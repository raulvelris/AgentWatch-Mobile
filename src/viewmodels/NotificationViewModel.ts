/**
 * NotificationViewModel.ts — RF22 (Módulo 6)
 *
 * CA-03: El polling cada 5 s detecta notificaciones nuevas del backend y las
 *        despacha como notificaciones locales via NotificationService (expo-notifications).
 *        Esto garantiza el SLA de < 10 s end-to-end cuando FCM real no está configurado.
 *
 * CA-04: Las notificaciones se filtran según las preferencias del usuario
 *        (niveles CRITICAL / WARNING / INFO + modo No Molestar) ANTES de
 *        mostrarlas en la app o despacharlas como push local.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { StorageService } from '../services/StorageService';
import { mostrarNotificacionLocal } from '../services/NotificationService';

const PREFS_KEY = '@notification_preferences';

export interface NotificationPreferences {
  noDisturbEnabled: boolean;
  noDisturbStart: string; // "HH:MM"
  noDisturbEnd: string;   // "HH:MM"
  receiveCritical: boolean;
  receiveWarning: boolean;
  receiveInfo: boolean;
}

const defaultPrefs: NotificationPreferences = {
  noDisturbEnabled: false,
  noDisturbStart: '22:00',
  noDisturbEnd: '07:00',
  receiveCritical: true,
  receiveWarning: true,
  receiveInfo: true,
};

// CA-01: mapa tipo → criticidad (espejo del backend)
const TIPO_A_CRITICIDAD: Record<string, string> = {
  deploy_fallido: 'CRITICAL',
  promotion_pendiente: 'WARNING',
  promotion_expirada: 'INFO',
};

function _criticidadDeNotif(n: { tipo: string; criticidad?: string }): string {
  return n.criticidad ?? TIPO_A_CRITICIDAD[n.tipo] ?? 'INFO';
}

export function useNotificationViewModel() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPrefs);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Ref con los IDs ya vistos para detectar solo notificaciones NUEVAS (CA-03)
  const notifIdsVistos = useRef<Set<number>>(new Set());

  // Cargar preferencias del almacenamiento local al montar
  useEffect(() => {
    async function loadPrefs() {
      try {
        const stored = await StorageService.getItem<NotificationPreferences>(PREFS_KEY);
        if (stored) {
          setPreferences(stored);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setLoadingPrefs(false);
      }
    }
    loadPrefs();
  }, []);

  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    await StorageService.setItem(PREFS_KEY, updated);
  };

  const checkIsNoDisturbActive = (): boolean => {
    if (!preferences.noDisturbEnabled) return false;
    const now = new Date();
    const [nowH, nowM] = [now.getHours(), now.getMinutes()];
    const [startH, startM] = preferences.noDisturbStart.split(':').map(Number);
    const [endH, endM] = preferences.noDisturbEnd.split(':').map(Number);

    const nowMin = nowH * 60 + nowM;
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (startMin <= endMin) {
      return nowMin >= startMin && nowMin <= endMin;
    } else {
      // Cruza la medianoche (ej: 22:00 a 07:00)
      return nowMin >= startMin || nowMin <= endMin;
    }
  };

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => NotificationRepository.getNotifications(),
    refetchInterval: 5000, // CA-03: polling cada 5 s garantiza SLA de 10 s
  });

  // CA-03 + CA-04: detectar notificaciones NUEVAS y despacharlas como push local
  useEffect(() => {
    if (notifications.length === 0) return;

    const noMolestar = checkIsNoDisturbActive();

    notifications.forEach((notif: any) => {
      // Ya procesada anteriormente → skip
      if (notifIdsVistos.current.has(notif.id)) return;
      notifIdsVistos.current.add(notif.id);

      // Si ya estaba leída al llegar, no es "nueva" (llegó mientras la app estaba cerrada)
      if (notif.leida) return;

      const criticidad = _criticidadDeNotif(notif);

      // CA-04: respetar preferencias del usuario
      if (criticidad === 'CRITICAL' && !preferences.receiveCritical) return;
      if (criticidad === 'WARNING'  && !preferences.receiveWarning)  return;
      if (criticidad === 'INFO'     && !preferences.receiveInfo)      return;
      if (noMolestar) return; // modo No Molestar activo

      // Despachar notificación local inmediata (expo-notifications)
      mostrarNotificacionLocal({
        id: notif.id,
        tipo: notif.tipo,
        criticidad,
        mensaje: notif.mensaje,
        agent_id: notif.agent_id ?? null,
        fecha: notif.fecha,
      }).catch((err) =>
        console.error('[NotificationViewModel] Error al mostrar notificación local:', err)
      );
    });
  }, [notifications, preferences]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => NotificationRepository.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // CA-04: filtrar notificaciones según las preferencias del usuario
  const filteredNotifications = notifications.filter((n: any) => {
    const criticidad = _criticidadDeNotif(n);
    if (criticidad === 'CRITICAL' && !preferences.receiveCritical) return false;
    if (criticidad === 'WARNING'  && !preferences.receiveWarning)  return false;
    if (criticidad === 'INFO'     && !preferences.receiveInfo)      return false;
    return true;
  });

  return {
    notifications: filteredNotifications,
    rawNotifications: notifications,
    isLoading: isLoading || loadingPrefs,
    error,
    preferences,
    updatePreferences,
    isNoDisturbActive: checkIsNoDisturbActive(),
    markAsRead: (id: number) => markAsReadMutation.mutate(id),
    isMarking: markAsReadMutation.isPending,
  };
}
