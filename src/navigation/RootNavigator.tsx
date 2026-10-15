import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { CommonActions, NavigationContainer, NavigatorScreenParams, useNavigationContainerRef } from '@react-navigation/native';
import { MarketplaceShell } from '../components/layout/MarketplaceShell';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { Cart } from '../screens/cart/Cart';
import { Checkout } from '../screens/cart/Checkout';
import { Splash } from '../screens/auth/Splash';
import { useAuth } from '../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';
import { SalesDashboard } from '../screens/admin/SalesDashboard';
import { FinanceDashboard } from '../screens/admin/FinanceDashboard';
import { SuperAdminDashboard } from '../screens/admin/SuperAdminDashboard';
import { OperationsLogin } from '../screens/admin/OperationsLogin';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';
import { linking } from './linking';
import type { AuthStackParamList } from './AuthStack';
import { canAccessOperations, hasStaffRole, isSuperAdmin } from '../utils/roles';


export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList> | undefined;
  AppTabs: { screen?: 'Home' | 'Search' | 'Sell' | 'Profile'; params?: { screen?: string; params?: object } } | undefined;
  Cart: undefined;
  Checkout: { orderId?: string } | undefined;
  SalesDashboard: undefined;
  FinanceDashboard: undefined;
  SuperAdminDashboard: undefined;
  OperationsLogin: undefined;
};

const Stack = createAppStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, initialized } = useAuth();
  const stackOptions = useAppStackScreenOptions();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [currentRoute, setCurrentRoute] = useState<{ name: string; category?: string }>({ name: 'HomeFeed' });
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

  const operationsAccess = canAccessOperations(user);
  const initialOperationsRoute = isSuperAdmin(user) ? 'SuperAdminDashboard'
    : hasStaffRole(user, 'sales_reviewer') ? 'SalesDashboard' : 'FinanceDashboard';

  const leaveAuthAfterSignIn = useCallback(() => {
    if (!user || !navigationRef.isReady()) return;
    const rootState = navigationRef.getRootState();
    if (!rootState) return;
    const activeRoute = rootState.routes[rootState.index ?? rootState.routes.length - 1];
    if (activeRoute?.name !== 'AuthStack') return;
    if (rootState.routes.length > 1) {
      navigationRef.dispatch({ ...CommonActions.goBack(), target: rootState.key });
    } else {
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'AppTabs' }] });
    }
  }, [navigationRef, user]);

  useEffect(() => { leaveAuthAfterSignIn(); }, [leaveAuthAfterSignIn]);

  if (!initialized || !minimumSplashElapsed) {
    if (Platform.OS === 'web') return null;
    return <><Splash /><StatusBar style="light" /></>;
  }

  const navigator = operationsAccess ? (
    <Stack.Navigator key="operations" initialRouteName={initialOperationsRoute} screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="OperationsLogin" component={OperationsLogin} />
      <Stack.Screen name="SalesDashboard" component={SalesDashboard} />
      <Stack.Screen name="FinanceDashboard" component={FinanceDashboard} />
      <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
    </Stack.Navigator>
  ) : (
    <Stack.Navigator key="marketplace" initialRouteName="AppTabs" screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="AppTabs" component={AppTabs} />
      <Stack.Screen name="Cart" component={Cart} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
      <Stack.Screen name="Checkout" component={Checkout} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
      <Stack.Screen name="AuthStack" component={AuthStack} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
      <Stack.Screen name="SalesDashboard" component={SalesDashboard} />
      <Stack.Screen name="FinanceDashboard" component={FinanceDashboard} />
      <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
      <Stack.Screen name="OperationsLogin" component={OperationsLogin} />
    </Stack.Navigator>
  );

  return (
    <>
    <NavigationContainer ref={navigationRef} linking={linking} onReady={() => { updateRoute(); leaveAuthAfterSignIn(); }} onStateChange={updateRoute}>
      {operationsAccess || currentRoute.name === 'OperationsLogin' ? navigator : <MarketplaceShell route={currentRoute.name} category={currentRoute.category} navigate={destination => {
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
