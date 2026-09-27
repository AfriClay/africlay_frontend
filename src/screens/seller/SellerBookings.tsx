import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingCard } from '../../components/domain/BookingCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { bookingKeys, bookingService } from '../../services/bookingService';
import { BookingStatus } from '../../types/booking';
import { theme } from '../../theme';

const actionsFor = (status: BookingStatus): Array<{ label: string; status: BookingStatus }> => {
  if (status === 'pending') return [{ label: 'Confirm', status: 'confirmed' }, { label: 'Cancel', status: 'cancelled' }];
  if (status === 'confirmed') return [{ label: 'Complete', status: 'completed' }, { label: 'Cancel', status: 'cancelled' }];
  return [];
};

export const SellerBookings = () => {
  const userId = useAuth().user?.id ?? '';
  const client = useQueryClient();
  const key = bookingKeys.seller(userId);
  const query = useQuery({ queryKey: key, queryFn: bookingService.listForSeller, enabled: Boolean(userId), refetchOnMount: 'always' });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => bookingService.updateStatus(id, status), onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  if (query.isError || update.isError) return <ErrorState message="Unable to update service bookings." onRetry={() => { update.reset(); void query.refetch(); }} />;
  return <SafeAreaView style={styles.container} edges={['bottom']}><FlatList
    data={query.data ?? []}
    refreshing={query.isFetching}
    onRefresh={() => void query.refetch()}
    keyExtractor={item => item.id}
    contentContainerStyle={(query.data?.length ?? 0) ? styles.list : styles.empty}
    ListEmptyComponent={query.isLoading ? <Text style={styles.loading}>Loading bookings...</Text> : <EmptyState title="No service bookings" description="Customer bookings will appear here." />}
    renderItem={({ item }) => <BookingCard booking={item} pending={update.isPending && update.variables?.id === item.id} actions={actionsFor(item.status).map(action => ({ ...action, onPress: () => void update.mutateAsync({ id: item.id, status: action.status }) }))} />}
  /></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  list: { padding: theme.spacing.lg },
  empty: { flexGrow: 1 },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
