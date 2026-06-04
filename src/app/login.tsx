import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthViewModel } from '../viewmodels/AuthViewModel';
import { Colors } from '../theme/colors';
import { Fingerprint } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { loginWithBiometrics, isAuthenticating, hasBiometrics } = useAuthViewModel();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>AW</Text>
        </View>
        <Text style={styles.title}>AgentWatch</Text>
        <Text style={styles.subtitle}>Mobile Management</Text>
      </View>

      <View style={styles.loginCard}>
        {hasBiometrics ? (
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={loginWithBiometrics}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Fingerprint color="#fff" size={24} style={styles.icon} />
                <Text style={styles.primaryBtnText}>Acceder con Biometría</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.errorText}>
              Tu dispositivo no tiene biometría configurada. Usa el entorno web.
            </Text>
            {__DEV__ && (
              <TouchableOpacity 
                style={[styles.primaryBtn, { marginTop: 16, backgroundColor: '#334155' }]} 
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={styles.primaryBtnText}>Modo Dev: Entrar sin Biometría</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 8,
  },
  loginCard: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 12,
  },
  icon: {
    marginRight: 8,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
  }
});
