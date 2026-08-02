import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
  AppTabs: { screen?: 'Home' | 'Search' | 'Messages' | 'Profile'; params?: { screen?: string; params?: object } } | undefined;
  Cart: undefined;
  Checkout: { orderId?: string } | undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, isGuest, initialized } = useAuth();
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMinimumSplashElapsed(true), 1200);
    return () => clearTimeout(timeout);
  }, []);

  if (!initialized || !minimumSplashElapsed) {
    return <><Splash /><StatusBar style="light" /></>;
  }

  const appStateKey = user ? 'member' : isGuest ? 'guest' : 'signed-out';

  return (
    <>
    <NavigationContainer>
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
    </NavigationContainer>
    <StatusBar style="dark" />
    </>
  );
};
