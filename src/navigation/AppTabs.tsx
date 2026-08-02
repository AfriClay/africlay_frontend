import { useCallback, useState } from 'react';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Home, MessageCircle, Plus, Search, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { MessagesStack } from './MessagesStack';
import { ProfileStack } from './ProfileStack';
import { theme } from '../theme';
import { BottomSheet } from '../components/ui/BottomSheet';

const Tab = createBottomTabNavigator();

const tabItems = [
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'Search', label: 'Search', icon: Search },
  { name: 'Sell', label: 'Sell', icon: Plus },
  { name: 'Messages', label: 'Messages', icon: MessageCircle },
  { name: 'Profile', label: 'Profile', icon: User },
] as const;

export const AppTabs = () => {
  const [sellSheetVisible, setSellSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const onSellPress = useCallback(() => setSellSheetVisible(true), []);
  const closeSheet = useCallback(() => setSellSheetVisible(false), []);

  const TabBar = useCallback(({ state, navigation }: BottomTabBarProps) => (
    <View style={[styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabItems.map(item => {
        const isFocused = state.routes[state.index]?.name === item.name;
        const Icon = item.icon;

        if (item.name === 'Sell') {
          return (
            <Pressable
              key={item.name}
              onPress={onSellPress}
              style={styles.sellButton}
              accessibilityRole="button"
              accessibilityLabel="Sell"
            >
              <View style={styles.sellCircle}>
                <Icon color={theme.colors.white} size={26} strokeWidth={2} />
              </View>
              <Text style={styles.sellLabel}>Sell</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={item.name}
            onPress={() => navigation.navigate(item.name)}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isFocused }}
          >
            <Icon color={isFocused ? theme.colors.primary.DEFAULT : theme.colors.muted} size={22} strokeWidth={1.9} />
            {item.name === 'Messages' ? <View style={styles.unreadDot} /> : null}
            <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  ), [insets.bottom, onSellPress]);

  return (
    <>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={TabBar}>
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Search" component={SearchStack} />
        <Tab.Screen name="Messages" component={MessagesStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
      <BottomSheet
        visible={sellSheetVisible}
        onClose={closeSheet}
        title="Seller onboarding is coming soon"
        description="Seller onboarding is coming in a future update — continue as a buyer for now?"
        actionLabel="Continue as Buyer"
        onAction={closeSheet}
      />
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
  },
  tabLabel: {
    marginTop: theme.spacing.xs,
    fontSize: 11,
    color: theme.colors.muted,
  },
  tabLabelActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  sellButton: {
    position: 'relative',
    bottom: 13,
    flex: 1,
    minHeight: 70,
    alignItems: 'center',
  },
  sellCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  sellLabel: {
    marginTop: 2,
    color: theme.colors.primary.DEFAULT,
    fontSize: 11,
    fontWeight: '700',
  },
  unreadDot: {
    position: 'absolute',
    top: 5,
    right: 18,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary.DEFAULT,
  },
});
