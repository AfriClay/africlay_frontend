import React from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export const Skeleton: React.FC<{ width?: DimensionValue; height?: number }> = ({ width = '100%', height = 16 }) => {
  const style: ViewStyle = { width, height };
  return <View style={[styles.root, style]} />;
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.sm,
  },
});
