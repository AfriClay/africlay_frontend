import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { FormFrame } from '../../components/layout/FormFrame';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../constants/routes';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

export const GetStarted: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'GetStarted'>>();
  const auth = useAuth();

  return (
    <FormFrame style={styles.container}>
      <Text style={styles.title}>Support Local. Buy African. Grow Africa.</Text>
      <Text style={styles.copy}>A secure marketplace for authentic products, services, and trusted sellers across Africa.</Text>
      <View style={styles.actions}>
        <Button onPress={() => navigation.navigate(ROUTES.Login)} accessibilityLabel="Login">Login</Button>
        <Button variant="outline" onPress={() => navigation.navigate(ROUTES.Register)} accessibilityLabel="Create Account">Create Account</Button>
      </View>
      <Pressable onPress={auth.continueAsGuest} accessibilityRole="button">
        <Text style={styles.guestLink}>Continue as Guest</Text>
      </Pressable>
    </FormFrame>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.lg,
  },
  copy: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.xxl,
  },
  actions: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  guestLink: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
