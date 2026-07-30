import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

const STATUS_CONFIG = {
  Processing: { backgroundColor: theme.colors.secondary.tint, color: theme.colors.ink },
  Shipped: { backgroundColor: theme.colors.primary.DEFAULT, color: theme.colors.white },
  Delivered: { backgroundColor: theme.colors.success, color: theme.colors.white },
  Cancelled: { backgroundColor: theme.colors.error, color: theme.colors.white },
} as const;

interface StatusPillProps {
  status: keyof typeof STATUS_CONFIG;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.root, { backgroundColor: config.backgroundColor }]}> 
      <Text style={[styles.text, { color: config.color }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  text: {
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
  },
});
