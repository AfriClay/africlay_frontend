import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, CircleX, Clock3, ShieldCheck, WalletCards } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import {
  isWalletTopUpPhone, normalizeKenyanPaymentPhone, paymentKeys, paymentService,
} from '../../services/paymentService';
import { theme } from '../../theme';
import { PaymentAttempt, Payout, PayoutStatus } from '../../types/payment';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { canAccessSellerTools } from '../../utils/roles';

const payoutStatusCopy: Record<PayoutStatus, { label: string; description: string }> = {
  requested: { label: 'Requested', description: 'Your funds have been reserved.' },
  processing: { label: 'Processing', description: 'M-Pesa is processing this payout.' },
  succeeded: { label: 'Paid', description: 'The payout was sent successfully.' },
  failed: { label: 'Not paid', description: 'The funds were returned to your available balance.' },
  unknown: { label: 'Being checked', description: 'Your funds remain reserved while the result is confirmed.' },
};

const PayoutStatusIcon = ({ status }: { status: PayoutStatus }) => status === 'succeeded'
  ? <CircleCheckBig size={19} color={theme.colors.success} />
  : status === 'failed' ? <CircleX size={19} color={theme.colors.error} />
    : status === 'unknown' ? <AlertTriangle size={19} color={theme.colors.secondary.dark} />
      : <Clock3 size={19} color={theme.colors.secondary.dark} />;

const PayoutRow = ({ payout }: { payout: Payout }) => {
  const status = payoutStatusCopy[payout.status];
  return <View style={styles.payoutRow}>
    <PayoutStatusIcon status={payout.status} />
    <View style={styles.transactionCopy}>
      <View style={styles.rowHeading}>
        <Text style={styles.transactionType}>{status.label}</Text>
        <Text style={styles.transactionAmount}>{formatCurrency(payout.amount, payout.currency)}</Text>
      </View>
      <Text style={styles.meta}>{payout.destinationPhone} - {formatDate(payout.createdAt)}</Text>
      <Text style={styles.meta}>{payout.transactionReceipt ? `Receipt ${payout.transactionReceipt}` : status.description}</Text>
      {payout.failureMessage && payout.status === 'failed' ? <Text style={styles.error}>{payout.failureMessage}</Text> : null}
    </View>
  </View>;
};

