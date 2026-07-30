import React, { useCallback, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { MessagesStack } from './MessagesStack';
import { ProfileStack } from './ProfileStack';
import { theme } from '../theme';
import { Bell, Home, MessageCircle, Search, ShoppingBag, User } from 'lucide-react-native';
import { BottomSheet } from '../components/ui/BottomSheet';

const Tab = createBottomTabNavigator();

const tabItems = [
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'Search', label: 'Search', icon: Search },
  { name: 'Sell', label: 'Sell', icon: ShoppingBag },
  { name: 'Messages', label: 'Messages', icon: MessageCircle },
  { name: 'Profile', label: 'Profile', icon: User },
] as const;

export const AppTabs = () => {
  const [sellSheetVisible, setSellSheetVisible] = useState(false);

  const onSellPress = useCallback(() => setSellSheetVisible(true), []);
  const closeSheet = useCallback(() => setSellSheetVisible(false), []);

  const TabBar = useCallback((props: any) => {
    const { state, descriptors, navigation } = props;
    return (
      <View style={styles.tabBar}>
        {tabItems.map((item, index) => {
          const isFocused = state.index === index;
          const Icon = item.icon;
          if (item.name === 'Sell') {
            return (
              <Pressable key={item.name} onPress={onSellPress} style={styles.sellButton} accessibilityRole="button" accessibilityLabel="Sell" >
                <View style={styles.sellCircle}>
                  <Icon color={theme.colors.white} size={24} />
                </View>
              </Pressable>
            );
          }
          const onPress = () => navigation.navigate(item.name);
          return (
            <Pressable key={item.name} onPress={onPress} style={styles.tabItem} accessibilityRole="button" accessibilityLabel={item.label}>
              <Icon color={isFocused ? theme.colors.primary.DEFAULT : theme.colors.muted} size={22} />
              <Text style={[styles.tabLabel, { color: isFocused ? theme.colors.primary.DEFAULT : theme.colors.muted }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }, [onSellPress]);

  return (
    <>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <TabBar {...props} />}>
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
    height: 72,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.small.fontSize,
  },
  sellButton: {
    position: 'relative',
    bottom: 16,
  },
  sellCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});
