import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PackagePlus, Pencil } from 'lucide-react-native';
import { ProductCard } from '../../components/domain/ProductCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { productService } from '../../services/productService';
import { catalogKeys } from '../../services/catalogQueries';
import { ErrorState } from '../../components/ui/ErrorState';
import { Product } from '../../types/product';
import { theme } from '../../theme';
import { getApiErrorMessage } from '../../services/api';

type ProductNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'ProductManagement'>;
const LOW_STOCK_THRESHOLD = 5;

export const ProductManagement: React.FC = () => {
  const navigation = useNavigation<ProductNavigation>();
  const auth = useAuth();
  const sellerId = auth.user?.id ?? '';
  const productsQuery = useQuery({ queryKey: catalogKeys.ownedProducts(sellerId), queryFn: productService.fetchSellerProducts, enabled: Boolean(sellerId) });
  const { data: products = [], isLoading } = productsQuery;

  if (productsQuery.isError) return <ErrorState message={getApiErrorMessage(productsQuery.error, 'Unable to load your products.')} onRetry={() => void productsQuery.refetch()} />;

  const renderProduct = ({ item }: { item: Product }) => {
    const lowStock = item.availableQuantity < LOW_STOCK_THRESHOLD;
    const published = item.status === 'published';
    const archived = item.status === 'archived';
    return (
      <View style={styles.row}>
        <ProductCard product={item} layout="compact" onPress={() => navigation.navigate('AddEditProduct', { productId: item.id })} />
        <View style={styles.metaRow}>
          <View style={styles.listingMeta}>
            <View style={[styles.statusBadge, published ? styles.statusPublished : archived ? styles.statusArchived : styles.statusDraft]}>
              <Text style={[styles.statusText, published ? styles.statusPublishedText : archived ? styles.statusArchivedText : styles.statusDraftText]}>{item.status}</Text>
            </View>
          <Text style={[styles.stock, lowStock ? styles.lowStock : null]}>{item.availableQuantity} in stock{lowStock ? ' · Low stock' : ''}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={() => navigation.navigate('AddEditProduct', { productId: item.id })} style={styles.action} accessibilityRole="button"><Pencil color={theme.colors.primary.DEFAULT} size={17} /><Text style={styles.edit}>Edit</Text></Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.summary}>{products.length} product{products.length === 1 ? '' : 's'}</Text>
        <Pressable style={styles.addIcon} onPress={() => navigation.navigate('AddEditProduct')} accessibilityRole="button"><PackagePlus color={theme.colors.white} size={21} /></Pressable>
      </View>
      {isLoading ? <Text style={styles.loading}>Loading products…</Text> : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          contentContainerStyle={products.length ? styles.list : styles.emptyList}
          ListEmptyComponent={<View style={styles.empty}><EmptyState title="You haven't listed anything yet" description="Add your first product to start selling on AfriClay." /><Button onPress={() => navigation.navigate('AddEditProduct')}>Add Your First Product</Button></View>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  header: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { color: theme.colors.muted },
  addIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.DEFAULT },
  list: { padding: theme.spacing.lg, paddingTop: 0, paddingBottom: theme.spacing.xxl },
  emptyList: { flexGrow: 1, padding: theme.spacing.lg },
  row: { padding: theme.spacing.sm, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.sm },
  listingMeta: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm },
  statusBadge: { minHeight: 28, paddingHorizontal: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.sm, borderWidth: 1 },
  statusPublished: { backgroundColor: theme.colors.primary.tint, borderColor: theme.colors.primary.DEFAULT },
  statusDraft: { backgroundColor: theme.colors.secondary.tint, borderColor: theme.colors.secondary.DEFAULT },
  statusArchived: { backgroundColor: theme.colors.white, borderColor: theme.colors.muted },
  statusText: { fontSize: theme.typography.small.fontSize, fontWeight: '700', textTransform: 'capitalize' },
  statusPublishedText: { color: theme.colors.primary.dark },
  statusDraftText: { color: theme.colors.secondary.dark },
  statusArchivedText: { color: theme.colors.muted },
  stock: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize },
  lowStock: { color: theme.colors.error, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  action: { minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.xs },
  edit: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginLeft: theme.spacing.xs },
  delete: { color: theme.colors.error, fontWeight: '700', marginLeft: theme.spacing.xs },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
  empty: { flex: 1, justifyContent: 'center' },
});
