import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StartSelling } from '../screens/seller/StartSelling';
import { KYCUpload } from '../screens/auth/KYCUpload';
import { VerificationPending } from '../screens/auth/VerificationPending';
import { StorefrontSetup } from '../screens/auth/StorefrontSetup';
import { theme } from '../theme';

export type SellOnboardingStackParamList = {
  StartSelling: undefined;
  KYCUpload: undefined;
  VerificationPending: undefined;
  StorefrontSetup: undefined;
};

const Stack = createNativeStackNavigator<SellOnboardingStackParamList>();

export const SellOnboardingStack = () => {
  return (
    <Stack.Navigator initialRouteName="StartSelling" screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.cream }, headerTintColor: theme.colors.ink, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="StartSelling" component={StartSelling} options={{ headerShown: false }} />
      <Stack.Screen name="KYCUpload" component={KYCUpload} options={{ title: 'Seller Verification' }} />
      <Stack.Screen name="VerificationPending" component={VerificationPending} options={{ headerShown: false }} />
      <Stack.Screen name="StorefrontSetup" component={StorefrontSetup} options={{ title: 'Storefront Setup' }} />
    </Stack.Navigator>
  );
};
