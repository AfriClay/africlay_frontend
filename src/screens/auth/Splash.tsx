import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Image } from 'expo-image';

export const Splash: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/africlay-brand-v1.png')} style={styles.mark} contentFit="cover" />
      <Text style={styles.title}>AfriClay</Text>
      <Text style={styles.tagline}>Buy. Sell. Connect.</Text>
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
    marginTop: theme.spacing.lg,
  },
  tagline: {
    color: theme.colors.secondary.DEFAULT,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.white,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  mark: {
    width: 164,
    height: 164,
    borderRadius: 36,
  },
});
