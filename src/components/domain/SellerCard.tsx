import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Seller } from '../../types/seller';
import { RatingBadge } from '../ui/RatingBadge';

interface SellerCardProps {
  seller: Seller;
  onPress: () => void;
}

export const SellerCard: React.FC<SellerCardProps> = ({ seller, onPress }) => (
  <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${seller.name} store`}>
    <View>
      <Text style={styles.name}>{seller.name}</Text>
      <Text style={styles.location}>{seller.location}</Text>
    </View>
    <RatingBadge rating={seller.rating} reviewCount={seller.reviewCount} />
  </Pressable>
);

const styles = StyleSheet.create({
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
