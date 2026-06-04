import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';

type AgentMetric = {
  agent_id: string;
  total_tasks: number;
  completed_tasks: number;
  generated_value_usd: number;
  operation_cost_usd: number;
  roi: number;
  cost_per_completed_task_usd: number;
  human_hours_saved: number;
  quality_rate_percent: number;
};

import { API_BASE_URL } from '../../services/api';

export default function MetricsScreen() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentMetric[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/metrics/business?tenant_id=TEN001&period=month`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.warn('Backend metrics not ready, showing empty state');
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  const totalOperationCost = agents.reduce((sum, item) => sum + item.operation_cost_usd, 0);
  const totalGeneratedValue = agents.reduce((sum, item) => sum + item.generated_value_usd, 0);
  const totalHoursSaved = agents.reduce((sum, item) => sum + item.human_hours_saved, 0);
  
  const globalRoi = totalOperationCost > 0 ? (totalGeneratedValue / totalOperationCost).toFixed(2) : 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Métricas de Negocio</Text>
      <Text style={styles.subtitle}>Visualización gerencial del ROI, costos y calidad.</Text>

      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <Text style={styles.cardLabel}>ROI Global</Text>
          <Text style={styles.cardValue}>{globalRoi}x</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.cardLabel}>Horas Ahorradas</Text>
          <Text style={styles.cardValue}>{totalHoursSaved}h</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Detalle por agente</Text>
      
      {agents.length === 0 ? (
        <Text style={styles.emptyText}>No hay información relevante aún</Text>
      ) : (
        agents.map((item, index) => (
          <View key={index} style={styles.tableCard}>
            <Text style={styles.agentName}>{item.agent_id}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Valor generado:</Text>
              <Text style={styles.value}>${item.generated_value_usd}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Costo operativo:</Text>
              <Text style={styles.value}>${item.operation_cost_usd}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ROI:</Text>
              <Text style={styles.value}>{item.roi}x</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Calidad:</Text>
              <Text style={styles.value}>{item.quality_rate_percent}%</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, marginTop: 4 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  metricCard: { backgroundColor: Colors.surfaceLight, padding: 16, borderRadius: 12, width: '48%', borderWidth: 1, borderColor: Colors.border },
  cardLabel: { fontSize: 12, color: Colors.textMuted },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primaryLight, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  tableCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  agentName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: { fontSize: 14, color: Colors.text, fontWeight: 'bold' },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 24 }
});
