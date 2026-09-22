import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { CircleHelp, Home, MessageCircle, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, ShoppingCart, Tag, User, type LucideIcon } from 'lucide-react-native';
import { useResponsiveLayout, contentLimit, authRoutes } from '../../contexts/ResponsiveLayoutContext';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../services/productService';
import { catalogKeys } from '../../services/catalogQueries';
import { categoryIconMap } from '../domain/CategoryCard';
import { theme } from '../../theme';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { Tooltip } from '../ui/Tooltip';
import { canAccessSellerTools } from '../../utils/roles';

type Destination = { tab?: 'Home' | 'Search' | 'Sell' | 'Messages' | 'Profile'; screen?: string; params?: object; root?: 'Cart' };
type Props = PropsWithChildren<{ route: string; category?: string; navigate: (destination: Destination) => void }>;

const CollapsedSidebar = createContext(false);
const Action = ({ label, icon: Icon, onPress, active = false, iconOnly = false, expanded }: {
  label: string; icon: LucideIcon; onPress: () => void; active?: boolean; iconOnly?: boolean; expanded?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const collapsed = useContext(CollapsedSidebar);
  return <Tooltip label={label}><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, expanded }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress}
    style={({ pressed }) => [styles.action, (iconOnly || collapsed) && styles.iconAction, active && styles.active, (focused || pressed) && styles.focused]}>
    <Icon size={20} color={theme.colors.primary.dark} />
    {!iconOnly && !collapsed && <Text style={styles.actionText}>{label}</Text>}
  </Pressable></Tooltip>;
};

