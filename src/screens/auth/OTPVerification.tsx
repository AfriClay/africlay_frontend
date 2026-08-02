import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OTPInput } from '../../components/ui/OTPInput';
import { Button } from '../../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import { getAuthErrorMessage } from '../../services/authService';
import { theme } from '../../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../hooks/useAuth';

const RESEND_COOLDOWN_SECONDS = 60;

export const OTPVerification: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>>();
  const { pendingEmail, resendVerification, verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [timer, setTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const canResend = timer === 0;

  useEffect(() => {
    const interval = setInterval(() => setTimer(current => Math.max(0, current - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = useCallback(async () => {
    if (code.length !== 6 || verifying) {
      return;
    }
    setVerifying(true);
    setError(undefined);
    try {
      await verifyEmail(code);
      navigation.navigate('RoleSelection');
    } catch (verificationError) {
      setError(getAuthErrorMessage(verificationError, 'Unable to verify this code.'));
      setCode('');
    } finally {
      setVerifying(false);
    }
  }, [code, navigation, verifyEmail, verifying]);

  const handleResend = async () => {
    if (!canResend || resending) {
      return;
    }

    setResending(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await resendVerification();
      setTimer(RESEND_COOLDOWN_SECONDS);
      setNotice('A new verification code has been sent.');
    } catch (resendError) {
      setError(getAuthErrorMessage(resendError, 'Unable to resend the code.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.copy}>Enter the 6-digit code sent to {pendingEmail ?? 'your email'}.</Text>
      <OTPInput value={code} onChange={setCode} onComplete={handleComplete} error={error} accessibilityLabel="Email verification code" />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable onPress={handleResend} disabled={!canResend || resending} accessibilityRole="button">
        <Text style={[styles.resend, !canResend || resending ? styles.resendDisabled : null]}>Resend code {canResend ? '' : `(${timer}s)`}</Text>
      </Pressable>
      <Button onPress={handleComplete} disabled={code.length !== 6 || verifying} loading={verifying} accessibilityLabel="Verify email">Verify Email</Button>
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
  notice: {
    color: theme.colors.primary.DEFAULT,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
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
