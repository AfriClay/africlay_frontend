import React from 'react';
import { ActivityIndicator, StyleSheet, Text, Pressable } from 'react-native';
import { theme } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  accessibilityLabel,
}) => {
  const backgroundColors = {
    primary: theme.colors.primary.DEFAULT,
    secondary: theme.colors.secondary.DEFAULT,
    outline: theme.colors.white,
    ghost: theme.colors.white,
  } as const;

  const textColors = {
    primary: theme.colors.white,
    secondary: theme.colors.ink,
    outline: theme.colors.ink,
    ghost: theme.colors.primary.DEFAULT,
  } as const;

  const borderColors: Record<ButtonVariant, string> = {
    primary: 'transparent',
    secondary: 'transparent',
    outline: theme.colors.border,
    ghost: 'transparent',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: backgroundColors[variant],
          borderColor: borderColors[variant] ?? 'transparent',
          opacity: disabled || loading ? 0.6 : pressed ? 0.9 : 1,
          paddingVertical: size === 'sm' ? theme.spacing.sm : size === 'lg' ? theme.spacing.lg : theme.spacing.md,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <Text style={[styles.text, { color: textColors[variant] }]}>{children}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});
