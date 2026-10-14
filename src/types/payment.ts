export type PaymentStatus = 'initiated' | 'pending' | 'succeeded' | 'failed' | 'cancelled';
export type PaymentAttemptStatus = 'initiated' | 'pending' | 'succeeded' | 'failed' | 'unknown';
export type PaymentPurpose = 'order_total' | 'delivery_fee' | 'delivery_balance';

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: number;
  currency: string;
  checkoutRequestId: string;
  receiptNumber: string;
}

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  heldBalance: number;
  availableBalance: number;
  pendingPayoutBalance: number;
  orderHeldBalance: number;
  minimumPayout: number;
  isFrozen: boolean;
  createdAt: string;
}

export type WalletTransactionType =
  | 'credit'
  | 'debit'
  | 'escrow_hold'
  | 'escrow_release'
  | 'escrow_capture'
  | 'refund'
  | 'seller_earning'
  | 'withdrawal';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  heldBalanceAfter: number;
  reference: string;
  createdAt: string;
}

export interface PaymentAttempt {
  id: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: PaymentAttemptStatus;
  providerReceipt: string;
  resultDescription: string;
  createdAt: string;
}

export type PayoutStatus = 'requested' | 'processing' | 'succeeded' | 'failed' | 'unknown';

export interface PayoutAccount {
  id: string;
  provider: 'mpesa';
  phoneNumber: string;
  accountName: string;
  isActive: boolean;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  provider: 'mpesa';
  amount: number;
  currency: string;
  status: PayoutStatus;
  destinationPhone: string;
  destinationName: string;
  transactionReceipt: string;
  failureMessage: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
