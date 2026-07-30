import React, { useState } from 'react';
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

type RegisterForm = {
  name: string;
  identifier: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export const Register: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', identifier: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmit = async (data: RegisterForm) => {
    setSubmitError(null);
    try {
      await auth.register(data.name, data.identifier, data.password);
      navigation.navigate(ROUTES.OTPVerification);
    } catch (error) {
      setSubmitError('Unable to create account.');
    }
  };

  return (
    <View style={styles.container}>
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
        name="identifier"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Email or phone" value={value} onChangeText={onChange} placeholder="you@example.com" error={fieldState.error?.message} accessibilityLabel="Email or phone" />
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
      <Pressable onPress={() => setAcceptTerms(current => !current)} style={styles.checkboxRow} accessibilityRole="checkbox" accessibilityState={{ checked: acceptTerms }}>
        <View style={[styles.checkbox, acceptTerms ? styles.checkboxChecked : null]}>{acceptTerms ? <Text style={styles.checkmark}>?</Text> : null}</View>
        <Text style={styles.checkboxLabel}>I agree to the Terms</Text>
      </Pressable>
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      <Button onPress={handleSubmit(onSubmit)} disabled={!acceptTerms || auth.loading} loading={auth.loading} accessibilityLabel="Create Account">Create Account</Button>
      <Text style={styles.footer}>Already have an account? <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.Login)}>Log In</Text></Text>
    </View>
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
