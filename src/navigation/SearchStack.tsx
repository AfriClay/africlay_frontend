import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Search } from '../screens/search/Search';
import { ProductListing } from '../screens/home/ProductListing';
import { ProductDetails } from '../screens/home/ProductDetails';
import { SellerStore } from '../screens/home/SellerStore';
import { ServiceDetails } from '../screens/home/ServiceDetails';
import { theme } from '../theme';

export type SearchStackParamList = {
  SearchLanding: { query?: string } | undefined;
  ProductListing: { categoryId?: string } | undefined;
  ProductDetails: { productId: string };
  SellerStore: { sellerId: string };
  ServiceDetails: { serviceId: string };
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export const SearchStack = () => (
  <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.cream }, headerTintColor: theme.colors.ink, headerBackButtonDisplayMode: 'minimal' }}>
    <Stack.Screen name="SearchLanding" component={Search} options={{ headerShown: false }} />
    <Stack.Screen name="ProductListing" component={ProductListing} options={{ title: 'Products' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ title: '' }} />
    <Stack.Screen name="SellerStore" component={SellerStore} options={{ title: 'Seller Store' }} />
    <Stack.Screen name="ServiceDetails" component={ServiceDetails} options={{ title: '' }} />
  </Stack.Navigator>
);
