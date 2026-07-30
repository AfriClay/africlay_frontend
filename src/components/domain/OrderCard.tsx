import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Order } from '../../types/order';
import { StatusPill } from '../ui/StatusPill';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => (
  <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View order ${order.id}`}>
    <View style={styles.header}>
      <Text style={styles.id}>#{order.id}</Text>
      <StatusPill status={order.status} />
    </View>
    <Text style={styles.summary}>{`${order.items.length} item${order.items.length > 1 ? 's' : ''} · ${order.date}`}</Text>
    <Text style={styles.total}>{`KSh ${order.total.toLocaleString()}`}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  id: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  summary: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  total: {
    color: theme.colors.secondary.DEFAULT,
    fontWeight: '700',
  },
});
