import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { MarketplaceShell } from '../components/layout/MarketplaceShell';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { Cart } from '../screens/cart/Cart';
import { Checkout } from '../screens/cart/Checkout';
import { Splash } from '../screens/auth/Splash';
import { useAuth } from '../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';
import { AdminPortal } from '../screens/admin/AdminPortal';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';
import { linking } from './linking';


export type RootStackParamList = {
  AuthStack: undefined;
  AppTabs: { screen?: 'Home' | 'Search' | 'Sell' | 'Profile'; params?: { screen?: string; params?: object } } | undefined;
  Cart: undefined;
  Checkout: { orderId?: string } | undefined;
  AdminPortal: undefined;
};

const Stack = createAppStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, isGuest, initialized } = useAuth();
  const stackOptions = useAppStackScreenOptions();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [currentRoute, setCurrentRoute] = useState<{ name: string; category?: string }>({ name: 'AuthStack' });
  const updateRoute = () => {
    const route = navigationRef.getCurrentRoute();
    if (route) setCurrentRoute({ name: route.name, category: (route.params as { categoryId?: string } | undefined)?.categoryId });
  };
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timeout = setTimeout(() => setMinimumSplashElapsed(true), 1200);
    return () => clearTimeout(timeout);
  }, []);

  if (!initialized || !minimumSplashElapsed) {
    if (Platform.OS === 'web') return null;
    return <><Splash /><StatusBar style="light" /></>;
  }

  const appStateKey = user ? 'member' : isGuest ? 'guest' : 'signed-out';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const navigator = (
    <Stack.Navigator key={isAdmin ? 'admin' : appStateKey} screenOptions={{ ...stackOptions, headerShown: false }}>
      {!user && !isGuest ? (
        <Stack.Screen name="AuthStack" component={AuthStack} />
      ) : isAdmin ? (
        <Stack.Screen name="AdminPortal" component={AdminPortal} />
      ) : (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen name="Cart" component={Cart} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
          <Stack.Screen name="Checkout" component={Checkout} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
          {isGuest ? <Stack.Screen name="AuthStack" component={AuthStack} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} /> : null}
        </>
      )}
    </Stack.Navigator>
  );

  return (
    <>
    <NavigationContainer ref={navigationRef} linking={linking} onReady={updateRoute} onStateChange={updateRoute}>
      {isAdmin ? navigator : <MarketplaceShell route={currentRoute.name} category={currentRoute.category} navigate={destination => {
        if (!navigationRef.isReady()) return;
        if (destination.root) navigationRef.navigate(destination.root);
        else navigationRef.navigate('AppTabs', { screen: destination.tab, params: destination.screen ? { screen: destination.screen, params: destination.params } : undefined });
      }}>
        {navigator}
      </MarketplaceShell>}
    </NavigationContainer>
    <StatusBar style="dark" />
    </>
  );
};
