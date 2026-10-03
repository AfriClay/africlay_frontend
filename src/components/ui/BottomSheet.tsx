import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View, Text } from 'react-native';
import { theme } from '../../theme';
import { Button } from './Button';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => (
  <RNModal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button onPress={onAction} fullWidth>{actionLabel}</Button>
      {secondaryActionLabel && onSecondaryAction ? (
        <View style={styles.secondaryButton}><Button onPress={onSecondaryAction} variant="tertiary" fullWidth>{secondaryActionLabel}</Button></View>
      ) : null}
    </View>
  </RNModal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    padding: theme.spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  description: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.body.fontSize,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
  },
});
