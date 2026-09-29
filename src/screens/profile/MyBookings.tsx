import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingCard } from '../../components/domain/BookingCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { bookingKeys, bookingService } from '../../services/bookingService';
import { theme } from '../../theme';

export const MyBookings = () => {
  const { user } = useAuth();
  const client = useQueryClient();
  const userId = user?.id ?? '';
  const key = bookingKeys.customer(userId);
  const query = useQuery({ queryKey: key, queryFn: bookingService.list, enabled: Boolean(userId), refetchOnMount: 'always' });
  const cancel = useMutation({ mutationFn: bookingService.cancel, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  if (!user) return <EmptyState title="Sign in to view bookings" description="Your service bookings are linked to your account." />;
  if (query.isError || cancel.isError) return <ErrorState message="Unable to update your bookings." onRetry={() => { cancel.reset(); void query.refetch(); }} />;
  return <SafeAreaView style={styles.container} edges={['bottom']}><FlatList
    data={query.data ?? []}
    refreshing={query.isFetching}
    onRefresh={() => void query.refetch()}
    keyExtractor={item => item.id}
    contentContainerStyle={(query.data?.length ?? 0) ? styles.list : styles.empty}
    ListEmptyComponent={query.isLoading ? <Text style={styles.loading}>Loading bookings...</Text> : <EmptyState title="No bookings yet" description="Bookings made from service details will appear here." />}
    renderItem={({ item }) => <BookingCard booking={item} pending={cancel.isPending && cancel.variables === item.id} actions={['pending', 'confirmed'].includes(item.status) ? [{ label: 'Cancel booking', status: 'cancelled', onPress: () => void cancel.mutateAsync(item.id) }] : []} />}
  /></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  list: { padding: theme.spacing.lg },
  empty: { flexGrow: 1 },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
