import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { DashboardHome } from '../screens/seller/DashboardHome';
import { ProductManagement } from '../screens/seller/ProductManagement';
import { ServiceManagement } from '../screens/seller/ServiceManagement';
import { AddEditProduct } from '../screens/seller/AddEditProduct';
import { SellerOrders } from '../screens/seller/SellerOrders';
import { OrderDetails } from '../screens/profile/OrderDetails';
import { SellerBookings } from '../screens/seller/SellerBookings';
import { StoreSettings } from '../screens/seller/StoreSettings';
import { SellerEarningsWallet } from '../screens/profile/Wallet';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';

export type SellerDashboardStackParamList = {
  DashboardHome: undefined;
  ProductManagement: undefined;
  ServiceManagement: undefined;
  AddEditProduct: { productId?: string } | undefined;
  SellerOrders: undefined;
  SellerBookings: undefined;
  StoreSettings: undefined;
  SellerEarningsWallet: undefined;
  OrderDetails: { orderId: string };
};

const Stack = createAppStackNavigator<SellerDashboardStackParamList>();

export const SellerDashboardStack = () => {
  const stackOptions = useAppStackScreenOptions();
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="DashboardHome" component={DashboardHome} options={{ headerShown: false }} />
    <Stack.Screen name="ProductManagement" component={ProductManagement} options={{ title: 'Manage Products' }} />
    <Stack.Screen name="ServiceManagement" component={ServiceManagement} options={{ title: 'Manage Services' }} />
    <Stack.Screen
      name="AddEditProduct"
      component={AddEditProduct}
      options={({ route }: { route: RouteProp<SellerDashboardStackParamList, 'AddEditProduct'> }): NativeStackNavigationOptions => ({ title: route.params?.productId ? 'Edit Product' : 'Add Product' })}
    />
    <Stack.Screen name="SellerOrders" component={SellerOrders} options={{ title: 'Seller Orders' }} />
    <Stack.Screen name="SellerBookings" component={SellerBookings} options={{ title: 'Service Bookings' }} />
    <Stack.Screen name="StoreSettings" component={StoreSettings} options={{ title: 'Store Settings' }} />
    <Stack.Screen name="SellerEarningsWallet" component={SellerEarningsWallet} options={{ title: 'Seller Earnings' }} />
    <Stack.Screen name="OrderDetails" component={OrderDetails as any} options={{ title: 'Order Details' }} />
  </Stack.Navigator>;
};
