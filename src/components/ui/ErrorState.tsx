import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from './Button';

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={styles.root}>
    <AlertTriangle size={48} color={theme.colors.error} />
    <Text style={styles.title}>Something went wrong</Text>
    <Text style={styles.description}>{message}</Text>
    {onRetry && <Button onPress={onRetry} accessibilityLabel="Retry">Retry</Button>}
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
