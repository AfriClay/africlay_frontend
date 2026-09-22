import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, Search } from 'lucide-react-native';
import { ServiceCard } from '../../components/domain/ServiceCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { productService } from '../../services/productService';
import { theme } from '../../theme';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { serviceService, ServiceCategory } from '../../services/serviceService';
import { ErrorState } from '../../components/ui/ErrorState';

type ServicesNavigation = NativeStackNavigationProp<HomeStackParamList, 'Services'>;

export const Services: React.FC = () => {
  const { isExpanded, isWeb } = useResponsiveLayout();
  const Content = isWeb ? ScrollView : View;
  const [contentWidth, setContentWidth] = useState(0);
  const columns = Math.max(2, Math.min(4, Math.floor((contentWidth - 48) / 236)));
  const navigation = useNavigation<ServicesNavigation>();
  const [query, setQuery] = useState('');
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: productService.fetchServices });
  const categoriesQuery = useQuery({ queryKey: ['service-categories'], queryFn: serviceService.categories });
  const { data: services = [], isLoading } = servicesQuery;
  const serviceCategories = categoriesQuery.data ?? [];
  const [categoryId, setCategoryId] = useState<string>();

  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter(service => (!categoryId || service.categoryId === categoryId) &&
      (!normalized || `${service.title} ${service.description} ${service.category}`.toLowerCase().includes(normalized)));
  }, [query, services, categoryId]);

  const renderCategory = ({ item }: { item: ServiceCategory }) => {
    return <Pressable key={item.id} style={styles.category} onPress={() => setCategoryId(current => current === item.id ? undefined : item.id)} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: categoryId === item.id }}>
      <View style={styles.categoryIcon}><BriefcaseBusiness color={theme.colors.primary.DEFAULT} size={22} /></View>
      <Text style={styles.categoryLabel} numberOfLines={2}>{item.name}</Text>
    </Pressable>;
  };

  if (servicesQuery.isError || categoriesQuery.isError) return <ErrorState message="Unable to load services." onRetry={() => { void servicesQuery.refetch(); void categoriesQuery.refetch(); }} />;

  return (
    <SafeAreaView style={styles.container} onLayout={event => setContentWidth(event.nativeEvent.layout.width)}>
      <Content style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Services</Text>
        <Search color={theme.colors.ink} size={22} />
      </View>
      <View style={styles.searchBar}>
        <Search color={theme.colors.muted} size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search trusted services"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
          accessibilityLabel="Search services"
        />
      </View>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Find trusted experts for all your needs</Text>
          <Text style={styles.heroText}>Explore services from local providers.</Text>
        </View>
        <Pressable style={styles.heroButton} accessibilityRole="button" onPress={() => { setQuery(''); setCategoryId(undefined); }}>
          <Text style={styles.heroButtonText}>Browse All</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>Popular Services</Text>
      {isExpanded ? <View style={[styles.categories, styles.categoryGrid]}>{serviceCategories.map(item => renderCategory({ item }))}</View> : <FlatList
        style={isWeb && { flexGrow: 0 }}
        data={serviceCategories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.categories}
      />}
      <Text style={styles.sectionTitle}>Recommended for you</Text>
      {isLoading ? (
        <View style={styles.skeleton} />
      ) : isExpanded ? (
        filteredServices.length ? <View style={[styles.services, styles.serviceGrid]}>{filteredServices.map(item =>
          <View key={item.id} style={{ width: `${100 / columns}%`, maxWidth: 320, padding: theme.spacing.sm }}>
            <ServiceCard grid service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.slug ?? item.id })} />
          </View>)}
        </View> : <EmptyState title="No services found" description="Try another service or clear your search." />
      ) : (
        <FlatList
          key={isExpanded ? `grid-${columns}` : 'horizontal'}
          data={filteredServices}
          horizontal={!isExpanded}
          numColumns={isExpanded ? columns : 1}
          scrollEnabled={!isExpanded}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={isExpanded && { width: `${100 / columns}%`, maxWidth: 320, padding: theme.spacing.sm }}>
              <ServiceCard grid={isExpanded} service={item} onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.slug ?? item.id })} />
            </View>
          )}
          ListEmptyComponent={<EmptyState title="No services found" description="Try another service or clear your search." />}
          contentContainerStyle={styles.services}
        />
      )}
      </Content>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  searchBar: { margin: theme.spacing.lg, marginBottom: theme.spacing.md, minHeight: 48, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, marginLeft: theme.spacing.sm, color: theme.colors.ink, fontSize: theme.typography.body.fontSize },
  hero: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.primary.DEFAULT, minHeight: 130, justifyContent: 'space-between' },
  heroCopy: { maxWidth: '82%' },
  heroTitle: { color: theme.colors.white, fontSize: theme.typography.h3.fontSize, lineHeight: 24, fontWeight: '800' },
  heroText: { color: theme.colors.white, opacity: 0.86, marginTop: theme.spacing.xs, fontSize: theme.typography.small.fontSize },
  heroButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.sm, backgroundColor: theme.colors.secondary.DEFAULT },
  heroButtonText: { color: theme.colors.ink, fontWeight: '800' },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  categories: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  category: { width: 104, alignItems: 'center', marginRight: theme.spacing.sm },
  categoryIcon: { width: 52, height: 52, borderRadius: theme.radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white, ...theme.shadows.sm },
  categoryLabel: { marginTop: theme.spacing.sm, color: theme.colors.ink, textAlign: 'center', fontSize: 11, lineHeight: 15 },
  services: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  skeleton: { height: 210, marginHorizontal: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border },
});
