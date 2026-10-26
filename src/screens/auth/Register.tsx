import React, { useState } from 'react';
import { FormFrame } from '../../components/layout/FormFrame';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { registerSchema } from '../../validation/authSchemas';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { getAuthErrorMessage } from '../../services/authService';
import { Check } from 'lucide-react-native';
import { ChoiceGroup } from '../../components/ui/ChoiceGroup';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export const Register: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Register'>>();
  const auth = useAuth();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [role, setRole] = useState<'buyer' | 'seller' | 'both'>('buyer');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toggleTerms = () => {
    const nextValue = !acceptTerms;
    setAcceptTerms(nextValue);
    setValue('acceptTerms', nextValue, { shouldValidate: true });
  };
  const openPolicies = () => {
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Policies');
  };
  const returnToMarketplace = () => {
    const root = navigation.getParent<any>();
    if (root?.canGoBack()) root.goBack();
    else root?.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
  };
  const { control, handleSubmit, setValue, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmit = async (data: RegisterForm) => {
    setSubmitError(null);
    try {
      await auth.register(data.name, data.email, data.password, role);
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, 'Unable to create account.'));
    }
  };

  return (
    <FormFrame style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Name" required value={value} onChangeText={onChange} placeholder="Your name" error={fieldState.error?.message} accessibilityLabel="Name" autoComplete="name" />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input
            label="Email"
            value={value}
            onChangeText={onChange}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={fieldState.error?.message}
            accessibilityLabel="Email"
            required
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Password" required value={value} onChangeText={onChange} placeholder="Create a password" secureTextEntry error={fieldState.error?.message} accessibilityLabel="Password" autoComplete="new-password" />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Confirm password" required value={value} onChangeText={onChange} placeholder="Repeat your password" secureTextEntry error={fieldState.error?.message} accessibilityLabel="Confirm password" autoComplete="new-password" />
        )}
      />
      <ChoiceGroup
        label="Account type"
        required
        value={role}
        onChange={setRole}
        options={[
          { value: 'buyer', label: 'Buyer' },
          { value: 'seller', label: 'Seller' },
          { value: 'both', label: 'Buy & sell' },
        ]}
      />
      <View style={styles.checkboxRow}>
        <Pressable onPress={toggleTerms} style={styles.checkboxControl} accessibilityRole="checkbox" accessibilityState={{ checked: acceptTerms }} accessibilityLabel="Agree to the Terms and Policies">
          <View style={[styles.checkbox, acceptTerms ? styles.checkboxChecked : null]}>{acceptTerms ? <Check size={16} color={theme.colors.white} strokeWidth={3} /> : null}</View>
          <Text style={styles.checkboxLabel}>I agree to the</Text>
        </Pressable>
        <Pressable onPress={openPolicies} accessibilityRole="link" style={styles.policyLinkHit}><Text style={styles.policyLink}>Terms & Policies</Text></Pressable>
      </View>
      {formState.errors.acceptTerms?.message ? <Text style={styles.error} accessibilityRole="alert">{formState.errors.acceptTerms.message}</Text> : null}
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      <Button fullWidth onPress={handleSubmit(onSubmit)} disabled={!acceptTerms || auth.loading} loading={auth.loading} loadingLabel="Creating account" accessibilityLabel="Create Account">Create Account</Button>
      <View style={styles.footer}><Text style={styles.footerText}>Already have an account?</Text><Button variant="tertiary" size="sm" onPress={() => navigation.navigate(ROUTES.Login)}>Log in</Button></View>
      <Button variant="tertiary" size="sm" onPress={returnToMarketplace}>Back to marketplace</Button>
    </FormFrame>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.lg,
    color: theme.colors.ink,
  },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  checkboxControl: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  checkboxLabel: {
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
  },
  policyLinkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.xs },
  policyLink: { color: theme.colors.primary.DEFAULT, fontSize: theme.typography.body.fontSize, fontWeight: '700', textDecorationLine: 'underline' },
  footer: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    color: theme.colors.muted,
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
});
