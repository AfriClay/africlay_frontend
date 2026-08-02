import React, { useEffect, useMemo, useRef } from 'react';
import { Keyboard, StyleSheet, TextInput, View, Text } from 'react-native';
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
  const inputs = useRef<Array<TextInput | null>>([]);
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
            style={[styles.cell, error ? styles.cellError : null]}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            accessible
            accessibilityLabel={`OTP digit ${index + 1}`}
          />
        ))}
      </View>
      {error ? <View style={styles.errorContainer}><View><Text style={styles.error}>{error}</Text></View></View> : null}
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
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
    fontSize: theme.typography.h2.fontSize,
    color: theme.colors.ink,
    backgroundColor: theme.colors.white,
  },
  cellError: {
    borderColor: theme.colors.error,
  },
  errorContainer: {
    marginTop: theme.spacing.xs,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.typography.small.fontSize,
  },
});
