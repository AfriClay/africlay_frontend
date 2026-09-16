import { createContext, useContext, type PropsWithChildren } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export const getResponsiveLayout = (width: number, height: number, web: boolean) => {
  const isExpanded = web && width >= 768;
  const isWide = isExpanded && width >= 1200;
  const sidebarWidth = isWide ? 232 : 184;
  const contentWidth = Math.min(1440, Math.max(0, width - (isExpanded ? sidebarWidth + 48 : 0)));
  return { width, height, isWeb: web, isCompact: !isExpanded, isExpanded, isWide, sidebarWidth,
    productColumns: isExpanded ? Math.max(2, Math.min(6, Math.floor((contentWidth - 48) / 200))) : 2 };
};

const Context = createContext(getResponsiveLayout(375, 720, false));
export const ResponsiveLayoutProvider = ({ children }: PropsWithChildren) => {
  const { width, height } = useWindowDimensions();
  return <Context.Provider value={getResponsiveLayout(width, height, Platform.OS === 'web')}>{children}</Context.Provider>;
};
export const useResponsiveLayout = () => useContext(Context);

export const authRoutes = new Set(['AuthStack', 'Splash', 'GetStarted', 'Login', 'Register', 'OTPVerification',
  'RoleSelection', 'KYCUpload', 'VerificationPending', 'StorefrontSetup', 'ProfileCompletion', 'ForgotPassword']);
export const contentLimit = (route: string) => {
  if (authRoutes.has(route)) return 480;
  if (['Checkout', 'Cart'].includes(route)) return 880;
  if (['StartSelling', 'AddEditProduct'].includes(route)) return 880;
  if (['Services', 'DashboardHome', 'ProductManagement', 'SellerOrders'].includes(route)) return 1200;
  if (['ProductDetails', 'ServiceDetails'].includes(route)) return 1200;
  if (route === 'Settings') return 760;
  if (['ProfileOverview', 'Settings', 'SupportHelp', 'MyOrders', 'OrderDetails', 'MyAddresses',
    'PaymentMethodsWallet', 'MyReviews', 'Notifications'].includes(route)) return 960;
  return 1440;
};
