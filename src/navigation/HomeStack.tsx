import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from '../screens/home/Home';
import { ProductListing } from '../screens/home/ProductListing';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { Services } from '../screens/home/Services';
import { ServiceDetails } from '../screens/home/ServiceDetails';
import { theme } from '../theme';
import { useResponsiveLayout } from '../contexts/ResponsiveLayoutContext';

export type HomeStackParamList = {
  HomeFeed: undefined;
  ProductListing: { categoryId?: string } | undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
  Services: undefined;
  ServiceDetails: { serviceId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStack = () => {
  const { isExpanded } = useResponsiveLayout();
  return (
  <Stack.Navigator screenOptions={({ route }) => ({ headerShown: !(isExpanded && ['ProductListing', 'Services'].includes(route.name)), headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.cream }, headerTintColor: theme.colors.ink, headerBackButtonDisplayMode: 'minimal' })}>
    <Stack.Screen name="HomeFeed" component={Home} options={{ headerShown: false }} />
    <Stack.Screen name="ProductListing" component={ProductListing} options={{ title: 'Products' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: '' }} />
    <Stack.Screen name="SellerStore" component={SellerStore} options={{ title: 'Seller Store' }} />
    <Stack.Screen name="Services" component={Services} options={{ title: '' }} />
    <Stack.Screen name="ServiceDetails" component={ServiceDetails} options={{ title: '' }} />
  </Stack.Navigator>
);
};
