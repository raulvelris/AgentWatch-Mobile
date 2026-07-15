import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { useNotificationViewModel } from '../../viewmodels/NotificationViewModel';
import { useRouter } from 'expo-router';
import { AlertOctagon, AlertTriangle, Info, Check, EyeOff, Bell, History } from 'lucide-react-native';


export default function AlertsScreen() {
  const { notifications, isLoading, isNoDisturbActive, markAsRead } = useNotificationViewModel();
  const router = useRouter();

  const handleNotificationPress = (item: any) => {
    // CA-02: Las notificaciones CRITICAL incluyen deep link al detalle del agente
    if (item.tipo === 'deploy_fallido' && item.agent_id) {
      router.push(`/agent/${item.agent_id}`);
    }
  };

  const getSeverityStyle = (tipo: string) => {
    switch (tipo) {
      case 'deploy_fallido':
        return {
          borderColor: Colors.error,
          badgeBg: 'rgba(239, 68, 68, 0.2)',
          badgeText: Colors.error,
          icon: <AlertOctagon color={Colors.error} size={20} />,
          badgeLabel: 'CRÍTICA',
        };
      case 'promotion_pendiente':
        return {
          borderColor: Colors.warning,
          badgeBg: 'rgba(250, 204, 21, 0.2)',
          badgeText: Colors.warning,
          icon: <AlertTriangle color={Colors.warning} size={20} />,
          badgeLabel: 'ADVERTENCIA',
        };
      default:
        return {
          borderColor: Colors.primaryLight,
          badgeBg: 'rgba(56, 189, 248, 0.2)',
          badgeText: Colors.primaryLight,
          icon: <Info color={Colors.primaryLight} size={20} />,
          badgeLabel: 'INFO',
        };
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CA-04: Banner informativo de Modo No Molestar */}
      {isNoDisturbActive && (
        <View style={styles.noDisturbBanner}>
          <EyeOff color="#fff" size={16} style={styles.bannerIcon} />
          <Text style={styles.noDisturbBannerText}>
            Modo No Molestar Activo — Alertas Silenciadas
          </Text>
        </View>
      )}

      {/* RF24 CA-06: acceso rápido al historial completo de alertas */}
      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => router.push('/(tabs)/alert-history')}
      >
        <History color={Colors.primaryLight} size={16} />
        <Text style={styles.historyBtnText}>Ver historial completo (RF24)</Text>
      </TouchableOpacity>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell color={Colors.textMuted} size={48} />
          <Text style={styles.emptyText}>No hay alertas que coincidan con tu configuración</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const styleProps = getSeverityStyle(item.tipo);
            const isRead = item.leida;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { borderLeftColor: styleProps.borderColor },
                  isRead && styles.readCard,
                ]}
                activeOpacity={item.tipo === 'deploy_fallido' ? 0.7 : 0.9}
                onPress={() => handleNotificationPress(item)}
                disabled={item.tipo !== 'deploy_fallido'}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconAndBadge}>
                    {styleProps.icon}
                    <View style={[styles.badge, { backgroundColor: styleProps.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: styleProps.badgeText }]}>
                        {styleProps.badgeLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.headerRight}>
                    <Text style={styles.dateText}>{formatDate(item.fecha)}</Text>
                    {!isRead && <View style={styles.unreadDot} />}
                  </View>
                </View>

                {/* CA-06: Mensaje que incluye Agente y detalles para actuar */}
                <Text style={styles.messageText}>{item.mensaje}</Text>
                
                {item.agent_id && (
                  <Text style={styles.agentText}>
                    Agente ID: <Text style={styles.agentHighlight}>{item.agent_id}</Text>
                  </Text>
                )}

                <View style={styles.cardActions}>
                  {item.tipo === 'deploy_fallido' && (
                    <Text style={styles.actionPrompt}>Tap para ver detalles ➔</Text>
                  )}
                  <View style={{ flex: 1 }} />
                  {!isRead && (
                    <TouchableOpacity
                      style={styles.markReadBtn}
                      onPress={() => markAsRead(item.id)}
                    >
                      <Check color={Colors.success} size={16} />
                      <Text style={styles.markReadText}>Marcar leída</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  noDisturbBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerIcon: {
    marginRight: 8,
  },
  noDisturbBannerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 16,
  },
  readCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },
  messageText: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  agentText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  agentHighlight: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionPrompt: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  markReadText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 0,
    marginBottom: 8,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    borderRadius: 10,
  },
  historyBtnText: {
    color: Colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
