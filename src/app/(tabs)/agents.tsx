import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { useAgentViewModel } from '../../viewmodels/AgentViewModel';
import { useRouter } from 'expo-router';

export default function AgentsScreen() {
  const { agents, isLoading } = useAgentViewModel();
  const router = useRouter();

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={agents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/agent/${item.id}`)}
          >
            <View style={styles.infoContainer}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </View>
            <View style={styles.stateContainer}>
              <View style={[
                styles.dot, 
                { backgroundColor: item.state === 'ACTIVE' ? Colors.success : (item.state === 'PAUSED' ? Colors.warning : Colors.textMuted) }
              ]} />
              <Text style={styles.stateText}>{item.state}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  stateContainer: {
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  stateText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: 'bold',
  }
});
