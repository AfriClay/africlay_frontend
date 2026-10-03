import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../../theme';
import { Eye, EyeOff } from 'lucide-react-native';
import { Button } from './Button';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  error?: string;
  accessibilityLabel?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize,
  autoComplete,
  autoCorrect,
  error,
  accessibilityLabel,
}) => {
  const [visible, setVisible] = useState(!secureTextEntry);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.root}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, focused ? styles.inputFocused : null, error ? styles.inputError : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          style={styles.input}
          accessibilityLabel={accessibilityLabel}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <Button
            variant="icon"
            size="sm"
            onPress={() => setVisible(v => !v)}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            style={styles.eyeButton}
            icon={visible ? <Eye color={theme.colors.muted} size={18} /> : <EyeOff color={theme.colors.muted} size={18} />}
          />
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.ink,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
  },
  inputWrapper: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
  },
  eyeButton: {
    flexShrink: 0,
  },
  inputFocused: {
    borderColor: theme.colors.primary.DEFAULT,
    borderWidth: 2,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    marginTop: theme.spacing.xs,
    color: theme.colors.error,
    fontSize: theme.typography.small.fontSize,
  },
});
