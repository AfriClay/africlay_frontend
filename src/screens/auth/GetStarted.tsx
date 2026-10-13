import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  const continueBrowsing = async () => {
    await auth.continueAsGuest();
    const root = navigation.getParent<any>();
    if (root?.canGoBack()) root.goBack();
    else root?.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
  };

  return (
    <FormFrame style={styles.container}>
      <Text style={styles.title}>Support Local. Buy African. Grow Africa.</Text>
      <Text style={styles.copy}>A secure marketplace for authentic products, services, and trusted sellers across Africa.</Text>
      <View style={styles.actions}>
        <Button fullWidth onPress={() => navigation.navigate(ROUTES.Login)} accessibilityLabel="Login">Login</Button>
        <Button fullWidth variant="secondary" onPress={() => navigation.navigate(ROUTES.Register)} accessibilityLabel="Create Account">Create Account</Button>
      </View>
      <Button fullWidth variant="tertiary" onPress={() => void continueBrowsing()}>Continue browsing</Button>
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
});
