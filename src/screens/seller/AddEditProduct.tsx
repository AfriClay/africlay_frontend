import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ImagePlus, Plus, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TagPicker } from '../../components/domain/TagPicker';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { productService, type CatalogCategory, type SellerProductDraft } from '../../services/productService';
import { catalogKeys, invalidateCatalog } from '../../services/catalogQueries';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { leafCategoryItems, rootCategories } from '../../utils/categoryTree';
import { productIdentifiers } from '../../utils/productIdentifiers';
import { ChoiceGroup } from '../../components/ui/ChoiceGroup';
import { FormField } from '../../components/ui/FormField';
import { SearchField } from '../../components/ui/SearchField';

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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryCreatorOpen, setCategoryCreatorOpen] = useState(false);
  const [categoryParentId, setCategoryParentId] = useState<string>();
  const [categoryParentName, setCategoryParentName] = useState('');
  const [categoryChildName, setCategoryChildName] = useState('');
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [categoryCreateError, setCategoryCreateError] = useState<string>();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [weightKg, setWeightKg] = useState('1');
  const [lengthCm, setLengthCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
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
    setCategoryPickerOpen(false); setCategoryQuery(''); setCategoryCreatorOpen(false);
    setCategoryParentId(undefined); setCategoryParentName(''); setCategoryChildName(''); setCategoryCreateError(undefined);
    setTagIds([]); setPrice(''); setStock('0'); setWeightKg('1'); setLengthCm(''); setWidthCm(''); setHeightCm(''); setExistingImages([]); setImages([]);
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
    setWeightKg(String(product.weightKg ?? 1));
    setLengthCm(product.lengthCm == null ? '' : String(product.lengthCm));
    setWidthCm(product.widthCm == null ? '' : String(product.widthCm));
    setHeightCm(product.heightCm == null ? '' : String(product.heightCm));
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
  const numericWeight = Number(weightKg.replace(/,/g, ''));
  const numericLength = Number(lengthCm.replace(/,/g, ''));
  const numericWidth = Number(widthCm.replace(/,/g, ''));
  const numericHeight = Number(heightCm.replace(/,/g, ''));
  const generatedIdentifiers = productIdentifiers(name, generatedIdentifierSeed.current);
  const resolvedSlug = productId ? slug.trim() : generatedIdentifiers.slug;
  const resolvedSku = productId ? sku.trim() : generatedIdentifiers.sku;
  const categories = categoriesQuery.data ?? [];
  const mainCategoryOptions = rootCategories(categories);
  const categoryOptions = leafCategoryItems(categories);
  const selectableCategoryIds = new Set(categoryOptions.map(item => item.category.id));
  const categoryById = new Map(categories.map(item => [item.id, item]));
  const pathForCategory = (id?: string) => {
    const path = [];
    const visited = new Set<string>();
    let current = id ? categoryById.get(id) : undefined;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current);
      current = current.parent ? categoryById.get(current.parent) : undefined;
    }
    return path;
  };
  const selectedCategoryPath = pathForCategory(categoryId);
  const selectedCategoryLabel = selectedCategoryPath.map(category => category.label).join(' / ');
  const normalizedCategoryQuery = categoryQuery.trim().toLowerCase();
  const visibleCategoryOptions = categoryOptions.filter(({ category }) =>
    !normalizedCategoryQuery || pathForCategory(category.id).some(item => item.label.toLowerCase().includes(normalizedCategoryQuery)));
  const hasValidCategory = Boolean(categoryId && selectableCategoryIds.has(categoryId));
  const validWeight = Number.isFinite(numericWeight) && numericWeight > 0;
  const validDimensions = [numericLength, numericWidth, numericHeight].every(value => Number.isFinite(value) && value > 0 && value < 100);
  const baseDetailsValid = Boolean(name.trim() && name.length <= 180 && resolvedSlug && resolvedSku && numericPrice > 0 && Number.isFinite(numericPrice) && /^\d+$/.test(stock.trim()) && validWeight);
  const canSave = baseDetailsValid && (status !== 'published' || (hasValidCategory && validDimensions));
  const canCreateCategory = Boolean((categoryParentId || categoryParentName.trim()) && categoryChildName.trim());
  const validationMessage = !name.trim() ? 'Enter a product name to continue.' :
    name.length > 180 ? 'Keep the product name within 180 characters.' :
    !Number.isFinite(numericPrice) || numericPrice <= 0 ? 'Enter a price greater than zero.' :
    !/^\d+$/.test(stock.trim()) ? 'Stock count must be a whole number of zero or more.' :
    !validWeight ? 'Enter the packaged product weight in kilograms.' :
    status === 'published' && categoriesQuery.isLoading ? 'Loading product categories...' :
    status === 'published' && categoriesQuery.isError ? 'Categories could not be loaded. Retry before publishing.' :
    status === 'published' && categoryOptions.length === 0 ? 'Add a specific category before publishing.' :
    status === 'published' && !hasValidCategory ? 'Choose a specific category before publishing.' :
    status === 'published' && !validDimensions ? 'Enter package length, width, and height below 100 cm.' : undefined;

  const createCategory = async () => {
    if (!canCreateCategory || categoryCreating) return;
    setCategoryCreating(true);
    setCategoryCreateError(undefined);
    try {
      const created = await productService.createCategoryPath({
        parentId: categoryParentId,
        parentName: categoryParentId ? undefined : categoryParentName,
        childName: categoryChildName,
      });
      queryClient.setQueryData<CatalogCategory[]>(catalogKeys.categories, current => {
        const merged = new Map((current ?? []).map(category => [category.id, category]));
        merged.set(created.parent.id, created.parent);
        merged.set(created.child.id, created.child);
        return [...merged.values()];
      });
      setCategoryId(created.child.id);
      setCategoryPickerOpen(false);
      setCategoryCreatorOpen(false);
      setCategoryQuery('');
      setCategoryParentId(undefined);
      setCategoryParentName('');
      setCategoryChildName('');
      await queryClient.invalidateQueries({ queryKey: catalogKeys.categories });
    } catch (createError) {
      setCategoryCreateError(createError instanceof Error ? createError.message : 'Unable to add this category.');
    } finally {
      setCategoryCreating(false);
    }
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const draft: SellerProductDraft = {
        name: name.trim(), slug: resolvedSlug, sku: resolvedSku, description: description.trim(),
        categoryId, tagIds, price: numericPrice, availableQuantity: Number(stock),
        weightKg: numericWeight,
        lengthCm: lengthCm.trim() ? numericLength : undefined,
        widthCm: widthCm.trim() ? numericWidth : undefined,
        heightCm: heightCm.trim() ? numericHeight : undefined,
        status,
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
    <Input label="Product name" required value={name} onChangeText={setName} placeholder="What are you selling?" accessibilityLabel="Product name" />
    <Input label="Description" required value={description} onChangeText={setDescription} placeholder="Describe the product, materials, and condition" multiline accessibilityLabel="Product description" />
    <FormField label="Specific category" required>
      {categoriesQuery.isLoading ? <Text style={styles.optionMessage}>Loading categories...</Text> :
      categoriesQuery.isError ? <View style={styles.optionFailure}><Text style={styles.optionError}>Unable to load categories.</Text><Button size="sm" variant="tertiary" onPress={() => void categoriesQuery.refetch()} accessibilityLabel="Retry loading product categories">Retry</Button></View> :
        <View style={styles.categoryPicker}>
            <Pressable
              onPress={() => setCategoryPickerOpen(value => !value)}
              style={[styles.categoryField, categoryId && styles.categoryFieldSelected]}
              accessibilityRole="button"
              accessibilityState={{ expanded: categoryPickerOpen }}
              accessibilityLabel={selectedCategoryLabel || 'Choose a specific category'}
            >
              <Text numberOfLines={2} style={[styles.categoryFieldText, !categoryId && styles.categoryPlaceholder]}>{selectedCategoryLabel || 'Choose a category'}</Text>
              <ChevronDown color={theme.colors.primary.DEFAULT} size={20} />
            </Pressable>
            {categoryPickerOpen ? <View style={styles.categoryPanel}>
              <SearchField value={categoryQuery} onChangeText={setCategoryQuery} placeholder="Search categories" accessibilityLabel="Search product categories" />
              {categoryOptions.length ? <ScrollView style={styles.categoryTree} contentContainerStyle={styles.categoryTreeContent} nestedScrollEnabled keyboardShouldPersistTaps="handled">{visibleCategoryOptions.map(({ category }) => {
                const selected = categoryId === category.id;
                return <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setCategoryPickerOpen(false); setCategoryQuery(''); }}
                  style={[styles.categoryBranch, selected && styles.categoryActive]}
                  accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`Choose ${category.label}`}>
                  <Text numberOfLines={2} style={[styles.categoryText, selected && styles.categoryTextActive]}>{pathForCategory(category.id).map(item => item.label).join(' / ')}</Text>
                </Pressable>;
              })}</ScrollView> : null}
              {!visibleCategoryOptions.length ? <Text style={styles.optionMessage}>{categoryOptions.length ? 'No matching categories.' : 'No categories are available yet.'}</Text> : null}
              <Button
                size="sm"
                variant="tertiary"
                icon={<Plus color={theme.colors.primary.DEFAULT} size={17} />}
                onPress={() => {
                  setCategoryCreatorOpen(value => !value);
                  if (!categoryChildName && categoryQuery.trim()) setCategoryChildName(categoryQuery.trim());
                  setCategoryCreateError(undefined);
                }}
                accessibilityState={{ expanded: categoryCreatorOpen }}
              >Add missing category</Button>
              {categoryCreatorOpen ? <View style={styles.categoryCreator}>
                <Text style={styles.creatorTitle}>Main category</Text>
                {mainCategoryOptions.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.parentOptions} keyboardShouldPersistTaps="handled">
                  {mainCategoryOptions.map(category => {
                    const selected = categoryParentId === category.id;
                    return <Pressable key={category.id} onPress={() => { setCategoryParentId(category.id); setCategoryParentName(''); setCategoryCreateError(undefined); }}
                      accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.parentOption, selected && styles.parentOptionActive]}>
                      <Text style={[styles.parentOptionText, selected && styles.parentOptionTextActive]}>{category.label}</Text>
                    </Pressable>;
                  })}
                </ScrollView> : null}
                <Input label="New main category" value={categoryParentName} onChangeText={value => { setCategoryParentName(value.slice(0, 100)); if (value.trim()) setCategoryParentId(undefined); setCategoryCreateError(undefined); }} placeholder="Only if it is not listed" />
                <Input label="Child category" value={categoryChildName} onChangeText={value => { setCategoryChildName(value.slice(0, 100)); setCategoryCreateError(undefined); }} placeholder="Specific category" />
                {categoryCreateError ? <Text accessibilityRole="alert" style={styles.optionError}>{categoryCreateError}</Text> : null}
                <Button size="sm" onPress={createCategory} disabled={!canCreateCategory} loading={categoryCreating}>Add category</Button>
              </View> : null}
            </View> : null}
          </View>}
    </FormField>
    <TagPicker
      tags={tagsQuery.data ?? []}
      selectedIds={tagIds}
      onChange={setTagIds}
      relevantCategoryIds={selectedCategoryPath.map(category => category.id)}
      loading={tagsQuery.isLoading}
      error={tagsQuery.isError}
      onRetry={() => void tagsQuery.refetch()}
      disabled={saving}
    />
    <View style={styles.twoColumns}>
      <View style={styles.column}><Input label="Price (KSh)" required value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Product price" /></View>
      <View style={styles.column}><Input label="Stock count" required value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" accessibilityLabel="Stock count" /></View>
    </View>
    <Text style={styles.label}>Package measurements</Text>
    <View style={styles.twoColumns}>
      <View style={styles.column}><Input label="Weight (kg)" required value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="1.0" accessibilityLabel="Packaged product weight in kilograms" /></View>
      <View style={styles.column}><Input label="Length (cm)" optional value={lengthCm} onChangeText={setLengthCm} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Package length in centimetres" /></View>
    </View>
    <View style={styles.twoColumns}>
      <View style={styles.column}><Input label="Width (cm)" optional value={widthCm} onChangeText={setWidthCm} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Package width in centimetres" /></View>
      <View style={styles.column}><Input label="Height (cm)" optional value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Package height in centimetres" /></View>
    </View>
    <ChoiceGroup label="Listing status" required value={status} onChange={setStatus} disabled={saving}
      options={productStatuses.filter(option => option.value !== 'archived' || Boolean(productId)).map(option => ({ value: option.value, label: option.label, description: option.summary }))} />
    <FormField label={`Images (${existingImages.length + images.length}/8)`} optional helperText="Add clear JPG or PNG images. The first image is used as the cover.">
      <View style={styles.imageGrid}>
      {existingImages.length + images.length < 8 && <Pressable style={styles.addImage} onPress={pickImages} accessibilityRole="button" accessibilityLabel="Add product images"><ImagePlus color={theme.colors.primary.DEFAULT} size={25} /><Text style={styles.addImageText}>Add images</Text></Pressable>}
      {existingImages.map(uri => <Image key={uri} source={{ uri }} style={styles.image} />)}
      {images.map(asset => <View key={asset.uri}>
        <Image source={{ uri: asset.uri }} style={styles.image} />
        <Button variant="icon" size="sm" style={styles.removeImage} onPress={() => { pendingUploads.current = pendingUploads.current.filter(image => image.uri !== asset.uri); setImages(current => current.filter(image => image.uri !== asset.uri)); }} accessibilityLabel="Remove selected image" icon={<X color={theme.colors.white} size={15} />} />
      </View>)}
      </View>
    </FormField>
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
  categoryPicker: { marginBottom: theme.spacing.md },
  categoryField: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  categoryFieldSelected: { borderColor: theme.colors.primary.DEFAULT },
  categoryFieldText: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.small.fontSize, lineHeight: 18 },
  categoryPlaceholder: { color: theme.colors.muted },
  categoryPanel: { marginTop: theme.spacing.xs, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  categoryTree: { marginTop: theme.spacing.sm, maxHeight: 300 },
  categoryTreeContent: { gap: 4 },
  categoryBranch: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.sm, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  categoryActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  categoryText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  categoryTextActive: { color: theme.colors.white, fontWeight: '700' },
  categoryCreator: { gap: theme.spacing.sm, marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  creatorTitle: { color: theme.colors.ink, fontWeight: '700', fontSize: theme.typography.small.fontSize },
  parentOptions: { gap: theme.spacing.xs, paddingBottom: theme.spacing.xs },
  parentOption: { minHeight: 36, justifyContent: 'center', paddingHorizontal: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.white },
  parentOptionActive: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  parentOptionText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  parentOptionTextActive: { color: theme.colors.primary.dark, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: theme.spacing.md },
  column: { flex: 1 },
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
