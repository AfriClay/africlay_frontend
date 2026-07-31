import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { loginSchema } from '../../validation/authSchemas';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';

type LoginForm = {
  identifier: string;
  password: string;
};

export const Login: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMessage(null);
    try {
      await auth.login(data.identifier, data.password);
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (error) {
      setErrorMessage('Invalid email or password.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>
      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input
            label="Email or phone"
            value={value}
            onChangeText={onChange}
            placeholder="you@example.com"
            error={fieldState.error?.message}
            accessibilityLabel="Email or phone"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value }, fieldState }) => (
          <Input
            label="Password"
            value={value}
            onChangeText={onChange}
            placeholder="Enter your password"
            secureTextEntry
            error={fieldState.error?.message}
            accessibilityLabel="Password"
          />
        )}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Text style={styles.forgot} onPress={() => navigation.navigate(ROUTES.ForgotPassword)}>Forgot Password?</Text>
      <Button onPress={handleSubmit(onSubmit)} loading={auth.loading} accessibilityLabel="Log In">Log In</Button>
      <Text style={styles.footer}>Don�t have an account? <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.Register)}>Create Account</Text></Text>
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
  forgot: {
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.lg,
    textAlign: 'right',
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
