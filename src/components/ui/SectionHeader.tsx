import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction }) => (
  <View style={styles.root}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction} accessibilityRole="button" style={styles.actionButton}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
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
  actionButton: {},
  actionText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});
