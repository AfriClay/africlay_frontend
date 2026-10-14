import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BadgeCheck, Landmark, LogOut, ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { confirmLogout } from '../../utils/confirmLogout';
import { hasStaffRole, isSuperAdmin } from '../../utils/roles';

export const operationsColors = {
  canvas: '#F4F6F5', panel: '#FFFFFF', ink: '#18211C', muted: '#66726B', border: '#DDE3DF',
  green: '#207F20', greenSoft: '#E8F2EC', red: '#B42318', redSoft: '#FDECEA', amber: '#9A5A16', amberSoft: '#FFF3E2',
};

export const formatOperationsDate = (value?: string) => value
  ? new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not recorded';

export const StatusPill = ({ value }: { value: string }) => {
  const rejected = ['rejected', 'failed', 'suspended'].includes(value);
  const approved = ['approved', 'active', 'succeeded', 'released'].includes(value);
  return <View style={[styles.pill, approved && styles.pillGreen, rejected && styles.pillRed]}>
    <Text style={[styles.pillText, approved && styles.pillTextGreen, rejected && styles.pillTextRed]}>{value.replaceAll('_', ' ')}</Text>
  </View>;
};

export const OperationsScaffold = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => {
  const auth = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const links = [
    hasStaffRole(auth.user, 'sales_reviewer') && { label: 'Sales review', route: 'SalesDashboard' as const, icon: BadgeCheck },
    hasStaffRole(auth.user, 'finance') && { label: 'Finance', route: 'FinanceDashboard' as const, icon: Landmark },
    isSuperAdmin(auth.user) && { label: 'Administration', route: 'SuperAdminDashboard' as const, icon: ShieldCheck },
  ].filter(Boolean) as Array<{ label: string; route: 'SalesDashboard' | 'FinanceDashboard' | 'SuperAdminDashboard'; icon: typeof BadgeCheck }>;

  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <View style={styles.brand}><Text style={styles.brandMark}>A</Text><View><Text style={styles.brandName}>AfriClay</Text><Text style={styles.brandSub}>Operations</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navigation}>
        {links.map(link => { const Icon = link.icon; return <Pressable key={link.route} onPress={() => navigation.navigate(link.route)} accessibilityRole="link" style={styles.navLink}>
          <Icon size={17} color={operationsColors.green} /><Text style={styles.navText}>{link.label}</Text>
        </Pressable>; })}
      </ScrollView>
      <Button variant="icon" size="sm" accessibilityLabel="Log out" onPress={() => confirmLogout(() => void auth.logout())} icon={<LogOut size={19} color={operationsColors.red} />} />
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.heading}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
      {children}
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: operationsColors.canvas },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: operationsColors.border, backgroundColor: operationsColors.panel },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 34, height: 34, textAlign: 'center', textAlignVertical: 'center', borderRadius: 5, overflow: 'hidden', backgroundColor: operationsColors.green, color: '#FFF', fontSize: 20, fontWeight: '800' },
  brandName: { color: operationsColors.ink, fontSize: 15, fontWeight: '800' }, brandSub: { color: operationsColors.muted, fontSize: 10 },
  navigation: { flexGrow: 1, justifyContent: 'center', gap: 6 }, navLink: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 }, navText: { color: operationsColors.ink, fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 }, content: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: 20, paddingBottom: 64 }, heading: { marginBottom: 18 },
  title: { color: operationsColors.ink, fontSize: 25, fontWeight: '800' }, subtitle: { color: operationsColors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, maxWidth: 760 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: operationsColors.amberSoft },
  pillGreen: { backgroundColor: operationsColors.greenSoft }, pillRed: { backgroundColor: operationsColors.redSoft },
  pillText: { color: operationsColors.amber, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, pillTextGreen: { color: operationsColors.green }, pillTextRed: { color: operationsColors.red },
});
