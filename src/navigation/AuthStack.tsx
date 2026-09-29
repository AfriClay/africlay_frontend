import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Splash } from '../screens/auth/Splash';
import { GetStarted } from '../screens/auth/GetStarted';
import { Login } from '../screens/auth/Login';
import { Register } from '../screens/auth/Register';
import { OTPVerification } from '../screens/auth/OTPVerification';
import { RoleSelection } from '../screens/auth/RoleSelection';
import { ProfileCompletion } from '../screens/auth/ProfileCompletion';
import { ForgotPassword } from '../screens/auth/ForgotPassword';
import { KYCUpload } from '../screens/auth/KYCUpload';
import { VerificationPending } from '../screens/auth/VerificationPending';
import { StorefrontSetup } from '../screens/auth/StorefrontSetup';
import { useAuth } from '../hooks/useAuth';

export type AuthStackParamList = {
  Splash: undefined;
  GetStarted: undefined;
  Login: undefined;
  Register: undefined;
  OTPVerification: undefined;
  RoleSelection: undefined;
  KYCUpload: undefined;
  VerificationPending: undefined;
  StorefrontSetup: undefined;
  ProfileCompletion: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  const { pendingEmail, pendingUser, pendingVerification } = useAuth();

  const initialRouteName = pendingVerification && pendingEmail
    ? 'OTPVerification'
    : pendingUser?.verified
      ? 'RoleSelection'
      : 'GetStarted';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="GetStarted" component={GetStarted} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="OTPVerification" component={OTPVerification} />
      <Stack.Screen name="RoleSelection" component={RoleSelection} />
      <Stack.Screen name="KYCUpload" component={KYCUpload} />
      <Stack.Screen name="VerificationPending" component={VerificationPending} />
      <Stack.Screen name="StorefrontSetup" component={StorefrontSetup} />
      <Stack.Screen name="ProfileCompletion" component={ProfileCompletion} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
};