export const Wallet: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const isSeller = canAccessSellerTools(user?.role);
  const client = useQueryClient();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [formError, setFormError] = useState<string>();
  const [attempt, setAttempt] = useState<PaymentAttempt>();
  const [payoutPhone, setPayoutPhone] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutError, setPayoutError] = useState<string>();
  const idempotency = useRef<{ signature: string; key: string } | undefined>(undefined);
  const payoutIdempotency = useRef<{ signature: string; key: string } | undefined>(undefined);

  const wallets = useQuery({
    queryKey: paymentKeys.wallets(userId), queryFn: paymentService.listWallets,
    enabled: Boolean(userId), refetchOnMount: 'always',
  });
  const wallet = useMemo(() => wallets.data?.find(item => item.currency === 'KES') ?? wallets.data?.[0], [wallets.data]);
  const transactions = useQuery({
    queryKey: paymentKeys.transactions(userId, wallet?.id ?? ''),
    queryFn: () => paymentService.listWalletTransactions(wallet!.id),
    enabled: Boolean(userId && wallet?.id),
    refetchOnMount: 'always',
  });
  const payoutAccount = useQuery({
    queryKey: paymentKeys.payoutAccount(userId),
    queryFn: paymentService.getPayoutAccount,
    enabled: Boolean(userId && isSeller),
    refetchOnMount: 'always',
  });
  const payouts = useQuery({
    queryKey: paymentKeys.payouts(userId),
    queryFn: () => paymentService.listPayouts(),
    enabled: Boolean(userId && isSeller),
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
  const savePayoutAccount = useMutation({
    mutationFn: ({ phone, password }: { phone: string; password: string }) => paymentService.savePayoutAccount(phone, password),
    onSuccess: result => {
      client.setQueryData(paymentKeys.payoutAccount(userId), result);
      setPayoutPhone('');
      setAccountPassword('');
      setPayoutError(undefined);
    },
    onError: error => setPayoutError(getApiErrorMessage(error, 'Unable to save this payout number.')),
  });
  const requestPayout = useMutation({
    mutationFn: ({ value, key }: { value: number; key: string }) => paymentService.requestPayout(value, key),
    onSuccess: result => {
      setPayoutError(result.status === 'failed' ? result.failureMessage || 'This payout could not be started.' : undefined);
      setPayoutAmount('');
      payoutIdempotency.current = undefined;
      void client.invalidateQueries({ queryKey: paymentKeys.wallets(userId) });
      void client.invalidateQueries({ queryKey: paymentKeys.payouts(userId) });
      if (wallet?.id) void client.invalidateQueries({ queryKey: paymentKeys.transactions(userId, wallet.id) });
    },
    onError: error => setPayoutError(getApiErrorMessage(error, 'Unable to request this payout.')),
  });

  const refresh = async () => {
    await Promise.allSettled([
      wallets.refetch(),
      wallet?.id ? transactions.refetch() : Promise.resolve(),
      isSeller ? payoutAccount.refetch() : Promise.resolve(),
      isSeller ? payouts.refetch() : Promise.resolve(),
    ]);
  };

  const submitTopUp = (newAttempt = false) => {
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

  const submitPayoutAccount = () => {
    const normalizedPhone = normalizeKenyanPaymentPhone(payoutPhone || user?.phoneNumber || '');
    if (!isWalletTopUpPhone(normalizedPhone)) {
      setPayoutError('Use a Kenyan number in 2547XXXXXXXX or 2541XXXXXXXX format.');
      return;
    }
    if (!accountPassword) {
      setPayoutError('Enter your account password to confirm this payout number.');
      return;
    }
    setPayoutError(undefined);
    savePayoutAccount.mutate({ phone: normalizedPhone, password: accountPassword });
  };

  const submitPayout = () => {
    const value = Number(payoutAmount);
    const minimum = wallet?.minimumPayout ?? 500;
    if (!Number.isInteger(value) || value < minimum) {
      setPayoutError(`Enter a whole KES amount of at least ${formatCurrency(minimum, wallet?.currency ?? 'KES')}.`);
      return;
    }
    if (!wallet || value > wallet.availableBalance) {
      setPayoutError('The requested amount exceeds your available balance.');
      return;
    }
    const signature = String(value);
    if (payoutIdempotency.current?.signature !== signature) {
      payoutIdempotency.current = { signature, key: randomUUID() };
    }
    setPayoutError(undefined);
    requestPayout.mutate({ value, key: payoutIdempotency.current.key });
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
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.balanceSection}>
      <View style={styles.balanceIcon}><WalletCards size={24} color={theme.colors.primary.dark} /></View>
      <Text style={styles.label}>Available balance</Text>
      <Text style={styles.balance}>{wallets.isLoading ? 'Loading...' : formatCurrency(wallet?.availableBalance ?? 0, wallet?.currency ?? 'KES')}</Text>
      {wallet?.isFrozen ? <Text style={styles.error}>Wallet activity is temporarily unavailable.</Text> : null}
      {isSeller && wallet ? <View style={styles.balanceBreakdown}>
        <View style={styles.balanceItem}><Text style={styles.balanceItemValue}>{formatCurrency(wallet.orderHeldBalance, wallet.currency)}</Text><Text style={styles.meta}>Held for orders</Text></View>
        <View style={styles.balanceItem}><Text style={styles.balanceItemValue}>{formatCurrency(wallet.pendingPayoutBalance, wallet.currency)}</Text><Text style={styles.meta}>Payouts in progress</Text></View>
      </View> : wallet ? <Text style={styles.meta}>{formatCurrency(wallet.heldBalance, wallet.currency)} currently held</Text> : null}
    </View>

    {isSeller ? <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingIcon}><ShieldCheck size={20} color={theme.colors.primary.dark} /></View>
        <View style={styles.transactionCopy}><Text style={styles.title}>Seller payouts</Text><Text style={styles.meta}>Available earnings are sent to your saved M-Pesa number.</Text></View>
      </View>
      {payoutAccount.isError ? <View><Text style={styles.error}>{getApiErrorMessage(payoutAccount.error, 'Unable to load your payout details.')}</Text><Button variant="secondary" onPress={() => void payoutAccount.refetch()}>Retry</Button></View> : payoutAccount.data ? <>
        <View style={styles.destinationRow}>
          <View style={styles.transactionCopy}><Text style={styles.fieldLabel}>M-Pesa destination</Text><Text style={styles.destination}>{payoutAccount.data.phoneNumber}</Text><Text style={styles.meta}>{payoutAccount.data.accountName || 'Seller account'}</Text></View>
          <Button size="sm" variant="secondary" onPress={() => setPayoutPhone(user.phoneNumber ?? '')}>Change</Button>
        </View>
        {payoutPhone ? <View style={styles.formBand}>
          <Input label="New M-Pesa number" value={payoutPhone} onChangeText={setPayoutPhone} placeholder="254712345678" keyboardType="phone-pad" autoComplete="tel" />
          <Input label="Account password" value={accountPassword} onChangeText={setAccountPassword} placeholder="Confirm your identity" secureTextEntry autoComplete="current-password" />
          <View style={styles.actions}><Button variant="secondary" onPress={() => { setPayoutPhone(''); setAccountPassword(''); setPayoutError(undefined); }}>Cancel</Button><Button loading={savePayoutAccount.isPending} loadingLabel="Saving" onPress={submitPayoutAccount}>Save number</Button></View>
        </View> : <>
          <Input label="Payout amount (KSh)" value={payoutAmount} onChangeText={value => { setPayoutAmount(value); setPayoutError(undefined); requestPayout.reset(); }} placeholder={String(wallet?.minimumPayout ?? 500)} keyboardType="number-pad" />
          <Text style={styles.meta}>Minimum {formatCurrency(wallet?.minimumPayout ?? 500, wallet?.currency ?? 'KES')}. Funds remain reserved until M-Pesa confirms the result.</Text>
          <Button loading={requestPayout.isPending} loadingLabel="Requesting payout" disabled={wallet?.isFrozen || !wallet || wallet.availableBalance < (wallet.minimumPayout || 500)} onPress={submitPayout}>Withdraw to M-Pesa</Button>
        </>}
      </> : <View style={styles.formBand}>
        <Text style={styles.subtitle}>Add your payout number</Text>
        <Text style={styles.meta}>Use an M-Pesa number you control. Your password is required whenever the number changes.</Text>
        <Input label="M-Pesa number" value={payoutPhone} onChangeText={setPayoutPhone} placeholder={user.phoneNumber || '254712345678'} keyboardType="phone-pad" autoComplete="tel" />
        <Input label="Account password" value={accountPassword} onChangeText={setAccountPassword} placeholder="Confirm your identity" secureTextEntry autoComplete="current-password" />
        <Button loading={savePayoutAccount.isPending} loadingLabel="Saving" onPress={submitPayoutAccount}>Save payout number</Button>
      </View>}
      {payoutError ? <Text style={styles.error} accessibilityRole="alert">{payoutError}</Text> : null}

      <View style={styles.historyHeading}><Text style={styles.subtitle}>Payout history</Text><Button size="sm" variant="tertiary" onPress={() => void payouts.refetch()}>Refresh</Button></View>
      {payouts.isError ? <Text style={styles.error}>Unable to load payout history.</Text> : payouts.isLoading ? <Text style={styles.meta}>Loading payouts...</Text> : (payouts.data?.results.length ?? 0) === 0 ? <Text style={styles.meta}>No payouts requested yet.</Text> : payouts.data?.results.map(item => <PayoutRow key={item.id} payout={item} />)}
    </View> : null}

    <View style={styles.section}>
      <Text style={styles.title}>Add money with M-Pesa</Text>
      <Text style={styles.meta}>Top-ups can be used for marketplace purchases.</Text>
      <Input label="Amount (KSh)" value={amount} onChangeText={value => { setAmount(value); setAttempt(undefined); setFormError(undefined); topUp.reset(); }} placeholder="1000" keyboardType="number-pad" />
      <Input label="Phone number" value={phoneNumber} onChangeText={value => { setPhoneNumber(value); setAttempt(undefined); setFormError(undefined); topUp.reset(); }} placeholder="254712345678" keyboardType="phone-pad" autoComplete="tel" />
      {formError ? <Text style={styles.error} accessibilityRole="alert">{formError}</Text> : null}
      {attemptMessage ? <View style={styles.attempt}>
        {attempt?.status === 'succeeded' ? <CircleCheckBig size={20} color={theme.colors.success} /> : <Clock3 size={20} color={theme.colors.secondary.dark} />}
        <View style={styles.attemptCopy}><Text style={styles.attemptTitle}>{attempt?.status === 'succeeded' ? 'Confirmed' : attempt?.status === 'failed' ? 'Not completed' : 'Request sent'}</Text><Text style={styles.meta}>{attemptMessage}</Text></View>
      </View> : null}
      {attempt?.status === 'failed'
        ? <Button loading={topUp.isPending} loadingLabel="Requesting top-up" disabled={wallet?.isFrozen} onPress={() => submitTopUp(true)}>Start New Top-up</Button>
        : attempt && attempt.status !== 'succeeded'
          ? null
          : <Button loading={topUp.isPending} loadingLabel="Requesting top-up" disabled={wallet?.isFrozen} onPress={() => submitTopUp()}>{topUp.isError ? 'Retry Same Top-up' : 'Send M-Pesa Prompt'}</Button>}
      {attempt && attempt.status !== 'succeeded' ? <Button variant="secondary" onPress={() => void refresh()}>Refresh Wallet Activity</Button> : null}
    </View>

    <View style={styles.section}>
      <Text style={styles.title}>Recent wallet activity</Text>
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
  balanceBreakdown: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.md },
  balanceItem: { minWidth: 135, alignItems: 'center' },
  balanceItemValue: { color: theme.colors.ink, fontWeight: '800' },
  section: { paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: theme.spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  sectionHeadingIcon: { width: 38, height: 38, borderRadius: theme.radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
  title: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  subtitle: { color: theme.colors.ink, fontSize: theme.typography.body.fontSize, fontWeight: '800' },
  fieldLabel: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, fontWeight: '600' },
  destination: { color: theme.colors.ink, fontSize: 19, fontWeight: '800', marginVertical: 2 },
  destinationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  formBand: { paddingVertical: theme.spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: theme.spacing.sm },
  historyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  meta: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: 18 },
  error: { color: theme.colors.error, marginTop: theme.spacing.xs, fontSize: theme.typography.small.fontSize, lineHeight: 18 },
  attempt: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.colors.secondary.tint, borderRadius: theme.radii.md },
  attemptCopy: { flex: 1, minWidth: 0 },
  attemptTitle: { color: theme.colors.ink, fontWeight: '800', marginBottom: 2 },
  payoutRow: { minHeight: 78, flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  rowHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm },
  transaction: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionType: { color: theme.colors.ink, fontWeight: '700', textTransform: 'capitalize' },
  transactionAmount: { color: theme.colors.ink, fontWeight: '800' },
});
