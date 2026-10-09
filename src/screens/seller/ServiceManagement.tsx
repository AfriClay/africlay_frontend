import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/ErrorState';
import { TagPicker } from '../../components/domain/TagPicker';
import { getApiErrorMessage } from '../../services/api';
import { catalogKeys } from '../../services/catalogQueries';
import { productService } from '../../services/productService';
import { serviceService, type ServiceDraft } from '../../services/serviceService';
import type { Service } from '../../types/product';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { slugifyProductName } from '../../utils/productIdentifiers';

type ServiceStatus = ServiceDraft['status'];

const serviceStatuses: Array<{ value: ServiceStatus; label: string; summary: string }> = [
  { value: 'draft', label: 'Draft', summary: 'Only visible to you' },
  { value: 'published', label: 'Published', summary: 'Visible in the marketplace' },
  { value: 'archived', label: 'Archived', summary: 'Hidden from the marketplace' },
];

const identifierSeed = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const serviceSlug = (name: string, seed: string) => {
  const base = slugifyProductName(name) || 'service';
  const suffix = seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8) || 'service';
  return `${base}-${suffix}`.slice(0, 200);
};

const draftFor = (service?: Service): ServiceDraft => ({
  name: service?.title ?? '',
  slug: service?.slug ?? '',
  description: service?.description ?? '',
  price: service?.priceFrom ?? 0,
  currency: service?.currency ?? 'KES',
  duration_minutes: service?.durationMinutes ?? 60,
  booking_buffer_minutes: service?.bookingBufferMinutes ?? 0,
  category: service?.categoryId ?? null,
  tags: service?.tagIds ?? [],
  status: service?.status ?? 'published',
});