export const MarketplaceShell = ({ children, route, category, navigate }: Props) => {
  const { isExpanded, sidebarWidth } = useResponsiveLayout();
  const { user } = useAuth();
  const canSell = canAccessSellerTools(user?.role);
  const categoriesQuery = useQuery({ queryKey: catalogKeys.categories, queryFn: productService.fetchCategories });
  const cart = useCart();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotionSafe();
  const railWidth = useRef(new Animated.Value(sidebarWidth)).current;
  useEffect(() => {
    const animation = Animated.timing(railWidth, { toValue: collapsed ? 64 : sidebarWidth, duration: reducedMotion ? 0 : 160, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [collapsed, sidebarWidth, reducedMotion, railWidth]);
  const focused = authRoutes.has(route);
  const search = () => navigate({ tab: 'Search', screen: 'SearchLanding', params: { query } });
  return <View style={styles.mobile}>
    {isExpanded && !focused && <View style={styles.header}>
      <Action label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} icon={collapsed ? PanelLeftOpen : PanelLeftClose} expanded={!collapsed} onPress={() => setCollapsed(value => !value)} iconOnly />
      <Pressable accessibilityRole="button" accessibilityLabel="AfriClay home" onPress={() => navigate({ tab: 'Home', screen: 'HomeFeed' })} style={styles.brand}>
        <Image source={require('../../../assets/africlay-brand-v1.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.brandText}>AfriClay</Text>
      </Pressable>
      <View style={styles.search}>
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search"
          placeholder="Search AfriClay" accessibilityLabel="Search products, services and sellers" style={styles.input} />
        <Action label="Search" icon={Search} onPress={search} iconOnly />
      </View>
      <Action label={`Cart, ${cart.itemCount} items`} icon={ShoppingCart} onPress={() => navigate({ root: 'Cart' })} iconOnly />
      <Action label="Account" icon={User} onPress={() => navigate({ tab: 'Profile', screen: 'ProfileOverview' })} iconOnly />
    </View>}
    <View style={styles.body}>
      {isExpanded && !focused && <CollapsedSidebar.Provider value={collapsed}><Animated.View style={[styles.sidebar, { width: railWidth, overflow: 'hidden' }]}><ScrollView contentContainerStyle={styles.sidebarContent}>
        {!collapsed && <Text style={styles.userName}>{user?.name ?? 'AfriClay Guest'}</Text>}
        <Action label="View profile" icon={User} active={route === 'ProfileOverview'} onPress={() => navigate({ tab: 'Profile', screen: 'ProfileOverview' })} />
        <Action label="Home" icon={Home} active={route === 'HomeFeed'} onPress={() => navigate({ tab: 'Home', screen: 'HomeFeed' })} />
        <Action label="Discover" icon={Search} active={route === 'SearchLanding'} onPress={() => navigate({ tab: 'Search', screen: 'SearchLanding' })} />
        <Action label="Messages" icon={MessageCircle} active={route.includes('Conversation')} onPress={() => navigate({ tab: 'Messages' })} />
        {canSell && <Action label="Sell" icon={Plus} active={['StartSelling', 'DashboardHome', 'ProductManagement', 'ServiceManagement', 'AddEditProduct', 'SellerOrders'].includes(route)} onPress={() => navigate({ tab: 'Sell' })} />}
        {collapsed ? <View style={styles.divider} /> : <Text style={styles.section}>Shop by category</Text>}
        {categoriesQuery.isError ? <Action label="Retry categories" icon={Tag} onPress={() => void categoriesQuery.refetch()} /> : (categoriesQuery.data ?? []).map(item => <Action key={item.id} label={item.label} icon={categoryIconMap[item.icon] ?? Tag}
          active={route === 'ProductListing' && category === item.slug}
          onPress={() => navigate({ tab: 'Home', screen: 'ProductListing', params: { categoryId: item.slug } })} />)}
        {collapsed ? <View style={styles.divider} /> : <Text style={styles.section}>Your account</Text>}
        <Action label="Settings" icon={Settings} active={route === 'Settings'} onPress={() => navigate({ tab: 'Profile', screen: 'Settings' })} />
        <Action label="Help & support" icon={CircleHelp} active={route === 'SupportHelp'} onPress={() => navigate({ tab: 'Profile', screen: 'SupportHelp' })} />
      </ScrollView></Animated.View></CollapsedSidebar.Provider>}
      <View style={[styles.main, (focused || !isExpanded) && { padding: 0 }]}><View style={[styles.route, isExpanded && { maxWidth: contentLimit(route) }]}>{children}</View></View>
    </View>
  </View>;
};

const styles = StyleSheet.create({
  mobile: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    minHeight: 80, backgroundColor: theme.colors.white, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44 },
  logo: { width: 36, height: 36 },
  brandText: { fontSize: 24, fontWeight: '800', color: theme.colors.primary.dark },
  search: { flex: 1, minWidth: 160, maxWidth: 720, flexDirection: 'row', marginLeft: theme.spacing.sm, marginRight: 'auto',
    minHeight: 48, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md },
  input: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: theme.spacing.md, fontSize: 16, color: theme.colors.ink },
  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  sidebar: { flexGrow: 0, flexShrink: 0, backgroundColor: theme.colors.white, borderRightWidth: 1, borderRightColor: theme.colors.border },
  sidebarContent: { padding: theme.spacing.sm, paddingBottom: theme.spacing.xl },
  userName: { padding: theme.spacing.sm, color: theme.colors.ink, fontSize: 18, fontWeight: '700' },
  section: { marginTop: theme.spacing.lg, padding: theme.spacing.sm, fontWeight: '700', color: theme.colors.muted },
  action: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44, minWidth: 44,
    padding: theme.spacing.sm, borderWidth: 2, borderColor: 'transparent', borderRadius: theme.radii.sm },
  actionText: { flex: 1, minWidth: 0, color: theme.colors.ink, fontSize: 14 },
  iconAction: { width: 44, flexShrink: 0, justifyContent: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginVertical: theme.spacing.sm },
  active: { backgroundColor: theme.colors.primary.tint },
  focused: { borderColor: theme.colors.primary.DEFAULT },
  main: { flex: 1, minWidth: 0, padding: theme.spacing.md, alignItems: 'center', backgroundColor: theme.colors.cream },
  route: { flex: 1, width: '100%', minWidth: 0 },
  focusPage: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.cream },
});
