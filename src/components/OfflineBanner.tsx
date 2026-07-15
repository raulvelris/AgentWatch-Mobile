/**
 * OfflineBanner.tsx — RF23 CA-02
 *
 * Indicador visual de modo offline con:
 *   - Banner rojo animado cuando no hay conexión (datos cacheados).
 *   - Banner verde breve al reconectar (con resultado de sync).
 *   - Toast de conflictos "server wins" (CA-06).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react-native';
import {
  addSyncListener,
  ConnectivityStatus,
  ConflictInfo,
} from '../services/SyncManager';
import { Colors } from '../theme/colors';

interface Props {
  /** Si true, el banner ocupa espacio en el layout y empuja el contenido. */
  pushContent?: boolean;
}

export default function OfflineBanner({ pushContent = true }: Props) {
  const [status, setStatus]       = useState<ConnectivityStatus>('checking');
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showOnline, setShowOnline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const onlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = addSyncListener((s, c) => {
      setStatus(s);
      if (c && c.length > 0) setConflicts(c);

      if (s === 'online') {
        // Mostrar banner verde por 3 s
        setShowOnline(true);
        if (onlineTimer.current) clearTimeout(onlineTimer.current);
        onlineTimer.current = setTimeout(() => setShowOnline(false), 3000);
      }
    });
    return () => { unsub(); if (onlineTimer.current) clearTimeout(onlineTimer.current); };
  }, []);

  // Animación de slide
  useEffect(() => {
    const shouldShow = status === 'offline' || showOnline;
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : -60,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [status, showOnline]);

  const isOffline  = status === 'offline';
  const bgColor    = isOffline ? Colors.error : Colors.success;
  const icon       = isOffline
    ? <WifiOff color="#fff" size={16} />
    : <Wifi    color="#fff" size={16} />;
  const message    = isOffline
    ? 'Sin conexión — mostrando datos cacheados'
    : 'Conectado — datos sincronizados ✓';

  return (
    <>
      {/* Banner principal (offline / reconexión) */}
      <Animated.View
        style={[
          styles.banner,
          { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
          pushContent && styles.bannerPush,
        ]}
      >
        <View style={styles.row}>
          {icon}
          <Text style={styles.bannerText}>{message}</Text>
          {isOffline && <RefreshCw color="#fff" size={14} style={{ marginLeft: 6 }} />}
        </View>
      </Animated.View>

      {/* Toast de conflictos CA-06 */}
      {conflicts.length > 0 && (
        <View style={styles.conflictToast}>
          <AlertTriangle color={Colors.warning} size={14} />
          <Text style={styles.conflictText}>
            {conflicts.length} agente(s) actualizados por el servidor (server wins):
            {' '}{conflicts.map(c => `${c.agent_id} ${c.local_estado}→${c.server_estado}`).join(', ')}
          </Text>
          <Text
            style={styles.conflictDismiss}
            onPress={() => setConflicts([])}
          >✕</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bannerPush: {
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  conflictToast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(250,204,21,0.15)',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 8,
    margin: 12,
    padding: 10,
    gap: 8,
    zIndex: 998,
  },
  conflictText: {
    color: Colors.warning,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  conflictDismiss: {
    color: Colors.textMuted,
    fontSize: 14,
    paddingLeft: 4,
  },
});