export const ServiceManagement: React.FC = () => {
  const client = useQueryClient();
  const userId = useAuth().user?.id ?? '';
  const managedKey = ['managed-services', userId] as const;
  const servicesQuery = useQuery({ queryKey: managedKey, queryFn: serviceService.managed, enabled: Boolean(userId) });
  const categoriesQuery = useQuery({ queryKey: ['service-categories'], queryFn: serviceService.categories });
  const tagsQuery = useQuery({ queryKey: catalogKeys.tags, queryFn: productService.fetchTags });
  const [editing, setEditing] = useState<Service | 'new'>();
  const [draft, setDraft] = useState<ServiceDraft>(draftFor());
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [deleteId, setDeleteId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const generatedIdentifierSeed = useRef(identifierSeed());
  const savedServiceId = useRef<string | undefined>(undefined);
  const pendingUploads = useRef<ImagePicker.ImagePickerAsset[]>([]);

  const open = (service: Service | 'new') => {
    generatedIdentifierSeed.current = identifierSeed();
    savedServiceId.current = undefined;
    pendingUploads.current = [];
    setEditing(service);
    setDraft(draftFor(service === 'new' ? undefined : service));
    setExistingImages(service === 'new' ? [] : service.images);
    setImages([]);
    setError(undefined);
  };

  const closeEditor = () => {
    if (busy) return;
    setEditing(undefined);
    setImages([]);
    setError(undefined);
  };

  const pickImages = async () => {
    const remaining = 8 - existingImages.length - images.length;
    if (remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add service images.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (picked.canceled) return;
    if (picked.assets.some(asset => (asset.fileSize ?? 0) > 5 * 1024 * 1024 ||
      (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)))) {
      setError('Use JPG, PNG, or WebP images no larger than 5 MB.');
      return;
    }
    setImages(current => [...current, ...picked.assets].slice(0, 8 - existingImages.length));
    setError(undefined);
  };

  const resolvedSlug = editing === 'new'
    ? serviceSlug(draft.name, generatedIdentifierSeed.current)
    : draft.slug.trim();
  const canSave = Boolean(
    draft.name.trim() &&
    draft.name.trim().length <= 180 &&
    resolvedSlug &&
    Number.isFinite(draft.price) &&
    draft.price >= 0 &&
    Number.isInteger(draft.duration_minutes) &&
    draft.duration_minutes > 0 &&
    Number.isInteger(draft.booking_buffer_minutes) &&
    draft.booking_buffer_minutes >= 0
  );
  const validationMessage = !draft.name.trim() ? 'Enter a service name to continue.' :
    draft.name.trim().length > 180 ? 'Keep the service name within 180 characters.' :
    !Number.isFinite(draft.price) || draft.price < 0 ? 'Enter a valid price of zero or more.' :
    !Number.isInteger(draft.duration_minutes) || draft.duration_minutes < 1 ? 'Duration must be a positive number of minutes.' :
    !Number.isInteger(draft.booking_buffer_minutes) || draft.booking_buffer_minutes < 0 ? 'Booking buffer must be a whole number of zero or more.' : undefined;

  const save = async () => {
    if (!canSave || busy || !editing) return;
    setBusy(true);
    setError(undefined);
    let saved: Service | undefined;
    try {
      const requestedDraft: ServiceDraft = {
        ...draft,
        name: draft.name.trim(),
        slug: resolvedSlug,
        description: draft.description.trim(),
      };
      const existingStatus = editing === 'new' ? undefined : editing.status;
      const hasPendingUploads = pendingUploads.current.length > 0 || images.length > 0;
      const deferPublishing = requestedDraft.status === 'published' && existingStatus !== 'published' && hasPendingUploads;
      const initialDraft = deferPublishing ? { ...requestedDraft, status: 'draft' as const } : requestedDraft;
      const serviceId = savedServiceId.current ?? (editing === 'new' ? undefined : editing.id);
      saved = serviceId
        ? await serviceService.update(serviceId, initialDraft)
        : await serviceService.create(initialDraft);
      savedServiceId.current = saved.id;
      setEditing(saved);

      if (!pendingUploads.current.length) pendingUploads.current = [...images];
      while (pendingUploads.current.length) {
        const asset = pendingUploads.current[0];
        await serviceService.uploadImages(saved.id, [asset]);
        pendingUploads.current.shift();
        setImages(current => current.filter(image => image.uri !== asset.uri));
      }
      if (deferPublishing) saved = await serviceService.update(saved.id, requestedDraft);

      await Promise.all([
        client.invalidateQueries({ queryKey: managedKey }),
        client.invalidateQueries({ queryKey: ['services'] }),
        client.invalidateQueries({ queryKey: catalogKeys.storeServices(saved.providerId) }),
      ]);
      setEditing(undefined);
    } catch (cause) {
      if (saved) await client.invalidateQueries({ queryKey: managedKey });
      const fallback = saved
        ? 'The service was saved, but publication could not be completed. Try again.'
        : 'Unable to save service.';
      setError(getApiErrorMessage(cause, fallback));
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
      await Promise.all([
        client.invalidateQueries({ queryKey: managedKey }),
        client.invalidateQueries({ queryKey: ['services'] }),
      ]);
      setDeleteId(undefined);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to delete service.'));
    } finally {
      setBusy(false);
    }
  };

  if (servicesQuery.isError) {
    return <ErrorState message="Unable to load your services." onRetry={() => void servicesQuery.refetch()} />;
  }

  if (editing) {
    return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>{editing === 'new' ? 'Add service' : 'Edit service'}</Text>
      <Input label="Service name" value={draft.name} onChangeText={name => setDraft(value => ({ ...value, name }))} placeholder="What service do you offer?" />
      <Text style={styles.label}>Description</Text>
      <TextInput
        value={draft.description}
        onChangeText={description => setDraft(value => ({ ...value, description }))}
        placeholder="Describe what is included and what customers can expect"
        placeholderTextColor={theme.colors.muted}
        multiline
        style={styles.description}
      />
      <View style={styles.twoColumns}>
        <View style={styles.column}><Input label="Price (KSh)" value={String(draft.price)} onChangeText={price => setDraft(value => ({ ...value, price: Number(price.replace(/,/g, '')) }))} keyboardType="decimal-pad" /></View>
        <View style={styles.column}><Input label="Duration (min)" value={String(draft.duration_minutes)} onChangeText={minutes => setDraft(value => ({ ...value, duration_minutes: Number(minutes) }))} keyboardType="number-pad" /></View>
      </View>
      <Input label="Booking buffer (minutes)" value={String(draft.booking_buffer_minutes)} onChangeText={minutes => setDraft(value => ({ ...value, booking_buffer_minutes: Number(minutes) }))} keyboardType="number-pad" />

      <Text style={styles.label}>Category</Text>
      {categoriesQuery.isLoading ? <Text style={styles.optionMessage}>Loading categories...</Text> :
        categoriesQuery.isError ? <View style={styles.optionFailure}><Text style={styles.optionError}>Unable to load service categories.</Text><Button size="sm" variant="tertiary" onPress={() => void categoriesQuery.refetch()}>Retry</Button></View> :
          <View style={styles.options}>
            <Pressable onPress={() => setDraft(value => ({ ...value, category: null }))} style={[styles.option, !draft.category && styles.optionActive]} accessibilityRole="radio" accessibilityState={{ selected: !draft.category }}>
              <Text style={[styles.optionText, !draft.category && styles.optionTextActive]}>None</Text>
            </Pressable>
            {(categoriesQuery.data ?? []).map(category => {
              const selected = draft.category === category.id;
              return <Pressable key={category.id} onPress={() => setDraft(value => ({ ...value, category: category.id }))} style={[styles.option, selected && styles.optionActive]} accessibilityRole="radio" accessibilityState={{ selected }}>
                <Text style={[styles.optionText, selected && styles.optionTextActive]}>{category.name}</Text>
              </Pressable>;
            })}
          </View>}

      <TagPicker
        tags={tagsQuery.data ?? []}
        selectedIds={draft.tags}
        onChange={tags => setDraft(value => ({ ...value, tags }))}
        loading={tagsQuery.isLoading}
        error={tagsQuery.isError}
        onRetry={() => void tagsQuery.refetch()}
        disabled={busy}
      />

      <Text style={styles.label}>Listing status</Text>
      <View style={styles.statusOptions}>
        {serviceStatuses.filter(option => option.value !== 'archived' || editing !== 'new').map(option => {
          const selected = draft.status === option.value;
          return <Pressable
            key={option.value}
            onPress={() => setDraft(value => ({ ...value, status: option.value }))}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityLabel={`${option.label}: ${option.summary}`}
            accessibilityState={{ selected, disabled: busy }}
            style={({ pressed }) => [styles.statusOption, selected && styles.statusOptionActive, pressed && styles.optionPressed]}
          >
            <Text style={[styles.statusOptionText, selected && styles.statusOptionTextActive]}>{option.label}</Text>
          </Pressable>;
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.statusSummary}>{serviceStatuses.find(option => option.value === draft.status)?.summary}</Text>

      <Text style={styles.label}>Images ({existingImages.length + images.length}/8)</Text>
      <View style={styles.imageGrid}>
        {existingImages.length + images.length < 8 && <Pressable style={styles.addImage} onPress={() => void pickImages()} accessibilityRole="button" accessibilityLabel="Add service images">
          <ImagePlus color={theme.colors.primary.DEFAULT} size={25} />
          <Text style={styles.addImageText}>Add images</Text>
        </Pressable>}
        {existingImages.map(uri => <Image key={uri} source={{ uri }} style={styles.image} />)}
        {images.map(asset => <View key={asset.uri}>
          <Image source={{ uri: asset.uri }} style={styles.image} />
          <Button variant="icon" size="sm" style={styles.removeImage} onPress={() => {
            pendingUploads.current = pendingUploads.current.filter(image => image.uri !== asset.uri);
            setImages(current => current.filter(image => image.uri !== asset.uri));
          }} accessibilityLabel="Remove selected image" icon={<X color={theme.colors.white} size={15} />} />
        </View>)}
      </View>

      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {validationMessage && <Text style={styles.validationMessage} accessibilityLiveRegion="polite">{validationMessage}</Text>}
      <Button onPress={() => void save()} disabled={!canSave} loading={busy}>
        {editing === 'new' ? draft.status === 'published' ? 'Publish Service' : 'Save Draft' : 'Save Changes'}
      </Button>
      <Button variant="outline" onPress={closeEditor} disabled={busy}>Cancel</Button>
    </ScrollView>;
  }

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Button onPress={() => open('new')}>Add Service</Button>
    {servicesQuery.isLoading && <Text style={styles.note}>Loading services...</Text>}
    {!servicesQuery.isLoading && !servicesQuery.data?.length && <Text style={styles.note}>No services yet.</Text>}
    {servicesQuery.data?.map(service => <View key={service.id} style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.name}>{service.title}</Text>
        <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{service.status ?? 'draft'}</Text></View>
      </View>
      <View style={styles.rowActions}>
        <Button size="sm" variant="tertiary" onPress={() => open(service)} accessibilityLabel={`Edit ${service.title}`}>Edit</Button>
        {deleteId === service.id ? <>
          <Button size="sm" variant="destructive" onPress={() => void remove(service.id)} loading={busy} loadingLabel="Deleting">Confirm</Button>
          <Button size="sm" variant="tertiary" onPress={() => setDeleteId(undefined)} disabled={busy}>Keep</Button>
        </> : <Button size="sm" variant="tertiary" onPress={() => setDeleteId(service.id)} accessibilityLabel={`Delete ${service.title}`}>Delete</Button>}
      </View>
    </View>)}
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.md },
  heading: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.md },
  label: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, fontWeight: '700', marginBottom: theme.spacing.xs },
  description: { minHeight: 112, padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, color: theme.colors.ink, textAlignVertical: 'top', marginBottom: theme.spacing.md },
  twoColumns: { flexDirection: 'row', gap: theme.spacing.md },
  column: { flex: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  option: { minHeight: 42, justifyContent: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  optionActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  optionPressed: { opacity: 0.75 },
  optionText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  optionTextActive: { color: theme.colors.white, fontWeight: '700' },
  optionMessage: { color: theme.colors.muted, lineHeight: 20, marginBottom: theme.spacing.md },
  optionFailure: { alignItems: 'flex-start', marginBottom: theme.spacing.md },
  optionError: { color: theme.colors.error, lineHeight: 20 },
  statusOptions: { flexDirection: 'row', gap: theme.spacing.sm },
  statusOption: { flex: 1, minHeight: 44, paddingHorizontal: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  statusOptionActive: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  statusOptionText: { color: theme.colors.muted, fontWeight: '700', textAlign: 'center' },
  statusOptionTextActive: { color: theme.colors.primary.dark },
  statusSummary: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  image: { width: 104, height: 104, borderRadius: theme.radii.md },
  removeImage: { position: 'absolute', top: 4, right: 4, width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: 20, backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  addImage: { width: 104, height: 104, borderRadius: theme.radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  addImageText: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginTop: theme.spacing.xs, fontSize: theme.typography.small.fontSize, textAlign: 'center' },
  row: { padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, gap: theme.spacing.sm },
  rowText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: theme.spacing.xs },
  name: { flex: 1, color: theme.colors.ink, fontWeight: '700', fontSize: theme.typography.body.fontSize },
  statusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary.tint },
  statusBadgeText: { color: theme.colors.primary.dark, fontSize: theme.typography.small.fontSize, fontWeight: '700', textTransform: 'capitalize' },
  note: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  error: { color: theme.colors.error, marginBottom: theme.spacing.sm },
  validationMessage: { color: theme.colors.muted, lineHeight: 20, marginBottom: theme.spacing.sm },
});
