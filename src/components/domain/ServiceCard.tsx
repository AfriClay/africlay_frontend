import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CatalogImage } from '../ui/CatalogImage';
import { theme } from '../../theme';
import { RatingBadge } from '../ui/RatingBadge';
import { Service } from '../../types/product';

interface ServiceCardProps {
  service: Service;
  onPress: () => void;
  marketplace?: boolean;
  grid?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress, marketplace = false, grid = false }) => (
  <Pressable style={({ pressed }) => [styles.root, grid && { width: '100%', marginRight: 0 }, marketplace && styles.marketplaceRoot, pressed && { opacity: 0.9 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Book ${service.title}`}>
    <CatalogImage uri={service.images[0]} label={service.title} style={styles.image} />
    <View style={styles.content}>
      <Text style={[styles.name, marketplace && styles.marketplaceName]}>{service.title}</Text>
      <Text style={styles.price}>{`From KSh ${service.priceFrom.toLocaleString()}`}</Text>
      <RatingBadge rating={service.rating} reviewCount={service.reviewCount} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  marketplaceRoot: { borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, elevation: 0, shadowOpacity: 0 },
  marketplaceName: { ...theme.typography.marketplace.label, fontWeight: 'normal' },
  root: {
    width: 220,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.sm,
    marginRight: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 120,
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
    color: theme.colors.secondary.dark,
    marginBottom: theme.spacing.xs,
  },
});
