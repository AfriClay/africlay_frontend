import { z } from 'zod';
import {
  PaginatedResult,
  Payment,
  PaymentAttempt,
  Payout,
  PayoutAccount,
  Wallet,
  WalletTransaction,
} from '../types/payment';
import { ApiError, apiClient } from './api';
import { parseAmount, parseCommerce } from './commerceContract';

const moneySchema = z.union([z.string(), z.number()]);
const paymentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  provider: z.string(),
  purpose: z.enum(['order_total', 'delivery_fee', 'delivery_balance']),
  status: z.enum(['initiated', 'pending', 'succeeded', 'failed', 'cancelled']),
  amount: moneySchema,
  currency: z.string().length(3),
  checkout_request_id: z.string(),
  receipt_number: z.string(),
});
const walletSchema = z.object({
  id: z.string().uuid(),
  currency: z.string().length(3),
  balance: moneySchema,
  held_balance: moneySchema,
  available_balance: moneySchema,
  pending_payout_balance: moneySchema,
  order_held_balance: moneySchema,
  minimum_payout: moneySchema,
  is_frozen: z.boolean(),
  created_at: z.string(),
});
const transactionSchema = z.object({
  id: z.string().uuid(),
  transaction_type: z.enum(['credit', 'debit', 'escrow_hold', 'escrow_release', 'escrow_capture', 'refund', 'seller_earning', 'withdrawal']),
  amount: moneySchema,
  balance_after: moneySchema,
  held_balance_after: moneySchema,
  reference: z.string(),
  created_at: z.string(),
});
const attemptSchema = z.object({
  id: z.string().uuid(),
  amount: moneySchema,
  currency: z.string().length(3),
  phone_number: z.string(),
  status: z.enum(['initiated', 'pending', 'succeeded', 'failed', 'unknown']),
  provider_receipt: z.string().nullable(),
  result_description: z.string(),
  created_at: z.string(),
});
const transactionPageSchema = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(transactionSchema),
});
const payoutAccountSchema = z.object({
  id: z.string().uuid(),
  provider: z.literal('mpesa'),
  phone_number: z.string(),
  account_name: z.string(),
  is_active: z.boolean(),
  confirmed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
const payoutSchema = z.object({
  id: z.string().uuid(),
  provider: z.literal('mpesa'),
  amount: moneySchema,
  currency: z.string().length(3),
  status: z.enum(['requested', 'processing', 'succeeded', 'failed', 'unknown']),
  destination_phone: z.string(),
  destination_name: z.string(),
  transaction_receipt: z.string(),
  failure_message: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  processed_at: z.string().nullish(),
});
const payoutPageSchema = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(payoutSchema),
});

const toPayment = (raw: z.infer<typeof paymentSchema>): Payment => ({
  id: raw.id,
  orderId: raw.order_id,
  provider: raw.provider,
  purpose: raw.purpose,
  status: raw.status,
  amount: parseAmount(raw.amount),
  currency: raw.currency,
  checkoutRequestId: raw.checkout_request_id,
  receiptNumber: raw.receipt_number,
});
const toWallet = (raw: z.infer<typeof walletSchema>): Wallet => ({
  id: raw.id,
  currency: raw.currency,
  balance: parseAmount(raw.balance),
  heldBalance: parseAmount(raw.held_balance),
  availableBalance: parseAmount(raw.available_balance),
  pendingPayoutBalance: parseAmount(raw.pending_payout_balance),
  orderHeldBalance: parseAmount(raw.order_held_balance),
  minimumPayout: parseAmount(raw.minimum_payout),
  isFrozen: raw.is_frozen,
  createdAt: raw.created_at,
});
const toTransaction = (raw: z.infer<typeof transactionSchema>): WalletTransaction => ({
  id: raw.id,
  type: raw.transaction_type,
  amount: parseAmount(raw.amount),
  balanceAfter: parseAmount(raw.balance_after),
  heldBalanceAfter: parseAmount(raw.held_balance_after),
  reference: raw.reference,
  createdAt: raw.created_at,
});
const toAttempt = (raw: z.infer<typeof attemptSchema>): PaymentAttempt => ({
  id: raw.id,
  amount: parseAmount(raw.amount),
  currency: raw.currency,
  phoneNumber: raw.phone_number,
  status: raw.status,
  providerReceipt: raw.provider_receipt ?? '',
  resultDescription: raw.result_description,
  createdAt: raw.created_at,
});
const toPayoutAccount = (raw: z.infer<typeof payoutAccountSchema>): PayoutAccount => ({
  id: raw.id,
  provider: raw.provider,
  phoneNumber: raw.phone_number,
  accountName: raw.account_name,
  isActive: raw.is_active,
  confirmedAt: raw.confirmed_at,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});
