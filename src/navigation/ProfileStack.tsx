import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Profile } from '../screens/profile/Profile';
import { MyOrders } from '../screens/profile/MyOrders';
import { OrderDetails } from '../screens/profile/OrderDetails';
import { MyAddresses, Settings, SupportHelp } from '../screens/profile/OtherProfileScreens';
import { theme } from '../theme';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { Wishlist } from '../screens/profile/Wishlist';
import { Notifications } from '../screens/notifications/Notifications';
import { MyBookings } from '../screens/profile/MyBookings';
import { ServiceDetails } from '../screens/home/ServiceDetails';

export type ProfileStackParamList = {
  ProfileOverview: undefined;
  MyOrders: undefined;
  OrderDetails: { orderId: string };
  MyAddresses: undefined;
  Wishlist: undefined;
  Notifications: undefined;
  MyBookings: undefined;
  Settings: undefined;
  SupportHelp: undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
  ServiceDetails: { serviceId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.cream }, headerTintColor: theme.colors.ink, headerBackButtonDisplayMode: 'minimal' }}>
    <Stack.Screen name="ProfileOverview" component={Profile} options={{ headerShown: false }} />
    <Stack.Screen name="MyOrders" component={MyOrders} options={{ title: 'My Orders' }} />
    <Stack.Screen name="OrderDetails" component={OrderDetails} options={{ title: 'Order Details' }} />
    <Stack.Screen name="MyAddresses" component={MyAddresses} options={{ title: 'My Addresses' }} />
    <Stack.Screen name="Wishlist" component={Wishlist} options={{ title: 'My Wishlist' }} />
    <Stack.Screen name="Notifications" component={Notifications} />
    <Stack.Screen name="MyBookings" component={MyBookings} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="Settings" component={Settings} />
    <Stack.Screen name="SupportHelp" component={SupportHelp} options={{ title: 'Help & Support' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: '' }} />
    <Stack.Screen name="SellerStore" component={SellerStore} options={{ title: 'Seller Store' }} />
    <Stack.Screen name="ServiceDetails" component={ServiceDetails} options={{ title: '' }} />
  </Stack.Navigator>
);
