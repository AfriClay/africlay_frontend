import React, { useState } from 'react';
import { FormFrame } from '../../components/layout/FormFrame';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { passwordResetSchema } from '../../validation/authSchemas';
import { getAuthErrorMessage } from '../../services/authService';
import { OTPInput } from '../../components/ui/OTPInput';
import { useAuth } from '../../hooks/useAuth';

type ResetForm = {
  email: string;
};

export const ForgotPassword: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const auth = useAuth();
  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);
    setSubmitError(null);
    try {
      await auth.sendPasswordReset(data.email);
      setSent(true);
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, 'Unable to send the reset email.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setSubmitError(null);
    if (code.length !== 6) {
      setSubmitError('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await auth.resetPassword(code, password);
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, 'Unable to reset your password.'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <FormFrame style={styles.container}>
        <Text style={styles.title}>Enter Reset Code</Text>
        <Text style={styles.copy}>We sent a 6-digit code to your email. Enter it below and choose a new password.</Text>
        <OTPInput value={code} onChange={setCode} onComplete={() => undefined} error={submitError ?? undefined} accessibilityLabel="Password reset code" />
        <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="New password" accessibilityLabel="New password" />
        <Input label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repeat new password" accessibilityLabel="Confirm new password" />
        <Button onPress={handleReset} loading={loading} disabled={loading} accessibilityLabel="Reset password">Reset Password</Button>
      </FormFrame>
    );
  }

  return (
    <FormFrame style={styles.container}>
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
  copy: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
});
