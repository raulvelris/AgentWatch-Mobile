import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Bell } from 'lucide-react-native';

export default function AlertsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <Bell color={Colors.textMuted} size={48} />
        <Text style={styles.text}>No hay alertas nuevas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    opacity: 0.5,
  },
  text: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  }
});
