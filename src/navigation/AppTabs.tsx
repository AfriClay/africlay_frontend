import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Grid2X2, Home, PackageCheck, Plus, User, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { SellTab } from './SellTab';
import { ProfileStack } from './ProfileStack';
import { theme } from '../theme';
import { useResponsiveLayout } from '../contexts/ResponsiveLayoutContext';
import { useAuth } from '../hooks/useAuth';
import { canAccessSellerTools } from '../utils/roles';
import { CompactSearchPanel } from '../components/search/CompactSearchPanel';
import type { RootStackParamList } from './RootNavigator';
import { CompactSearchContext } from '../contexts/CompactSearchContext';

export type AppTabParamList = {
  Home: undefined;
  Search: undefined;
  Sell: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type CompactItem = {
  name: 'Home' | 'CategoriesAction' | 'Sell' | 'OrdersAction' | 'Profile';
  label: string;
  icon: LucideIcon;
};

const compactItems: CompactItem[] = [
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'CategoriesAction', label: 'Categories', icon: Grid2X2 },
  { name: 'Sell', label: 'Sell', icon: Plus },
  { name: 'OrdersAction', label: 'Orders', icon: PackageCheck },
  { name: 'Profile', label: 'Profile', icon: User },
];

const nestedRouteName = (route: BottomTabBarProps['state']['routes'][number] | undefined, fallback: string) => {
  const nested = route?.state as { index?: number; routes?: Array<{ name: string }> } | undefined;
  return nested?.routes?.[nested.index ?? 0]?.name ?? fallback;
};

const AppTabsNavigator = ({ onOpenHome, onOpenCategories, onOpenOrders, onOpenProfile }: {
  onOpenHome: () => void;
  onOpenCategories: () => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { isCompact } = useResponsiveLayout();
  const { user } = useAuth();
  const canSell = canAccessSellerTools(user?.role);

  const TabBar = useCallback(({ state, navigation }: BottomTabBarProps) => (
    <View style={[styles.tabBar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
      {compactItems.filter(item => item.name !== 'Sell' || canSell).map(item => {
        const activeTab = state.routes[state.index]?.name;
        const homeScreen = nestedRouteName(state.routes.find(route => route.name === 'Home'), 'HomeFeed');
        const profileScreen = nestedRouteName(state.routes.find(route => route.name === 'Profile'), 'ProfileOverview');
        const isFocused = item.name === 'Home' ? activeTab === 'Home' && homeScreen !== 'ProductListing' :
          item.name === 'CategoriesAction' ? activeTab === 'Home' && homeScreen === 'ProductListing' :
          item.name === 'OrdersAction' ? activeTab === 'Profile' && ['MyOrders', 'OrderDetails'].includes(profileScreen) :
          item.name === 'Profile' ? activeTab === 'Profile' && !['MyOrders', 'OrderDetails'].includes(profileScreen) :
          activeTab === 'Sell';
        const Icon = item.icon;
        const onPress = () => {
          if (item.name === 'Home') { onOpenHome(); return; }
          if (item.name === 'CategoriesAction') { onOpenCategories(); return; }
          if (item.name === 'OrdersAction') { onOpenOrders(); return; }
          if (item.name === 'Profile') { onOpenProfile(); return; }
          navigation.navigate('Sell');
        };

        if (item.name === 'Sell') {
          return (
            <Pressable key={item.name} onPress={onPress} style={({ pressed }) => [styles.sellButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Sell" accessibilityState={{ selected: isFocused }}>
              <View style={[styles.sellCircle, isFocused ? styles.sellCircleFocused : null]}><Icon color={theme.colors.white} size={26} strokeWidth={2} /></View>
              <Text style={styles.sellLabel}>Sell</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={item.name} onPress={onPress} style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: isFocused }}>
            <View style={[styles.iconPill, isFocused && styles.iconPillActive]}><Icon color={isFocused ? theme.colors.primary.DEFAULT : theme.colors.muted} size={22} strokeWidth={1.8} /></View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={2} style={[styles.tabLabel, isFocused ? styles.tabLabelActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  ), [canSell, insets.bottom, onOpenCategories, onOpenHome, onOpenOrders, onOpenProfile]);

  return (
    <Tab.Navigator backBehavior="history" screenOptions={{ headerShown: false }} tabBar={isCompact ? TabBar : () => null}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Sell" component={SellTab} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

const AppTabsContent = () => {
  const { isCompact } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'AppTabs'>>();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (isCompact) return;
    setSearchOpen(false);
  }, [isCompact]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openHome = useCallback(() => navigation.navigate('AppTabs', { screen: 'Home', params: { screen: 'HomeFeed' } }), [navigation]);
  const openCategories = useCallback(() => navigation.navigate('AppTabs', { screen: 'Home', params: { screen: 'ProductListing' } }), [navigation]);
  const openOrders = useCallback(() => {
    if (!user) { navigation.navigate('AuthStack'); return; }
    navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'MyOrders' } });
  }, [navigation, user]);
  const openProfile = useCallback(() => navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'ProfileOverview' } }), [navigation]);
  const openProduct = useCallback((productId: string) => navigation.navigate('AppTabs', {
    screen: 'Home', params: { screen: 'ProductDetails', params: { productId } },
  }), [navigation]);
  const openSeller = useCallback((sellerId: string) => navigation.navigate('AppTabs', {
    screen: 'Home', params: { screen: 'SellerStore', params: { sellerId } },
  }), [navigation]);
  const compactSearch = useMemo(() => ({ open: openSearch }), [openSearch]);

  return (
    <CompactSearchContext.Provider value={compactSearch}>
      <View style={styles.appRoot}>
        <View style={styles.appRoot} accessibilityElementsHidden={isCompact && searchOpen} importantForAccessibility={isCompact && searchOpen ? 'no-hide-descendants' : 'auto'}>
          <AppTabsNavigator onOpenHome={openHome} onOpenCategories={openCategories} onOpenOrders={openOrders} onOpenProfile={openProfile} />
        </View>
        {isCompact && <CompactSearchPanel visible={searchOpen} onClose={() => setSearchOpen(false)} onOpenProduct={openProduct} onOpenSeller={openSeller} />}
      </View>
    </CompactSearchContext.Provider>
  );
};

export const AppTabs = () => <AppTabsContent />;

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', overflow: 'visible', backgroundColor: theme.colors.white, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: theme.spacing.xs },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 48 },
  tabLabel: { marginTop: theme.spacing.xs, ...theme.typography.marketplace.navigation, color: theme.colors.muted },
  tabLabelActive: { color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  sellButton: { position: 'relative', flex: 1, minHeight: 72, justifyContent: 'center', alignItems: 'center', transform: [{ translateY: -14 }] },
  sellCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary.DEFAULT, borderWidth: 4, borderColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', ...theme.shadows.md },
  sellCircleFocused: { backgroundColor: theme.colors.primary.dark, borderColor: theme.colors.primary.tint },
  sellLabel: { marginTop: 2, color: theme.colors.primary.DEFAULT, ...theme.typography.marketplace.navigation },
  iconPill: { width: 48, height: 30, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: theme.colors.primary.tint },
  pressed: { opacity: 0.68 },
});
