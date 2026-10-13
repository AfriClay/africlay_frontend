import { Home } from '../screens/home/Home';
import { ProductListing } from '../screens/home/ProductListing';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { Services } from '../screens/home/Services';
import { ServiceDetails } from '../screens/home/ServiceDetails';
import { useResponsiveLayout } from '../contexts/ResponsiveLayoutContext';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';

export type HomeStackParamList = {
  HomeFeed: undefined;
  ProductListing: { categoryId?: string } | undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
  Services: undefined;
  ServiceDetails: { serviceId: string };
};

const Stack = createAppStackNavigator<HomeStackParamList>();

export const HomeStack = () => {
  const { isExpanded } = useResponsiveLayout();
  const stackOptions = useAppStackScreenOptions();
  return (
  <Stack.Navigator screenOptions={({ route }) => ({ ...stackOptions, headerShown: !(isExpanded && ['ProductListing', 'Services'].includes(route.name)) })}>
    <Stack.Screen name="HomeFeed" component={Home} options={{ headerShown: false }} />
    <Stack.Screen name="ProductListing" component={ProductListing} options={{ title: 'Products' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: '' }} />
    <Stack.Screen name="SellerStore" component={SellerStore} options={{ title: 'Seller Store' }} />
    <Stack.Screen name="Services" component={Services} options={{ title: '' }} />
    <Stack.Screen name="ServiceDetails" component={ServiceDetails} options={{ title: '' }} />
  </Stack.Navigator>
);
};
