import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors } from '../../theme/colors';
import { useAgentViewModel } from '../../viewmodels/AgentViewModel';
import { Play, Pause } from 'lucide-react-native';

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { getAgentById, toggleAgentState, isUpdating } = useAgentViewModel();
  
  const agent = getAgentById(id as string);

  if (!agent) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Agente no encontrado</Text>
      </View>
    );
  }

  const handleToggleState = () => {
    toggleAgentState(agent.id, agent.state);
  };

  const isActive = agent.state === 'ACTIVE';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: agent.name }} />
      
      <View style={styles.card}>
        <Text style={styles.label}>ID del Agente</Text>
        <Text style={styles.value}>{agent.id}</Text>
        
        <Text style={styles.label}>Descripción</Text>
        <Text style={styles.value} numberOfLines={2}>{agent.description}</Text>
        
        <Text style={styles.label}>Estado Actual</Text>
        <View style={styles.stateContainer}>
          <View style={[
            styles.dot, 
            { backgroundColor: isActive ? Colors.success : (agent.state === 'PAUSED' ? Colors.warning : Colors.textMuted) }
          ]} />
          <Text style={styles.stateValue}>{agent.state}</Text>
        </View>

        <Text style={styles.label}>Salud</Text>
        <Text style={styles.value}>{agent.health}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.actionBtn, isActive ? styles.btnPause : styles.btnPlay]} 
        onPress={handleToggleState}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="#fff" />
        ) : isActive ? (
          <>
            <Pause color="#fff" size={20} style={styles.icon} />
            <Text style={styles.btnText}>Pausar Agente</Text>
          </>
        ) : (
          <>
            <Play color="#fff" size={20} style={styles.icon} />
            <Text style={styles.btnText}>Reactivar Agente</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
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
  error: {
    color: Colors.error,
    fontSize: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 4,
    marginTop: 16,
  },
  value: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  stateValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  btnPlay: {
    backgroundColor: Colors.success,
  },
  btnPause: {
    backgroundColor: Colors.warning,
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    marginRight: 8,
  }
});
