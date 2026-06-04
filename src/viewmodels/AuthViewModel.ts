import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';

export function useAuthViewModel() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometrics(hasHardware && isEnrolled);
  };

  const loginWithBiometrics = async () => {
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Iniciar sesión en AgentWatch',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Redirigir al dashboard
        router.replace('/(tabs)');
      } else {
        console.warn('Autenticación fallida o cancelada');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticating,
    hasBiometrics,
    loginWithBiometrics
  };
}
