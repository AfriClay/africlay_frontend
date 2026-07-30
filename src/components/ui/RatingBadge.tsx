import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { theme } from '../../theme';

interface RatingBadgeProps {
  rating: number;
  reviewCount?: number;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, reviewCount }) => (
  <View style={styles.root}>
    <Star size={14} color={theme.colors.secondary.DEFAULT} />
    <Text style={styles.rating}>{rating.toFixed(1)}</Text>
    {reviewCount ? <Text style={styles.meta}> ({reviewCount})</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  meta: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.muted,
    fontSize: theme.typography.small.fontSize,
  },
});
