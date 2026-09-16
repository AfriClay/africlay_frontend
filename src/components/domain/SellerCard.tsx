import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Seller } from '../../types/seller';
import { RatingBadge } from '../ui/RatingBadge';

interface SellerCardProps {
  seller: Seller;
  onPress: () => void;
  marketplace?: boolean;
}

export const SellerCard: React.FC<SellerCardProps> = ({ seller, onPress, marketplace = false }) => (
  <Pressable style={({ pressed }) => [styles.root, marketplace && styles.marketplaceRoot, pressed && { opacity: 0.9 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${seller.name} store`}>
    <View>
      <Text style={[styles.name, marketplace && styles.marketplaceName]}>{seller.name}</Text>
      <Text style={styles.location}>{seller.location}</Text>
    </View>
    <RatingBadge rating={seller.rating} reviewCount={seller.reviewCount} />
  </Pressable>
);

const styles = StyleSheet.create({
  marketplaceRoot: { borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, elevation: 0, shadowOpacity: 0 },
  marketplaceName: { ...theme.typography.marketplace.label, fontWeight: 'normal' },
  root: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  name: {
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
  location: {
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.small.fontSize,
  },
});
