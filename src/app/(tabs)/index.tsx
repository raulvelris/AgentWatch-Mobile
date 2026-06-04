import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { useAgentViewModel } from '../../viewmodels/AgentViewModel';
import { ActivityIndicator } from 'react-native';

export default function DashboardScreen() {
  const { agents, isLoading } = useAgentViewModel();

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  const activeCount = agents.filter(a => a.state === 'ACTIVE').length;
  const pausedCount = agents.filter(a => a.state === 'PAUSED').length;
  const total = agents.length;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Resumen General</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{total}</Text>
          <Text style={styles.cardLabel}>Total Agentes</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardValue, { color: Colors.success }]}>{activeCount}</Text>
          <Text style={styles.cardLabel}>Activos</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardValue, { color: Colors.warning }]}>{pausedCount}</Text>
          <Text style={styles.cardLabel}>Pausados</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    width: '48%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
  },
  cardLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  }
});
