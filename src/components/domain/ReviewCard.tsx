import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { theme } from '../../theme';
import { Review } from '../../types/review';
import { RatingBadge } from '../ui/RatingBadge';
import { Button } from '../ui/Button';

interface ReviewCardProps {
  review: Review;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onEdit, onDelete, deleting }) => (
  <View style={styles.root}>
    <View style={styles.header}>
      <Text style={styles.author}>{review.reviewerEmail}</Text>
      <RatingBadge rating={review.rating} />
    </View>
    {review.comment ? <Text style={styles.text}>{review.comment}</Text> : null}
    <View style={styles.footer}>
      <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      {(onEdit || onDelete) && <View style={styles.actions}>
        {onEdit && <Button variant="icon" size="sm" onPress={onEdit} accessibilityLabel="Edit review" icon={<Pencil size={17} color={theme.colors.primary.DEFAULT} />} />}
        {onDelete && <Button variant="icon" size="sm" onPress={onDelete} disabled={deleting} accessibilityLabel="Delete review" icon={<Trash2 size={17} color={theme.colors.error} />} />}
      </View>}
    </View>
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
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: theme.spacing.xs },
});
