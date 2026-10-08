import React, { useEffect, useMemo } from 'react';
import { BackHandler, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Bell, CircleHelp, Home, LayoutDashboard, LogOut, Settings, ShoppingCart, Tag, User } from 'lucide-react-native';
import { Avatar } from './ui/Avatar';
import { categoryIconMap } from './domain/CategoryCard';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { catalogKeys } from '../services/catalogQueries';
import { useAuth } from '../hooks/useAuth';
import { useSideMenu } from '../contexts/SideMenuContext';
import { theme } from '../theme';
import { confirmLogout } from '../utils/confirmLogout';
import { canAccessBuyerTools, canAccessSellerTools } from '../utils/roles';
import { rootCategories } from '../utils/categoryTree';
import { useCart } from '../hooks/useCart';
import { notificationKeys, notificationService } from '../services/notificationService';
import { Button } from './ui/Button';

export const SideMenu: React.FC = () => {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.86, 350);
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const cart = useCart();
  const { isOpen, close } = useSideMenu();
  const categoriesQuery = useQuery({ queryKey: catalogKeys.categories, queryFn: productService.fetchCategories });
  const categoryItems = rootCategories(categoriesQuery.data ?? []);
  const unreadQuery = useQuery({
    queryKey: notificationKeys.unread(auth.user?.id ?? ''),
    queryFn: () => notificationService.list(false),
    enabled: Boolean(auth.user?.id),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const translateX = useSharedValue(-panelWidth);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -panelWidth, { duration: 240 });
    backdropOpacity.value = withTiming(isOpen ? 1 : 0, { duration: 200 });
  }, [backdropOpacity, isOpen, translateX, panelWidth]);

  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, isOpen]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => { translateX.value = Math.max(-panelWidth, Math.min(0, gesture.dx)); },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -60 || gesture.vx < -0.5) close();
      else translateX.value = withTiming(0, { duration: 160 });
    },
  }), [close, translateX, panelWidth]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const goTo = (screen: string, params?: object) => {
    close();
    navigation.navigate('AppTabs', { screen, params });
  };

  const goToCart = () => {
    close();
    navigation.navigate('Cart');
  };

  const requestLogout = () => confirmLogout(() => { close(); void auth.logout(); });

  const showStoreDashboard = canAccessSellerTools(auth.user?.role);
  const showCart = !auth.user || canAccessBuyerTools(auth.user.role);

  return (
    <View pointerEvents={isOpen ? 'auto' : 'none'} style={styles.overlay} accessibilityViewIsModal={isOpen}
      accessibilityElementsHidden={!isOpen} importantForAccessibility={isOpen ? 'yes' : 'no-hide-descendants'} aria-hidden={!isOpen}>
      <Animated.View style={[styles.backdrop, backdropStyle]}><Pressable style={styles.fill} onPress={close} accessibilityLabel="Close menu" /></Animated.View>
      <Animated.View style={[styles.panel, { width: panelWidth }, panelStyle]} {...panResponder.panHandlers}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.userRow}>
            <Avatar name={auth.user?.name ?? 'AfriClay Guest'} imageUrl={auth.user?.avatarUrl} />
            <View style={styles.userCopy}><Text style={styles.name}>{auth.user?.name ?? 'AfriClay Guest'}</Text></View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Pressable style={styles.menuRow} onPress={() => goTo('Home', { screen: 'HomeFeed' })}><Home color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Home</Text></Pressable>
            {showCart ? <Pressable style={styles.menuRow} onPress={goToCart} accessibilityRole="button" accessibilityLabel={`Cart, ${cart.itemCount} items`}>
              <ShoppingCart color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Cart</Text>{cart.itemCount > 0 ? <View style={styles.countBadge}><Text style={styles.countText}>{cart.itemCount > 99 ? '99+' : cart.itemCount}</Text></View> : null}
            </Pressable> : null}
            {auth.user ? <Pressable style={styles.menuRow} onPress={() => goTo('Profile', { screen: 'Notifications' })} accessibilityRole="button" accessibilityLabel={`Notifications, ${unreadQuery.data?.length ?? 0} unread`}>
              <Bell color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Notifications</Text>{unreadQuery.data?.length ? <View style={styles.countBadge}><Text style={styles.countText}>{unreadQuery.data.length > 99 ? '99+' : unreadQuery.data.length}</Text></View> : null}
            </Pressable> : null}
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            {categoriesQuery.isError ? <Button fullWidth size="sm" variant="tertiary" onPress={() => void categoriesQuery.refetch()}>Retry categories</Button> : categoryItems.map(category => {
              const Icon = categoryIconMap[category.icon] ?? Tag;
              return (
                <Pressable key={category.id} style={styles.categoryRow} onPress={() => goTo('Home', { screen: 'ProductListing', params: { categoryId: category.slug } })} accessibilityRole="button" accessibilityLabel={`Browse ${category.label}`}>
                  <View style={styles.categoryIcon}><Icon color={theme.colors.primary.DEFAULT} size={19} /></View>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                </Pressable>
              );
            })}
            <View style={styles.divider} />
            {showStoreDashboard ? <Pressable style={styles.menuRow} onPress={() => goTo('Sell')}><LayoutDashboard color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Sell</Text></Pressable> : null}
            <Pressable style={styles.menuRow} onPress={() => goTo('Profile', { screen: 'Settings' })}><Settings color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Settings</Text></Pressable>
            <Pressable style={styles.menuRow} onPress={() => goTo('Profile', { screen: 'SupportHelp' })}><CircleHelp color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Help & Support</Text></Pressable>
            <Pressable style={styles.menuRow} onPress={() => goTo('Profile', { screen: 'ProfileOverview' })}><User color={theme.colors.ink} size={20} /><Text style={styles.menuLabel}>Profile</Text></Pressable>
            <View style={styles.divider} />
            {auth.user ? <Button fullWidth variant="destructive" icon={<LogOut color={theme.colors.white} size={20} />} onPress={requestLogout}>Log out</Button> : null}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, elevation: 1000 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.48)' },
  fill: { flex: 1 },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: theme.colors.cream, ...theme.shadows.lg },
  safeArea: { flex: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.primary.dark },
  userCopy: { flex: 1, marginLeft: theme.spacing.md },
  name: { color: theme.colors.white, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  viewProfile: { color: theme.colors.secondary.DEFAULT, fontWeight: '700', marginTop: theme.spacing.xs },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.sm },
  categoryRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { width: 36, height: 36, borderRadius: theme.radii.sm, backgroundColor: theme.colors.primary.tint, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { flex: 1, color: theme.colors.ink, marginLeft: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },
  menuRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  menuLabel: { color: theme.colors.ink, marginLeft: theme.spacing.md, fontSize: theme.typography.body.fontSize },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.DEFAULT },
  countText: { color: theme.colors.white, fontSize: 11, fontWeight: '800' },
});
