import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CatalogImage } from '../../components/ui/CatalogImage';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { recordId } from '../../services/catalogContract';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { serviceService } from '../../services/serviceService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { ReviewSection } from '../../components/domain/ReviewSection';
import { useAuth } from '../../hooks/useAuth';
import { bookingKeys, bookingService } from '../../services/bookingService';
import { getApiErrorMessage } from '../../services/api';

export const ServiceDetails: React.FC = () => {
  const { user } = useAuth();
  const client = useQueryClient();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [authSheet, setAuthSheet] = useState(false);
  const { params } = useRoute<RouteProp<HomeStackParamList, 'ServiceDetails'>>();
  const slug = recordId(params?.serviceId);
  const query = useQuery({ queryKey: ['service', slug], queryFn: () => serviceService.detail(slug), enabled: Boolean(slug) });
  const booking = useMutation({ mutationFn: ({ serviceId, scheduledAt }: { serviceId: string; scheduledAt: string }) => bookingService.create(serviceId, scheduledAt, notes.trim()) });
  if (query.isError) return <ErrorState message="Unable to load this service." onRetry={() => void query.refetch()} />;
  if (query.isLoading) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading service...</Text></SafeAreaView>;
  if (!query.data) return <EmptyState title="Service not found" description="This service is unavailable. Go back to browse other services." />;
  const service = query.data;
  const book = async () => {
    if (!user) { setAuthSheet(true); return; }
    setSuccess(false); setFormError(undefined);
    const scheduled = new Date(`${date}T${time}:00`);
    if (!date || !time || Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      setFormError('Choose a valid future date and time.'); return;
    }
    try {
      await booking.mutateAsync({ serviceId: service.id, scheduledAt: scheduled.toISOString() });
      await client.invalidateQueries({ queryKey: bookingKeys.customer(user.id) });
      setDate(''); setTime(''); setNotes(''); setSuccess(true);
    } catch (error) { setFormError(getApiErrorMessage(error, 'Unable to create this booking.')); }
  };
  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <CatalogImage uri={service.images[0]} label={service.title} style={styles.image} />
      <Text style={styles.title}>{service.title}</Text>
      <Text style={styles.price}>From {formatCurrency(service.priceFrom, service.currency)}</Text>
      <Text style={styles.description}>{service.durationMinutes} minutes</Text>
      <Text style={styles.sectionTitle}>About this service</Text>
      <Text style={styles.description}>{service.description}</Text>
      <View style={styles.bookingCard}>
        <Text style={styles.sectionTitle}>Book this service</Text>
        <View style={styles.dateRow}><View style={styles.dateField}><Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" accessibilityLabel="Booking date" /></View><View style={styles.dateField}><Input label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" accessibilityLabel="Booking time" /></View></View>
        <Text style={styles.notesLabel}>Notes (optional)</Text>
        <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Tell the provider anything they should know" placeholderTextColor={theme.colors.muted} style={styles.notes} accessibilityLabel="Booking notes" />
        {formError && <Text style={styles.error} accessibilityRole="alert">{formError}</Text>}
        {success && <Text style={styles.success} accessibilityRole="alert">Booking requested. You can track it from My Bookings.</Text>}
        <Button onPress={() => void book()} loading={booking.isPending}>Request booking</Button>
      </View>
      <ReviewSection target={{ type: 'service', id: service.id }} />
    </ScrollView>
    <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Log in to book this service." />
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  image: { width: '100%', height: 260, borderRadius: theme.radii.lg, marginBottom: theme.spacing.lg },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', marginBottom: theme.spacing.xs },
  price: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.sm },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  description: { color: theme.colors.muted, fontSize: theme.typography.body.fontSize, lineHeight: 24 },
  bookingCard: { marginTop: theme.spacing.xl, padding: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  dateRow: { flexDirection: 'row', gap: theme.spacing.sm },
  dateField: { flex: 1, minWidth: 0 },
  notesLabel: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, fontWeight: '600', marginBottom: theme.spacing.xs },
  notes: { minHeight: 90, textAlignVertical: 'top', color: theme.colors.ink, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
  success: { color: theme.colors.success, fontWeight: '700', marginBottom: theme.spacing.md },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
