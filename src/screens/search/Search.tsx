import React, { useEffect, useMemo, useState } from 'react';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CatalogImage } from '../../components/ui/CatalogImage';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search as SearchIcon, SlidersHorizontal, Store } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchStackParamList } from '../../navigation/SearchStack';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

type SearchNavigation = NativeStackNavigationProp<SearchStackParamList, 'SearchLanding'>;
type SearchResult =
  | { id: string; type: 'product'; title: string; meta: string; imageUrl?: string }
  | { id: string; type: 'service'; title: string; meta: string; imageUrl?: string }
  | { id: string; type: 'seller'; title: string; meta: string; imageUrl?: string };

const popularSearches = ['Maasai beads', 'Organic produce', 'Home cleaning', 'African decor'];

export const Search: React.FC = () => {
  const { isExpanded, isWide } = useResponsiveLayout();
  const columns = isExpanded ? (isWide ? 3 : 2) : 1;
  const route = useRoute<RouteProp<SearchStackParamList, 'SearchLanding'>>();
  const navigation = useNavigation<SearchNavigation>();
  const [query, setQuery] = useState('');
  useEffect(() => { if (route.params?.query !== undefined) setQuery(route.params.query); }, [route.params?.query]);
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.fetchProducts });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: productService.fetchServices });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: productService.fetchSellers });

  const results = useMemo<SearchResult[]>(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const productResults: SearchResult[] = products
      .filter(product => `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(normalized))
      .map(product => ({ id: product.id, type: 'product', title: product.name, meta: `${formatCurrency(product.price)} · ${product.category}`, imageUrl: product.images[0] }));
    const serviceResults: SearchResult[] = services
      .filter(service => `${service.title} ${service.description}`.toLowerCase().includes(normalized))
      .map(service => ({ id: service.id, type: 'service', title: service.title, meta: `From ${formatCurrency(service.priceFrom)} · Service`, imageUrl: service.images[0] }));
    const sellerResults: SearchResult[] = sellers
      .filter(seller => `${seller.name} ${seller.location} ${seller.bio}`.toLowerCase().includes(normalized))
      .map(seller => ({ id: seller.id, type: 'seller', title: seller.name, meta: `Verified Seller · ${seller.location}`, imageUrl: seller.bannerUrl }));
    return [...productResults, ...serviceResults, ...sellerResults];
  }, [products, query, sellers, services]);

  const openResult = (result: SearchResult) => {
    if (result.type === 'product') navigation.navigate('ProductDetails', { productId: result.id });
    else if (result.type === 'service') navigation.navigate('ServiceDetails', { serviceId: result.id });
    else navigation.navigate('SellerStore', { sellerId: result.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Discover Africa</Text>
      <View style={styles.searchBar}>
        <SearchIcon color={theme.colors.muted} size={19} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Products, sellers, services" placeholderTextColor={theme.colors.muted} style={styles.input} accessibilityLabel="Search AfriClay" autoFocus={false} />
        <SlidersHorizontal color={theme.colors.primary.DEFAULT} size={20} />
      </View>
      <View style={styles.locationChip}><MapPin color={theme.colors.primary.DEFAULT} size={16} /><Text style={styles.locationText}>Shopping in Kenya</Text></View>

      {!query.trim() ? (
        <View style={styles.discovery}>
          <Text style={styles.sectionTitle}>Popular searches</Text>
          <View style={styles.chips}>
            {popularSearches.map(item => <Pressable key={item} style={styles.chip} onPress={() => setQuery(item)}><Text style={styles.chipText}>{item}</Text></Pressable>)}
          </View>
          <View style={styles.tipCard}><Store color={theme.colors.primary.DEFAULT} size={28} /><Text style={styles.tipTitle}>Search the whole marketplace</Text><Text style={styles.tipText}>Find products, verified sellers, and trusted local services from one search.</Text></View>
        </View>
      ) : (
        <FlatList
          key={columns}
          numColumns={columns}
          data={results}
          keyExtractor={item => `${item.type}-${item.id}`}
          renderItem={({ item }) => (
            <Pressable style={[styles.result, isExpanded && { flex: 1, maxWidth: `${100 / columns}%`, marginHorizontal: theme.spacing.xs }]} onPress={() => openResult(item)} accessibilityRole="button">
              <CatalogImage uri={item.imageUrl} label={item.title} style={styles.resultImage} />
              <View style={styles.resultCopy}><Text style={styles.resultTitle}>{item.title}</Text><Text style={styles.resultMeta}>{item.meta}</Text></View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="No results" description="Try a different product, seller, or service." />}
          contentContainerStyle={results.length ? styles.results : styles.emptyResults}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, paddingTop: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  searchBar: { marginHorizontal: theme.spacing.lg, minHeight: 50, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.white, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, marginHorizontal: theme.spacing.sm, color: theme.colors.ink, fontSize: theme.typography.body.fontSize },
  locationChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary.tint },
  locationText: { color: theme.colors.primary.dark, marginLeft: theme.spacing.xs, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  discovery: { padding: theme.spacing.lg },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: { minHeight: 42, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  chipText: { color: theme.colors.ink },
  tipCard: { marginTop: theme.spacing.xl, padding: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.primary.tint },
  tipTitle: { color: theme.colors.primary.dark, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginTop: theme.spacing.md },
  tipText: { color: theme.colors.muted, marginTop: theme.spacing.xs, lineHeight: 21 },
  results: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  emptyResults: { flexGrow: 1, padding: theme.spacing.lg },
  result: { minHeight: 82, padding: theme.spacing.sm, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, marginBottom: theme.spacing.sm, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  resultImage: { width: 64, height: 64, borderRadius: theme.radii.md, backgroundColor: theme.colors.border },
  resultCopy: { flex: 1, marginLeft: theme.spacing.md },
  resultTitle: { color: theme.colors.ink, fontWeight: '800' },
  resultMeta: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: theme.spacing.xs },
});
