import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../theme';
import { RatingBadge } from '../ui/RatingBadge';
import { Product } from '../../types/product';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => (
  <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${product.name}`}>
    <Image source={{ uri: product.images[0] }} style={styles.image} contentFit="cover" />
    <View style={styles.content}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>{`KSh ${product.price.toLocaleString()}`}</Text>
      <RatingBadge rating={product.rating} reviewCount={product.reviewCount} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    width: 180,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
    marginRight: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: theme.spacing.md,
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
