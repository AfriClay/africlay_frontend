import { Profile } from '../screens/profile/Profile';
import { MyOrders } from '../screens/profile/MyOrders';
import { OrderDetails } from '../screens/profile/OrderDetails';
import { MyAddresses, Settings, SupportHelp } from '../screens/profile/OtherProfileScreens';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { Wishlist } from '../screens/profile/Wishlist';
import { Notifications } from '../screens/notifications/Notifications';
import { MyBookings } from '../screens/profile/MyBookings';
import { ServiceDetails } from '../screens/home/ServiceDetails';
import { Wallet } from '../screens/profile/Wallet';
import { DashboardAccessRequests } from '../screens/profile/DashboardAccessRequests';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';
import { useAuth } from '../hooks/useAuth';
import { AuthRequiredState } from '../components/ui/AuthRequiredState';

export type ProfileStackParamList = {
  ProfileOverview: undefined;
  MyOrders: undefined;
  OrderDetails: { orderId: string };
  MyAddresses: undefined;
  Wishlist: undefined;
  Notifications: undefined;
  MyBookings: undefined;
  Wallet: undefined;
  DashboardAccessRequests: undefined;
  Settings: undefined;
  SupportHelp: undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
  ServiceDetails: { serviceId: string };
};

const Stack = createAppStackNavigator<ProfileStackParamList>();

const protectedScreen = (Screen: ComponentType, title: string, description: string) => {
  const ProtectedScreen = () => useAuth().user
    ? <Screen />
    : <AuthRequiredState title={title} description={description} />;
  ProtectedScreen.displayName = `Protected${Screen.displayName ?? Screen.name ?? 'Screen'}`;
  return ProtectedScreen;
};

const ProtectedMyOrders = protectedScreen(MyOrders, 'Log in to view orders', 'Orders and delivery updates are linked to your account.');
const ProtectedOrderDetails = protectedScreen(OrderDetails, 'Log in to view this order', 'Order details are private to the account that placed the order.');
const ProtectedAddresses = protectedScreen(MyAddresses, 'Log in to view addresses', 'Saved delivery addresses belong to your account.');
const ProtectedWishlist = protectedScreen(Wishlist, 'Log in to view saved items', 'Create an account or log in to keep a private wishlist.');
const ProtectedNotifications = protectedScreen(Notifications, 'Log in to view notifications', 'Order, booking, and account notifications are private.');
const ProtectedBookings = protectedScreen(MyBookings, 'Log in to view bookings', 'Service bookings are linked to your account.');
const ProtectedWallet = protectedScreen(Wallet, 'Log in to view your wallet', 'Balances and transactions are private account information.');
const ProtectedDashboardAccess = protectedScreen(DashboardAccessRequests, 'Log in to request access', 'Operations access requests are tied to your account.');
const ProtectedSettings = protectedScreen(Settings, 'Log in to manage your account', 'Profile and account settings are available after authentication.');

export const ProfileStack = () => {
  const stackOptions = useAppStackScreenOptions();
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="ProfileOverview" component={Profile} options={{ headerShown: false }} />
    <Stack.Screen name="MyOrders" component={ProtectedMyOrders} options={{ title: 'My Orders' }} />
    <Stack.Screen name="OrderDetails" component={ProtectedOrderDetails} options={{ title: 'Order Details' }} />
    <Stack.Screen name="MyAddresses" component={ProtectedAddresses} options={{ title: 'My Addresses' }} />
    <Stack.Screen name="Wishlist" component={ProtectedWishlist} options={{ title: 'My Wishlist' }} />
    <Stack.Screen name="Notifications" component={ProtectedNotifications} />
    <Stack.Screen name="MyBookings" component={ProtectedBookings} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="Wallet" component={ProtectedWallet} options={{ title: 'Shopping Wallet' }} />
    <Stack.Screen name="DashboardAccessRequests" component={ProtectedDashboardAccess} options={{ title: 'Operations Access' }} />
    <Stack.Screen name="Settings" component={ProtectedSettings} />
    <Stack.Screen name="SupportHelp" component={SupportHelp} options={{ title: 'Help & Support' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: '' }} />
    <Stack.Screen name="SellerStore" component={SellerStore} options={{ title: 'Seller Store' }} />
    <Stack.Screen name="ServiceDetails" component={ServiceDetails} options={{ title: '' }} />
  </Stack.Navigator>;
};
import type { ComponentType } from 'react';
