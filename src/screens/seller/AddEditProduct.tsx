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

type AddEditRoute = RouteProp<SellerDashboardStackParamList, 'AddEditProduct'>;
type AddEditNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'AddEditProduct'>;

export const AddEditProduct: React.FC = () => {
  const route = useRoute<AddEditRoute>();
  const navigation = useNavigation<AddEditNavigation>();
  const queryClient = useQueryClient();
  const sellerId = useAuth().user?.id ?? '';
  const productId = route.params?.productId;
  const populated = useRef(false);
  const savedProductId = useRef<string | undefined>(undefined);
  const pendingUploads = useRef<ImagePicker.ImagePickerAsset[]>([]);
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
  const [status, setStatus] = useState<SellerProductDraft['status']>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    populated.current = false;
    savedProductId.current = undefined;
    pendingUploads.current = [];
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
  const canSave = Boolean(name.trim() && name.length <= 180 && slug.trim() && slug.length <= 200 && /^[a-zA-Z0-9_-]+$/.test(slug) && sku.trim() && sku.length <= 80 && numericPrice > 0 && Number.isFinite(numericPrice) && /^\d+$/.test(stock.trim()));

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const draft: SellerProductDraft = {
        name: name.trim(), slug: slug.trim(), sku: sku.trim(), description: description.trim(),
        categoryId, tagIds, price: numericPrice, availableQuantity: Number(stock), status,
      };
      const saved = savedProductId.current
        ? await productService.updateSellerProduct(sellerId, savedProductId.current, draft)
        : productId
          ? await productService.updateSellerProduct(sellerId, productId, draft)
          : await productService.addSellerProduct(sellerId, draft);
      savedProductId.current = saved.id;
      if (!pendingUploads.current.length) pendingUploads.current = [...images];
      while (pendingUploads.current.length) {
        const asset = pendingUploads.current[0];
        await productService.uploadProductImages(saved.id, [asset]);
        pendingUploads.current.shift();
        setImages(current => current.filter(image => image.uri !== asset.uri));
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
  if (categoriesQuery.isError || tagsQuery.isError) return <ErrorState message="Unable to load product options." onRetry={() => { void categoriesQuery.refetch(); void tagsQuery.refetch(); }} />;

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Input label="Product name" value={name} onChangeText={setName} placeholder="What are you selling?" accessibilityLabel="Product name" />
    <Input label="Product URL slug" value={slug} onChangeText={setSlug} placeholder="e.g. handmade-sisal-rug" autoCapitalize="none" accessibilityLabel="Product URL slug" />
    <Input label="SKU" value={sku} onChangeText={setSku} placeholder="e.g. RUG-001" accessibilityLabel="SKU" />
    <Text style={styles.label}>Description</Text>
    <TextInput value={description} onChangeText={setDescription} placeholder="Describe the product, materials, and condition" placeholderTextColor={theme.colors.muted} multiline style={styles.description} />
    <Text style={styles.label}>Category</Text>
    <View style={styles.categories}>{(categoriesQuery.data ?? []).map(item =>
      <Pressable key={item.id} onPress={() => setCategoryId(current => current === item.id ? undefined : item.id)} style={[styles.category, categoryId === item.id && styles.categoryActive]} accessibilityRole="button">
        <Text style={[styles.categoryText, categoryId === item.id && styles.categoryTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    <Text style={styles.label}>Tags</Text>
    <View style={styles.categories}>{(tagsQuery.data ?? []).map(item =>
      <Pressable key={item.id} onPress={() => setTagIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} style={[styles.category, tagIds.includes(item.id) && styles.categoryActive]} accessibilityRole="button">
        <Text style={[styles.categoryText, tagIds.includes(item.id) && styles.categoryTextActive]}>{item.label}</Text>
      </Pressable>)}</View>
    <View style={styles.twoColumns}>
      <View style={styles.column}><Input label="Price (KSh)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Product price" /></View>
      <View style={styles.column}><Input label="Stock count" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" accessibilityLabel="Stock count" /></View>
    </View>
    <Text style={styles.label}>Images ({existingImages.length + images.length}/8)</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
      {existingImages.map(uri => <Image key={uri} source={{ uri }} style={styles.image} />)}
      {images.map(asset => <View key={asset.uri}>
        <Image source={{ uri: asset.uri }} style={styles.image} />
        <Pressable style={styles.removeImage} onPress={() => { pendingUploads.current = pendingUploads.current.filter(image => image.uri !== asset.uri); setImages(current => current.filter(image => image.uri !== asset.uri)); }} accessibilityRole="button" accessibilityLabel="Remove selected image"><X color={theme.colors.white} size={15} /></Pressable>
      </View>)}
      {existingImages.length + images.length < 8 && <Pressable style={styles.addImage} onPress={pickImages} accessibilityRole="button" accessibilityLabel="Add product image"><ImagePlus color={theme.colors.primary.DEFAULT} size={25} /><Text style={styles.addImageText}>Add</Text></Pressable>}
    </ScrollView>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button onPress={save} disabled={!canSave || categoriesQuery.isLoading || tagsQuery.isLoading} loading={saving}>Save Product</Button>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, backgroundColor: theme.colors.cream },
  label: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, marginBottom: theme.spacing.xs },
  description: { minHeight: 112, padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, color: theme.colors.ink, textAlignVertical: 'top', marginBottom: theme.spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  category: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  categoryActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  categoryText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  categoryTextActive: { color: theme.colors.white, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: theme.spacing.md },
  column: { flex: 1 },
  imageRow: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  image: { width: 104, height: 104, borderRadius: theme.radii.md },
  removeImage: { position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.error, alignItems: 'center', justifyContent: 'center' },
  addImage: { width: 104, height: 104, borderRadius: theme.radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  addImageText: { color: theme.colors.primary.DEFAULT, fontWeight: '700', marginTop: theme.spacing.xs },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
});
