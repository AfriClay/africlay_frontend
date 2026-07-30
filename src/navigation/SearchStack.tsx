import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Search } from '../screens/search/Search';
import { ProductListing } from '../screens/home/ProductListing';
import { ProductDetails } from '../screens/home/ProductDetails';
import { ROUTES } from '../constants/routes';

export type SearchStackParamList = {
  Search: undefined;
  ProductListing: { categoryId?: string } | undefined;
  ProductDetails: { productId: string };
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export const SearchStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Search" component={Search} />
    <Stack.Screen name="ProductListing" component={ProductListing} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} />
  </Stack.Navigator>
);
