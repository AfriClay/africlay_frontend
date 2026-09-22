import { useCallback } from 'react';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Home, MessageCircle, Plus, Search, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { SellTab } from './SellTab';
import { MessagesStack } from './MessagesStack';
import { ProfileStack } from './ProfileStack';
import { SideMenu } from '../components/SideMenu';
import { SideMenuProvider } from '../contexts/SideMenuContext';
import { theme } from '../theme';
import { useResponsiveLayout } from '../contexts/ResponsiveLayoutContext';
import { useAuth } from '../hooks/useAuth';
import { canAccessSellerTools } from '../utils/roles';

export type AppTabParamList = {
  Home: undefined;
  Search: undefined;
  Sell: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const tabItems = [
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'Search', label: 'Search', icon: Search },
  { name: 'Sell', label: 'Sell', icon: Plus },
  { name: 'Messages', label: 'Messages', icon: MessageCircle },
  { name: 'Profile', label: 'Profile', icon: User },
] as const;

const AppTabsNavigator = () => {
  const insets = useSafeAreaInsets();
  const { isCompact } = useResponsiveLayout();
  const { user } = useAuth();
  const canSell = canAccessSellerTools(user?.role);

  const TabBar = useCallback(({ state, navigation }: BottomTabBarProps) => (
    <View style={[styles.tabBar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabItems.filter(item => item.name !== 'Sell' || canSell).map(item => {
        const isFocused = state.routes[state.index]?.name === item.name;
        const Icon = item.icon;
        const route = state.routes.find(route => route.name === item.name);
        const onPress = () => {
          if (!route) return;
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(item.name);
        };
        const onLongPress = () => { if (route) navigation.emit({ type: 'tabLongPress', target: route.key }); };

        if (item.name === 'Sell') {
          return (
            <Pressable key={item.name} onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.sellButton, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Sell" accessibilityState={{ selected: isFocused }}>
              <View style={[styles.sellCircle, isFocused ? styles.sellCircleFocused : null]}><Icon color={theme.colors.white} size={26} strokeWidth={2} /></View>
              <Text style={styles.sellLabel}>Sell</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={item.name} onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: isFocused }}>
            <View style={[styles.iconPill, isFocused && styles.iconPillActive]}><Icon color={isFocused ? theme.colors.primary.DEFAULT : theme.colors.muted} size={22} strokeWidth={1.8} /></View>
            <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  ), [canSell, insets.bottom]);

  return (
    <Tab.Navigator backBehavior="history" screenOptions={{ headerShown: false }} tabBar={isCompact ? TabBar : () => null}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Sell" component={SellTab} />
      <Tab.Screen name="Messages" component={MessagesStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export const AppTabs = () => {
  const { isCompact } = useResponsiveLayout();
  return (
  <SideMenuProvider>
    <View style={styles.appRoot}>
      <AppTabsNavigator />
      {isCompact && <SideMenu />}
    </View>
  </SideMenuProvider>
  );
};

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: theme.colors.white, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: theme.spacing.sm },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 48 },
  tabLabel: { marginTop: theme.spacing.xs, ...theme.typography.marketplace.navigation, color: theme.colors.muted },
  tabLabelActive: { color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  sellButton: { position: 'relative', flex: 1, minHeight: 64, justifyContent: 'center', alignItems: 'center' },
  sellCircle: { width: 44, height: 40, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm },
  sellCircleFocused: { backgroundColor: theme.colors.primary.dark },
  sellLabel: { marginTop: 2, color: theme.colors.primary.DEFAULT, ...theme.typography.marketplace.navigation },
  iconPill: { width: 48, height: 30, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: theme.colors.primary.tint },
});
