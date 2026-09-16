import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, CircleHelp, CreditCard, Heart, LogOut, MapPin, MessageCircle, Package, Settings, Star, BadgeCheck } from 'lucide-react-native';
import { Avatar } from '../../components/ui/Avatar';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { useAuth } from '../../hooks/useAuth';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { theme } from '../../theme';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileOverview'>;
type ProfileRouteName = 'MyOrders' | 'Wishlist' | 'MyAddresses' | 'PaymentMethodsWallet' | 'MyReviews' | 'Settings' | 'SupportHelp';

const menuItems: ReadonlyArray<{ label: string; route: ProfileRouteName; icon: typeof Package }> = [
  { label: 'My Orders', route: 'MyOrders', icon: Package },
  { label: 'Wishlist', route: 'Wishlist', icon: Heart },
  { label: 'My Addresses', route: 'MyAddresses', icon: MapPin },
  { label: 'Payment Methods & Wallet', route: 'PaymentMethodsWallet', icon: CreditCard },
  { label: 'My Reviews', route: 'MyReviews', icon: Star },
  { label: 'Settings', route: 'Settings', icon: Settings },
  { label: 'Help & Support', route: 'SupportHelp', icon: CircleHelp },
];

export const Profile: React.FC = () => {
  const { isExpanded } = useResponsiveLayout();
  const auth = useAuth();
  const navigation = useNavigation<ProfileNavigation>();
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const stats = auth.user?.stats ?? { orders: 0, wishlist: 0, reviews: 0 };

  const openRoute = (route: ProfileRouteName) => {
    if (auth.isGuest && route === 'Wishlist') {
      setAuthSheetVisible(true);
      return;
    }
    navigation.navigate({ name: route, params: undefined });
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => void auth.logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar name={auth.user?.name ?? 'Guest'} imageUrl={auth.user?.avatarUrl} />
          <Text style={styles.name}>{auth.user?.name ?? 'Welcome to AfriClay'}</Text>
          <Text style={styles.location}>{auth.user?.location ?? 'Browse as a guest'}</Text>
          {auth.user?.verified ? (
            <View style={styles.verifiedRow}><BadgeCheck color={theme.colors.success} size={17} /><Text style={styles.verified}>Verified User</Text></View>
          ) : null}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.stat}><Text style={styles.statValue}>{stats.orders}</Text><Text style={styles.statLabel}>Orders</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{stats.wishlist}</Text><Text style={styles.statLabel}>Wishlist</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{stats.reviews}</Text><Text style={styles.statLabel}>Reviews</Text></View>
        </View>

        <View style={[styles.menu, isExpanded && styles.desktopMenu]}>
          <Pressable style={[styles.menuRow, isExpanded && styles.desktopRow]} onPress={() => navigation.getParent()?.navigate('Messages')} accessibilityRole="button">
            <View style={styles.menuIcon}><MessageCircle color={theme.colors.ink} size={20} /></View>
            <Text style={styles.menuLabel}>My Messages</Text>
            <ChevronRight color={theme.colors.muted} size={19} />
          </Pressable>
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <Pressable key={item.route} style={[styles.menuRow, isExpanded && styles.desktopRow]} onPress={() => openRoute(item.route)} accessibilityRole="button">
                <View style={styles.menuIcon}><Icon color={theme.colors.ink} size={20} /></View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight color={theme.colors.muted} size={19} />
              </Pressable>
            );
          })}
          {auth.user ? (
            <Pressable style={[styles.menuRow, isExpanded && styles.desktopRow]} onPress={confirmLogout} accessibilityRole="button">
              <View style={styles.menuIcon}><LogOut color={theme.colors.error} size={20} /></View>
              <Text style={styles.logoutLabel}>Logout</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.signInButton} onPress={() => setAuthSheetVisible(true)} accessibilityRole="button">
              <Text style={styles.signInText}>Create Account or Log In</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      <GuestAuthSheet visible={authSheetVisible} onClose={() => setAuthSheetVisible(false)} description="Create an account to save items and keep your orders, messages, and payment details in one place." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desktopMenu: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  desktopRow: { width: '48%', paddingVertical: theme.spacing.sm },
  container: { flex: 1, backgroundColor: theme.colors.cream },
  header: { alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg, backgroundColor: theme.colors.primary.DEFAULT },
  name: { marginTop: theme.spacing.sm, fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.white },
  location: { color: theme.colors.white, opacity: 0.84, marginTop: theme.spacing.xs },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white },
  verified: { marginLeft: theme.spacing.xs, color: theme.colors.primary.dark, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  statsCard: { marginHorizontal: theme.spacing.lg, marginTop: -12, paddingVertical: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, flexDirection: 'row', ...theme.shadows.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  statLabel: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
  menu: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  menuRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuIcon: { width: 34, alignItems: 'flex-start' },
  menuLabel: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.body.fontSize },
  logoutLabel: { color: theme.colors.error, fontSize: theme.typography.body.fontSize, fontWeight: '700' },
  signInButton: { minHeight: 50, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.lg },
  signInText: { color: theme.colors.white, fontWeight: '800' },
});
