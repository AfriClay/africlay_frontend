import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CompositeNavigationProp, NavigationProp, RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuth } from '../../hooks/useAuth';
import { Heart, MessageCircle, Share2, ShoppingCart } from 'lucide-react-native';
import { Image } from 'expo-image';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { RootStackParamList } from '../../navigation/RootNavigator';

type ProductDetailsRoute = RouteProp<HomeStackParamList, 'ProductDetails'>;
type ProductDetailsNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'ProductDetails'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const ProductDetails: React.FC = () => {
  const route = useRoute<ProductDetailsRoute>();
  const navigation = useNavigation<ProductDetailsNavigation>();
  const { productId } = route.params;
  const { data: product } = useQuery({ queryKey: ['product', productId], queryFn: () => productService.fetchProductById(productId) });
  const { data: seller } = useQuery({ queryKey: ['seller', product?.sellerId], queryFn: () => product?.sellerId ? productService.fetchSeller(product.sellerId) : Promise.resolve(undefined), enabled: Boolean(product) });
  const cart = useCart();
  const wishlist = useWishlist();
  const auth = useAuth();
  const [authSheetVisible, setAuthSheetVisible] = useState(false);

  const isWishlisted = product ? wishlist.has(product.id) : false;

  const handleAddToCart = () => {
    if (product) {
      cart.addItem({ id: product.id, productId: product.id, name: product.name, quantity: 1, price: product.price, sellerId: product.sellerId, thumbnailUrl: product.images[0] });
    }
  };

  const buyNow = () => {
    if (auth.isGuest) {
      setAuthSheetVisible(true);
      return;
    }
    if (product) {
      cart.addItem({ id: product.id, productId: product.id, name: product.name, quantity: 1, price: product.price, sellerId: product.sellerId, thumbnailUrl: product.images[0] });
      navigation.navigate('Checkout');
    }
  };

  const toggleWishlist = () => {
    if (!product) return;
    if (auth.isGuest) {
      setAuthSheetVisible(true);
      return;
    }
    wishlist.toggle(product.id);
  };

  const chatSeller = () => {
    if (auth.isGuest) {
      setAuthSheetVisible(true);
      return;
    }
    const tabNavigation = navigation.getParent() as NavigationProp<{
      Messages: { screen: 'ConversationThread'; params: { conversationId: string; name: string } };
    }>;
    tabNavigation.navigate('Messages', {
      screen: 'ConversationThread',
      params: { conversationId: 'conv-zuri', name: seller?.name ?? 'Seller' },
    });
  };

  if (!product) {
    return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.images[0] }} style={styles.image} contentFit="cover" />
          <View style={styles.iconRow}>
            <Pressable onPress={toggleWishlist} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Toggle wishlist">
              <Heart color={isWishlisted ? theme.colors.secondary.DEFAULT : theme.colors.white} fill={isWishlisted ? theme.colors.secondary.DEFAULT : 'transparent'} size={22} />
            </Pressable>
            <Pressable onPress={() => {}} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Share product"><Share2 color={theme.colors.white} size={22} /></Pressable>
          </View>
        </View>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        <RatingBadge rating={product.rating} reviewCount={product.reviewCount} />
        <Pressable style={styles.sellerCard} onPress={() => seller && navigation.navigate('SellerStore', { sellerId: seller.id })} accessibilityRole="button">
          <View>
            <Text style={styles.sellerName}>{seller?.name}</Text>
            <Text style={styles.sellerMeta}>{seller?.location}</Text>
          </View>
          <Text style={styles.sellerLink}>View Store</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={styles.meta}>Delivery estimate: {product.deliveryEstimate}</Text>
      </ScrollView>
      <View style={styles.actions}> 
        <Pressable style={styles.chatButton} onPress={chatSeller} accessibilityRole="button">
          <MessageCircle color={theme.colors.primary.DEFAULT} size={20} />
          <Text style={styles.chatLabel}>Chat Seller</Text>
        </Pressable>
        <View style={styles.buttonRow}>
          <Pressable style={styles.outlineButton} onPress={handleAddToCart} accessibilityRole="button">
            <ShoppingCart color={theme.colors.primary.DEFAULT} size={20} />
            <Text style={styles.outlineText}>Add to Cart</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={buyNow} accessibilityRole="button"><Text style={styles.primaryText}>Buy Now</Text></Pressable>
        </View>
      </View>
      <GuestAuthSheet visible={authSheetVisible} onClose={() => setAuthSheetVisible(false)} description="Register or log in to save items, message sellers, and complete your purchase." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  imageContainer: {
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  image: {
    width: '100%',
    height: 300,
  },
  iconRow: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: theme.radii.pill,
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  price: {
    color: theme.colors.secondary.DEFAULT,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  sellerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sellerName: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  sellerMeta: {
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  sellerLink: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  description: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
  },
  meta: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.xl,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  chatLabel: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outlineButton: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    flexDirection: 'row',
  },
  outlineText: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  loading: {
    color: theme.colors.muted,
    padding: theme.spacing.lg,
  },
});
