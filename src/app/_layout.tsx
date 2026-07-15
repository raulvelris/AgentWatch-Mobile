/**
 * Root Layout — AgentWatch Mobile
 *
 * RF22 CA-03: Inicializa expo-notifications al arrancar la app para que el
 * token FCM esté registrado antes de que llegue la primera notificación.
 *
 * RF22 CA-02: Configura el listener de deep link para que tocar una
 * notificación CRITICAL navegue directamente al detalle del agente.
 */

import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  inicializarNotificaciones,
  configurarListenerDeepLink,
} from '../services/NotificationService';

const queryClient = new QueryClient();

function NotificationInitializer() {
  const router = useRouter();

  useEffect(() => {
    // CA-03: registrar token FCM al montar la app
    inicializarNotificaciones().catch((err) =>
      console.error('[Layout] Error al inicializar notificaciones:', err)
    );

    // CA-02: activar listener para deep links desde notificaciones CRITICAL
    const removeListener = configurarListenerDeepLink(router);
    return removeListener;
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <NotificationInitializer />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="agent/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </QueryClientProvider>
  );
}
