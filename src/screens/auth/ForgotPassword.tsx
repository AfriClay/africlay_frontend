import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { passwordResetSchema } from '../../validation/authSchemas';
import { authService } from '../../services/authService';

type ResetForm = {
  identifier: string;
};

export const ForgotPassword: React.FC = () => {
  const [sent, setSent] = useState(false);
  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { identifier: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    await authService.sendPasswordReset(data.identifier);
    setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reset Link Sent</Text>
        <Text style={styles.copy}>If an account exists for that email/phone, we&apos;ve sent a reset link.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input label="Email or phone" value={value} onChangeText={onChange} placeholder="you@example.com" error={fieldState.error?.message} accessibilityLabel="Email or phone" />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)} accessibilityLabel="Send reset link">Send Reset Link</Button>
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
});
