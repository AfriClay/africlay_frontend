import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

export const Skeleton: React.FC<{ width?: number | string; height?: number }> = ({ width = '100%', height = 16 }) => {
  const style: any = { width, height };
  return <View style={[styles.root, style]} />;
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.sm,
  },
});
