import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Order } from '../../types/order';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { buyerTrackingStatus } from '../../utils/buyerTracking';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => (
  <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Track order ${order.id} and view details`}>
    <View style={styles.header}>
      <Text style={styles.id}>Order #{order.id.slice(0, 8)}</Text>
      <Text style={styles.currentStatus}>{buyerTrackingStatus(order)}</Text>
    </View>
    <Text style={styles.summary}>{formatDate(order.date)}</Text>
    <Text style={styles.itemPreview} numberOfLines={2}>{order.items.slice(0, 2).map(item => `${item.name}${item.optionLabel ? ` · ${item.optionLabel}` : ''} × ${item.quantity}`).join(', ')}{order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}</Text>
    <Text style={styles.summary}>Delivery {formatCurrency(order.shippingCost, order.currency)}</Text>
    <Text style={styles.total}>Order total {formatCurrency(order.total, order.currency)}</Text>
    <Text style={styles.track}>Track order →</Text>
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
    flex: 1,
  },
  currentStatus: { color: theme.colors.primary.dark, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  itemPreview: { color: theme.colors.ink, marginBottom: theme.spacing.sm },
  summary: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  total: {
    color: theme.colors.secondary.DEFAULT,
    fontWeight: '700',
  },
  track: { color: theme.colors.primary.DEFAULT, fontWeight: '800', marginTop: theme.spacing.sm },
});
