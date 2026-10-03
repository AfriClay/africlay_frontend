import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { productService, type SellerProductDraft } from '../../services/productService';
import { catalogKeys, invalidateCatalog } from '../../services/catalogQueries';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { leafCategoryItems } from '../../utils/categoryTree';
import { productIdentifiers } from '../../utils/productIdentifiers';

type AddEditRoute = RouteProp<SellerDashboardStackParamList, 'AddEditProduct'>;
type AddEditNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'AddEditProduct'>;
type ProductStatus = SellerProductDraft['status'];

const productStatuses: Array<{ value: ProductStatus; label: string; summary: string }> = [
  { value: 'draft', label: 'Draft', summary: 'Only visible to you' },
  { value: 'published', label: 'Published', summary: 'Visible in the marketplace' },
  { value: 'archived', label: 'Archived', summary: 'Hidden from the marketplace' },
];

const identifierSeed = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const AddEditProduct: React.FC = () => {
  const route = useRoute<AddEditRoute>();
  const navigation = useNavigation<AddEditNavigation>();
  const queryClient = useQueryClient();
  const sellerId = useAuth().user?.id ?? '';
  const productId = route.params?.productId;
  const populated = useRef(false);
  const savedProductId = useRef<string | undefined>(undefined);
  const pendingUploads = useRef<ImagePicker.ImagePickerAsset[]>([]);
  const generatedIdentifierSeed = useRef(identifierSeed());
  const productQuery = useQuery({ queryKey: catalogKeys.ownedProduct(productId ?? ''), queryFn: () => productService.fetchOwnedProductById(productId!), enabled: Boolean(productId) });
  const categoriesQuery = useQuery({ queryKey: catalogKeys.categories, queryFn: productService.fetchCategories });
  const tagsQuery = useQuery({ queryKey: catalogKeys.tags, queryFn: productService.fetchTags });
  const { data: product } = productQuery;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    populated.current = false;
    savedProductId.current = undefined;
    pendingUploads.current = [];
    generatedIdentifierSeed.current = identifierSeed();
    setName(''); setSlug(''); setSku(''); setDescription(''); setCategoryId(undefined);
    setTagIds([]); setPrice(''); setStock('0'); setExistingImages([]); setImages([]);
    setStatus('draft'); setError(undefined);
  }, [productId]);

  useEffect(() => {
    if (!product || populated.current) return;
    populated.current = true;
    setName(product.name);
    setSlug(product.slug ?? '');
    setSku(product.sku ?? '');
    setDescription(product.description);
    setCategoryId(product.categoryId);
    setTagIds(product.tagIds ?? []);
    setPrice(String(product.price));
    setStock(String(product.availableQuantity));
    setExistingImages(product.images);
    setStatus(product.status ?? 'draft');
  }, [product]);

  const pickImages = async () => {
    const remaining = 8 - existingImages.length - images.length;
    if (remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Allow photo access to add product images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.85 });
    if (result.canceled) return;
    if (result.assets.some(asset => (asset.fileSize ?? 0) > 5 * 1024 * 1024 || (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)))) {
      setError('Use JPG, PNG, or WebP images no larger than 5 MB.');
      return;
    }
    setImages(current => [...current, ...result.assets].slice(0, 8 - existingImages.length));
    setError(undefined);
  };

  const numericPrice = Number(price.replace(/,/g, ''));
  const generatedIdentifiers = productIdentifiers(name, generatedIdentifierSeed.current);
  const resolvedSlug = productId ? slug.trim() : generatedIdentifiers.slug;
  const resolvedSku = productId ? sku.trim() : generatedIdentifiers.sku;
  const categories = categoriesQuery.data ?? [];
  const categoryOptions = leafCategoryItems(categories);
  const selectableCategoryIds = new Set(categoryOptions.map(item => item.category.id));
  const categoryById = new Map(categories.map(item => [item.id, item]));
  const hasValidCategory = Boolean(categoryId && selectableCategoryIds.has(categoryId));
  const baseDetailsValid = Boolean(name.trim() && name.length <= 180 && resolvedSlug && resolvedSku && numericPrice > 0 && Number.isFinite(numericPrice) && /^\d+$/.test(stock.trim()));
  const canSave = baseDetailsValid && (status !== 'published' || hasValidCategory);
  const validationMessage = !name.trim() ? 'Enter a product name to continue.' :
    name.length > 180 ? 'Keep the product name within 180 characters.' :
    !Number.isFinite(numericPrice) || numericPrice <= 0 ? 'Enter a price greater than zero.' :
    !/^\d+$/.test(stock.trim()) ? 'Stock count must be a whole number of zero or more.' :
    status === 'published' && categoriesQuery.isLoading ? 'Loading product categories...' :
    status === 'published' && categoriesQuery.isError ? 'Categories could not be loaded. Retry before publishing.' :
    status === 'published' && categoryOptions.length === 0 ? 'No product categories are available yet. Save as a draft or ask an administrator to add categories.' :
    status === 'published' && !hasValidCategory ? 'Choose a specific category before publishing.' : undefined;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const draft: SellerProductDraft = {
        name: name.trim(), slug: resolvedSlug, sku: resolvedSku, description: description.trim(),
        categoryId, tagIds, price: numericPrice, availableQuantity: Number(stock), status,
      };
      const hasPendingUploads = pendingUploads.current.length > 0 || images.length > 0;
      const deferPublishing = status === 'published' && product?.status !== 'published' && hasPendingUploads;
      const initialDraft = deferPublishing ? { ...draft, status: 'draft' as const } : draft;
      let saved = savedProductId.current
        ? await productService.updateSellerProduct(sellerId, savedProductId.current, initialDraft)
        : productId
          ? await productService.updateSellerProduct(sellerId, productId, initialDraft)
          : await productService.addSellerProduct(sellerId, initialDraft);
      savedProductId.current = saved.id;
      if (!pendingUploads.current.length) pendingUploads.current = [...images];
      while (pendingUploads.current.length) {
        const asset = pendingUploads.current[0];
        await productService.uploadProductImages(saved.id, [asset]);
        pendingUploads.current.shift();
        setImages(current => current.filter(image => image.uri !== asset.uri));
      }
      if (deferPublishing) {
        saved = await productService.updateSellerProduct(sellerId, saved.id, draft);
      }
      await invalidateCatalog(queryClient, sellerId, saved.sellerId, saved.slug, saved.id);
      navigation.goBack();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this product.');
    } finally {
      setSaving(false);
    }
  };

  if (productId && productQuery.isError) return <ErrorState message="Unable to load this product." onRetry={() => void productQuery.refetch()} />;
  if (productId && productQuery.isLoading) return <Text style={styles.label}>Loading product...</Text>;
  if (productId && !product) return <EmptyState title="Product not found" description="This product can no longer be edited." />;
  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Input label="Product name" value={name} onChangeText={setName} placeholder="What are you selling?" accessibilityLabel="Product name" />
    <Text style={styles.label}>Description</Text>
    <TextInput value={description} onChangeText={setDescription} placeholder="Describe the product, materials, and condition" placeholderTextColor={theme.colors.muted} multiline style={styles.description} />
    <Text style={styles.label}>Specific category</Text>
    {categoriesQuery.isLoading ? <Text style={styles.optionMessage}>Loading categories...</Text> :
      categoriesQuery.isError ? <View style={styles.optionFailure}><Text style={styles.optionError}>Unable to load categories.</Text><Button size="sm" variant="tertiary" onPress={() => void categoriesQuery.refetch()} accessibilityLabel="Retry loading product categories">Retry</Button></View> :
        categoryOptions.length === 0 ? <Text style={styles.optionMessage}>No categories are available. You can save a draft, but a category is required to publish.</Text> :
          <View style={styles.categoryTree}>{categoryOptions.map(({ category }) =>
            <Pressable key={category.id} onPress={() => setCategoryId(current => current === category.id ? undefined : category.id)}
              style={[styles.categoryBranch, categoryId === category.id && styles.categoryActive]}
              accessibilityRole="radio" accessibilityState={{ selected: categoryId === category.id }} accessibilityLabel={`Choose ${category.label}`}>
              <Text style={[styles.categoryText, categoryId === category.id && styles.categoryTextActive]}>{categoryById.get(category.parent ?? '')?.label ?? 'Other'} / {category.label}</Text>
            </Pressable>)}</View>}
    <Text style={styles.label}>Tags</Text>
    {tagsQuery.isLoading ? <Text style={styles.optionMessage}>Loading optional tags...</Text> :
      tagsQuery.isError ? <View style={styles.optionFailure}><Text style={styles.optionError}>Optional tags could not be loaded.</Text><Button size="sm" variant="tertiary" onPress={() => void tagsQuery.refetch()} accessibilityLabel="Retry loading product tags">Retry</Button></View> :
        (tagsQuery.data ?? []).length === 0 ? <Text style={styles.optionMessage}>No optional tags are available.</Text> :
          <View style={styles.categories}>{(tagsQuery.data ?? []).map(item =>
            <Pressable key={item.id} onPress={() => setTagIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} style={[styles.category, tagIds.includes(item.id) && styles.categoryActive]} accessibilityRole="button">
              <Text style={[styles.categoryText, tagIds.includes(item.id) && styles.categoryTextActive]}>{item.label}</Text>
            </Pressable>)}</View>}
    <View style={styles.twoColumns}>
      <View style={styles.column}><Input label="Price (KSh)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Product price" /></View>
      <View style={styles.column}><Input label="Stock count" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" accessibilityLabel="Stock count" /></View>
    </View>
    <Text style={styles.label}>Listing status</Text>
    <View style={styles.statusOptions}>
      {productStatuses.filter(option => option.value !== 'archived' || Boolean(productId)).map(option => {
        const selected = status === option.value;
        return <Pressable
          key={option.value}
          onPress={() => setStatus(option.value)}
          disabled={saving}
          accessibilityRole="radio"
          accessibilityLabel={`${option.label}: ${option.summary}`}
          accessibilityState={{ selected, disabled: saving }}
          style={({ pressed }) => [styles.statusOption, selected && styles.statusOptionActive, pressed && styles.statusOptionPressed]}
        >
          <Text style={[styles.statusOptionText, selected && styles.statusOptionTextActive]}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.statusSummary}>{productStatuses.find(option => option.value === status)?.summary}</Text>
    <Text style={styles.label}>Images ({existingImages.length + images.length}/8)</Text>
    <View style={styles.imageGrid}>
      {existingImages.length + images.length < 8 && <Pressable style={styles.addImage} onPress={pickImages} accessibilityRole="button" accessibilityLabel="Add product images"><ImagePlus color={theme.colors.primary.DEFAULT} size={25} /><Text style={styles.addImageText}>Add images</Text></Pressable>}
      {existingImages.map(uri => <Image key={uri} source={{ uri }} style={styles.image} />)}
      {images.map(asset => <View key={asset.uri}>
        <Image source={{ uri: asset.uri }} style={styles.image} />
        <Button variant="icon" size="sm" style={styles.removeImage} onPress={() => { pendingUploads.current = pendingUploads.current.filter(image => image.uri !== asset.uri); setImages(current => current.filter(image => image.uri !== asset.uri)); }} accessibilityLabel="Remove selected image" icon={<X color={theme.colors.white} size={15} />} />
      </View>)}
    </View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {validationMessage && <Text accessibilityLiveRegion="polite" style={styles.validationMessage}>{validationMessage}</Text>}
    <Button onPress={save} disabled={!canSave} loading={saving}>
      {productId ? 'Save Changes' : status === 'published' ? 'Publish Product' : 'Save Draft'}
    </Button>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, backgroundColor: theme.colors.cream },
  label: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, marginBottom: theme.spacing.xs },
  description: { minHeight: 112, padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, color: theme.colors.ink, textAlignVertical: 'top', marginBottom: theme.spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  categoryTree: { gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  categoryBranch: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.sm, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  branchMarker: { width: 8, height: 8, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.muted, marginRight: theme.spacing.sm },
  category: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  categoryActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  categoryText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  categoryTextActive: { color: theme.colors.white, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: theme.spacing.md },
  column: { flex: 1 },
  statusOptions: { flexDirection: 'row', gap: theme.spacing.sm },
  statusOption: { flex: 1, minHeight: 44, paddingHorizontal: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  statusOptionActive: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  statusOptionPressed: { opacity: 0.75 },
  statusOptionText: { color: theme.colors.muted, fontWeight: '700', textAlign: 'center' },
  statusOptionTextActive: { color: theme.colors.primary.dark },
  statusSummary: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  image: { width: 104, height: 104, borderRadius: theme.radii.md },
  removeImage: { position: 'absolute', top: 4, right: 4, width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: 20, backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  addImage: { width: 104, height: 104, borderRadius: theme.radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  addImageText: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginTop: theme.spacing.xs, fontSize: theme.typography.small.fontSize, textAlign: 'center' },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
  optionMessage: { color: theme.colors.muted, lineHeight: 20, marginBottom: theme.spacing.md },
  optionFailure: { alignItems: 'flex-start', marginBottom: theme.spacing.md },
  optionError: { color: theme.colors.error, lineHeight: 20 },
  validationMessage: { color: theme.colors.muted, lineHeight: 20, marginBottom: theme.spacing.sm },
});
