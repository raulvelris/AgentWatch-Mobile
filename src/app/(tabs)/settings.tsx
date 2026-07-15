import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Colors } from '../../theme/colors';
import { User, LogOut, EyeOff, BellRing } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotificationViewModel } from '../../viewmodels/NotificationViewModel';

export default function SettingsScreen() {
  const router = useRouter();
  const { preferences, updatePreferences } = useNotificationViewModel();

  const handleLogout = () => {
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

      {/* CA-04: Preferencias de Notificaciones */}
      <Text style={styles.sectionTitle}>Preferencias de Alertas</Text>
      
      <View style={styles.settingsGroup}>
        {/* Toggle Modo No Molestar */}
        <View style={styles.settingsItem}>
          <View style={styles.settingsItemLeft}>
            <EyeOff color={Colors.primaryLight} size={20} style={styles.icon} />
            <View>
              <Text style={styles.settingsItemText}>Modo No Molestar</Text>
              <Text style={styles.settingsItemSubtext}>Silenciar notificaciones temporalmente</Text>
            </View>
          </View>
          <Switch
            value={preferences.noDisturbEnabled}
            onValueChange={(val) => updatePreferences({ noDisturbEnabled: val })}
            trackColor={{ false: '#1e293b', true: Colors.primary }}
            thumbColor={'#fff'}
          />
        </View>

        {preferences.noDisturbEnabled && (
          <>
            <View style={styles.divider} />
            <View style={styles.timeInputsRow}>
              <View style={styles.timeInputCol}>
                <Text style={styles.timeLabel}>Hora Inicio</Text>
                <TextInput
                  style={styles.timeInput}
                  value={preferences.noDisturbStart}
                  onChangeText={(val) => updatePreferences({ noDisturbStart: val })}
                  placeholder="22:00"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                />
              </View>
              <View style={styles.timeInputCol}>
                <Text style={styles.timeLabel}>Hora Fin</Text>
                <TextInput
                  style={styles.timeInput}
                  value={preferences.noDisturbEnd}
                  onChangeText={(val) => updatePreferences({ noDisturbEnd: val })}
                  placeholder="07:00"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                />
              </View>
            </View>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Niveles de Criticidad a Recibir</Text>
      
      <View style={styles.settingsGroup}>
        {/* Critical Alerts */}
        <View style={styles.settingsItem}>
          <View style={styles.settingsItemLeft}>
            <View style={[styles.colorIndicator, { backgroundColor: Colors.error }]} />
            <View>
              <Text style={styles.settingsItemText}>Alertas Críticas (CRITICAL)</Text>
              <Text style={styles.settingsItemSubtext}>Fallo total de ejecución, violaciones</Text>
            </View>
          </View>
          <Switch
            value={preferences.receiveCritical}
            onValueChange={(val) => updatePreferences({ receiveCritical: val })}
            trackColor={{ false: '#1e293b', true: Colors.error }}
            thumbColor={'#fff'}
          />
        </View>

        <View style={styles.divider} />

        {/* Warning Alerts */}
        <View style={styles.settingsItem}>
          <View style={styles.settingsItemLeft}>
            <View style={[styles.colorIndicator, { backgroundColor: Colors.warning }]} />
            <View>
              <Text style={styles.settingsItemText}>Advertencias (WARNING)</Text>
              <Text style={styles.settingsItemSubtext}>Degradación de calidad, 80% del budget</Text>
            </View>
          </View>
          <Switch
            value={preferences.receiveWarning}
            onValueChange={(val) => updatePreferences({ receiveWarning: val })}
            trackColor={{ false: '#1e293b', true: Colors.warning }}
            thumbColor={'#fff'}
          />
        </View>

        <View style={styles.divider} />

        {/* Info Alerts */}
        <View style={styles.settingsItem}>
          <View style={styles.settingsItemLeft}>
            <View style={[styles.colorIndicator, { backgroundColor: Colors.primaryLight }]} />
            <View>
              <Text style={styles.settingsItemText}>Informativas (INFO)</Text>
              <Text style={styles.settingsItemSubtext}>Tareas completadas, reportes diarios</Text>
            </View>
          </View>
          <Switch
            value={preferences.receiveInfo}
            onValueChange={(val) => updatePreferences({ receiveInfo: val })}
            trackColor={{ false: '#1e293b', true: Colors.primary }}
            thumbColor={'#fff'}
          />
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
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    flex: 1,
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  settingsItemSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  timeInputsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  timeInputCol: {
    width: '48%',
  },
  timeLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 48,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: 'bold',
  }
});
