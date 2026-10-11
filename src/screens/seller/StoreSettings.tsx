import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { DispatchTownPicker } from '../../components/domain/DispatchTownPicker';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { catalogKeys } from '../../services/catalogQueries';
import { getApiErrorMessage } from '../../services/api';
import { productService } from '../../services/productService';
import { shippingService } from '../../services/shippingService';
import { theme } from '../../theme';

export const StoreSettings: React.FC = () => {
  const userId = useAuth().user?.id ?? '';
  const client = useQueryClient();
  const storeKey = ['owned-store', userId] as const;
  const storeQuery = useQuery({ queryKey: storeKey, queryFn: () => productService.fetchOwnStore(userId), enabled: Boolean(userId) });
  const townsQuery = useQuery({ queryKey: ['shipping-towns'], queryFn: shippingService.supportedTowns });
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (storeQuery.data?.city) setCity(storeQuery.data.city);
  }, [storeQuery.data?.city]);

  const save = async () => {
    const store = storeQuery.data;
    if (!store?.slug || !city || saving) return;
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      await productService.updateStore(store.slug, { city });
      await Promise.all([
        client.invalidateQueries({ queryKey: storeKey }),
        client.invalidateQueries({ queryKey: catalogKeys.sellers }),
      ]);
      setSaved(true);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save the dispatch town.'));
    } finally {
      setSaving(false);
    }
  };

  if (storeQuery.isError) return <ErrorState message="Unable to load your store settings." onRetry={() => void storeQuery.refetch()} />;

  return <SafeAreaView style={styles.container} edges={['bottom']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.icon}><MapPin color={theme.colors.primary.DEFAULT} size={28} /></View>
      <Text style={styles.title}>Dispatch location</Text>
      <Text style={styles.copy}>Choose the town where delivery partners collect your parcels. This is separate from your personal delivery addresses.</Text>
      <View style={styles.storeRow}>
        <Text style={styles.storeLabel}>Store</Text>
        <Text style={styles.storeName}>{storeQuery.data?.name ?? 'Loading...'}</Text>
      </View>
      <DispatchTownPicker
        towns={townsQuery.data ?? []}
        value={city}
        onChange={value => { setCity(value); setSaved(false); setError(undefined); }}
        loading={townsQuery.isLoading}
        error={townsQuery.isError}
        onRetry={() => void townsQuery.refetch()}
        disabled={saving}
      />
      {saved ? <Text style={styles.success} accessibilityRole="alert">Dispatch town updated. Buyers can now receive delivery quotes from this store.</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <Button onPress={() => void save()} loading={saving} disabled={!storeQuery.data?.slug || !city || townsQuery.isLoading || townsQuery.isError}>Save Dispatch Town</Button>
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.tint },
  title: { marginTop: theme.spacing.md, color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  copy: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg, color: theme.colors.muted, lineHeight: 22 },
  storeRow: { marginBottom: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  storeLabel: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize },
  storeName: { marginTop: theme.spacing.xs, color: theme.colors.ink, fontWeight: '800' },
  success: { marginBottom: theme.spacing.md, color: theme.colors.success, lineHeight: 20 },
  error: { marginBottom: theme.spacing.md, color: theme.colors.error, lineHeight: 20 },
});
