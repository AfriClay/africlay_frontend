import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export const Splash: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) {
      return;
    }

    const timeout = setTimeout(() => {
      if (auth.user || auth.isGuest) {
        navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: ROUTES.GetStarted }] });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [auth.loading, auth.user, auth.isGuest, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AfriClay � Buy. Sell. Connect.</Text>
      <Text style={styles.subtitle}>Empowering Africa one trade at a time.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.white,
    fontSize: theme.typography.h1.fontSize,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.white,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
});
