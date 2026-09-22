import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { OrderStatus } from '../../types/order';

const STATUS_CONFIG = {
  pending: { backgroundColor: theme.colors.secondary.tint, color: theme.colors.ink, label: 'Pending' },
  processing: { backgroundColor: theme.colors.primary.tint, color: theme.colors.primary.dark, label: 'Processing' },
  shipped: { backgroundColor: theme.colors.primary.DEFAULT, color: theme.colors.white, label: 'Shipped' },
  delivered: { backgroundColor: theme.colors.success, color: theme.colors.white, label: 'Delivered' },
  cancelled: { backgroundColor: theme.colors.error, color: theme.colors.white, label: 'Cancelled' },
} as const;

interface StatusPillProps {
  status: OrderStatus;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.root, { backgroundColor: config.backgroundColor }]}> 
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
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
