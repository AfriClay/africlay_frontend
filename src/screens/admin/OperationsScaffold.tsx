import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BadgeCheck, Landmark, LogOut, RefreshCw, ShieldCheck, Truck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { MarketplaceBrand } from '../../components/ui/MarketplaceBrand';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { confirmLogout } from '../../utils/confirmLogout';
import { hasStaffRole, isApprovedRider, isSuperAdmin } from '../../utils/roles';

export const operationsColors = {
  canvas: '#F4F6F5', panel: '#FFFFFF', ink: '#18211C', muted: '#66726B', border: '#DDE3DF',
  green: '#207F20', greenSoft: '#E8F2EC', red: '#B42318', redSoft: '#FDECEA', amber: '#9A5A16', amberSoft: '#FFF3E2',
};

export const formatOperationsDate = (value?: string) => value
  ? new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not recorded';

export const formatQueueAge = (value?: string) => {
  if (!value) return 'Age unavailable';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 24) return `${hours}h old`;
  const days = Math.floor(hours / 24);
  return `${days}d old`;
};

export const DataFreshness = ({ updatedAt, refreshing, failed = false, onRefresh }: { updatedAt: number; refreshing: boolean; failed?: boolean; onRefresh: () => void }) => <View style={styles.freshness}>
  <Text style={[styles.freshnessText, failed && styles.freshnessError]} accessibilityRole={failed ? 'alert' : undefined}>{failed ? updatedAt ? 'Refresh failed; showing last loaded data' : 'Live data unavailable' : refreshing ? 'Refreshing data...' : updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for live data'}</Text>
  <Pressable onPress={onRefresh} disabled={refreshing} accessibilityRole="button" accessibilityLabel="Refresh dashboard data" accessibilityState={{ disabled: refreshing }} style={styles.refreshButton}>
    <RefreshCw size={15} color={operationsColors.green} /><Text style={styles.refreshText}>Refresh</Text>
  </Pressable>
</View>;

export const StatusPill = ({ value }: { value: string }) => {
  const rejected = ['rejected', 'failed', 'suspended'].includes(value);
  const approved = ['approved', 'active', 'succeeded', 'released'].includes(value);
  return <View style={[styles.pill, approved && styles.pillGreen, rejected && styles.pillRed]}>
    <Text style={[styles.pillText, approved && styles.pillTextGreen, rejected && styles.pillTextRed]}>{value.replaceAll('_', ' ')}</Text>
  </View>;
};

export const OperationsScaffold = ({ title, subtitle, children, scrollRef }: { title: string; subtitle: string; children: React.ReactNode; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const auth = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { width, height } = useWindowDimensions();
  const compact = width < 720;
  const webViewport = Platform.OS === 'web' ? { height, maxHeight: height } : undefined;
  const links = [
    hasStaffRole(auth.user, 'sales_reviewer') && { label: 'Sales review', route: 'SalesDashboard' as const, icon: BadgeCheck },
    hasStaffRole(auth.user, 'finance') && { label: 'Finance', route: 'FinanceDashboard' as const, icon: Landmark },
    hasStaffRole(auth.user, 'logistics') && !isApprovedRider(auth.user) && { label: 'Logistics', route: 'LogisticsDashboard' as const, icon: Truck },
    isApprovedRider(auth.user) && { label: 'My deliveries', route: 'RiderDashboard' as const, icon: Truck },
    isSuperAdmin(auth.user) && { label: 'Administration', route: 'SuperAdminDashboard' as const, icon: ShieldCheck },
  ].filter(Boolean) as Array<{ label: string; route: 'SalesDashboard' | 'FinanceDashboard' | 'LogisticsDashboard' | 'RiderDashboard' | 'SuperAdminDashboard'; icon: typeof BadgeCheck }>;

  const activeSection = links.find(link => link.route === route.name)?.label ?? 'Operations';
  const navigationLinks = <ScrollView horizontal style={compact ? styles.navViewportCompact : styles.navViewport} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.navigation, compact && styles.navigationCompact]}>
        {links.map(link => { const Icon = link.icon; const active = link.route === route.name; return <Pressable key={link.route} onPress={() => navigation.navigate(link.route)} accessibilityRole="link" accessibilityState={{ selected: active }} accessibilityLabel={`${link.label} dashboard`} style={[styles.navLink, active && styles.navLinkActive]}>
          <Icon size={17} color={operationsColors.green} /><Text style={[styles.navText, active && styles.navTextActive]}>{link.label}</Text>
        </Pressable>; })}
      </ScrollView>;

  return <SafeAreaView style={[styles.root, webViewport]}>
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={[styles.headerMain, compact && styles.headerMainCompact]}>
        <MarketplaceBrand compact />
        {!compact ? navigationLinks : null}
        <Button variant="icon" size="sm" accessibilityLabel="Log out" onPress={() => confirmLogout(() => void auth.logout())} icon={<LogOut size={19} color={operationsColors.red} />} />
      </View>
      {compact ? navigationLinks : null}
    </View>
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      testID="operations-scroll"
    >
      <View style={[styles.heading, compact && styles.headingCompact]}><Text style={styles.eyebrow}>AFRICLAY / {activeSection.toUpperCase()}</Text><Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
      {children}
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: operationsColors.canvas },
  header: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: operationsColors.border, backgroundColor: operationsColors.panel },
  headerCompact: { paddingBottom: 2 },
  headerMain: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  headerMainCompact: { minHeight: 58, justifyContent: 'space-between', paddingHorizontal: 12 },
  navViewport: { flex: 1, minWidth: 0 }, navViewportCompact: { flexGrow: 0, flexShrink: 0, width: '100%', height: 44 },
  navigation: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 6 }, navigationCompact: { justifyContent: 'flex-start', paddingHorizontal: 8 }, navLink: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 20 }, navLinkActive: { backgroundColor: operationsColors.greenSoft }, navText: { color: operationsColors.muted, fontSize: 12, fontWeight: '700' }, navTextActive: { color: operationsColors.green },
  scroll: { flex: 1, minHeight: 0 }, content: { flexGrow: 1, width: '100%', maxWidth: 1320, alignSelf: 'center', padding: 24, paddingBottom: 120 }, contentCompact: { padding: 14, paddingBottom: 144 }, heading: { marginBottom: 20 }, headingCompact: { marginBottom: 16 },
  eyebrow: { color: operationsColors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 7 },
  title: { color: operationsColors.ink, fontSize: 29, fontWeight: '800' }, titleCompact: { fontSize: 24 }, subtitle: { color: operationsColors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, maxWidth: 760 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: operationsColors.amberSoft },
  pillGreen: { backgroundColor: operationsColors.greenSoft }, pillRed: { backgroundColor: operationsColors.redSoft },
  pillText: { color: operationsColors.amber, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, pillTextGreen: { color: operationsColors.green }, pillTextRed: { color: operationsColors.red },
  freshness: { minHeight: 38, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  freshnessText: { color: operationsColors.muted, fontSize: 11 },
  freshnessError: { color: operationsColors.red },
  refreshButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 9, backgroundColor: operationsColors.panel },
  refreshText: { color: operationsColors.green, fontSize: 11, fontWeight: '800' },
});
