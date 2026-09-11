import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../theme';
import { RatingBadge } from '../ui/RatingBadge';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatCurrency';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  layout?: 'horizontal' | 'grid' | 'compact';
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onPress, layout = 'horizontal' }) => (
  <Pressable style={[styles.root, layout === 'grid' ? styles.gridRoot : null, layout === 'compact' ? styles.compactRoot : null]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${product.name}`}>
    <Image source={{ uri: product.images[0] }} style={[styles.image, layout === 'compact' ? styles.compactImage : null]} contentFit="cover" />
    <View style={[styles.content, layout === 'compact' ? styles.compactContent : null]}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>{formatCurrency(product.price)}</Text>
      <RatingBadge rating={product.rating} reviewCount={product.reviewCount} />
    </View>
  </Pressable>
));

const styles = StyleSheet.create({
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
    color: theme.colors.secondary.DEFAULT,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
});
