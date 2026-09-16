import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CatalogImage } from '../../components/ui/CatalogImage';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { recordId } from '../../services/catalogContract';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { RatingBadge } from '../../components/ui/RatingBadge';
import { useAuth } from '../../hooks/useAuth';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

type ServiceRoute = RouteProp<HomeStackParamList, 'ServiceDetails'>;
type ServiceNavigation = NativeStackNavigationProp<HomeStackParamList, 'ServiceDetails'>;

export const ServiceDetails: React.FC = () => {
  const { params } = useRoute<ServiceRoute>();
  const navigation = useNavigation<ServiceNavigation>();
  const auth = useAuth();
  const [bookingVisible, setBookingVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const serviceId = recordId(params?.serviceId);
  const serviceQuery = useQuery({ queryKey: ['service', serviceId], queryFn: () => productService.fetchServiceById(serviceId), enabled: Boolean(serviceId) });
  const { data: service, isLoading } = serviceQuery;
  if (serviceQuery.isError) return <ErrorState message="Unable to load this service." onRetry={() => void serviceQuery.refetch()} />;
  if (!isLoading && !service) return <EmptyState title="Service not found" description="This service is unavailable. Go back to browse other services." />;

  if (isLoading || !service) {
    return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading service…</Text></SafeAreaView>;
  }

  const startBooking = () => {
    if (auth.isGuest) setAuthVisible(true);
    else setBookingVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <CatalogImage uri={service.images[0]} label={service.title} style={styles.image} />
        <Text style={styles.title}>{service.title}</Text>
        <Text style={styles.price}>From {formatCurrency(service.priceFrom)}</Text>
        <RatingBadge rating={service.rating} reviewCount={service.reviewCount} />
        <View style={styles.trustRow}>
          <ShieldCheck color={theme.colors.primary.DEFAULT} size={22} />
          <Text style={styles.trustText}>Verified provider · Secure in-app booking</Text>
        </View>
        <Text style={styles.sectionTitle}>About this service</Text>
        <Text style={styles.description}>{service.description}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.outlineButton} onPress={startBooking} accessibilityRole="button">
            <MessageCircle color={theme.colors.primary.DEFAULT} size={20} />
            <Text style={styles.outlineLabel}>Message</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={startBooking} accessibilityRole="button">
            <CalendarDays color={theme.colors.white} size={20} />
            <Text style={styles.primaryLabel}>Request Booking</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomSheet visible={bookingVisible} onClose={() => setBookingVisible(false)} title="Booking request ready" description="Your provider will confirm availability and the final price in Messages." actionLabel="Continue to Messages" onAction={() => { setBookingVisible(false); navigation.getParent()?.navigate('Messages'); }} />
      <GuestAuthSheet visible={authVisible} onClose={() => setAuthVisible(false)} description="Register or log in to message providers and request a booking." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  image: { width: '100%', height: 260, borderRadius: theme.radii.lg, marginBottom: theme.spacing.lg },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', marginBottom: theme.spacing.xs },
  price: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.sm },
  trustRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.md, marginVertical: theme.spacing.lg },
  trustText: { flex: 1, color: theme.colors.primary.dark, marginLeft: theme.spacing.sm, fontWeight: '600' },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.sm },
  description: { color: theme.colors.muted, fontSize: theme.typography.body.fontSize, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl },
  outlineButton: { flex: 1, minHeight: 52, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  outlineLabel: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginLeft: theme.spacing.xs },
  primaryButton: { flex: 1.35, minHeight: 52, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primaryLabel: { color: theme.colors.white, fontWeight: '700', marginLeft: theme.spacing.xs },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
