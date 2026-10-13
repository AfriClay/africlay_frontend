import { StartSelling } from '../screens/seller/StartSelling';
import { KYCUpload } from '../screens/auth/KYCUpload';
import { VerificationPending } from '../screens/auth/VerificationPending';
import { StorefrontSetup } from '../screens/auth/StorefrontSetup';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';

export type SellOnboardingStackParamList = {
  StartSelling: undefined;
  KYCUpload: undefined;
  VerificationPending: undefined;
  StorefrontSetup: undefined;
};

const Stack = createAppStackNavigator<SellOnboardingStackParamList>();

export const SellOnboardingStack = () => {
  const stackOptions = useAppStackScreenOptions();
  return (
    <Stack.Navigator initialRouteName="StartSelling" screenOptions={stackOptions}>
      <Stack.Screen name="StartSelling" component={StartSelling} options={{ headerShown: false }} />
      <Stack.Screen name="KYCUpload" component={KYCUpload} options={{ title: 'Seller Verification' }} />
      <Stack.Screen name="VerificationPending" component={VerificationPending} options={{ headerShown: false }} />
      <Stack.Screen name="StorefrontSetup" component={StorefrontSetup} options={{ title: 'Storefront Setup' }} />
    </Stack.Navigator>
  );
};