const toPayout = (raw: z.infer<typeof payoutSchema>): Payout => ({
  id: raw.id,
  provider: raw.provider,
  amount: parseAmount(raw.amount),
  currency: raw.currency,
  status: raw.status,
  destinationPhone: raw.destination_phone,
  destinationName: raw.destination_name,
  transactionReceipt: raw.transaction_receipt,
  failureMessage: raw.failure_message,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  processedAt: raw.processed_at ?? undefined,
});

export const normalizeKenyanPaymentPhone = (value: string): string =>
  value.replace(/[+\s-]/g, '');

export const isOrderPaymentPhone = (value: string): boolean =>
  /^254(?:7|1)\d{8}$/.test(normalizeKenyanPaymentPhone(value));

export const isWalletTopUpPhone = (value: string): boolean =>
  /^254(?:7|1)\d{8}$/.test(normalizeKenyanPaymentPhone(value));

export const paymentKeys = {
  detail: (paymentId: string) => ['payment', paymentId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
  transactions: (userId: string, walletId: string) => ['wallet-transactions', userId, walletId] as const,
  payoutAccount: (userId: string) => ['payout-account', userId] as const,
  payouts: (userId: string) => ['payouts', userId] as const,
};

export const paymentService = {
  initiateOrderPayment: async (orderId: string, phoneNumber: string, purpose: 'initial' | 'delivery_balance' = 'initial', signal?: AbortSignal): Promise<Payment> =>
    toPayment(parseCommerce(paymentSchema, await apiClient('/payments/initiate/', {
      method: 'POST',
      body: { order_id: orderId, phone_number: normalizeKenyanPaymentPhone(phoneNumber), purpose },
      signal,
      timeoutMs: 45_000,
    }))),
  getPayment: async (paymentId: string, signal?: AbortSignal): Promise<Payment> =>
    toPayment(parseCommerce(paymentSchema, await apiClient(`/payments/${encodeURIComponent(paymentId)}/`, {
      signal,
      timeoutMs: 20_000,
    }))),
  listWallets: async (): Promise<Wallet[]> => {
    const raw = await apiClient('/payments/wallets/');
    return parseCommerce(z.array(walletSchema), raw).map(toWallet);
  },
  listWalletTransactions: async (walletId: string, limit = 50, offset = 0): Promise<PaginatedResult<WalletTransaction>> => {
    const page = parseCommerce(transactionPageSchema, await apiClient(
      `/payments/wallets/${encodeURIComponent(walletId)}/transactions/?limit=${limit}&offset=${offset}`,
    ));
    return { ...page, results: page.results.map(toTransaction) };
  },
  topUpWallet: async (amount: number, phoneNumber: string, idempotencyKey: string): Promise<PaymentAttempt> => {
    try {
      return toAttempt(parseCommerce(attemptSchema, await apiClient('/payments/mpesa/stk-push/', {
        method: 'POST',
        body: { amount, phone_number: normalizeKenyanPaymentPhone(phoneNumber) },
        headers: { 'Idempotency-Key': idempotencyKey },
        timeoutMs: 45_000,
      })));
    } catch (error) {
      if (error instanceof ApiError && error.status === 502) {
        return toAttempt(parseCommerce(attemptSchema, error.data));
      }
      throw error;
    }
  },
  getPayoutAccount: async (): Promise<PayoutAccount | undefined> => {
    const raw = await apiClient('/payments/payout-account/');
    if (raw == null) return undefined;
    return toPayoutAccount(parseCommerce(payoutAccountSchema, raw));
  },
  savePayoutAccount: async (phoneNumber: string, currentPassword: string): Promise<PayoutAccount> =>
    toPayoutAccount(parseCommerce(payoutAccountSchema, await apiClient('/payments/payout-account/', {
      method: 'PUT',
      body: { phone_number: normalizeKenyanPaymentPhone(phoneNumber), current_password: currentPassword },
    }))),
  listPayouts: async (limit = 50, offset = 0): Promise<PaginatedResult<Payout>> => {
    const page = parseCommerce(payoutPageSchema, await apiClient(`/payments/payouts/?limit=${limit}&offset=${offset}`));
    return { ...page, results: page.results.map(toPayout) };
  },
  requestPayout: async (amount: number, idempotencyKey: string): Promise<Payout> =>
    toPayout(parseCommerce(payoutSchema, await apiClient('/payments/payouts/', {
      method: 'POST',
      body: { amount },
      headers: { 'Idempotency-Key': idempotencyKey },
      timeoutMs: 45_000,
    }))),
};
