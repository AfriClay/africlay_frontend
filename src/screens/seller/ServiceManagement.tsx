import React, { useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/ErrorState';
import { getApiErrorMessage } from '../../services/api';
import { serviceService, ServiceDraft } from '../../services/serviceService';
import { Service } from '../../types/product';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';

const draftFor = (service?: Service): ServiceDraft => ({
  name: service?.title ?? '', slug: service?.slug ?? '', description: service?.description ?? '',
  price: service?.priceFrom ?? 0, currency: service?.currency ?? 'KES',
  duration_minutes: service?.durationMinutes ?? 60, category: service?.categoryId ?? null,
  tags: service?.tagIds ?? [], status: service?.status ?? 'draft',
});

export const ServiceManagement: React.FC = () => {
  const client = useQueryClient();
  const userId = useAuth().user?.id ?? '';
  const managedKey = ['managed-services', userId] as const;
  const servicesQuery = useQuery({ queryKey: managedKey, queryFn: serviceService.managed, enabled: Boolean(userId) });
  const categoriesQuery = useQuery({ queryKey: ['service-categories'], queryFn: serviceService.categories });
  const [editing, setEditing] = useState<Service | 'new'>();
  const [draft, setDraft] = useState<ServiceDraft>(draftFor());
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [deleteId, setDeleteId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const open = (service: Service | 'new') => {
    setEditing(service);
    setDraft(draftFor(service === 'new' ? undefined : service));
    setImages([]);
    setError(undefined);
  };
  const pickImages = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!picked.canceled) setImages(picked.assets);
  };
  const save = async () => {
    if (busy) return;
    if (!draft.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) ||
      !Number.isFinite(draft.price) || draft.price < 0 || !Number.isInteger(draft.duration_minutes) || draft.duration_minutes < 1) {
      setError('Enter a name, a lowercase hyphenated slug, a valid price, and a positive duration.');
      return;
    }
    setBusy(true);
    setError(undefined);
    let saved: Service | undefined;
    try {
      saved = editing === 'new' ? await serviceService.create(draft) : await serviceService.update((editing as Service).id, draft);
      setEditing(saved);
      if (images.length) await serviceService.uploadImages(saved.id, images);
      await client.invalidateQueries({ queryKey: managedKey });
      await client.invalidateQueries({ queryKey: ['services'] });
      setEditing(undefined);
    } catch (cause) {
      if (saved) await client.invalidateQueries({ queryKey: managedKey });
      setError(saved ? `Service saved, but image upload failed: ${getApiErrorMessage(cause, 'Try the upload again.')}` :
        getApiErrorMessage(cause, 'Unable to save service.'));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await serviceService.remove(id);
      await client.invalidateQueries({ queryKey: managedKey });
      await client.invalidateQueries({ queryKey: ['services'] });
      setDeleteId(undefined);
    } catch (cause) { setError(getApiErrorMessage(cause, 'Unable to delete service.')); }
    finally { setBusy(false); }
  };

  if (servicesQuery.isError || categoriesQuery.isError) return <ErrorState message="Unable to load your services." onRetry={() => { void servicesQuery.refetch(); void categoriesQuery.refetch(); }} />;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    {editing ? <View>
      <Text style={styles.heading}>{editing === 'new' ? 'Add service' : 'Edit service'}</Text>
      <Input label="Name" value={draft.name} onChangeText={name => setDraft(value => ({ ...value, name }))} />
      <Input label="Slug" value={draft.slug} onChangeText={slug => setDraft(value => ({ ...value, slug }))} autoCapitalize="none" />
      <Input label="Description" value={draft.description} onChangeText={description => setDraft(value => ({ ...value, description }))} />
      <Input label="Price (KES)" value={String(draft.price)} onChangeText={price => setDraft(value => ({ ...value, price: Number(price) }))} keyboardType="decimal-pad" />
      <Input label="Duration (minutes)" value={String(draft.duration_minutes)} onChangeText={minutes => setDraft(value => ({ ...value, duration_minutes: Number(minutes) }))} keyboardType="number-pad" />
      <Text style={styles.label}>Category</Text>
      <View style={styles.options}><Pressable onPress={() => setDraft(value => ({ ...value, category: null }))} accessibilityRole="radio" accessibilityState={{ selected: !draft.category }}><Text style={styles.option}>None</Text></Pressable>
        {(categoriesQuery.data ?? []).map(category => <Pressable key={category.id} onPress={() => setDraft(value => ({ ...value, category: category.id }))} accessibilityRole="radio" accessibilityState={{ selected: draft.category === category.id }}><Text style={styles.option}>{category.name}</Text></Pressable>)}</View>
      <Text style={styles.label}>Status</Text>
      <View style={styles.options}>{(['draft', 'published', 'archived'] as const).map(status => <Pressable key={status} onPress={() => setDraft(value => ({ ...value, status }))} accessibilityRole="radio" accessibilityState={{ selected: draft.status === status }}><Text style={styles.option}>{status}</Text></Pressable>)}</View>
      <Button variant="outline" onPress={() => void pickImages()}>{images.length ? `${images.length} images selected` : 'Select images'}</Button>
      <Button onPress={() => void save()} loading={busy}>Save service</Button>
      <Button variant="outline" onPress={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
    </View> : <View>
      <Button onPress={() => open('new')}>Add service</Button>
      {servicesQuery.isLoading && <Text style={styles.note}>Loading services...</Text>}
      {!servicesQuery.isLoading && !servicesQuery.data?.length && <Text style={styles.note}>No services yet.</Text>}
      {servicesQuery.data?.map(service => <View key={service.id} style={styles.row}>
        <View style={styles.rowText}><Text style={styles.name}>{service.title}</Text><Text style={styles.note}>{service.status}</Text></View>
        <Pressable onPress={() => open(service)} accessibilityRole="button" accessibilityLabel={`Edit ${service.title}`}><Text style={styles.link}>Edit</Text></Pressable>
        {deleteId === service.id ? <>
          <Pressable onPress={() => void remove(service.id)} disabled={busy} accessibilityRole="button"><Text style={styles.error}>Confirm delete</Text></Pressable>
          <Pressable onPress={() => setDeleteId(undefined)} accessibilityRole="button"><Text style={styles.link}>Cancel</Text></Pressable>
        </> : <Pressable onPress={() => setDeleteId(service.id)} accessibilityRole="button" accessibilityLabel={`Delete ${service.title}`}><Text style={styles.error}>Delete</Text></Pressable>}
      </View>)}
    </View>}
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  heading: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.md },
  label: { color: theme.colors.ink, fontWeight: '700', marginTop: theme.spacing.md },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
  option: { color: theme.colors.primary.DEFAULT, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.white, marginTop: theme.spacing.sm },
  rowText: { flex: 1 }, name: { color: theme.colors.ink, fontWeight: '700' },
  note: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  link: { color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  error: { color: theme.colors.error, marginVertical: theme.spacing.sm },
});
