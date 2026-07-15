/**
 * AlertHistory — RF24 CA-06
 *
 * Historial de alertas multicanal con filtros avanzados por:
 *   - Criticidad: CRITICAL / WARNING / INFO
 *   - Estado: pendiente / leida / snoozed / escalada
 *   - Canal: push / email / slack / webhook
 *
 * CA-05: Cada alerta tiene opciones de snooze (1h / 4h / 24h) y marcar como leída.
 * CA-04: Las alertas escaladas se muestran con badge especial.
 * CA-02: El tipo de anomalía detectada se muestra en la card.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ArrowUpCircle,
  Filter,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Alert {
  id: number;
  tenant_id: string;
  agent_id: string | null;
  tipo: string;
  criticidad: 'CRITICAL' | 'WARNING' | 'INFO';
  mensaje: string;
  canales_usados: string[];
  estado: 'pendiente' | 'leida' | 'snoozed' | 'escalada';
  snooze_until: string | null;
  escalado_a: string | null;
  escalado_en: string | null;
  fecha: string;
}

type FilterCriticidad = 'TODAS' | 'CRITICAL' | 'WARNING' | 'INFO';
type FilterEstado = 'TODOS' | 'pendiente' | 'leida' | 'snoozed' | 'escalada';
type FilterCanal = 'TODOS' | 'push' | 'email' | 'slack' | 'webhook';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchAlerts(params: {
  criticidad?: string;
  estado?: string;
  canal?: string;
}): Promise<Alert[]> {
  const query = new URLSearchParams();
  if (params.criticidad && params.criticidad !== 'TODAS') query.set('criticidad', params.criticidad);
  if (params.estado && params.estado !== 'TODOS') query.set('estado', params.estado);
  if (params.canal && params.canal !== 'TODOS') query.set('canal', params.canal);

  const resp = await fetch(`${API_BASE_URL}/alerts/?${query.toString()}`);
  if (!resp.ok) throw new Error('Error cargando alertas');
  const data = await resp.json();
  return data.alerts;
}

async function markAlertRead(id: number): Promise<void> {
  await fetch(`${API_BASE_URL}/alerts/${id}/read`, { method: 'PATCH' });
}

async function snoozeAlert(id: number, horas: 1 | 4 | 24): Promise<void> {
  await fetch(`${API_BASE_URL}/alerts/${id}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ horas }),
  });
}

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const SEVERIDAD_CONFIG = {
  CRITICAL: {
    borderColor: Colors.error,
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeText: Colors.error,
    icon: <AlertOctagon color={Colors.error} size={18} />,
    label: 'CRÍTICA',
  },
  WARNING: {
    borderColor: Colors.warning,
    badgeBg: 'rgba(250,204,21,0.15)',
    badgeText: Colors.warning,
    icon: <AlertTriangle color={Colors.warning} size={18} />,
    label: 'ADVERTENCIA',
  },
  INFO: {
    borderColor: Colors.primaryLight,
    badgeBg: 'rgba(56,189,248,0.15)',
    badgeText: Colors.primaryLight,
    icon: <Info color={Colors.primaryLight} size={18} />,
    label: 'INFO',
  },
};

const CANAL_EMOJI: Record<string, string> = {
  push: '📱',
  email: '📧',
  slack: '💬',
  webhook: '🔗',
};

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  pendiente: { color: Colors.warning,     label: 'Pendiente' },
  leida:     { color: Colors.success,     label: 'Leída'     },
  snoozed:   { color: Colors.textMuted,   label: 'Silenciada'},
  escalada:  { color: Colors.error,       label: 'Escalada'  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + d.toLocaleDateString();
  } catch { return iso; }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AlertHistoryScreen() {
  const queryClient = useQueryClient();

  // Filtros activos
  const [criticidad, setCriticidad] = useState<FilterCriticidad>('TODAS');
  const [estado, setEstado]         = useState<FilterEstado>('TODOS');
  const [canal, setCanal]           = useState<FilterCanal>('TODOS');
  const [showFilters, setShowFilters] = useState(false);

  // Snooze modal
  const [snoozeAlertId, setSnoozeAlertId] = useState<number | null>(null);

  const { data: alerts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['alert-history', criticidad, estado, canal],
    queryFn: () => fetchAlerts({ criticidad, estado, canal }),
    refetchInterval: 15000,
  });

  const readMutation = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-history'] }),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, horas }: { id: number; horas: 1 | 4 | 24 }) =>
      snoozeAlert(id, horas),
    onSuccess: () => {
      setSnoozeAlertId(null);
      queryClient.invalidateQueries({ queryKey: ['alert-history'] });
    },
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const renderAlert = ({ item }: { item: Alert }) => {
    const sev = SEVERIDAD_CONFIG[item.criticidad] ?? SEVERIDAD_CONFIG.INFO;
    const est = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.pendiente;
    const isUnread = item.estado === 'pendiente';
    const isEscalada = item.estado === 'escalada';

    return (
      <View style={[styles.card, { borderLeftColor: sev.borderColor }, !isUnread && styles.cardRead]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.iconBadgeRow}>
            {sev.icon}
            <View style={[styles.badge, { backgroundColor: sev.badgeBg }]}>
              <Text style={[styles.badgeText, { color: sev.badgeText }]}>{sev.label}</Text>
            </View>
            {isEscalada && (
              <View style={styles.escaladaBadge}>
                <ArrowUpCircle color="#fff" size={12} />
                <Text style={styles.escaladaText}>ESCALADA</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.estadoPill, { backgroundColor: est.color + '22' }]}>
              <Text style={[styles.estadoText, { color: est.color }]}>{est.label}</Text>
            </View>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>

        {/* Mensaje */}
        <Text style={styles.mensaje} numberOfLines={3}>{item.mensaje}</Text>

        {/* Meta: agente, tipo, canales */}
        <View style={styles.metaRow}>
          {item.agent_id && (
            <Text style={styles.metaText}>🤖 {item.agent_id}</Text>
          )}
          <Text style={styles.metaText}>⚡ {item.tipo.replace(/_/g, ' ')}</Text>
        </View>

        {/* Canales usados */}
        {item.canales_usados.length > 0 && (
          <View style={styles.canalesRow}>
            {item.canales_usados.map(c => (
              <View key={c} style={styles.canalPill}>
                <Text style={styles.canalText}>{CANAL_EMOJI[c] ?? '📡'} {c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Escalación info */}
        {isEscalada && item.escalado_a && (
          <Text style={styles.escaladaInfo}>↗ Escalado a: {item.escalado_a}</Text>
        )}

        {/* Snooze info */}
        {item.estado === 'snoozed' && item.snooze_until && (
          <Text style={styles.snoozeInfo}>
            🔕 Silenciada hasta {formatDate(item.snooze_until)}
          </Text>
        )}

        {/* Fecha */}
        <Text style={styles.fecha}>{formatDate(item.fecha)}</Text>

        {/* Acciones */}
        {isUnread && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setSnoozeAlertId(item.id)}
            >
              <BellOff color={Colors.textMuted} size={14} />
              <Text style={styles.actionBtnText}>Silenciar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => readMutation.mutate(item.id)}
            >
              <Check color={Colors.success} size={14} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>Leída</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de filtros */}
      <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(v => !v)}>
        <Filter color={Colors.primaryLight} size={16} />
        <Text style={styles.filterToggleText}>Filtros</Text>
        {(criticidad !== 'TODAS' || estado !== 'TODOS' || canal !== 'TODOS') && (
          <View style={styles.filterActiveDot} />
        )}
        <ChevronDown color={Colors.textMuted} size={14} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Criticidad */}
          <Text style={styles.filterLabel}>Criticidad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {(['TODAS', 'CRITICAL', 'WARNING', 'INFO'] as FilterCriticidad[]).map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.filterChip, criticidad === v && styles.filterChipActive]}
                onPress={() => setCriticidad(v)}
              >
                <Text style={[styles.filterChipText, criticidad === v && styles.filterChipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Estado */}
          <Text style={styles.filterLabel}>Estado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {(['TODOS', 'pendiente', 'leida', 'snoozed', 'escalada'] as FilterEstado[]).map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.filterChip, estado === v && styles.filterChipActive]}
                onPress={() => setEstado(v)}
              >
                <Text style={[styles.filterChipText, estado === v && styles.filterChipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Canal */}
          <Text style={styles.filterLabel}>Canal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {(['TODOS', 'push', 'email', 'slack', 'webhook'] as FilterCanal[]).map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.filterChip, canal === v && styles.filterChipActive]}
                onPress={() => setCanal(v)}
              >
                <Text style={[styles.filterChipText, canal === v && styles.filterChipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Lista */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell color={Colors.textMuted} size={48} />
          <Text style={styles.emptyText}>No hay alertas con los filtros seleccionados</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => String(item.id)}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}

      {/* Snooze Modal CA-05 */}
      <Modal visible={snoozeAlertId !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Silenciar alerta</Text>
            <Text style={styles.modalSubtitle}>¿Por cuánto tiempo?</Text>
            {([1, 4, 24] as const).map(h => (
              <TouchableOpacity
                key={h}
                style={styles.snoozeOption}
                onPress={() => snoozeAlertId !== null && snoozeMutation.mutate({ id: snoozeAlertId, horas: h })}
              >
                <BellOff color={Colors.textMuted} size={18} />
                <Text style={styles.snoozeOptionText}>{h} hora{h !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSnoozeAlertId(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:             { padding: 16 },
  filterToggle:     { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  filterToggleText: { color: Colors.primaryLight, fontWeight: '600', fontSize: 14 },
  filterActiveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primaryLight },
  filtersPanel:     { backgroundColor: Colors.surface, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterLabel:      { color: Colors.textMuted, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  filterRow:        { flexDirection: 'row' },
  filterChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: 'transparent' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:   { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  card:             { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, padding: 14, marginBottom: 14 },
  cardRead:         { opacity: 0.6 },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconBadgeRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:        { fontSize: 10, fontWeight: 'bold' },
  escaladaBadge:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  escaladaText:     { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  headerRight:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estadoPill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  estadoText:       { fontSize: 10, fontWeight: 'bold' },
  unreadDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryLight },
  mensaje:          { color: Colors.text, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  metaRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  metaText:         { color: Colors.textMuted, fontSize: 12 },
  canalesRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  canalPill:        { backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)' },
  canalText:        { color: Colors.primaryLight, fontSize: 11, fontWeight: '600' },
  escaladaInfo:     { color: Colors.error, fontSize: 12, marginBottom: 6 },
  snoozeInfo:       { color: Colors.textMuted, fontSize: 12, marginBottom: 6 },
  fecha:            { color: Colors.textMuted, fontSize: 11, marginBottom: 8 },
  actionsRow:       { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  actionBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  actionBtnPrimary: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)' },
  actionBtnText:    { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  emptyState:       { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5, padding: 32 },
  emptyText:        { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 16 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:       { color: Colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle:    { color: Colors.textMuted, fontSize: 14, marginBottom: 20 },
  snoozeOption:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.background, borderRadius: 12, marginBottom: 10 },
  snoozeOptionText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  cancelBtn:        { alignItems: 'center', padding: 16, marginTop: 4 },
  cancelBtnText:    { color: Colors.textMuted, fontSize: 16 },
});
