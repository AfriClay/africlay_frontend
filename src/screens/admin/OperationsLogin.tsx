import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { authService, getAuthErrorMessage } from '../../services/authService';
import { loginSchema } from '../../validation/authSchemas';
import { canAccessOperations, hasStaffRole, isSuperAdmin } from '../../utils/roles';
import { operationsColors } from './OperationsScaffold';

type LoginForm = { email: string; password: string };

const dashboardFor = (user: Parameters<typeof canAccessOperations>[0]) => isSuperAdmin(user)
  ? 'SuperAdminDashboard'
  : hasStaffRole(user, 'sales_reviewer') ? 'SalesDashboard' : 'FinanceDashboard';

export const OperationsLogin = () => {
  const auth = useAuth();
  const navigation = useNavigation<any>();
  const [error, setError] = useState<string>();
  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (canAccessOperations(auth.user)) navigation.replace(dashboardFor(auth.user));
  }, [auth.user, navigation]);

  const submit = async (values: LoginForm) => {
    setError(undefined);
    try {
      await auth.login(values.email.trim().toLowerCase(), values.password);
      const user = await authService.currentUser();
      if (!canAccessOperations(user)) {
        await auth.logout();
        setError('This account has not been assigned access to an operations dashboard. Contact a super administrator.');
      }
    } catch (value) {
      setError(getAuthErrorMessage(value, 'Unable to sign in to operations.'));
    }
  };

  if (auth.user && !canAccessOperations(auth.user)) return <SafeAreaView style={styles.safe}>
    <ScrollView testID="operations-login-scroll" style={styles.scroll} contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled"><View style={styles.panel}>
      <ShieldCheck size={34} color={operationsColors.green} />
      <Text style={styles.title}>Operations access required</Text>
      <Text style={styles.copy}>Your marketplace account is signed in, but no Sales Review or Finance assignment is active.</Text>
      <Button fullWidth onPress={() => void auth.logout()}>Sign in with another account</Button>
      <Button fullWidth variant="outline" onPress={() => navigation.navigate('AppTabs')}>Return to marketplace</Button>
    </View></ScrollView>
  </SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <ScrollView testID="operations-login-scroll" style={styles.scroll} contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled"><View style={styles.panel}>
      <View style={styles.brand}><Text style={styles.brandMark}>A</Text><View><Text style={styles.brandName}>AfriClay</Text><Text style={styles.brandSub}>Operations</Text></View></View>
      <Text style={styles.title}>Operations sign in</Text>
      <Text style={styles.copy}>Use your assigned staff account. Your credentials will open the dashboard roles granted to your account.</Text>
      <Controller control={control} name="email" render={({ field: { onChange, value }, fieldState }) => <Input label="Email" required value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} placeholder="name@company.com" error={fieldState.error?.message} accessibilityLabel="Operations email" />} />
      <Controller control={control} name="password" render={({ field: { onChange, value }, fieldState }) => <Input label="Password" required value={value} onChangeText={onChange} secureTextEntry autoComplete="current-password" placeholder="Enter your password" error={fieldState.error?.message} accessibilityLabel="Operations password" />} />
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <Button fullWidth loading={auth.loading} loadingLabel="Signing in" onPress={handleSubmit(submit)}>Sign in</Button>
      <Button fullWidth variant="tertiary" onPress={() => navigation.navigate('AuthStack', { screen: 'ForgotPassword' })}>Forgot password?</Button>
      <View style={styles.notice}><ShieldCheck size={17} color={operationsColors.green} /><Text style={styles.noticeText}>Dashboard access is assigned and audited by a super administrator.</Text></View>
      <Button fullWidth variant="outline" onPress={() => navigation.navigate('AppTabs')}>Back to marketplace</Button>
    </View></ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: operationsColors.canvas },
  scroll: { flex: 1, minHeight: 0 },
  root: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 18, paddingBottom: 40 },
  panel: { width: '100%', maxWidth: 480, gap: 13, padding: 22, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 7, backgroundColor: operationsColors.panel },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  brandMark: { width: 38, height: 38, textAlign: 'center', textAlignVertical: 'center', borderRadius: 5, overflow: 'hidden', backgroundColor: operationsColors.green, color: '#FFF', fontSize: 22, fontWeight: '800' },
  brandName: { color: operationsColors.ink, fontSize: 16, fontWeight: '800' },
  brandSub: { color: operationsColors.muted, fontSize: 11 },
  title: { color: operationsColors.ink, fontSize: 25, fontWeight: '800' },
  copy: { color: operationsColors.muted, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  error: { color: operationsColors.red, padding: 10, backgroundColor: operationsColors.redSoft },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, backgroundColor: operationsColors.greenSoft },
  noticeText: { flex: 1, color: operationsColors.green, fontSize: 11, lineHeight: 16 },
});
