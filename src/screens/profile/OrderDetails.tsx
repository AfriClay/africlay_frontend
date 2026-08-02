import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Check, MapPin } from 'lucide-react-native';
import { StatusPill } from '../../components/ui/StatusPill';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { orderService } from '../../services/orderService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

type OrderDetailsRoute = RouteProp<ProfileStackParamList, 'OrderDetails'>;
const timeline = ['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'] as const;

export const OrderDetails: React.FC = () => {
  const { params } = useRoute<OrderDetailsRoute>();
  const { data: order, isLoading } = useQuery({ queryKey: ['order', params.orderId], queryFn: () => orderService.fetchOrderById(params.orderId) });

  if (isLoading || !order) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading order…</Text></SafeAreaView>;

  const completedSteps = order.status === 'Delivered' ? 5 : order.status === 'Shipped' ? 3 : order.status === 'Processing' ? 2 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.orderHeader}>
          <View><Text style={styles.id}>Order #{order.id}</Text><Text style={styles.date}>{formatDate(order.date)}</Text></View>
          <StatusPill status={order.status} />
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" /> : null}
            <View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemQty}>Qty {item.quantity}</Text></View>
            <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.addressCard}><MapPin color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.addressText}>{order.deliveryAddress}</Text></View>

        <Text style={styles.sectionTitle}>Delivery Timeline</Text>
        <View style={styles.timelineCard}>
          {timeline.map((label, index) => {
            const completed = index < completedSteps;
            return (
              <View key={label} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, completed ? styles.timelineDotComplete : null]}>{completed ? <Check color={theme.colors.white} size={13} /> : null}</View>
                  {index < timeline.length - 1 ? <View style={[styles.timelineLine, completed && index < completedSteps - 1 ? styles.timelineLineComplete : null]} /> : null}
                </View>
                <View style={styles.timelineCopy}><Text style={[styles.timelineLabel, completed ? styles.timelineLabelComplete : null]}>{label}</Text><Text style={styles.timelineMeta}>{completed ? 'Completed' : 'Pending update'}</Text></View>
              </View>
            );
          })}
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Delivery fee</Text><Text style={styles.totalValue}>{formatCurrency(order.deliveryFee)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.grandTotalLabel}>Order total</Text><Text style={styles.grandTotal}>{formatCurrency(order.total)}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  id: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink },
  date: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  sectionTitle: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm, fontSize: theme.typography.h3.fontSize, fontWeight: '800', color: theme.colors.ink },
  itemRow: { minHeight: 82, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.sm, marginBottom: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  thumbnail: { width: 62, height: 62, borderRadius: theme.radii.md },
  itemInfo: { flex: 1, marginHorizontal: theme.spacing.sm },
  itemName: { color: theme.colors.ink, fontWeight: '700' },
  itemQty: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  itemPrice: { color: theme.colors.ink, fontWeight: '800' },
  addressCard: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  addressText: { flex: 1, color: theme.colors.ink, marginLeft: theme.spacing.sm },
  timelineCard: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  timelineRow: { minHeight: 62, flexDirection: 'row' },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  timelineDotComplete: { backgroundColor: theme.colors.primary.DEFAULT },
  timelineLine: { width: 2, flex: 1, backgroundColor: theme.colors.border },
  timelineLineComplete: { backgroundColor: theme.colors.primary.DEFAULT },
  timelineCopy: { flex: 1, paddingLeft: theme.spacing.sm },
  timelineLabel: { color: theme.colors.muted, fontWeight: '700' },
  timelineLabelComplete: { color: theme.colors.ink },
  timelineMeta: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: 2 },
  totalCard: { marginTop: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  totalLabel: { color: theme.colors.muted },
  totalValue: { color: theme.colors.ink },
  grandTotalLabel: { color: theme.colors.ink, fontWeight: '800' },
  grandTotal: { color: theme.colors.ink, fontWeight: '800', fontSize: theme.typography.h3.fontSize },
  loading: { padding: theme.spacing.lg, color: theme.colors.muted },
});
