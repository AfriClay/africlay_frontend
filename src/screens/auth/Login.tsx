import React, { useState } from 'react';
import { FormFrame } from '../../components/layout/FormFrame';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { getAuthErrorMessage } from '../../services/authService';

type LoginForm = {
  email: string;
  password: string;
};

export const Login: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const auth = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMessage(null);
    try {
      const result = await auth.login(data.email, data.password);
      if (result === 'verification') {
        navigation.navigate(ROUTES.OTPVerification);
      } else if (result === 'onboarding') {
        navigation.navigate(ROUTES.RoleSelection);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'Unable to log in.'));
    }
  };

  return (
    <FormFrame style={styles.container}>
      <Text style={styles.title}>Log In</Text>
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
      <Button variant="tertiary" size="sm" style={styles.forgot} onPress={() => navigation.navigate(ROUTES.ForgotPassword)}>Forgot password?</Button>
      <Button fullWidth onPress={handleSubmit(onSubmit)} loading={auth.loading} loadingLabel="Logging in" accessibilityLabel="Log In">Log In</Button>
      <View style={styles.footer}><Text style={styles.footerText}>Don&apos;t have an account?</Text><Button variant="tertiary" size="sm" onPress={() => navigation.navigate(ROUTES.Register)}>Create account</Button></View>
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
  forgot: {
    marginBottom: theme.spacing.lg,
    alignSelf: 'flex-end',
  },
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
