/**
 * Root Layout — AgentWatch Mobile
 *
 * RF22 CA-03: Inicializa expo-notifications al arrancar la app para que el
 * token FCM esté registrado antes de que llegue la primera notificación.
 *
 * RF22 CA-02: Configura el listener de deep link para que tocar una
 * notificación CRITICAL navegue directamente al detalle del agente.
 *
 * RF23 CA-02/CA-03: Inicializa el SyncManager para detectar conectividad y
 * arrancar el ciclo de delta sync + procesamiento de cola offline.
 */

import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  inicializarNotificaciones,
  configurarListenerDeepLink,
} from '../services/NotificationService';
import {
  iniciarSyncManager,
  detenerSyncManager,
} from '../services/SyncManager';

const queryClient = new QueryClient();

function AppInitializer() {
  const router = useRouter();

  useEffect(() => {
    // RF22 CA-03: registrar token FCM al montar la app
    inicializarNotificaciones().catch((err) =>
      console.error('[Layout] Error al inicializar notificaciones:', err)
    );

    // RF22 CA-02: activar listener para deep links desde notificaciones CRITICAL
    const removeNotifListener = configurarListenerDeepLink(router);

    // RF23 CA-02/CA-03: arrancar sync manager (detecta red + delta sync)
    iniciarSyncManager().catch((err) =>
      console.error('[Layout] Error al iniciar SyncManager:', err)
    );

    return () => {
      removeNotifListener();
      detenerSyncManager();  // RF23: limpiar timers al desmontar
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AppInitializer />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="agent/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </QueryClientProvider>
  );
}

