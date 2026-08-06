import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BadgeCheck, ClipboardList, PackagePlus, Pencil, WalletCards } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { OrderCard } from '../../components/domain/OrderCard';
import { StatCard } from '../../components/domain/StatCard';
import { useAuth } from '../../hooks/useAuth';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { theme } from '../../theme';

type DashboardNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'DashboardHome'>;

const actions = [
  { label: 'Manage Products', route: 'ProductManagement' as const, icon: Pencil },
  { label: 'Add New Product', route: 'AddEditProduct' as const, icon: PackagePlus },
  { label: 'View Orders', route: 'SellerOrders' as const, icon: ClipboardList },
  { label: 'Wallet & Earnings', route: 'PaymentMethodsWallet' as const, icon: WalletCards },
];

export const DashboardHome: React.FC = () => {
  const navigation = useNavigation<DashboardNavigation>();
  const auth = useAuth();
  const sellerId = auth.user?.id ?? '';
  const { data: products = [] } = useQuery({ queryKey: ['seller-products', sellerId], queryFn: () => productService.initializeSellerCatalog(sellerId), enabled: Boolean(sellerId) });
  const { data: orders = [] } = useQuery({ queryKey: ['seller-orders', sellerId], queryFn: () => orderService.initializeSellerOrders(sellerId), enabled: Boolean(sellerId) });
  const pendingCount = orders.filter(order => order.status === 'New').length;
  const reviewCount = products.reduce((total, product) => total + product.reviewCount, 0);
  const rating = useMemo(() => {
    if (!reviewCount) return undefined;
    return products.reduce((total, product) => total + product.rating * product.reviewCount, 0) / reviewCount;
  }, [products, reviewCount]);
  const recentOrders = orders.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.storeHeader}>
          {auth.storefront?.logoUrl ? <Image source={{ uri: auth.storefront.logoUrl }} style={styles.logo} /> : <View style={styles.logoFallback}><Text style={styles.logoInitial}>{auth.storefront?.name?.[0] ?? 'A'}</Text></View>}
          <View style={styles.storeCopy}>
            <Text style={styles.eyebrow}>MY STORE</Text>
            <Text style={styles.storeName}>{auth.storefront?.name ?? "Wanjiku's Corner"}</Text>
            <View style={styles.verified}><BadgeCheck color={theme.colors.success} size={16} /><Text style={styles.verifiedText}>Verified Seller</Text></View>
          </View>
        </View>

        <View style={styles.stats}>
          <StatCard value={String(products.length)} label="Products" />
          <StatCard value={String(pendingCount)} label="Pending Orders" />
          <StatCard value={rating ? rating.toFixed(1) : 'No ratings yet'} label={rating ? `${reviewCount} reviews` : 'Store rating'} />
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionGrid}>
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <Pressable key={action.label} style={styles.action} onPress={() => navigation.navigate(action.route as any)} accessibilityRole="button">
                <View style={styles.actionIcon}><Icon color={theme.colors.primary.DEFAULT} size={23} /></View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Text style={styles.link} onPress={() => navigation.navigate('SellerOrders')}>View all</Text>
        </View>
        {recentOrders.length
          ? recentOrders.map(order => <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })} />)
          : <Text style={styles.empty}>Incoming customer orders will appear here.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  storeHeader: { minHeight: 116, padding: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.primary.dark, flexDirection: 'row', alignItems: 'center', ...theme.shadows.md },
  logo: { width: 76, height: 76, borderRadius: 38 },
  logoFallback: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' },
  logoInitial: { color: theme.colors.primary.dark, fontSize: 30, fontWeight: '800' },
  storeCopy: { flex: 1, marginLeft: theme.spacing.md },
  eyebrow: { color: theme.colors.secondary.DEFAULT, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  storeName: { color: theme.colors.white, fontSize: theme.typography.h2.fontSize, fontWeight: '800', marginTop: theme.spacing.xs },
  verified: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: 3, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white },
  verifiedText: { color: theme.colors.primary.dark, fontSize: theme.typography.small.fontSize, fontWeight: '700', marginLeft: theme.spacing.xs },
  stats: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing.sm },
  action: { width: '48.5%', minHeight: 112, padding: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, justifyContent: 'center', ...theme.shadows.sm },
  actionIcon: { width: 42, height: 42, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.tint, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: theme.colors.ink, fontWeight: '700', marginTop: theme.spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  empty: { color: theme.colors.muted, padding: theme.spacing.lg, borderRadius: theme.radii.md, backgroundColor: theme.colors.white, textAlign: 'center' },
});
