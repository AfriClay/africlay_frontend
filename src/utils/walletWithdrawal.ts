import type { Payout, PayoutStatus, Wallet, WalletBalanceSource } from '../types/payment';

export type WithdrawalUnavailableReason =
  | 'wallet_loading'
  | 'wallet_unavailable'
  | 'destination_loading'
  | 'destination_unavailable'
  | 'destination_missing'
  | 'request_pending'
  | 'wallet_frozen'
  | 'payout_pending'
  | 'payout_unknown'
  | 'funds_reserved'
  | 'zero_balance'
  | 'below_minimum'
  | 'above_maximum'
  | 'fractional_balance';

export interface WithdrawalAvailabilityInput {
  wallet?: Wallet;
  source: WalletBalanceSource;
  payouts?: Payout[];
  walletLoading?: boolean;
  walletError?: boolean;
  payoutAccountLoading?: boolean;
  payoutAccountError?: boolean;
  hasPayoutAccount?: boolean;
  requestPending?: boolean;
}

export interface WithdrawalAvailability {
  allowed: boolean;
  amount: number;
  reason?: WithdrawalUnavailableReason;
  activePayoutStatus?: PayoutStatus;
}

const activeStatuses = new Set<PayoutStatus>(['requested', 'processing', 'unknown']);

export const getWithdrawalAvailability = ({
  wallet,
  source,
  payouts = [],
  walletLoading = false,
  walletError = false,
  payoutAccountLoading = false,
  payoutAccountError = false,
  hasPayoutAccount = false,
  requestPending = false,
}: WithdrawalAvailabilityInput): WithdrawalAvailability => {
  const amount = source === 'shopping'
    ? wallet?.shoppingAvailableBalance ?? 0
    : wallet?.earningsAvailableBalance ?? 0;

  if (walletLoading) return { allowed: false, amount, reason: 'wallet_loading' };
  if (walletError || !wallet) return { allowed: false, amount, reason: 'wallet_unavailable' };
  if (payoutAccountLoading) return { allowed: false, amount, reason: 'destination_loading' };
  if (payoutAccountError) return { allowed: false, amount, reason: 'destination_unavailable' };
  if (!hasPayoutAccount) return { allowed: false, amount, reason: 'destination_missing' };
  if (requestPending) return { allowed: false, amount, reason: 'request_pending' };
  if (wallet.isFrozen) return { allowed: false, amount, reason: 'wallet_frozen' };

  const activePayout = payouts.find(payout => payout.balanceSource === source && activeStatuses.has(payout.status));
  const pendingAmount = source === 'shopping'
    ? wallet.shoppingPendingPayoutBalance
    : wallet.earningsPendingPayoutBalance;
  if (activePayout?.status === 'unknown') {
    return { allowed: false, amount, reason: 'payout_unknown', activePayoutStatus: activePayout.status };
  }
  if (activePayout || pendingAmount > 0) {
    return {
      allowed: false,
      amount,
      reason: 'payout_pending',
      activePayoutStatus: activePayout?.status,
    };
  }

  const heldAmount = source === 'shopping' ? wallet.shoppingHeldBalance : wallet.earningsHeldBalance;
  if (amount <= 0) {
    return { allowed: false, amount, reason: heldAmount > 0 ? 'funds_reserved' : 'zero_balance' };
  }
  if (amount < wallet.withdrawalMinimum) return { allowed: false, amount, reason: 'below_minimum' };
  if (amount > wallet.withdrawalMaximum) return { allowed: false, amount, reason: 'above_maximum' };
  if (!Number.isInteger(amount)) return { allowed: false, amount, reason: 'fractional_balance' };
  return { allowed: true, amount };
};
