import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, TextInput, View, Text } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  error?: string;
  accessibilityLabel?: string;
}

const CELL_COUNT = 6;

export const OTPInput: React.FC<OTPInputProps> = ({ value, onChange, onComplete, error, accessibilityLabel }) => {
  const { colors } = useAppTheme();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>();
  const digits = useMemo(() => Array.from({ length: CELL_COUNT }, (_, index) => value[index] ?? ''), [value]);

  useEffect(() => {
    if (value.length === CELL_COUNT) {
      Keyboard.dismiss();
      onComplete();
    }
  }, [value, onComplete]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    const nextValue = value.split('');
    nextValue[index] = digit.slice(-1);
    const joined = nextValue.join('');
    onChange(joined);
    if (digit && index < CELL_COUNT - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }, index: number) => {
    if (nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const nextValue = value.split('');
      nextValue[index - 1] = '';
      onChange(nextValue.join(''));
    }
  };

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { inputs.current[index] = ref; }}
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={event => handleKeyPress(event, index)}
            style={[styles.cell, { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : focusedIndex === index ? colors.focusRing : colors.border }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            accessible
            accessibilityLabel={`OTP digit ${index + 1}`}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(current => current === index ? undefined : current)}
          />
        ))}
      </View>
      {error ? <View style={styles.errorContainer}><View><Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text></View></View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  cell: {
    flex: 1,
    maxWidth: 48,
    minWidth: 38,
    height: 56,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: theme.typography.h2.fontSize,
  },
  errorContainer: {
    marginTop: theme.spacing.xs,
  },
  error: {
    fontSize: theme.typography.small.fontSize,
  },
});
