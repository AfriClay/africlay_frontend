import { Home } from '../screens/home/Home';
import { useResponsiveLayout } from '../contexts/ResponsiveLayoutContext';
import { lazyScreen } from '../components/ui/LazyScreen';
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
const ProductListing = lazyScreen(() => import('../screens/home/ProductListing').then(module => ({ default: module.ProductListing })));
const ProductDetails = lazyScreen(() => import('../screens/home/ProductDetails').then(module => ({ default: module.ProductDetails })));
const SellerStore = lazyScreen(() => import('../screens/home/SellerStore').then(module => ({ default: module.SellerStore })));
const Services = lazyScreen(() => import('../screens/home/Services').then(module => ({ default: module.Services })));
const ServiceDetails = lazyScreen(() => import('../screens/home/ServiceDetails').then(module => ({ default: module.ServiceDetails })));

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
