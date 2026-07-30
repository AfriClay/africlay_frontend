import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { theme } from '../../theme';
import { RouteProp, useRoute } from '@react-navigation/native';
import { formatDate } from '../../utils/formatDate';
import { StatusPill } from '../../components/ui/StatusPill';

export const OrderDetails: React.FC = () => {
  const route = useRoute<any>();
  const { orderId } = route.params;
  const { data: order } = useQuery({ queryKey: ['order', orderId], queryFn: () => orderService.fetchOrderById(orderId) });

  if (!order) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.id}>Order #{order.id}</Text>
        <Text style={styles.date}>{formatDate(order.date)}</Text>
        <StatusPill status={order.status} />
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>�{item.quantity}</Text>
            <Text style={styles.itemPrice}>KSh {item.price.toLocaleString()}</Text>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.card}><Text style={styles.cardText}>{order.deliveryAddress}</Text></View>
        <Text style={styles.sectionTitle}>Delivery Timeline</Text>
        <Text style={styles.meta}>Confirmed ? Packed ? Shipped ? Out for Delivery ? Delivered</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg },
  id: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink },
  date: { color: theme.colors.muted, marginBottom: theme.spacing.md },
  sectionTitle: { marginTop: theme.spacing.lg, fontSize: theme.typography.h3.fontSize, fontWeight: '700', color: theme.colors.ink },
  itemRow: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginTop: theme.spacing.sm, ...theme.shadows.sm },
  itemName: { color: theme.colors.ink, fontWeight: '700' },
  itemQty: { color: theme.colors.muted },
  itemPrice: { color: theme.colors.secondary.DEFAULT, fontWeight: '700' },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginTop: theme.spacing.sm, ...theme.shadows.sm },
  cardText: { color: theme.colors.ink },
  meta: { color: theme.colors.muted, marginTop: theme.spacing.sm },
  loading: { padding: theme.spacing.lg, color: theme.colors.muted },
});
