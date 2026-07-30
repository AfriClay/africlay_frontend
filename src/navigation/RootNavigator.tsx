import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { ROUTES } from '../constants/routes';
import { Cart } from '../screens/cart/Cart';
import { Checkout } from '../screens/cart/Checkout';
import { Notifications } from '../screens/notifications/Notifications';


export type RootStackParamList = {
  AuthStack: undefined;
  AppTabs: undefined;
  Cart: undefined;
  Checkout: { orderId?: string } | undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthStack" component={AuthStack} />
      <Stack.Screen name="AppTabs" component={AppTabs} />
      <Stack.Screen name="Cart" component={Cart} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Checkout" component={Checkout} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  </NavigationContainer>
);
