import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { theme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'icon' | 'outline' | 'ghost';
export type ButtonStatus = 'idle' | 'success' | 'error';

export interface ButtonProps {
  children?: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  status?: ButtonStatus;
  successLabel?: string;
  errorLabel?: string;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel = 'Working',
  disabled = false,
  status = 'idle',
  successLabel,
  errorLabel,
  icon,
  iconPosition = 'start',
  fullWidth = false,
  accessibilityLabel,
  style,
  testID,
}) => {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotionSafe();
  const [focused, setFocused] = useState(false);
  const blocked = disabled || loading;
  const normalizedVariant = variant === 'outline' ? 'secondary' : variant === 'ghost' ? 'tertiary' : variant;
  const iconOnly = normalizedVariant === 'icon';
  const statusLabel = status === 'success' ? successLabel : status === 'error' ? errorLabel : undefined;
  const visibleLabel = statusLabel ?? children;

  useEffect(() => {
    if (__DEV__ && iconOnly && !accessibilityLabel) console.warn('Icon-only Button requires accessibilityLabel.');
  }, [accessibilityLabel, iconOnly]);

  const palette = normalizedVariant === 'primary' ? {
    background: colors.accent,
    pressed: colors.accentPressed,
    text: colors.surface,
    border: colors.accent,
  } : normalizedVariant === 'secondary' ? {
    background: colors.surface,
    pressed: colors.accentSoft,
    text: colors.accentPressed,
    border: colors.border,
  } : normalizedVariant === 'destructive' ? {
    background: colors.danger,
    pressed: colors.dangerPressed,
    text: colors.surface,
    border: colors.danger,
  } : {
    background: 'transparent',
    pressed: colors.accentSoft,
    text: normalizedVariant === 'icon' ? colors.text : colors.accent,
    border: 'transparent',
  };

  const minHeight = size === 'lg' ? 56 : size === 'sm' ? 48 : 50;
  const horizontalPadding = iconOnly ? 0 : size === 'lg' ? theme.spacing.lg : size === 'sm' ? theme.spacing.smd : theme.spacing.md;
  const statusIcon = status === 'success'
    ? <CheckCircle2 size={18} color={palette.text} />
    : status === 'error' ? <AlertCircle size={18} color={palette.text} /> : icon;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={loading || status !== 'idle' ? 'polite' : 'none'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight,
          minWidth: iconOnly ? minHeight : 48,
          paddingHorizontal: horizontalPadding,
          backgroundColor: pressed && !blocked ? palette.pressed : palette.background,
          borderColor: focused ? colors.focusRing : palette.border,
          opacity: blocked ? 0.5 : 1,
          transform: pressed && !blocked && !reducedMotion ? [{ scale: 0.985 }] : undefined,
          alignSelf: fullWidth ? 'stretch' : undefined,
        },
        iconOnly && styles.iconButton,
        style,
      ]}
    >
      <View style={[styles.content, loading && styles.hiddenContent]}>
        {!iconOnly && statusIcon && iconPosition === 'start' ? statusIcon : null}
        {!iconOnly && visibleLabel != null ? <Text numberOfLines={2} style={[styles.text, { color: palette.text }]}>{visibleLabel}</Text> : null}
        {!iconOnly && statusIcon && iconPosition === 'end' ? statusIcon : null}
        {iconOnly ? statusIcon : null}
      </View>
      {loading ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator color={palette.text} /><Text style={[styles.loadingText, { color: palette.text }]}>{loadingLabel}</Text></View> : null}
    </Pressable>
  );
};

export const StickyButtonBar = ({ children, keyboardVerticalOffset = 0 }: React.PropsWithChildren<{ keyboardVerticalOffset?: number }>) => {
  const { bottom } = useSafeAreaInsets();
  const { colors } = useAppTheme();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
      <View style={[styles.stickyBar, { paddingBottom: Math.max(bottom, theme.spacing.smd), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radii.control,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  iconButton: { borderRadius: theme.radii.pill, paddingVertical: 0 },
  content: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  hiddenContent: { opacity: 0 },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  text: {
    flexShrink: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    textAlign: 'center',
  },
  loadingText: { fontFamily: 'Inter_600SemiBold', fontSize: theme.typography.small.fontSize },
  stickyBar: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.smd,
    borderTopWidth: 1,
    ...theme.shadows.md,
  },
});
