import { Search } from '../screens/search/Search';
import { ProductListing } from '../screens/home/ProductListing';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { ServiceDetails } from '../screens/home/ServiceDetails';
import { UiPreview } from '../screens/dev/UiPreview';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';

export type SearchStackParamList = {
  SearchLanding: { query?: string } | undefined;
  ProductListing: { categoryId?: string } | undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
  ServiceDetails: { serviceId: string };
  UiPreview: undefined;
};

const Stack = createAppStackNavigator<SearchStackParamList>();

export const SearchStack = () => {
  const stackOptions = useAppStackScreenOptions();
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="SearchLanding" component={Search} options={{ headerShown: false }} />
    <Stack.Screen name="ProductListing" component={ProductListing} options={{ title: 'Products' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: '' }} />
    <Stack.Screen name="SellerStore" component={SellerStore} options={{ title: 'Seller Store' }} />
    <Stack.Screen name="ServiceDetails" component={ServiceDetails} options={{ title: '' }} />
    {__DEV__ ? <Stack.Screen name="UiPreview" component={UiPreview} options={{ title: 'UI preview' }} /> : null}
  </Stack.Navigator>;
};
