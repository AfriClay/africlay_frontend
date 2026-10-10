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

export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
