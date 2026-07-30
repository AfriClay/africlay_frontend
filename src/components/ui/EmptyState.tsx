import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AlertCircle } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => (
  <View style={styles.root}>
    <AlertCircle size={48} color={theme.colors.muted} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    marginTop: theme.spacing.md,
    color: theme.colors.ink,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: theme.spacing.sm,
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
});
