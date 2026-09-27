import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { CatalogImage } from '../../components/ui/CatalogImage';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { catalogKeys } from '../../services/catalogQueries';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

export const Wishlist: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'Wishlist'>>();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const [removeError, setRemoveError] = useState<string>();
  const products = useQuery({ queryKey: catalogKeys.products, queryFn: () => productService.fetchProducts(), enabled: Boolean(user && wishlist.items.length) });
  if (!user) return <EmptyState title="Sign in to view your wishlist" description="Saved products are linked to your account." />;
  if (wishlist.error) return <ErrorState message="Unable to load your wishlist." onRetry={() => void wishlist.refresh()} />;
  const productsById = new Map((products.data ?? []).map(product => [product.id, product]));

  const removeItem = async (productId: string) => {
    setRemoveError(undefined);
    try {
      await wishlist.toggle(productId);
    } catch {
      setRemoveError('Unable to remove that item. Please try again.');
    }
  };

  return <SafeAreaView style={styles.container} edges={['bottom']}>
    <FlatList
      data={wishlist.items}
      refreshing={wishlist.isFetching}
      onRefresh={() => void wishlist.refresh()}
      keyExtractor={item => item.id}
      contentContainerStyle={wishlist.items.length ? styles.list : styles.empty}
      ListHeaderComponent={removeError
        ? <Text accessibilityRole="alert" style={styles.error}>{removeError}</Text>
        : null}
      ListEmptyComponent={wishlist.isLoading
        ? <Text style={styles.loading}>Loading saved products...</Text>
        : <EmptyState title="Your wishlist is empty" description="Use the heart on a product to save it here." />}
      renderItem={({ item }) => {
        const product = productsById.get(item.productId);
        const productIdentifier = item.productSlug.trim() || product?.slug;
        const removing = wishlist.pendingProductId === item.productId;
        return <View style={styles.item}>
          <Pressable
            style={({ pressed }) => [styles.productLink, pressed && styles.pressed]}
            onPress={() => productIdentifier && navigation.navigate('ProductDetails', { productId: productIdentifier })}
            disabled={!productIdentifier}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.productName}`}
            accessibilityState={{ disabled: !productIdentifier }}
          >
            <CatalogImage uri={product?.images?.[0]} label={item.productName} style={styles.image} />
            <View style={styles.copy}><Text style={styles.name} numberOfLines={2}>{item.productName}</Text><Text style={styles.price}>{formatCurrency(item.productPrice, product?.currency ?? 'KES')}</Text></View>
          </Pressable>
          <Pressable
            onPress={() => void removeItem(item.productId)}
            disabled={removing}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.productName} from wishlist`}
            accessibilityState={{ busy: removing, disabled: removing }}
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            {removing
              ? <ActivityIndicator size="small" color={theme.colors.error} />
              : <Trash2 size={20} color={theme.colors.error} />}
          </Pressable>
        </View>;
      }}
    />
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  list: { padding: theme.spacing.lg },
  empty: { flexGrow: 1 },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 104, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, marginBottom: theme.spacing.md, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  productLink: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  image: { width: 84, height: 84, borderRadius: theme.radii.md },
  copy: { flex: 1, minWidth: 0, marginHorizontal: theme.spacing.md },
  name: { color: theme.colors.ink, fontWeight: '800' },
  price: { color: theme.colors.secondary.dark, fontWeight: '800', marginTop: theme.spacing.xs },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
});
