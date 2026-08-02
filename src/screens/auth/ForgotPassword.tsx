import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { passwordResetSchema } from '../../validation/authSchemas';
import { authService, getAuthErrorMessage } from '../../services/authService';

type ResetForm = {
  email: string;
};

export const ForgotPassword: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);
    setSubmitError(null);
    try {
      await authService.sendPasswordReset(data.email);
      setSent(true);
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, 'Unable to send the reset email.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reset Link Sent</Text>
        <Text style={styles.copy}>If an account exists for that email, we&apos;ve sent a reset link.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
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
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      <Button onPress={handleSubmit(onSubmit)} loading={loading} accessibilityLabel="Send reset link">Send Reset Link</Button>
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
  copy: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
});
