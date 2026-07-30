import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export const Chip: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.root}>
    <Text style={styles.text}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.primary.tint,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
  },
  text: {
    color: theme.colors.primary.dark,
    fontSize: theme.typography.small.fontSize,
  },
});
