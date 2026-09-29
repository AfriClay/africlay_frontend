import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { reviewKeys, reviewService, ReviewTarget } from '../../services/reviewService';
import { theme } from '../../theme';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { GuestAuthSheet } from '../ui/GuestAuthSheet';
import { ReviewCard } from './ReviewCard';

export const ReviewSection = ({ target }: { target: ReviewTarget }) => {
  const { user } = useAuth();
  const client = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [authSheet, setAuthSheet] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const query = useQuery({ queryKey: reviewKeys.target(target), queryFn: () => reviewService.list(target), enabled: Boolean(target.id) });
  const ownReview = query.data?.find(review => review.reviewerEmail.toLowerCase() === user?.email?.toLowerCase());
  const average = useMemo(() => query.data?.length ? query.data.reduce((sum, item) => sum + item.rating, 0) / query.data.length : 0, [query.data]);
  const save = useMutation({
    mutationFn: () => editingId ? reviewService.update(editingId, rating, comment.trim()) : reviewService.create(target, rating, comment.trim()),
    onSuccess: async () => {
      setComment(''); setRating(5); setEditingId(undefined); setComposing(false); setActionError(undefined);
      await client.invalidateQueries({ queryKey: reviewKeys.target(target) });
    },
    onError: error => setActionError(getApiErrorMessage(error, 'Unable to save your review.')),
  });
  const remove = useMutation({
    mutationFn: reviewService.remove,
    onSuccess: async () => { setEditingId(undefined); setComment(''); await client.invalidateQueries({ queryKey: reviewKeys.target(target) }); },
    onError: error => setActionError(getApiErrorMessage(error, 'Unable to delete your review.')),
  });

  useEffect(() => { setEditingId(undefined); setComposing(false); setComment(''); setRating(5); setActionError(undefined); }, [target.id, target.type]);

  const startReview = () => {
    if (!user) { setAuthSheet(true); return; }
    if (ownReview) { setEditingId(ownReview.id); setRating(ownReview.rating); setComment(ownReview.comment); }
    else setComposing(true);
  };

  return <View style={styles.root}>
    <View style={styles.headingRow}>
      <View><Text style={styles.title}>Reviews</Text><Text style={styles.summary}>{query.data?.length ? `${average.toFixed(1)} from ${query.data.length} review${query.data.length === 1 ? '' : 's'}` : 'No reviews yet'}</Text></View>
      {!ownReview && <Button size="sm" variant="outline" onPress={startReview}>Write a review</Button>}
    </View>
    {actionError && <Text style={styles.error} accessibilityRole="alert">{actionError}</Text>}
    {query.isError ? <ErrorState message="Unable to load reviews." onRetry={() => void query.refetch()} /> : query.isLoading ? <Text style={styles.muted}>Loading reviews...</Text> : null}
    {(user && (composing || editingId)) && <View style={styles.form}>
      <Text style={styles.label}>{editingId ? 'Edit your review' : 'Your rating'}</Text>
      <View style={styles.stars}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} onPress={() => setRating(value)} accessibilityRole="button" accessibilityLabel={`${value} star rating`}><Star size={26} color={theme.colors.secondary.dark} fill={value <= rating ? theme.colors.secondary.DEFAULT : 'transparent'} /></Pressable>)}</View>
      <TextInput value={comment} onChangeText={setComment} placeholder="Share your experience" placeholderTextColor={theme.colors.muted} multiline style={styles.comment} accessibilityLabel="Review comment" />
      <View style={styles.formActions}>
        <Button size="sm" variant="ghost" onPress={() => { setEditingId(undefined); setComposing(false); setComment(''); setActionError(undefined); }}>Cancel</Button>
        <Button size="sm" onPress={() => void save.mutateAsync()} loading={save.isPending}>{editingId ? 'Save review' : 'Post review'}</Button>
      </View>
    </View>}
    {ownReview && !editingId && <ReviewCard review={ownReview} onEdit={startReview} onDelete={() => void remove.mutateAsync(ownReview.id)} deleting={remove.isPending} />}
    {(query.data ?? []).filter(review => review.id !== ownReview?.id).map(review => <ReviewCard key={review.id} review={review} />)}
    <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Log in to review products, services, and stores." />
  </View>;
};

const styles = StyleSheet.create({
  root: { marginTop: theme.spacing.xl },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  summary: { color: theme.colors.muted, marginTop: 2 },
  muted: { color: theme.colors.muted, paddingVertical: theme.spacing.md },
  form: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  label: { color: theme.colors.ink, fontWeight: '700', marginBottom: theme.spacing.sm },
  stars: { flexDirection: 'row', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  comment: { minHeight: 96, textAlignVertical: 'top', color: theme.colors.ink, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, padding: theme.spacing.md },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  error: { color: theme.colors.error, marginTop: theme.spacing.sm },
});
