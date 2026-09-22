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
  const { control, handleSubmit, setValue } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmit = async (data: RegisterForm) => {
    setSubmitError(null);
    try {
      await auth.register(data.name, data.email, data.password, role);
      navigation.navigate(ROUTES.OTPVerification);
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
          <Input label="Name" value={value} onChangeText={onChange} placeholder="Your name" error={fieldState.error?.message} accessibilityLabel="Name" />
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
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Password" value={value} onChangeText={onChange} placeholder="Create a password" secureTextEntry error={fieldState.error?.message} accessibilityLabel="Password" />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Confirm password" value={value} onChangeText={onChange} placeholder="Repeat your password" secureTextEntry error={fieldState.error?.message} accessibilityLabel="Confirm password" />
        )}
      />
      <Text style={styles.roleLabel}>Account type</Text>
      <View style={styles.roleRow}>{(['buyer', 'seller', 'both'] as const).map(option =>
        <Pressable key={option} onPress={() => setRole(option)} accessibilityRole="radio" accessibilityState={{ selected: role === option }} style={[styles.roleOption, role === option && styles.roleSelected]}>
          <Text style={styles.roleText}>{option === 'both' ? 'Buy & Sell' : option === 'buyer' ? 'Buyer' : 'Seller'}</Text>
        </Pressable>)}</View>
      <Pressable
        onPress={() => {
          const nextValue = !acceptTerms;
          setAcceptTerms(nextValue);
          setValue('acceptTerms', nextValue, { shouldValidate: true });
        }}
        style={styles.checkboxRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptTerms }}
      >
        <View style={[styles.checkbox, acceptTerms ? styles.checkboxChecked : null]}>{acceptTerms ? <Text style={styles.checkmark}>?</Text> : null}</View>
        <Text style={styles.checkboxLabel}>I agree to the Terms</Text>
      </Pressable>
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      <Button onPress={handleSubmit(onSubmit)} disabled={!acceptTerms || auth.loading} loading={auth.loading} accessibilityLabel="Create Account">Create Account</Button>
      <Text style={styles.footer}>Already have an account? <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.Login)}>Log In</Text></Text>
    </FormFrame>
  );
};

const styles = StyleSheet.create({
  roleLabel: { color: theme.colors.ink, fontWeight: '700', marginBottom: theme.spacing.sm },
  roleRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  roleOption: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.sm, alignItems: 'center' },
  roleSelected: { borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.primary.tint },
  roleText: { color: theme.colors.ink, fontWeight: '700' },
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
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
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
  checkmark: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  footer: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.muted,
  },
  link: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
});
