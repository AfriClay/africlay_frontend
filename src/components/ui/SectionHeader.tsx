import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Button } from './Button';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction }) => (
  <View style={styles.root}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel && onAction ? <Button onPress={onAction} variant="tertiary" size="sm">{actionLabel}</Button> : null}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    color: theme.colors.ink,
  },
});
