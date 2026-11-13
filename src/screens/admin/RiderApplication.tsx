import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { operationsColors } from './OperationsScaffold';
import { RiderApplicationForm } from './RiderApplicationForm';
import { MarketplaceBrand } from '../../components/ui/MarketplaceBrand';
import { canAccessOperations, hasStaffRole, isApprovedRider, isSuperAdmin } from '../../utils/roles';

export const RiderApplication = () => {
  const navigation = useNavigation<any>();
  const { user, pendingEmail } = useAuth();

  return <SafeAreaView style={styles.safe}>
    <ScrollView testID="rider-application-scroll" style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.panel}>
        <MarketplaceBrand compact />
        <Text style={styles.heading}>Deliver with AfriClay</Text>
        {!user ? <>
          <Text style={styles.copy}>Sign in or create a marketplace account to apply as a rider. Your application and documents are reviewed before you can receive deliveries.</Text>
          <Button fullWidth onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}>Log in to apply</Button>
          <Button fullWidth variant="outline" onPress={() => navigation.navigate('AuthStack', { screen: 'Register' })}>Create an account</Button>
        </> : !user.verified ? <>
          <Text style={styles.copy}>Verify your account email before submitting a rider application.</Text>
          <Button fullWidth onPress={() => navigation.navigate('AuthStack', { screen: pendingEmail ? 'OTPVerification' : 'Login' })}>{pendingEmail ? 'Verify email' : 'Sign in to verify email'}</Button>
        </> : <RiderApplicationForm userId={user.id} />}
        <Button fullWidth variant="tertiary" onPress={() => {
          if (navigation.canGoBack()) { navigation.goBack(); return; }
          if (!canAccessOperations(user)) { navigation.navigate('AppTabs'); return; }
          navigation.navigate(isSuperAdmin(user) ? 'SuperAdminDashboard'
            : hasStaffRole(user, 'sales_reviewer') ? 'SalesDashboard'
              : hasStaffRole(user, 'finance') ? 'FinanceDashboard'
                : isApprovedRider(user) ? 'RiderDashboard' : 'LogisticsDashboard');
        }}>Back</Button>
      </View>
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: operationsColors.canvas },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, alignItems: 'center', padding: 18, paddingBottom: 40 },
  panel: { width: '100%', maxWidth: 560, gap: 13, padding: 22, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 7, backgroundColor: operationsColors.panel },
  heading: { color: operationsColors.ink, fontSize: 25, fontWeight: '800' },
  copy: { color: operationsColors.muted, fontSize: 13, lineHeight: 20 },
});
