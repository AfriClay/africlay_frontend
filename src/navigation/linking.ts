import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

export const linking = {
  prefixes: [
    'africlay://',
    'https://africlaymarket.com',
    'https://www.africlaymarket.com',
    'https://africlayfrontend1.vercel.app',
  ],
  config: {
    screens: {
      AuthStack: {
        path: 'auth',
        screens: {
          GetStarted: 'welcome',
          Login: 'login',
          Register: 'register',
          OTPVerification: 'verify',
          RoleSelection: 'role',
          ProfileCompletion: 'profile',
          ForgotPassword: 'forgot-password',
          StorefrontSetup: 'storefront',
          KYCUpload: 'seller-verification',
          VerificationPending: 'verification-pending',
        },
      },
      AppTabs: {
        screens: {
          Home: {
            screens: {
              HomeFeed: 'home',
              ProductListing: 'products/:categoryId?',
              ProductDetails: 'product/:productId',
              SellerStore: 'store/:sellerId',
              Services: 'services',
              ServiceDetails: 'services/:serviceId',
            },
          },
          Search: {
            screens: {
              SearchLanding: 'search/:query?',
              ProductListing: 'search/products/:categoryId?',
              ProductDetails: 'search/product/:productId',
              SellerStore: 'search/store/:sellerId',
              ServiceDetails: 'search/services/:serviceId',
            },
          },
          Sell: {
            path: 'sell',
            screens: {
              DashboardHome: '',
              ProductManagement: 'products',
              ServiceManagement: 'services',
              AddEditProduct: 'products/edit/:productId?',
              SellerOrders: 'orders',
              SellerBookings: 'bookings',
              StoreSettings: 'store-settings',
              OrderDetails: 'orders/:orderId',
              StartSelling: 'start',
              StorefrontSetup: 'storefront',
              KYCUpload: 'verification',
              VerificationPending: 'verification-pending',
            },
          },
          Profile: {
            screens: {
              ProfileOverview: 'account',
              MyOrders: 'account/orders',
              OrderDetails: 'account/orders/:orderId',
              MyAddresses: 'account/addresses',
              Wishlist: 'account/wishlist',
              Notifications: 'account/notifications',
              MyBookings: 'account/bookings',
              Wallet: 'account/wallet',
              DashboardAccessRequests: 'account/operations-access',
              Settings: 'account/settings',
              SupportHelp: 'account/support',
              ProductDetails: 'account/product/:productId',
              SellerStore: 'account/store/:sellerId',
              ServiceDetails: 'account/services/:serviceId',
            },
          },
        },
      },
      Cart: 'cart',
      Checkout: 'checkout/:orderId?',
      OperationsLogin: 'operations',
      SalesDashboard: 'operations/sales',
      FinanceDashboard: 'operations/finance',
      SuperAdminDashboard: 'operations/admin',
    },
  },
} as LinkingOptions<RootStackParamList>;
