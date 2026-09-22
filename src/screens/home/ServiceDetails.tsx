import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { CatalogImage } from '../../components/ui/CatalogImage';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { recordId } from '../../services/catalogContract';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { serviceService } from '../../services/serviceService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

export const ServiceDetails: React.FC = () => {
  const { params } = useRoute<RouteProp<HomeStackParamList, 'ServiceDetails'>>();
  const slug = recordId(params?.serviceId);
  const query = useQuery({ queryKey: ['service', slug], queryFn: () => serviceService.detail(slug), enabled: Boolean(slug) });
  if (query.isError) return <ErrorState message="Unable to load this service." onRetry={() => void query.refetch()} />;
  if (query.isLoading) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading service...</Text></SafeAreaView>;
  if (!query.data) return <EmptyState title="Service not found" description="This service is unavailable. Go back to browse other services." />;
  const service = query.data;
  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <CatalogImage uri={service.images[0]} label={service.title} style={styles.image} />
      <Text style={styles.title}>{service.title}</Text>
      <Text style={styles.price}>From {formatCurrency(service.priceFrom, service.currency)}</Text>
      <Text style={styles.description}>{service.durationMinutes} minutes</Text>
      <Text style={styles.sectionTitle}>About this service</Text>
      <Text style={styles.description}>{service.description}</Text>
      <Text style={styles.unavailable}>Online booking is not available yet.</Text>
    </ScrollView>
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
  unavailable: { color: theme.colors.muted, marginTop: theme.spacing.xl },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
