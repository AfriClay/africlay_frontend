import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export const Badge: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.root}>
    <Text style={styles.text}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.secondary.tint,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  text: {
    color: theme.colors.ink,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
  },
});
