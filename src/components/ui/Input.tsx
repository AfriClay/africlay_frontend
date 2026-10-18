import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, type StyleProp, type TextInputProps, type TextStyle, View, type ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Eye, EyeOff } from 'lucide-react-native';
import { Button } from './Button';
import { FormField } from './FormField';
import { useAppTheme } from '../../contexts/ThemeContext';

export interface InputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  helperText,
  required,
  optional,
  containerStyle,
  inputStyle,
  multiline,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...inputProps
}) => {
  const { colors } = useAppTheme();
  const disabled = inputProps.editable === false;
  const [visible, setVisible] = useState(!secureTextEntry);
  const [focused, setFocused] = useState(false);
  return (
    <FormField label={label} helperText={helperText} error={error} required={required} optional={optional} style={containerStyle}>
      <View style={[
        styles.inputWrapper,
        multiline ? styles.multilineWrapper : null,
        { backgroundColor: colors.surface, borderColor: error ? colors.danger : focused ? colors.focusRing : colors.border },
        disabled ? styles.disabled : null,
      ]}>
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry && !visible}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : inputProps.textAlignVertical}
          selectionColor={colors.accent}
          style={[styles.input, multiline ? styles.multilineInput : null, { color: colors.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null, inputStyle]}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={event => { setFocused(true); onFocus?.(event); }}
          onBlur={event => { setFocused(false); onBlur?.(event); }}
        />
        {secureTextEntry ? (
          <Button
            variant="icon"
            size="sm"
            onPress={() => setVisible(v => !v)}
            disabled={disabled}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            style={styles.eyeButton}
            icon={visible ? <Eye color={colors.textMuted} size={18} /> : <EyeOff color={colors.textMuted} size={18} />}
          />
        ) : null}
      </View>
    </FormField>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    borderRadius: theme.radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.smd,
    paddingRight: theme.spacing.xs,
    minHeight: 50,
  },
  multilineWrapper: { minHeight: 112, alignItems: 'flex-start', paddingRight: theme.spacing.smd },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: theme.spacing.smd,
    fontFamily: 'Inter_400Regular',
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  multilineInput: { minHeight: 110, paddingTop: theme.spacing.smd, paddingBottom: theme.spacing.smd },
  disabled: { opacity: 0.55 },
  eyeButton: {
    flexShrink: 0,
    minWidth: 44,
    minHeight: 44,
  },
});
