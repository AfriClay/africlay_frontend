import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export const StatCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.root}>
    <Text style={styles.value} numberOfLines={2}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 92, padding: theme.spacing.sm, borderRadius: theme.radii.md, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm },
  value: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', textAlign: 'center' },
  label: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, textAlign: 'center', marginTop: theme.spacing.xs },
});
