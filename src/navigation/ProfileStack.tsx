import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Profile } from '../screens/profile/Profile';
import { MyOrders } from '../screens/profile/MyOrders';
import { OrderDetails } from '../screens/profile/OrderDetails';
import { MyAddresses, PaymentMethodsWallet, MyReviews, Settings, SupportHelp } from '../screens/profile/OtherProfileScreens';
import { Wishlist } from '../screens/profile/Wishlist';
import { ROUTES } from '../constants/routes';

export type ProfileStackParamList = {
  Profile: undefined;
  MyOrders: undefined;
  OrderDetails: { orderId: string };
  MyAddresses: undefined;
  PaymentMethodsWallet: undefined;
  MyReviews: undefined;
  Settings: undefined;
  SupportHelp: undefined;
  Wishlist: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={Profile} />
    <Stack.Screen name="MyOrders" component={MyOrders} />
    <Stack.Screen name="OrderDetails" component={OrderDetails} />
    <Stack.Screen name="MyAddresses" component={MyAddresses} />
    <Stack.Screen name="PaymentMethodsWallet" component={PaymentMethodsWallet} />
    <Stack.Screen name="MyReviews" component={MyReviews} />
    <Stack.Screen name="Settings" component={Settings} />
    <Stack.Screen name="SupportHelp" component={SupportHelp} />
    <Stack.Screen name="Wishlist" component={Wishlist} />
  </Stack.Navigator>
);
