import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from '../screens/home/Home';
import { ProductListing } from '../screens/home/ProductListing';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { ROUTES } from '../constants/routes';

export type HomeStackParamList = {
  Home: undefined;
  ProductListing: { categoryId?: string } | undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={Home} />
    <Stack.Screen name="ProductListing" component={ProductListing} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} />
    <Stack.Screen name="SellerStore" component={SellerStore} />
  </Stack.Navigator>
);
