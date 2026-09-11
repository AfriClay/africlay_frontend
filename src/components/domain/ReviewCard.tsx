import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Review } from '../../types/review';
import { RatingBadge } from '../ui/RatingBadge';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => (
  <View style={styles.root}>
    <View style={styles.header}>
      <Text style={styles.author}>{review.author}</Text>
      <RatingBadge rating={review.rating} />
    </View>
    <Text style={styles.text}>{review.text}</Text>
    <Text style={styles.date}>{review.date}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  author: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  text: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  date: {
    color: theme.colors.muted,
    fontSize: theme.typography.small.fontSize,
  },
});
