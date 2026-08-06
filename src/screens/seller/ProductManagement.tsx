import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, Pencil, Trash2 } from 'lucide-react-native';
import { ProductCard } from '../../components/domain/ProductCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';
import { theme } from '../../theme';

type ProductNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'ProductManagement'>;
const LOW_STOCK_THRESHOLD = 5;

export const ProductManagement: React.FC = () => {
  const navigation = useNavigation<ProductNavigation>();
  const auth = useAuth();
  const sellerId = auth.user?.id ?? '';
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['seller-products', sellerId], queryFn: () => productService.initializeSellerCatalog(sellerId), enabled: Boolean(sellerId) });

  const confirmDelete = (product: Product) => {
    Alert.alert('Delete product?', `${product.name} will be removed from your store.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await productService.deleteSellerProduct(sellerId, product.id);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['seller-products', sellerId] }),
            queryClient.invalidateQueries({ queryKey: ['products'] }),
          ]);
        },
      },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const lowStock = item.availableQuantity < LOW_STOCK_THRESHOLD;
    return (
      <View style={styles.row}>
        <ProductCard product={item} layout="compact" onPress={() => navigation.navigate('AddEditProduct', { productId: item.id })} />
        <View style={styles.metaRow}>
          <Text style={[styles.stock, lowStock ? styles.lowStock : null]}>{item.availableQuantity} in stock{lowStock ? ' · Low stock' : ''}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => navigation.navigate('AddEditProduct', { productId: item.id })} style={styles.action} accessibilityRole="button"><Pencil color={theme.colors.primary.DEFAULT} size={17} /><Text style={styles.edit}>Edit</Text></Pressable>
            <Pressable onPress={() => confirmDelete(item)} style={styles.action} accessibilityRole="button"><Trash2 color={theme.colors.error} size={17} /><Text style={styles.delete}>Delete</Text></Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.summary}>{products.length} listed product{products.length === 1 ? '' : 's'}</Text>
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
  stock: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize },
  lowStock: { color: theme.colors.error, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  action: { minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.xs },
  edit: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginLeft: theme.spacing.xs },
  delete: { color: theme.colors.error, fontWeight: '700', marginLeft: theme.spacing.xs },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
  empty: { flex: 1, justifyContent: 'center' },
});
