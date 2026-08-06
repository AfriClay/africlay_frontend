import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { categories } from '../../mock/categories';
import { SellerDashboardStackParamList } from '../../navigation/SellerDashboardStack';
import { productService } from '../../services/productService';
import { ProductCategory } from '../../types/product';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';

type AddEditRoute = RouteProp<SellerDashboardStackParamList, 'AddEditProduct'>;
type AddEditNavigation = NativeStackNavigationProp<SellerDashboardStackParamList, 'AddEditProduct'>;

export const AddEditProduct: React.FC = () => {
  const route = useRoute<AddEditRoute>();
  const navigation = useNavigation<AddEditNavigation>();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const sellerId = auth.user?.id ?? '';
  const productId = route.params?.productId;
  const populated = useRef(false);
  const { data: product } = useQuery({ queryKey: ['product', productId], queryFn: () => productService.fetchProductById(productId!), enabled: Boolean(productId) });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>();
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [images, setImages] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!product || populated.current) return;
    populated.current = true;
    setName(product.name);
    setDescription(product.description);
    setCategory(product.category);
    setPrice(String(product.price));
    setStock(String(product.availableQuantity));
    setImages(product.images);
    setWeight(product.weight ?? '');
    setDimensions(product.dimensions ?? '');
  }, [product]);

  const pickImages = async () => {
    const remaining = 8 - images.length;
    if (remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add product images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.85 });
    if (!result.canceled) {
      setImages(current => [...current, ...result.assets.map(asset => asset.uri)].slice(0, 8));
      setError(undefined);
    }
  };

  const numericPrice = Number(price.replace(/,/g, ''));
  const canSave = Boolean(name.trim() && category && numericPrice > 0 && images.length);

  const save = async () => {
    if (!canSave || !category) return;
    setSaving(true);
    setError(undefined);
    try {
      const draft = {
        name: name.trim(),
        description: description.trim(),
        category,
        price: numericPrice,
        availableQuantity: Math.max(0, Number.parseInt(stock, 10) || 0),
        images,
        weight: weight.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
      };
      if (productId) await productService.updateSellerProduct(sellerId, productId, draft);
      else await productService.addSellerProduct(sellerId, draft);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['seller-products', sellerId] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product', productId] }),
      ]);
      navigation.goBack();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Input label="Product name" value={name} onChangeText={setName} placeholder="What are you selling?" accessibilityLabel="Product name" />
      <Text style={styles.label}>Description</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="Describe the product, materials, and condition" placeholderTextColor={theme.colors.muted} multiline style={styles.description} />
      <Text style={styles.label}>Category *</Text>
      <View style={styles.categories}>
        {categories.map(item => (
          <Pressable key={item.id} onPress={() => setCategory(item.label as ProductCategory)} style={[styles.category, category === item.label ? styles.categoryActive : null]}>
            <Text style={[styles.categoryText, category === item.label ? styles.categoryTextActive : null]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.twoColumns}>
        <View style={styles.column}><Input label="Price (KSh)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" accessibilityLabel="Product price" /></View>
        <View style={styles.column}><Input label="Stock count" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" accessibilityLabel="Stock count" /></View>
      </View>
      <Text style={styles.label}>Images * ({images.length}/8)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
        {images.map(uri => (
          <View key={uri}>
            <Image source={{ uri }} style={styles.image} />
            <Pressable style={styles.removeImage} onPress={() => setImages(current => current.filter(image => image !== uri))}><X color={theme.colors.white} size={15} /></Pressable>
          </View>
        ))}
        {images.length < 8 ? <Pressable style={styles.addImage} onPress={pickImages}><ImagePlus color={theme.colors.primary.DEFAULT} size={25} /><Text style={styles.addImageText}>Add</Text></Pressable> : null}
      </ScrollView>
      <Text style={styles.optionalTitle}>Shipping details (optional)</Text>
      <Input label="Weight" value={weight} onChangeText={setWeight} placeholder="e.g. 1.5 kg" accessibilityLabel="Product weight" />
      <Input label="Dimensions" value={dimensions} onChangeText={setDimensions} placeholder="e.g. 30 × 20 × 10 cm" accessibilityLabel="Product dimensions" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button onPress={save} disabled={!canSave} loading={saving}>Save Product</Button>
    </ScrollView>
  );
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
  optionalTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginVertical: theme.spacing.md },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
});
