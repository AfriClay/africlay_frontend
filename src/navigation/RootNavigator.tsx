import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { MarketplaceShell } from '../components/layout/MarketplaceShell';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { Cart } from '../screens/cart/Cart';
import { Checkout } from '../screens/cart/Checkout';
import { Notifications } from '../screens/notifications/Notifications';
import { Splash } from '../screens/auth/Splash';
import { useAuth } from '../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';


export type RootStackParamList = {
  AuthStack: undefined;
  AppTabs: { screen?: 'Home' | 'Search' | 'Sell' | 'Messages' | 'Profile'; params?: { screen?: string; params?: object } } | undefined;
  Cart: undefined;
  Checkout: { orderId?: string } | undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, isGuest, initialized } = useAuth();
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

  return (
    <>
    <NavigationContainer ref={navigationRef} onReady={updateRoute} onStateChange={updateRoute}>
      <MarketplaceShell route={currentRoute.name} category={currentRoute.category} navigate={destination => {
        if (!navigationRef.isReady()) return;
        if (destination.root) navigationRef.navigate(destination.root);
        else navigationRef.navigate('AppTabs', { screen: destination.tab, params: destination.screen ? { screen: destination.screen, params: destination.params } : undefined });
      }}>
      <Stack.Navigator key={appStateKey} screenOptions={{ headerShown: false }}>
        {!user && !isGuest ? (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="AppTabs" component={AppTabs} />
            <Stack.Screen name="Cart" component={Cart} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Checkout" component={Checkout} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Notifications" component={Notifications} options={{ presentation: 'modal' }} />
            {isGuest ? <Stack.Screen name="AuthStack" component={AuthStack} options={{ presentation: 'modal' }} /> : null}
          </>
        )}
      </Stack.Navigator>
      </MarketplaceShell>
    </NavigationContainer>
    <StatusBar style="dark" />
    </>
  );
};
