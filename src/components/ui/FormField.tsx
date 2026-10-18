import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';

type Props = PropsWithChildren<{
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export const FormField = ({ label, helperText, error, required, optional, style, children }: Props) => {
  const { colors } = useAppTheme();
  return <View style={[styles.root, style]}>
    {label ? <View style={styles.labelRow}>
      <Text style={[styles.label, { color: colors.text }]}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>
      {optional && !required ? <Text style={[styles.optional, { color: colors.textMuted }]}>Optional</Text> : null}
    </View> : null}
    {children}
    {error
      ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.danger }]}>{error}</Text>
      : helperText ? <Text style={[styles.message, { color: colors.textMuted }]}>{helperText}</Text> : null}
  </View>;
};

const styles = StyleSheet.create({
  root: { marginBottom: theme.spacing.md, minWidth: 0 },
  labelRow: { minHeight: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  label: { flexShrink: 1, fontFamily: 'Inter_600SemiBold', fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
  optional: { flexShrink: 0, fontFamily: 'Inter_400Regular', fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
  message: { marginTop: theme.spacing.xs, fontFamily: 'Inter_400Regular', fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
});
