import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { OrderCard } from '../../components/domain/OrderCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { orderService } from '../../services/orderService';
import { theme } from '../../theme';

type OrderTab = 'Active' | 'Delivered' | 'Cancelled';
type OrdersNavigation = NativeStackNavigationProp<ProfileStackParamList, 'MyOrders'>;
const tabs: OrderTab[] = ['Active', 'Delivered', 'Cancelled'];

export const MyOrders: React.FC = () => {
  const navigation = useNavigation<OrdersNavigation>();
  const [activeTab, setActiveTab] = useState<OrderTab>('Active');
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: orderService.fetchOrders });

  const filteredOrders = useMemo(() => orders.filter(order => {
    if (activeTab === 'Active') return order.status === 'Processing' || order.status === 'Shipped';
    return order.status === activeTab;
  }), [activeTab, orders]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        {tabs.map(tab => (
          <Pressable key={tab} style={[styles.tab, tab === activeTab ? styles.activeTab : null]} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: tab === activeTab }}>
            <Text style={[styles.tabLabel, tab === activeTab ? styles.activeTabLabel : null]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 3 }).map((_, index) => <View key={index} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <OrderCard order={item} onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })} />}
          ListEmptyComponent={<EmptyState title={`No ${activeTab.toLowerCase()} orders`} description="Your orders will appear here as their status changes." />}
          contentContainerStyle={filteredOrders.length ? styles.list : styles.emptyList}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  tabs: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.colors.primary.DEFAULT },
  tabLabel: { color: theme.colors.muted, fontWeight: '600' },
  activeTabLabel: { color: theme.colors.primary.DEFAULT, fontWeight: '800' },
  list: { padding: theme.spacing.lg },
  emptyList: { flexGrow: 1, padding: theme.spacing.lg },
  skeleton: { height: 118, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
});
