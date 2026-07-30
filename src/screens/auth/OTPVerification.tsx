import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OTPInput } from '../../components/ui/OTPInput';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { VALID_OTP } from '../../constants/otp';
import { authService } from '../../services/authService';
import { theme } from '../../theme';

export const OTPVerification: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [timer, setTimer] = useState(30);
  const canResend = timer === 0;

  useEffect(() => {
    const interval = setInterval(() => setTimer(current => Math.max(0, current - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async () => {
    if (code.length !== 6) {
      return;
    }
    const result = await authService.verifyOtp(code);
    if (result) {
      navigation.navigate('RoleSelection');
    } else {
      setError('Incorrect code');
      setCode('');
    }
  };

  const handleResend = () => {
    if (canResend) {
      setTimer(30);
      setError(undefined);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTP Verification</Text>
      <Text style={styles.copy}>Enter the 6-digit code sent to your email or phone.</Text>
      <OTPInput value={code} onChange={setCode} onComplete={handleComplete} error={error} accessibilityLabel="OTP code" />
      <Pressable onPress={handleResend} disabled={!canResend} accessibilityRole="button">
        <Text style={[styles.resend, !canResend ? styles.resendDisabled : null]}>Resend code {canResend ? '' : `(${timer}s)`}</Text>
      </Pressable>
      <Button onPress={handleComplete} disabled={code.length !== 6} accessibilityLabel="Verify code">Verify Code</Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
    color: theme.colors.ink,
  },
  copy: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.xl,
    fontSize: theme.typography.body.fontSize,
  },
  resend: {
    color: theme.colors.primary.DEFAULT,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  resendDisabled: {
    color: theme.colors.muted,
  },
});
