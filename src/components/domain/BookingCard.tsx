import { StyleSheet, Text, View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { Booking, BookingStatus } from '../../types/booking';
import { theme } from '../../theme';
import { Button } from '../ui/Button';

const statusColors: Record<BookingStatus, string> = {
  pending: theme.colors.secondary.tint,
  confirmed: theme.colors.primary.tint,
  cancelled: theme.colors.border,
  completed: theme.colors.success,
};

export const BookingCard = ({ booking, actions = [], pending }: {
  booking: Booking;
  actions?: Array<{ label: string; status?: BookingStatus; onPress: () => void }>;
  pending?: boolean;
}) => <View style={styles.root}>
  <View style={styles.header}>
    <CalendarClock size={21} color={theme.colors.primary.DEFAULT} />
    <View style={styles.copy}><Text style={styles.title}>{booking.serviceName}</Text><Text style={styles.date}>{new Date(booking.scheduledAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</Text></View>
    <View style={[styles.status, { backgroundColor: statusColors[booking.status] }]}><Text style={[styles.statusText, booking.status === 'completed' && styles.completedText]}>{booking.status}</Text></View>
  </View>
  {booking.notes ? <Text style={styles.notes}>{booking.notes}</Text> : null}
  {actions.length > 0 && <View style={styles.actions}>{actions.map(action => <Button key={action.label} size="sm" variant={action.status === 'cancelled' ? 'outline' : 'primary'} disabled={pending} onPress={action.onPress}>{action.label}</Button>)}</View>}
</View>;

const styles = StyleSheet.create({
  root: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  title: { color: theme.colors.ink, fontWeight: '800' },
  date: { color: theme.colors.muted, marginTop: 3, fontSize: theme.typography.small.fontSize },
  status: { borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  statusText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, fontWeight: '700', textTransform: 'capitalize' },
  completedText: { color: theme.colors.white },
  notes: { color: theme.colors.muted, marginTop: theme.spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.md },
});
