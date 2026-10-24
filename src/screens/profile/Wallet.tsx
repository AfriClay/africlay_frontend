import React, { useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { PaymentAttempt, Payout, PayoutStatus, WalletBalanceSource } from '../../types/payment';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { canAccessSellerTools } from '../../utils/roles';
import { getWithdrawalAvailability } from '../../utils/walletWithdrawal';
import type { WithdrawalAvailability } from '../../utils/walletWithdrawal';

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
      <Text style={styles.meta}>{payout.balanceSource === 'earnings' ? 'Seller earnings' : 'Shopping funds'}</Text>
      <Text style={styles.meta}>{payout.transactionReceipt ? `Receipt ${payout.transactionReceipt}` : status.description}</Text>
      {payout.failureMessage && payout.status === 'failed' ? <Text style={styles.error}>{payout.failureMessage}</Text> : null}
    </View>
  </View>;
};

type WalletViewProps = {
  balanceSource: WalletBalanceSource;
};

const WalletView: React.FC<WalletViewProps> = ({ balanceSource }) => {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const isEarnings = balanceSource === 'earnings';
  const client = useQueryClient();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [formError, setFormError] = useState<string>();
  const [attempt, setAttempt] = useState<PaymentAttempt>();
  const [payoutPhone, setPayoutPhone] = useState('');
  const [isEditingPayoutAccount, setIsEditingPayoutAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
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
    enabled: Boolean(userId),
    refetchOnMount: 'always',
  });
  const payouts = useQuery({
    queryKey: paymentKeys.payouts(userId),
    queryFn: () => paymentService.listPayouts(),
    enabled: Boolean(userId),
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
      setIsEditingPayoutAccount(false);
      setAccountPassword('');
      setPayoutError(undefined);
    },
    onError: error => setPayoutError(getApiErrorMessage(error, 'Unable to save this payout number.')),
  });
  const requestPayout = useMutation({
    mutationFn: ({ source, key }: { source: WalletBalanceSource; key: string }) => paymentService.requestPayout(source, key),
    onSuccess: result => {
      setPayoutError(
        result.status === 'failed'
          ? result.failureMessage || 'This payout could not be started.'
          : result.status === 'unknown'
            ? 'M-Pesa has not confirmed the result. Your funds remain reserved while AfriClay reconciles the payout.'
            : undefined,
      );
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
      payoutAccount.refetch(),
      payouts.refetch(),
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
    const normalizedPhone = normalizeKenyanPaymentPhone(payoutPhone);
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

  const availabilityInput = (source: WalletBalanceSource) => getWithdrawalAvailability({
    wallet,
    source,
    payouts: payouts.data?.results,
    walletLoading: wallets.isLoading,
    walletError: wallets.isError,
    payoutAccountLoading: payoutAccount.isLoading,
    payoutAccountError: payoutAccount.isError,
    hasPayoutAccount: Boolean(payoutAccount.data),
    requestPending: requestPayout.isPending,
  });

  const availabilityMessage = (availability: WithdrawalAvailability, source: WalletBalanceSource) => {
    const sourceLabel = source === 'earnings' ? 'seller earnings' : 'shopping funds';
    switch (availability.reason) {
      case 'wallet_loading': return 'Loading the authoritative wallet balance.';
      case 'wallet_unavailable': return 'Wallet balance is unavailable. Refresh before trying to withdraw.';
      case 'destination_loading': return 'Loading your M-Pesa withdrawal destination.';
      case 'destination_unavailable': return 'Your M-Pesa withdrawal destination could not be loaded. Retry before withdrawing.';
      case 'destination_missing': return 'Add an M-Pesa withdrawal number before withdrawing.';
      case 'request_pending': return 'Wait for the current withdrawal request to finish submitting.';
      case 'wallet_frozen': return 'This wallet is frozen. Contact support before attempting a withdrawal.';
      case 'payout_unknown': return `A ${sourceLabel} payout is being reconciled. Its funds remain reserved until the provider result is confirmed.`;
      case 'payout_pending': return `A ${sourceLabel} payout is already being processed. Its funds remain reserved.`;
      case 'funds_reserved': return source === 'earnings'
        ? 'These earnings are held for orders or an active payout and are not yet withdrawable.'
        : 'These shopping funds are reserved for orders or an active payout and are not withdrawable.';
      case 'zero_balance': return `There are no available ${sourceLabel} to withdraw.`;
      case 'below_minimum': return `Available ${sourceLabel} must reach ${formatCurrency(wallet?.withdrawalMinimum ?? 0, wallet?.currency ?? 'KES')} before withdrawal.`;
      case 'above_maximum': return `This balance exceeds the ${formatCurrency(wallet?.withdrawalMaximum ?? 0, wallet?.currency ?? 'KES')} M-Pesa transfer limit. Contact support.`;
      case 'fractional_balance': return 'M-Pesa withdrawals require a whole KES balance. Contact support for this balance.';
      default: return undefined;
    }
  };

  const submitPayout = (source: WalletBalanceSource) => {
    const availability = availabilityInput(source);
    const unavailableMessage = availabilityMessage(availability, source);
    if (!availability.allowed || !wallet) {
      setPayoutError(unavailableMessage || 'This balance is not currently available for withdrawal.');
      return;
    }
    const value = availability.amount;
    const signature = `${source}:${value}`;
    if (payoutIdempotency.current?.signature !== signature) {
      payoutIdempotency.current = { signature, key: randomUUID() };
    }
    const run = () => {
      setPayoutError(undefined);
      requestPayout.mutate({ source, key: payoutIdempotency.current!.key });
    };
    const sourceLabel = source === 'earnings' ? 'seller earnings' : 'shopping funds';
    const message = `Withdraw the full ${formatCurrency(value, wallet.currency)} of available ${sourceLabel} to ${payoutAccount.data?.phoneNumber}? The funds will remain reserved until M-Pesa confirms the result.`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) run();
      return;
    }
    Alert.alert('Confirm withdrawal', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', onPress: run },
    ]);
  };

  if (!user) return <EmptyState title="Sign in to view your wallet" description="Wallet balances and transactions are private." />;
  if (isEarnings && !canAccessSellerTools(user.role)) return <EmptyState title="Seller access required" description="Seller earnings are available to approved seller accounts." />;
  if (wallets.isError) return <ErrorState message={getApiErrorMessage(wallets.error, 'Unable to load your wallet.')} onRetry={() => void wallets.refetch()} />;
  if (!wallets.isLoading && !wallet) return <ErrorState message="Your wallet balance is unavailable." onRetry={() => void wallets.refetch()} />;

  const withdrawal = availabilityInput(balanceSource);
  const availableBalance = wallet
    ? isEarnings ? wallet.earningsAvailableBalance : wallet.shoppingAvailableBalance
    : undefined;
  const heldBalance = wallet
    ? isEarnings ? wallet.earningsHeldBalance : wallet.shoppingHeldBalance
    : 0;
  const pendingPayoutBalance = wallet
    ? isEarnings ? wallet.earningsPendingPayoutBalance : wallet.shoppingPendingPayoutBalance
    : 0;
  const sourcePayouts = payouts.data?.results.filter(item => item.balanceSource === balanceSource) ?? [];
  const sourceTransactions = transactions.data?.results.filter(item => item.balanceSource === balanceSource) ?? [];

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
      <Text style={styles.label}>{isEarnings ? 'Available seller earnings' : 'Available shopping funds'}</Text>
      <Text style={styles.balance}>{wallets.isLoading || !wallet || availableBalance === undefined ? 'Loading...' : formatCurrency(availableBalance, wallet.currency)}</Text>
      {wallet?.isFrozen ? <Text style={styles.error}>Wallet activity is temporarily unavailable.</Text> : null}
      {wallet && heldBalance > 0 ? <Text style={styles.meta}>{formatCurrency(heldBalance, wallet.currency)} held or reserved</Text> : null}
      {wallet && pendingPayoutBalance > 0 ? <Text style={styles.meta}>{formatCurrency(pendingPayoutBalance, wallet.currency)} in payout processing</Text> : null}
    </View>

    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingIcon}><ShieldCheck size={20} color={theme.colors.primary.dark} /></View>
        <View style={styles.transactionCopy}><Text style={styles.title}>{isEarnings ? 'Seller payout' : 'Withdraw to M-Pesa'}</Text><Text style={styles.meta}>A withdrawal sends the full available {isEarnings ? 'earnings' : 'shopping balance'} directly to your saved number.</Text></View>
      </View>
      {payoutAccount.isError ? <View><Text style={styles.error}>{getApiErrorMessage(payoutAccount.error, 'Unable to load your withdrawal details.')}</Text><Button variant="secondary" onPress={() => void payoutAccount.refetch()}>Retry</Button></View> : payoutAccount.isLoading ? <Text style={styles.meta}>Loading withdrawal details...</Text> : payoutAccount.data ? <>
        <View style={styles.destinationRow}>
          <View style={styles.transactionCopy}><Text style={styles.fieldLabel}>M-Pesa destination</Text><Text style={styles.destination}>{payoutAccount.data.phoneNumber}</Text><Text style={styles.meta}>{payoutAccount.data.accountName || 'Wallet account'}</Text></View>
          <Button size="sm" variant="secondary" onPress={() => { setPayoutPhone(''); setIsEditingPayoutAccount(true); setPayoutError(undefined); }}>Change</Button>
        </View>
        {isEditingPayoutAccount ? <View style={styles.formBand}>
          <Input label="New M-Pesa number" required value={payoutPhone} onChangeText={setPayoutPhone} placeholder="254712345678" keyboardType="phone-pad" autoComplete="tel" />
          <Input label="Account password" required value={accountPassword} onChangeText={setAccountPassword} placeholder="Confirm your identity" secureTextEntry autoComplete="current-password" />
          <View style={styles.actions}><Button variant="secondary" onPress={() => { setPayoutPhone(''); setAccountPassword(''); setIsEditingPayoutAccount(false); setPayoutError(undefined); }}>Cancel</Button><Button loading={savePayoutAccount.isPending} loadingLabel="Saving" onPress={submitPayoutAccount}>Save number</Button></View>
        </View> : <>
          <View style={styles.withdrawalOption}>
            <View style={styles.transactionCopy}><Text style={styles.subtitle}>{isEarnings ? 'Seller earnings' : 'Shopping funds'}</Text><Text style={styles.meta}>{isEarnings ? 'Released proceeds from completed sales' : 'Top-ups and eligible refunds available to withdraw'}</Text></View>
            <Text style={styles.withdrawalAmount}>{wallet && availableBalance !== undefined ? formatCurrency(availableBalance, wallet.currency) : 'Loading...'}</Text>
          </View>
          <Button loading={requestPayout.isPending && requestPayout.variables?.source === balanceSource} loadingLabel="Sending withdrawal" disabled={!withdrawal.allowed} onPress={() => submitPayout(balanceSource)}>Withdraw all {isEarnings ? 'seller earnings' : 'shopping funds'}</Button>
          {!withdrawal.allowed ? <Text style={styles.availabilityNote} accessibilityLiveRegion="polite">{availabilityMessage(withdrawal, balanceSource)}</Text> : null}
          <Text style={styles.meta}>M-Pesa supports full-balance withdrawals from {formatCurrency(wallet?.withdrawalMinimum ?? 10, wallet?.currency ?? 'KES')} to {formatCurrency(wallet?.withdrawalMaximum ?? 250000, wallet?.currency ?? 'KES')}. Failed transfers are restored automatically.</Text>
        </>}
      </> : <View style={styles.formBand}>
        <Text style={styles.subtitle}>Add your withdrawal number</Text>
        <Text style={styles.meta}>Withdrawals are unavailable until you add an M-Pesa number you control. Your password is required when the number is added or changed.</Text>
        <Input label="M-Pesa number" required value={payoutPhone} onChangeText={setPayoutPhone} placeholder="254712345678" keyboardType="phone-pad" autoComplete="tel" />
        <Input label="Account password" required value={accountPassword} onChangeText={setAccountPassword} placeholder="Confirm your identity" secureTextEntry autoComplete="current-password" />
        <Button loading={savePayoutAccount.isPending} loadingLabel="Saving" onPress={submitPayoutAccount}>Save withdrawal number</Button>
      </View>}
      {payoutError ? <Text style={styles.error} accessibilityRole="alert">{payoutError}</Text> : null}

      <View style={styles.historyHeading}><Text style={styles.subtitle}>Withdrawal history</Text><Button size="sm" variant="tertiary" onPress={() => void payouts.refetch()}>Refresh</Button></View>
      {payouts.isError ? <Text style={styles.error}>Unable to load withdrawal history.</Text> : payouts.isLoading ? <Text style={styles.meta}>Loading withdrawals...</Text> : sourcePayouts.length === 0 ? <Text style={styles.meta}>No {isEarnings ? 'seller' : 'shopping'} withdrawals requested yet.</Text> : sourcePayouts.map(item => <PayoutRow key={item.id} payout={item} />)}
    </View>

    {!isEarnings ? <View style={styles.section}>
      <Text style={styles.title}>Add money with M-Pesa</Text>
      <Text style={styles.meta}>Top-ups can be used for marketplace purchases.</Text>
      <Input label="Amount (KSh)" required value={amount} onChangeText={value => { setAmount(value); setAttempt(undefined); setFormError(undefined); topUp.reset(); }} placeholder="1000" keyboardType="number-pad" />
      <Input label="Phone number" required value={phoneNumber} onChangeText={value => { setPhoneNumber(value); setAttempt(undefined); setFormError(undefined); topUp.reset(); }} placeholder="254712345678" keyboardType="phone-pad" autoComplete="tel" />
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
    </View> : null}

    <View style={styles.section}>
      <Text style={styles.title}>{isEarnings ? 'Recent earnings activity' : 'Recent shopping activity'}</Text>
      {transactions.isError ? <View><Text style={styles.error}>Unable to load wallet activity.</Text><Button variant="secondary" onPress={() => void transactions.refetch()}>Retry</Button></View> :
        transactions.isLoading ? <Text style={styles.meta}>Loading activity...</Text> :
          sourceTransactions.length === 0 ? <Text style={styles.meta}>No {isEarnings ? 'earnings' : 'shopping'} transactions yet.</Text> :
            sourceTransactions.map(item => <View key={item.id} style={styles.transaction}><View style={styles.transactionCopy}><Text style={styles.transactionType}>{item.type.replace(/_/g, ' ')}</Text><Text style={styles.meta}>{formatDate(item.createdAt)}</Text></View><Text style={styles.transactionAmount}>{formatCurrency(item.amount, wallet?.currency ?? 'KES')}</Text></View>)}
    </View>
  </ScrollView>;
};

export const Wallet: React.FC = () => <WalletView balanceSource="shopping" />;

export const SellerEarningsWallet: React.FC = () => <WalletView balanceSource="earnings" />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  balanceSection: { alignItems: 'center', paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  balanceIcon: { width: 48, height: 48, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint, marginBottom: theme.spacing.sm },
  label: { color: theme.colors.muted },
  balance: { color: theme.colors.ink, fontSize: 30, lineHeight: 38, fontWeight: '800', marginTop: theme.spacing.xs },
  section: { paddingVertical: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: theme.spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  sectionHeadingIcon: { width: 38, height: 38, borderRadius: theme.radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
  title: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  subtitle: { color: theme.colors.ink, fontSize: theme.typography.body.fontSize, fontWeight: '800' },
  fieldLabel: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, fontWeight: '600' },
  destination: { color: theme.colors.ink, fontSize: 19, fontWeight: '800', marginVertical: 2 },
  destinationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  withdrawalOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingTop: theme.spacing.sm },
  withdrawalAmount: { color: theme.colors.ink, fontWeight: '800', textAlign: 'right' },
  availabilityNote: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: 18 },
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
