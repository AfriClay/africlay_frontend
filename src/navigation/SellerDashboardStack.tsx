import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardHome } from '../screens/seller/DashboardHome';
import { ProductManagement } from '../screens/seller/ProductManagement';
import { ServiceManagement } from '../screens/seller/ServiceManagement';
import { AddEditProduct } from '../screens/seller/AddEditProduct';
import { SellerOrders } from '../screens/seller/SellerOrders';
import { OrderDetails } from '../screens/profile/OrderDetails';
import { theme } from '../theme';

export type SellerDashboardStackParamList = {
  DashboardHome: undefined;
  ProductManagement: undefined;
  ServiceManagement: undefined;
  AddEditProduct: { productId?: string } | undefined;
  SellerOrders: undefined;
  OrderDetails: { orderId: string };
};

const Stack = createNativeStackNavigator<SellerDashboardStackParamList>();

export const SellerDashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.cream }, headerTintColor: theme.colors.ink, headerBackButtonDisplayMode: 'minimal' }}>
    <Stack.Screen name="DashboardHome" component={DashboardHome} options={{ headerShown: false }} />
    <Stack.Screen name="ProductManagement" component={ProductManagement} options={{ title: 'Manage Products' }} />
    <Stack.Screen name="ServiceManagement" component={ServiceManagement} options={{ title: 'Manage Services' }} />
    <Stack.Screen
      name="AddEditProduct"
      component={AddEditProduct}
      options={({ route }: { route: RouteProp<SellerDashboardStackParamList, 'AddEditProduct'> }): NativeStackNavigationOptions => ({ title: route.params?.productId ? 'Edit Product' : 'Add Product' })}
    />
    <Stack.Screen name="SellerOrders" component={SellerOrders} options={{ title: 'Seller Orders' }} />
    <Stack.Screen name="OrderDetails" component={OrderDetails as any} options={{ title: 'Order Details' }} />
  </Stack.Navigator>
);
