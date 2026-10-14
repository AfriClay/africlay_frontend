import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppFrame } from './src/components/AppFrame';
import { ResponsiveLayoutProvider } from './src/contexts/ResponsiveLayoutContext';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/hooks/useAuth';
import { WishlistProvider } from './src/contexts/WishlistContext';
import { NativeNotificationBridge } from './src/components/notifications/NativeNotificationBridge';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { canAccessOperations } from './src/utils/roles';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

const AppContent = () => {
  const user = useAuth().user;
  const activeIdentity = user?.id ?? 'guest';
  const previousIdentity = useRef<string | undefined>(undefined);
  const client = useQueryClient();
  useEffect(() => {
    if (previousIdentity.current && previousIdentity.current !== activeIdentity) client.clear();
    previousIdentity.current = activeIdentity;
  }, [activeIdentity, client]);
  const navigator = <AppFrame><NativeNotificationBridge /><RootNavigator /></AppFrame>;
  return canAccessOperations(user) ? navigator : <CartProvider><WishlistProvider>{navigator}</WishlistProvider></CartProvider>;
};

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ResponsiveLayoutProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </QueryClientProvider>
        </ResponsiveLayoutProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
