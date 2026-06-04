import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { User, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = () => {
    // Aquí podrías agregar limpieza de tokens o AuthContext si lo tuvieras
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Ajustes y Perfil</Text>

      {/* Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <User color="#fff" size={32} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Enzo Ordóñez</Text>
          <Text style={styles.profileRole}>Administrador de Agentes</Text>
          <Text style={styles.profileEmail}>enzo.ordonez@agentwatch.com</Text>
        </View>
      </View>



      {/* Logout Option */}
      <TouchableOpacity 
        style={[styles.settingsGroup, styles.logoutBtn]}
        onPress={handleLogout}
      >
        <LogOut color={Colors.error} size={20} style={styles.icon} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.primaryLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 48,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: 'bold',
  }
});
