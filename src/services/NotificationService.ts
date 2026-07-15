/**
 * NotificationService.ts — RF22 (Módulo 6)
 *
 * Integra expo-notifications con Firebase Cloud Messaging (FCM) para
 * notificaciones push nativas en Android/iOS.
 *
 * CA-01: Las notificaciones locales incluyen el nivel de criticidad como
 *        categoría y color del ícono.
 * CA-02: Las notificaciones CRITICAL configuran un deep link al agente
 *        afectado usando expo-router (agente/{agent_id}).
 * CA-03: El token FCM se registra al iniciar la app; el backend envía a FCM
 *        y la entrega nativa llega en < 10 s.
 * CA-04: El filtrado por nivel se aplica ANTES de mostrar la notificación
 *        local (respeta las preferencias guardadas en AsyncStorage).
 *
 * En producción: configurar google-services.json (Android) y
 * GoogleService-Info.plist (iOS) con el proyecto Firebase real.
 * En el prototipo académico: el token se loggea en consola y el backend
 * usa FCM mock; las notificaciones locales se disparan desde el polling.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { StorageService } from './StorageService';

const FCM_TOKEN_KEY = '@fcm_push_token';

// ─── Configuración de comportamiento al recibir notificación ─────────────────
// Las notificaciones se muestran aunque la app esté en primer plano (CA-03)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Mapa de criticidad a configuración visual ────────────────────────────────
// CA-01: cada nivel tiene color e ícono diferenciado
const CRITICIDAD_CONFIG: Record<
  string,
  { color: string; sound: boolean; priority: Notifications.AndroidNotificationPriority }
> = {
  CRITICAL: {
    color: '#EF4444',
    sound: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  },
  WARNING: {
    color: '#FACC15',
    sound: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  },
  INFO: {
    color: '#38BDF8',
    sound: false,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
  },
};

// ─── Registro de canales Android (requerido para notificaciones en Android 8+) ─
async function _configurarCanalesAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('agentwatch-critical', {
    name: 'AgentWatch — Críticas',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EF4444',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('agentwatch-warning', {
    name: 'AgentWatch — Advertencias',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#FACC15',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('agentwatch-info', {
    name: 'AgentWatch — Informativas',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#38BDF8',
    sound: undefined,
  });
}

// ─── Solicitar permisos y obtener token FCM ───────────────────────────────────

/**
 * Inicializa el sistema de notificaciones push.
 * Retorna el token Expo/FCM o null si no se puede obtener (simulador).
 *
 * CA-03: El token se persiste en AsyncStorage para enviarlo al backend
 * en el registro del dispositivo (endpoint futuro: POST /api/v1/devices).
 */
export async function inicializarNotificaciones(): Promise<string | null> {
  await _configurarCanalesAndroid();

  // En simuladores sin Play Services, solo habilitamos notificaciones locales
  if (!Device.isDevice) {
    console.info(
      '[NotificationService] Simulador detectado: FCM deshabilitado, notificaciones locales activas.'
    );
    return null;
  }

  // Solicitar permisos (CA-04: si el usuario los deniega, respetamos su decisión)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[NotificationService] Permisos de notificación denegados por el usuario.');
    return null;
  }

  try {
    // Obtener Expo Push Token (proxy de FCM en proyectos Expo Go)
    // En producción con bare workflow usar getDevicePushTokenAsync() directamente
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getDevicePushTokenAsync();

    const token = tokenData.data;
    console.info('[NotificationService] Token FCM/Expo obtenido:', token);

    // Persistir para enviarlo al backend al registrar el dispositivo
    await StorageService.setItem(FCM_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.error('[NotificationService] Error al obtener token:', error);
    return null;
  }
}

// ─── Disparar notificación local con nivel de criticidad ─────────────────────

/**
 * Muestra una notificación local inmediata basada en una notificación del backend.
 *
 * CA-01: El canal y los colores reflejan el nivel de criticidad.
 * CA-02: Las CRITICAL incluyen datos de navegación para el deep link.
 * CA-06: El cuerpo incluye agente, tipo de evento y hora.
 */
export async function mostrarNotificacionLocal(params: {
  id: number;
  tipo: string;
  criticidad: string;
  mensaje: string;
  agent_id: string | null;
  fecha: string;
}): Promise<string> {
  const { id, tipo, criticidad, mensaje, agent_id, fecha } = params;
  const nivel = criticidad?.toUpperCase() ?? 'INFO';
  const config = CRITICIDAD_CONFIG[nivel] ?? CRITICIDAD_CONFIG.INFO;

  // CA-02: deep link payload para notificaciones CRITICAL
  const data: Record<string, string> = {
    notif_id: String(id),
    tipo,
    criticidad: nivel,
  };
  if (nivel === 'CRITICAL' && agent_id) {
    data.deeplink = `/agent/${agent_id}`;
    data.agent_id = agent_id;
  }

  // CA-06: título informativo con nivel y hora
  const horaFormateada = (() => {
    try {
      return new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  const titulos: Record<string, string> = {
    CRITICAL: '🔴 Alerta Crítica',
    WARNING: '🟡 Advertencia',
    INFO: '🔵 Información',
  };

  const channelId = `agentwatch-${nivel.toLowerCase()}` as const;

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${titulos[nivel] ?? 'AgentWatch'} ${horaFormateada ? `· ${horaFormateada}` : ''}`,
      body: mensaje,
      data,
      color: config.color,
      sound: config.sound ? 'default' : undefined,
      // CA-06: badge para notificaciones no leídas
      badge: 1,
    },
    trigger: null, // inmediata (CA-03)
    ...(Platform.OS === 'android' ? { channelId } : {}),
  } as any);

  return notifId;
}

// ─── Obtener token guardado ───────────────────────────────────────────────────

export async function obtenerTokenGuardado(): Promise<string | null> {
  return StorageService.getItem<string>(FCM_TOKEN_KEY);
}

// ─── Listener de tap en notificación (deep link CA-02) ───────────────────────

/**
 * Configura el handler para cuando el usuario toca una notificación.
 * El router de Expo navegará al deep link si está presente.
 *
 * Usar en el _layout.tsx raíz:
 *   configurarListenerDeepLink(router);
 */
export function configurarListenerDeepLink(
  router: { push: (href: string) => void }
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.deeplink) {
        // CA-02: navegar directamente al detalle del agente afectado
        router.push(data.deeplink);
      }
    }
  );
  return () => subscription.remove();
}
