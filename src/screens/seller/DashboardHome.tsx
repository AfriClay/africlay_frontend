import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BriefcaseBusiness, PackagePlus, Pencil } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '../../components/domain/StatCard';
import { useAuth } from '../../hooks/useAuth';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { catalogKeys } from '../../services/catalogQueries';
import { ErrorState } from '../../components/ui/ErrorState';

type DashboardNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'DashboardHome'>;

const actions = [
  { label: 'Manage Products', route: 'ProductManagement' as const, icon: Pencil },
  { label: 'Add New Product', route: 'AddEditProduct' as const, icon: PackagePlus },
  { label: 'Manage Services', route: 'ServiceManagement' as const, icon: BriefcaseBusiness },
];

export const DashboardHome: React.FC = () => {
  const { isWide } = useResponsiveLayout();
  const navigation = useNavigation<DashboardNavigation>();
  const auth = useAuth();
  const sellerId = auth.user?.id ?? '';
  const productsQuery = useQuery({ queryKey: catalogKeys.ownedProducts(sellerId), queryFn: productService.fetchSellerProducts, enabled: Boolean(sellerId) });
  const { data: products = [] } = productsQuery;
  const storeQuery = useQuery({ queryKey: ['owned-store', sellerId], queryFn: () => productService.fetchOwnStore(sellerId), enabled: Boolean(sellerId) });
  const store = storeQuery.data;
  const reviewCount = store?.reviewCount ?? 0;
  const rating = reviewCount ? store?.rating : undefined;

  if (productsQuery.isError || storeQuery.isError) return <ErrorState message="Unable to load your store." onRetry={() => { void productsQuery.refetch(); void storeQuery.refetch(); }} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.storeHeader}>
          {store?.logoUrl ? <Image source={{ uri: store.logoUrl }} style={styles.logo} /> : <View style={styles.logoFallback}><Text style={styles.logoInitial}>{store?.name?.[0] ?? 'A'}</Text></View>}
          <View style={styles.storeCopy}>
            <Text style={styles.eyebrow}>MY STORE</Text>
            <Text style={styles.storeName}>{store?.name ?? (storeQuery.isLoading ? 'Loading store...' : 'Store unavailable')}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <StatCard value={String(products.length)} label="Products" />
          <StatCard value={rating ? rating.toFixed(1) : 'No ratings yet'} label={rating ? `${reviewCount} reviews` : 'Store rating'} />
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionGrid}>
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <Pressable key={action.label} style={[styles.action, isWide && { width: '23.5%' }]} onPress={() => navigation.navigate(action.route as any)} accessibilityRole="button">
                <View style={styles.actionIcon}><Icon color={theme.colors.primary.DEFAULT} size={23} /></View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>

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
