import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface ModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ visible, onDismiss, title, children }) => (
  <RNModal animationType="fade" transparent visible={visible} onRequestClose={onDismiss}>
    <Pressable style={styles.overlay} onPress={onDismiss} accessibilityRole="button">
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </Pressable>
  </RNModal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  title: {
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '700',
    color: theme.colors.ink,
  },
});
