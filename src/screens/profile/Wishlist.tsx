import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { ProductCard } from '../../components/domain/ProductCard';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

export const Wishlist: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => productService.fetchProducts() });
  // For demo, assume wishlist contains first two products
  const wishlist = products.slice(0, 2);
  const [authSheet, setAuthSheet] = React.useState(false);

  if (auth.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <BottomSheet visible={authSheet} onClose={() => setAuthSheet(false)} title="Create a free account to continue" description="Register or log in to save items to your wishlist." actionLabel="Create Account" onAction={() => { setAuthSheet(false); navigation.navigate('Register'); }} />
        <View style={{ padding: theme.spacing.lg }}>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyText}>Create an account to save items to your wishlist.</Text>
          <Button onPress={() => setAuthSheet(true)}>Create Account</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!wishlist.length) return (
    <SafeAreaView style={styles.container}>{isLoading ? (
      <View>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ height: 220, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md }} />
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
        <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />
      )} contentContainerStyle={styles.list} columnWrapperStyle={styles.column} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: theme.spacing.lg },
  emptyTitle: { fontSize: theme.typography.h3.fontSize, fontWeight: '700', color: theme.colors.ink, textAlign: 'center', marginTop: 80 },
  emptyText: { color: theme.colors.muted, textAlign: 'center', marginTop: theme.spacing.md },
  list: { paddingBottom: theme.spacing.xl },
  column: { justifyContent: 'space-between' },
});
