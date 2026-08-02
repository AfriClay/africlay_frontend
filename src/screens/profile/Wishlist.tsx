import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { ProductCard } from '../../components/domain/ProductCard';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { useWishlist } from '../../hooks/useWishlist';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

export const Wishlist: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'Wishlist'>>();
  const auth = useAuth();
  const savedItems = useWishlist();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => productService.fetchProducts() });
  const wishlist = products.filter(product => savedItems.has(product.id));
  const [authSheet, setAuthSheet] = React.useState(false);

  if (auth.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Register or log in to save items to your wishlist." />
        <View style={styles.guestContent}>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyText}>Create an account to save items to your wishlist.</Text>
          <Button onPress={() => setAuthSheet(true)}>Create Account</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !wishlist.length) return (
    <SafeAreaView style={styles.container}>{isLoading ? (
      <View>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skeleton} />
        ))}
      </View>
    ) : (
      <View>
        <Text style={styles.emptyTitle}>Nothing saved yet</Text>
        <Text style={styles.emptyText}>Tap the heart on any product to add it here</Text>
      </View>
    )}</SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={wishlist} keyExtractor={item => item.id} numColumns={2} renderItem={({ item }) => (
        <View style={styles.cardWrapper}><ProductCard layout="grid" product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} /></View>
      )} contentContainerStyle={styles.list} columnWrapperStyle={styles.column} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: theme.spacing.lg },
  guestContent: { padding: theme.spacing.lg },
  emptyTitle: { fontSize: theme.typography.h3.fontSize, fontWeight: '700', color: theme.colors.ink, textAlign: 'center', marginTop: 80 },
  emptyText: { color: theme.colors.muted, textAlign: 'center', marginTop: theme.spacing.md },
  list: { paddingBottom: theme.spacing.xl },
  column: { justifyContent: 'space-between' },
  cardWrapper: { flex: 1, maxWidth: '48%', marginBottom: theme.spacing.md },
  skeleton: { height: 220, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md },
});
