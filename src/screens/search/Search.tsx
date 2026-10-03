import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  InteractionManager,
  Keyboard,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Clock3, PackageSearch, Store, Trash2 } from 'lucide-react-native';
import { CatalogImage } from '../../components/ui/CatalogImage';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SearchStackParamList } from '../../navigation/SearchStack';
import { catalogKeys } from '../../services/catalogQueries';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { recentSearches } from '../../utils/recentSearches';

type SearchNavigation = NativeStackNavigationProp<SearchStackParamList, 'SearchLanding'>;
type SearchProps = {
  presentation?: 'screen' | 'overlay';
  focusRequest?: number;
  onDismiss?: () => void;
  onOpenProduct?: (productId: string) => void;
  onOpenSeller?: (sellerId: string) => void;
};
type SearchResult = {
  key: string;
  id: string;
  type: 'product' | 'seller';
  title: string;
  meta: string;
  imageUrl?: string;
};

const Match = ({ text, query, color, highlight }: { text: string; query: string; color: string; highlight: string }) => {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (!query || index < 0) return <Text style={[styles.resultTitle, { color }]}>{text}</Text>;
  return <Text style={[styles.resultTitle, { color }]}>
    {text.slice(0, index)}<Text style={{ color: highlight }}>{text.slice(index, index + query.length)}</Text>{text.slice(index + query.length)}
  </Text>;
};

