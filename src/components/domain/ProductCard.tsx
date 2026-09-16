import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useWishlist } from '../../hooks/useWishlist';
import { CatalogImage } from '../ui/CatalogImage';
import { theme } from '../../theme';
import { RatingBadge } from '../ui/RatingBadge';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatCurrency';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';

interface ProductCardProps {
  product: Product;
  marketplace?: boolean;
  onPress: () => void;
  layout?: 'horizontal' | 'grid' | 'compact';
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onPress, layout = 'horizontal', marketplace = false }) => {
  const wishlist = useWishlist();
  const { isExpanded } = useResponsiveLayout();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
  <View style={[styles.root, marketplace && styles.marketplaceRoot, layout === 'grid' ? styles.gridRoot : null, layout === 'compact' ? styles.compactRoot : null]}>
  <Pressable onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={({ pressed }) => [{ width: '100%' }, layout === 'compact' && { flexDirection: 'row' }, (focused || hovered) && { backgroundColor: theme.colors.primary.tint }, pressed && { opacity: 0.9 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${product.name}`}>
    <CatalogImage uri={product.images[0]} label={product.name} style={[styles.image, isExpanded && layout === 'grid' && { height: undefined, aspectRatio: 1.2 }, layout === 'compact' ? styles.compactImage : null]} />
    <View style={[styles.content, layout === 'compact' ? styles.compactContent : null]}>
      <Text numberOfLines={marketplace ? 2 : undefined} style={[styles.name, marketplace && styles.marketplaceName]}>{product.name}</Text>
      <Text style={[styles.price, marketplace && styles.marketplacePrice]}>{formatCurrency(product.price)}</Text>
      <RatingBadge rating={product.rating} reviewCount={product.reviewCount} />
    </View>
  </Pressable>
    {marketplace && <Pressable accessibilityRole="button" accessibilityLabel={`${wishlist.has(product.id) ? 'Remove from' : 'Add to'} wishlist: ${product.name}`} accessibilityState={{ selected: wishlist.has(product.id) }} onPress={() => wishlist.toggle(product.id)} style={({ pressed }) => [styles.favorite, pressed && { transform: [{ scale: 0.92 }] }]}><Heart size={19} strokeWidth={1.8} color={theme.colors.primary.dark} fill={wishlist.has(product.id) ? theme.colors.primary.tint : 'none'} /></Pressable>}
  </View>
);
});

const styles = StyleSheet.create({
  marketplaceRoot: { borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, elevation: 0, shadowOpacity: 0 },
  marketplaceName: { ...theme.typography.marketplace.body, fontWeight: 'normal', minHeight: 40 },
  marketplacePrice: { ...theme.typography.marketplace.heading, color: theme.colors.primary.dark, fontWeight: 'normal' },
  favorite: { position: 'absolute', right: theme.spacing.xs, top: theme.spacing.xs, width: 44, height: 44, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' },
  root: {
    width: 168,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
    marginRight: theme.spacing.md,
  },
  gridRoot: {
    width: '100%',
    marginRight: 0,
  },
  compactRoot: {
    width: '100%',
    minHeight: 96,
    marginRight: 0,
    flexDirection: 'row',
  },
  image: {
    width: '100%',
    height: 140,
  },
  compactImage: {
    width: 96,
    height: 96,
  },
  content: {
    padding: theme.spacing.md,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  price: {
    color: theme.colors.secondary.dark,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
});
