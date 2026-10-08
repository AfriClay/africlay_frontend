import React, { useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, Clock3, WalletCards } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { isWalletTopUpPhone, normalizeKenyanPaymentPhone, paymentKeys, paymentService } from '../../services/paymentService';
import { theme } from '../../theme';
import { PaymentAttempt } from '../../types/payment';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export const Wallet: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const client = useQueryClient();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [formError, setFormError] = useState<string>();
  const [attempt, setAttempt] = useState<PaymentAttempt>();
  const idempotency = useRef<{ signature: string; key: string } | undefined>(undefined);
  const wallets = useQuery({ queryKey: paymentKeys.wallets(userId), queryFn: paymentService.listWallets, enabled: Boolean(userId), refetchOnMount: 'always' });
  const wallet = useMemo(() => wallets.data?.find(item => item.currency === 'KES') ?? wallets.data?.[0], [wallets.data]);
  const transactions = useQuery({
    queryKey: paymentKeys.transactions(userId, wallet?.id ?? ''),
    queryFn: () => paymentService.listWalletTransactions(wallet!.id),
    enabled: Boolean(userId && wallet?.id),
    refetchOnMount: 'always',
  });
  const topUp = useMutation({
    mutationFn: ({ value, phone, key }: { value: number; phone: string; key: string }) => paymentService.topUpWallet(value, phone, key),
    onSuccess: result => {
      setAttempt(result);
      setFormError(undefined);
      if (result.status === 'succeeded') {
        setAmount('');
        idempotency.current = undefined;
        void client.invalidateQueries({ queryKey: paymentKeys.wallets(userId) });
        if (wallet?.id) void client.invalidateQueries({ queryKey: paymentKeys.transactions(userId, wallet.id) });
      }
    },
    onError: error => setFormError(getApiErrorMessage(error, 'Unable to request this wallet top-up.')),
  });

  const refresh = async () => {
    await Promise.allSettled([wallets.refetch(), wallet?.id ? transactions.refetch() : Promise.resolve()]);
  };

  const submit = (newAttempt = false) => {
    const value = Number(amount);
    const normalizedPhone = normalizeKenyanPaymentPhone(phoneNumber);
    if (!Number.isInteger(value) || value < 1) {
      setFormError('Enter a whole KES amount of at least 1.');
      return;
    }
    if (!isWalletTopUpPhone(normalizedPhone)) {
      setFormError('Use a Kenyan number in 2547XXXXXXXX or 2541XXXXXXXX format.');
      return;
    }
    const signature = `${value}:${normalizedPhone}`;
    if (newAttempt) idempotency.current = undefined;
    if (idempotency.current?.signature !== signature) idempotency.current = { signature, key: randomUUID() };
    setFormError(undefined);
    topUp.mutate({ value, phone: normalizedPhone, key: idempotency.current.key });
  };

  if (!user) return <EmptyState title="Sign in to view your wallet" description="Wallet balances and transactions are private." />;
  if (wallets.isError) return <ErrorState message={getApiErrorMessage(wallets.error, 'Unable to load your wallet.')} onRetry={() => void wallets.refetch()} />;

  const attemptMessage = attempt?.status === 'succeeded'
    ? 'Top-up confirmed.'
    : attempt?.status === 'failed'
      ? attempt.resultDescription || 'The top-up failed.'
      : attempt?.status === 'unknown'
        ? 'The provider result is not confirmed. Refresh wallet activity before retrying.'
        : attempt ? attempt.resultDescription || 'Complete the M-Pesa prompt on your phone.' : undefined;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={wallets.isFetching || transactions.isFetching} onRefresh={() => void refresh()} />}>
    <View style={styles.balanceSection}>
      <View style={styles.balanceIcon}><WalletCards size={24} color={theme.colors.primary.dark} /></View>
      <Text style={styles.label}>Available balance</Text>
      <Text style={styles.balance}>{wallets.isLoading ? 'Loading...' : formatCurrency(wallet?.availableBalance ?? 0, wallet?.currency ?? 'KES')}</Text>
      {wallet ? <Text style={styles.meta}>{formatCurrency(wallet.heldBalance, wallet.currency)} currently held for orders</Text> : null}
      {wallet?.isFrozen ? <Text style={styles.error}>Wallet activity is temporarily unavailable.</Text> : null}
    </View>

    <View style={styles.section}>
      <Text style={styles.title}>Add money with M-Pesa</Text>
      <Input label="Amount (KSh)" value={amount} onChangeText={value => { setAmount(value); setAttempt(undefined); setFormError(undefined); topUp.reset(); }} placeholder="1000" keyboardType="number-pad" />
      <Input label="Phone number" value={phoneNumber} onChangeText={value => { setPhoneNumber(value); setAttempt(undefined); setFormError(undefined); topUp.reset(); }} placeholder="254712345678" keyboardType="phone-pad" autoComplete="tel" />
      {formError ? <Text style={styles.error} accessibilityRole="alert">{formError}</Text> : null}
      {attemptMessage ? <View style={styles.attempt}>
        {attempt?.status === 'succeeded' ? <CircleCheckBig size={20} color={theme.colors.success} /> : <Clock3 size={20} color={theme.colors.secondary.dark} />}
        <View style={styles.attemptCopy}><Text style={styles.attemptTitle}>{attempt?.status === 'succeeded' ? 'Confirmed' : attempt?.status === 'failed' ? 'Not completed' : 'Request sent'}</Text><Text style={styles.meta}>{attemptMessage}</Text></View>
      </View> : null}
      {attempt?.status === 'failed'
        ? <Button loading={topUp.isPending} loadingLabel="Requesting top-up" disabled={wallet?.isFrozen} onPress={() => submit(true)}>Start New Top-up</Button>
        : attempt && attempt.status !== 'succeeded'
          ? null
          : <Button loading={topUp.isPending} loadingLabel="Requesting top-up" disabled={wallet?.isFrozen} onPress={() => submit()}>{topUp.isError ? 'Retry Same Top-up' : 'Send M-Pesa Prompt'}</Button>}
      {attempt && attempt.status !== 'succeeded' ? <Button variant="secondary" onPress={() => void refresh()}>Refresh Wallet Activity</Button> : null}
    </View>

    <View style={styles.section}>
      <Text style={styles.title}>Recent activity</Text>
      {transactions.isError ? <View><Text style={styles.error}>Unable to load wallet activity.</Text><Button variant="secondary" onPress={() => void transactions.refetch()}>Retry</Button></View> :
        transactions.isLoading ? <Text style={styles.meta}>Loading activity...</Text> :
        (transactions.data?.results.length ?? 0) === 0 ? <Text style={styles.meta}>No wallet transactions yet.</Text> :
        transactions.data?.results.map(item => <View key={item.id} style={styles.transaction}><View style={styles.transactionCopy}><Text style={styles.transactionType}>{item.type.replace(/_/g, ' ')}</Text><Text style={styles.meta}>{formatDate(item.createdAt)}</Text></View><Text style={styles.transactionAmount}>{formatCurrency(item.amount, wallet?.currency ?? 'KES')}</Text></View>)}
    </View>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  balanceSection: { alignItems: 'center', paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  balanceIcon: { width: 48, height: 48, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint, marginBottom: theme.spacing.sm },
  label: { color: theme.colors.muted },
  balance: { color: theme.colors.ink, fontSize: 30, lineHeight: 38, fontWeight: '800', marginTop: theme.spacing.xs },
  section: { paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: theme.spacing.sm },
  title: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.sm },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: 18 },
  error: { color: theme.colors.error, marginBottom: theme.spacing.sm },
  attempt: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.colors.secondary.tint, borderRadius: theme.radii.md },
  attemptCopy: { flex: 1, minWidth: 0 },
  attemptTitle: { color: theme.colors.ink, fontWeight: '800', marginBottom: 2 },
  transaction: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionType: { color: theme.colors.ink, fontWeight: '700', textTransform: 'capitalize' },
  transactionAmount: { color: theme.colors.ink, fontWeight: '800' },
});