export const Search: React.FC<SearchProps> = ({ presentation = 'screen', focusRequest = 0, onDismiss, onOpenProduct, onOpenSeller }) => {
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const expanded = width >= 840;
  const route = useRoute<RouteProp<SearchStackParamList, 'SearchLanding'>>();
  const navigation = useNavigation<SearchNavigation>();
  const { colors } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(presentation === 'screen' ? route.params?.query ?? '' : '');
  const debouncedQuery = useDebouncedValue(query.trim(), 200);
  const [recent, setRecent] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [slow, setSlow] = useState(false);

  useEffect(() => { void recentSearches.load().then(setRecent); }, []);
  useEffect(() => {
    if (presentation === 'screen' && route.params?.query !== undefined) setQuery(route.params.query);
  }, [presentation, route.params?.query]);

  useEffect(() => {
    if (!focusRequest) return;
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => task.cancel();
  }, [focusRequest]);

  const productsQuery = useQuery({ queryKey: catalogKeys.products, queryFn: () => productService.fetchProducts(), staleTime: 60_000 });
  const sellersQuery = useQuery({ queryKey: catalogKeys.sellers, queryFn: productService.fetchSellers, staleTime: 60_000 });
  const products = productsQuery.data ?? [];
  const sellers = sellersQuery.data ?? [];
  const loading = productsQuery.isPending || sellersQuery.isPending;

  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 4_000);
    return () => clearTimeout(timer);
  }, [loading]);

  const productResults = useMemo<SearchResult[]>(() => {
    const normalized = debouncedQuery.toLocaleLowerCase();
    if (!normalized) return [];
    return products
      .filter(product => !availableOnly || product.availableQuantity > 0)
      .filter(product => `${product.name} ${product.description}`.toLocaleLowerCase().includes(normalized))
      .filter(product => Boolean(product.slug))
      .map(product => ({
        key: `product-${product.id}`,
        id: product.slug!,
        type: 'product',
        title: product.name,
        meta: `${formatCurrency(product.price, product.currency)} - ${product.availableQuantity > 0 ? 'In stock' : 'Out of stock'}`,
      }));
  }, [availableOnly, debouncedQuery, products]);

  const sellerResults = useMemo<SearchResult[]>(() => {
    const normalized = debouncedQuery.toLocaleLowerCase();
    if (!normalized) return [];
    return sellers
      .filter(seller => `${seller.name} ${seller.location} ${seller.bio}`.toLocaleLowerCase().includes(normalized))
      .map(seller => ({
        key: `seller-${seller.id}`,
        id: seller.slug ?? seller.id,
        type: 'seller',
        title: seller.name,
        meta: seller.location || 'AfriClay seller',
        imageUrl: seller.logoUrl,
      }));
  }, [debouncedQuery, sellers]);

  const sections = useMemo(() => [
    { title: 'Products', data: productResults },
    { title: 'Sellers', data: sellerResults },
  ].filter(section => section.data.length > 0), [productResults, sellerResults]);
  const flatResults = useMemo(() => sections.flatMap(section => section.data), [sections]);
  const hasCachedFailure = (productsQuery.isError && products.length > 0) || (sellersQuery.isError && sellers.length > 0);
  const hasBlockingFailure = (productsQuery.isError && products.length === 0) || (sellersQuery.isError && sellers.length === 0);

  useEffect(() => {
    setSelectedIndex(flatResults.length ? 0 : -1);
    if (debouncedQuery && !loading) AccessibilityInfo.announceForAccessibility(`${flatResults.length} search results`);
  }, [debouncedQuery, flatResults.length, loading]);

  const remember = async (value: string) => setRecent(await recentSearches.add(value));
  const openResult = (result: SearchResult) => {
    void remember(query);
    if (result.type === 'product') {
      if (onOpenProduct) onOpenProduct(result.id);
      else navigation.navigate('ProductDetails', { productId: result.id });
      return;
    }
    if (onOpenSeller) onOpenSeller(result.id);
    else navigation.navigate('SellerStore', { sellerId: result.id });
  };
  const submit = () => {
    if (selectedIndex >= 0 && flatResults[selectedIndex]) openResult(flatResults[selectedIndex]);
    else if (query.trim()) void remember(query);
  };
  const retry = () => { void productsQuery.refetch(); void sellersQuery.refetch(); };
  const cancel = () => {
    if (presentation === 'overlay' && onDismiss) {
      Keyboard.dismiss();
      onDismiss();
      return;
    }
    if (query) setQuery('');
    else if (navigation.canGoBack()) navigation.goBack();
    else Keyboard.dismiss();
  };

  if (hasBlockingFailure) return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    {presentation === 'overlay' && onDismiss ? <View style={styles.errorHeader}><Button variant="tertiary" size="sm" onPress={onDismiss}>Cancel</Button></View> : null}
    <ErrorState message="Search is unavailable right now. Check your connection and try again." onRetry={retry} />
  </SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={presentation === 'overlay' ? ['top', 'bottom'] : ['top']}>
      <View style={[styles.shell, expanded && styles.expandedShell]}>
        <View style={styles.headingRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
            {!compact ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>Find products and seller stores across AfriClay.</Text> : null}
          </View>
          {__DEV__ ? <Button size="sm" variant="tertiary" onPress={() => navigation.navigate('UiPreview')}>UI preview</Button> : null}
        </View>
        <SearchField
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onSubmit={submit}
          onCancel={cancel}
          showCancel={presentation === 'overlay' || compact}
          autoFocus={presentation === 'screen' && compact}
          onKeyPress={event => {
            if (event.nativeEvent.key === 'Escape') { cancel(); return; }
            if (event.nativeEvent.key === 'ArrowDown') setSelectedIndex(current => Math.min(flatResults.length - 1, current + 1));
            if (event.nativeEvent.key === 'ArrowUp') setSelectedIndex(current => Math.max(0, current - 1));
            if (event.nativeEvent.key === 'Enter') submit();
          }}
        />

        {!query.trim() ? (
          <View style={styles.discovery}>
            {recent.length > 0 ? <View style={styles.block}>
              <View style={styles.sectionHeadingRow}><Text style={[styles.sectionTitle, { color: colors.text }]}>Recent searches</Text><Button size="sm" variant="tertiary" onPress={() => { void recentSearches.clear(); setRecent([]); }}>Clear all</Button></View>
              {recent.map(item => <View key={item} style={[styles.recentRow, { borderBottomColor: colors.border }]}>
                <Pressable style={styles.recentAction} onPress={() => setQuery(item)} accessibilityRole="button" accessibilityLabel={`Search for ${item}`}>
                  <Clock3 size={18} color={colors.textMuted} /><Text numberOfLines={1} style={[styles.recentText, { color: colors.text }]}>{item}</Text>
                </Pressable>
                <Button variant="icon" size="sm" icon={<Trash2 size={17} color={colors.textMuted} />} accessibilityLabel={`Remove ${item} from recent searches`} onPress={() => { void recentSearches.remove(item).then(setRecent); }} />
              </View>)}
            </View> : null}
            <View style={[styles.discoveryCard, { backgroundColor: colors.accentSoft }]}>
              <PackageSearch size={26} color={colors.accentPressed} />
              <View style={styles.discoveryCopy}><Text style={[styles.discoveryTitle, { color: colors.text }]}>Search the marketplace</Text><Text style={[styles.supportingText, { color: colors.textMuted }]}>Search product names, descriptions, seller names, and locations.</Text></View>
            </View>
          </View>
        ) : loading ? (
          <View style={styles.results}>
            {slow ? <View style={[styles.notice, { backgroundColor: colors.secondarySoft }]}><Text style={[styles.noticeText, { color: colors.text }]}>This is taking longer than usual.</Text><Button size="sm" variant="tertiary" onPress={retry}>Retry</Button></View> : null}
            {Array.from({ length: 6 }).map((_, index) => <View key={index} style={styles.skeletonRow}><View style={[styles.skeletonImage, { backgroundColor: colors.skeleton }]} /><View style={styles.skeletonCopy}><View style={[styles.skeletonTitle, { backgroundColor: colors.skeleton }]} /><View style={[styles.skeletonMeta, { backgroundColor: colors.skeleton }]} /></View></View>)}
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.key}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={flatResults.length ? styles.results : styles.emptyResults}
            ListHeaderComponent={<>
              {hasCachedFailure ? <View style={[styles.notice, { backgroundColor: colors.secondarySoft }]}><Text style={[styles.noticeText, { color: colors.text }]}>Showing saved results. New results could not be loaded.</Text><Button size="sm" variant="tertiary" onPress={retry}>Retry</Button></View> : null}
              <View style={styles.filterRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: availableOnly }} onPress={() => setAvailableOnly(value => !value)} style={({ pressed }) => [styles.filterChip, { backgroundColor: availableOnly ? colors.accent : pressed ? colors.accentSoft : colors.surface, borderColor: availableOnly ? colors.accent : colors.border }]}><Text style={{ color: availableOnly ? colors.surface : colors.text, fontWeight: '600' }}>In stock only</Text></Pressable><Text style={[styles.resultCount, { color: colors.textMuted }]}>{flatResults.length} result{flatResults.length === 1 ? '' : 's'}</Text></View>
            </>}
            renderSectionHeader={({ section }) => <Text style={[styles.sectionHeader, { color: colors.text }]}>{section.title}</Text>}
            renderItem={({ item }) => {
              const index = flatResults.findIndex(result => result.key === item.key);
              const selected = index === selectedIndex;
              return <Pressable
                onPress={() => openResult(item)}
                onFocus={() => setSelectedIndex(index)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.result, { backgroundColor: pressed || selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.focusRing : colors.border }]}
              >
                {item.imageUrl ? <CatalogImage uri={item.imageUrl} label={item.title} style={styles.resultImage} /> : <View style={[styles.resultIcon, { backgroundColor: colors.accentSoft }]}>{item.type === 'seller' ? <Store size={22} color={colors.accent} /> : <PackageSearch size={22} color={colors.accent} />}</View>}
                <View style={styles.resultCopy}><View style={styles.resultType}>{item.type === 'seller' ? <Store size={15} color={colors.accent} /> : <PackageSearch size={15} color={colors.accent} />}<Text style={[styles.typeText, { color: colors.accentPressed }]}>{item.type === 'seller' ? 'Seller' : 'Product'}</Text></View><Match text={item.title} query={debouncedQuery} color={colors.text} highlight={colors.accentPressed} /><Text numberOfLines={1} style={[styles.resultMeta, { color: colors.textMuted }]}>{item.meta}</Text></View>
              </Pressable>;
            }}
            ListEmptyComponent={<EmptyState title="No matches found" description="Try a product name, seller, or location." />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorHeader: { minHeight: 56, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  shell: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  expandedShell: { maxWidth: 920, paddingHorizontal: theme.spacing.xl },
  headingRow: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  title: { fontSize: theme.typography.h2.fontSize, lineHeight: theme.typography.h2.lineHeight, fontFamily: 'Inter_800ExtraBold' },
  subtitle: { marginTop: theme.spacing.xs, fontSize: theme.typography.small.fontSize },
  discovery: { paddingVertical: theme.spacing.lg, gap: theme.spacing.lg },
  block: { gap: theme.spacing.sm },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: theme.typography.h3.fontSize, lineHeight: theme.typography.h3.lineHeight },
  recentRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  recentAction: { flex: 1, minWidth: 0, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.smd },
  recentText: { flex: 1, minWidth: 0, fontSize: theme.typography.body.fontSize },
  discoveryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.smd, padding: theme.spacing.md, borderRadius: theme.radii.surface },
  discoveryCopy: { flex: 1, minWidth: 0 },
  discoveryTitle: { fontFamily: 'Inter_700Bold', fontSize: theme.typography.body.fontSize, marginBottom: theme.spacing.xs },
  supportingText: { fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
  results: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl },
  emptyResults: { flexGrow: 1, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl },
  filterRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  filterChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderWidth: 1, borderRadius: theme.radii.pill },
  resultCount: { fontSize: theme.typography.small.fontSize },
  sectionHeader: { fontFamily: 'Inter_700Bold', fontSize: theme.typography.h3.fontSize, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  result: { minHeight: 80, padding: theme.spacing.smd, borderRadius: theme.radii.control, borderWidth: 2, marginBottom: theme.spacing.sm, flexDirection: 'row', alignItems: 'center' },
  resultImage: { width: 58, height: 58, borderRadius: theme.radii.sm },
  resultIcon: { width: 58, height: 58, borderRadius: theme.radii.sm, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1, minWidth: 0, marginLeft: theme.spacing.smd },
  resultType: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: 2 },
  typeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'uppercase' },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight },
  resultMeta: { fontSize: theme.typography.small.fontSize, marginTop: 2 },
  notice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, paddingLeft: theme.spacing.md, paddingRight: theme.spacing.xs, borderRadius: theme.radii.control, marginBottom: theme.spacing.md },
  noticeText: { flex: 1, minWidth: 0, fontSize: theme.typography.small.fontSize },
  skeletonRow: { minHeight: 80, padding: theme.spacing.smd, flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  skeletonImage: { width: 58, height: 58, borderRadius: theme.radii.sm },
  skeletonCopy: { flex: 1, marginLeft: theme.spacing.smd, gap: theme.spacing.sm },
  skeletonTitle: { width: '58%', height: 15, borderRadius: theme.radii.sm },
  skeletonMeta: { width: '38%', height: 12, borderRadius: theme.radii.sm },
});
