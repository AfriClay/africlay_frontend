import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productService } from '../../services/productService';
import { Seller } from '../../types/seller';
import { Product } from '../../types/product';
import { theme } from '../../theme';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { ProductCard } from '../../components/domain/ProductCard';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { Image } from 'expo-image';
import { BadgeCheck, MapPin } from 'lucide-react-native';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { recordId } from '../../services/catalogContract';
import { catalogKeys } from '../../services/catalogQueries';
import { serviceService } from '../../services/serviceService';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../hooks/useAuth';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { ServiceCard } from '../../components/domain/ServiceCard';
import { getApiErrorMessage } from '../../services/api';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';

const tabs = ['Shop', 'Services', 'About'] as const;

export const SellerStore: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'SellerStore'>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'SellerStore'>>();
  const sellerId = recordId(route.params?.sellerId);
  const auth = useAuth();
  const { isExpanded, productColumns } = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Shop');
  const [authSheet, setAuthSheet] = useState(false);
  const [messageError, setMessageError] = useState<string>();
  const [creatingConversation, setCreatingConversation] = useState(false);
  useEffect(() => setActiveTab('Shop'), [sellerId]);
  const sellerQuery = useQuery<Seller | null>({ queryKey: catalogKeys.seller(sellerId), queryFn: () => productService.fetchSeller(sellerId), enabled: Boolean(sellerId) });
  const { data: seller, isLoading: sellerLoading } = sellerQuery;
  const productsQuery = useQuery<Product[]>({ queryKey: catalogKeys.storeProducts(sellerId), queryFn: () => productService.fetchProductsBySeller(sellerId), enabled: Boolean(seller) });
  const { data: products = [], isLoading: productsLoading } = productsQuery;
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: serviceService.list, enabled: activeTab === 'Services' });
  const services = (servicesQuery.data ?? []).filter(service => service.providerId === seller?.id);

  const messageSeller = async () => {
    if (!seller?.ownerId) { setMessageError('Seller contact is unavailable.'); return; }
    if (!auth.user) { setAuthSheet(true); return; }
    if (creatingConversation) return;
    setCreatingConversation(true);
    setMessageError(undefined);
    try {
      const conversation = await messageService.createConversation({ seller_id: seller.ownerId, store_id: seller.id }, auth.user.id);
      (navigation.getParent() as any)?.navigate('Messages', { screen: 'ConversationThread', params: { conversationId: conversation.id, name: conversation.name } });
    } catch (cause) { setMessageError(getApiErrorMessage(cause, 'Unable to start conversation.')); }
    finally { setCreatingConversation(false); }
  };

  if (sellerQuery.isError) return <ErrorState message="Unable to load this seller." onRetry={() => void sellerQuery.refetch()} />;

  if (sellerLoading) {
    return <View style={styles.loading}><Text>Loading seller...</Text></View>;
  }

  if (!seller) {
    return <EmptyState title="Seller not found" description="This store is unavailable. Go back to browse another seller." />;
  }

  const columns = isExpanded ? Math.min(productColumns, 6) : 2;
  const serviceColumns = isExpanded ? 2 : 1;
  const storeHeader = <>
    {seller.bannerUrl ? <Image source={{ uri: seller.bannerUrl }} style={[styles.banner, isExpanded && styles.desktopBanner]} contentFit="cover" /> : null}
    <View style={styles.header}>
      <View style={styles.storeIdentity}><View style={styles.logo}>{seller.logoUrl ? <Image source={{ uri: seller.logoUrl }} style={styles.logoImage} contentFit="cover" /> : <Text style={styles.logoText}>{seller.name.slice(0, 2).toUpperCase()}</Text>}</View><View style={styles.storeCopy}><Text style={styles.name}>{seller.name}</Text><View style={styles.metaRow}><MapPin color={theme.colors.muted} size={14} /><Text style={styles.meta}>{seller.location}</Text></View></View></View>
      <View style={styles.badgeRow}>
        {seller.reviewCount > 0 && <RatingBadge rating={seller.rating} reviewCount={seller.reviewCount} />}
        {seller.verified ? <View style={styles.verifiedRow}><BadgeCheck color={theme.colors.success} size={16} /><Text style={styles.verified}>Verified Seller</Text></View> : null}
      </View>
      {seller.ownerId && auth.user?.id !== seller.ownerId && <Pressable onPress={() => void messageSeller()} disabled={creatingConversation} accessibilityRole="button" style={styles.followButton}><Text style={styles.followText}>{creatingConversation ? 'Opening...' : 'Message seller'}</Text></Pressable>}
      {messageError && <Text style={styles.messageError} accessibilityRole="alert">{messageError}</Text>}
    </View>
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab ? styles.tabActive : null]} accessibilityRole="tab" accessibilityLabel={tab} accessibilityState={{ selected: activeTab === tab }}>
          <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>{tab}</Text>
        </Pressable>
      ))}
    </View>
  </>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {activeTab === 'Shop' ? <FlatList
        key={`${sellerId}-shop-${columns}`}
        ListHeaderComponent={storeHeader}
        ListEmptyComponent={productsLoading
          ? <View style={styles.skeletonGrid}>{Array.from({ length: columns }).map((_, index) => <View key={index} style={[styles.skeletonWrapper, { width: `${100 / columns}%` }]}><View style={styles.productSkeleton} /></View>)}</View>
          : productsQuery.isError
            ? <ErrorState message="Unable to load this store section." onRetry={() => void productsQuery.refetch()} />
            : <EmptyState title="No products listed" description="This seller has no products available." />}
        data={productsLoading || productsQuery.isError ? [] : products}
        keyExtractor={item => item.id}
        numColumns={columns}
        renderItem={({ item }) => (
          <View style={[styles.cardWrapper, { width: `${100 / columns}%` }]}>
            <ProductCard layout="grid" product={item} onPress={() => item.slug && navigation.navigate('ProductDetails', { productId: item.slug })} />
          </View>
        )}
        contentContainerStyle={styles.page}
        columnWrapperStyle={columns > 1 ? styles.column : undefined}
      /> : activeTab === 'Services' ? <FlatList
        key={`${sellerId}-services-${serviceColumns}`}
        ListHeaderComponent={storeHeader}
        data={servicesQuery.isLoading || servicesQuery.isError ? [] : services}
        numColumns={serviceColumns}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <View style={[styles.serviceWrapper, { width: `${100 / serviceColumns}%` }]}><ServiceCard service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.slug ?? item.id })} /></View>}
        ListEmptyComponent={servicesQuery.isError
          ? <ErrorState message="Unable to load this store's services." onRetry={() => void servicesQuery.refetch()} />
          : servicesQuery.isLoading ? <Text style={styles.loadingText}>Loading services...</Text>
            : <EmptyState title="No services listed" description="This store has no published services." />}
        contentContainerStyle={styles.page}
        columnWrapperStyle={serviceColumns > 1 ? styles.column : undefined}
      /> : <ScrollView contentContainerStyle={styles.page}>{storeHeader}<View style={styles.content}><Text style={styles.description}>{seller.bio || 'No store description available.'}</Text></View></ScrollView>}
      <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Log in to message this seller." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: theme.spacing.lg,
  },
  page: { paddingBottom: theme.spacing.xl },
  banner: { width: '100%', height: 150 },
  desktopBanner: { height: 188 },
  storeIdentity: { flexDirection: 'row', alignItems: 'center' },
  storeCopy: { flex: 1, marginLeft: theme.spacing.sm },
  logo: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.ink, borderWidth: 3, borderColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', marginTop: -34 },
  logoImage: { width: '100%', height: '100%', borderRadius: 29 },
  logoText: { color: theme.colors.white, fontSize: 11, fontWeight: '800' },
  followButton: { minHeight: 40, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  followText: { color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  messageError: { color: theme.colors.error, marginTop: theme.spacing.sm },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.muted,
    marginLeft: theme.spacing.xs,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  verifiedRow: { flexDirection: 'row', alignItems: 'center' },
  verified: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.success,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  tabTextActive: {
    color: theme.colors.ink,
  },
  content: {
    padding: theme.spacing.lg,
  },
  description: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
  column: {
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.md,
  },
  cardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  serviceWrapper: { flexGrow: 0, flexShrink: 0, padding: theme.spacing.sm },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md },
  skeletonWrapper: { paddingHorizontal: theme.spacing.xs },
  loadingText: { color: theme.colors.muted, padding: theme.spacing.lg },
  serviceSkeleton: {
    height: 210,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.border,
  },
  productSkeleton: { width: '100%', height: 260, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
  reviewSkeleton: { height: 88, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
});
