import { Platform } from 'react-native';
import { z } from 'zod';
import { API_ORIGIN, apiClient, apiDownload } from './api';
import { parseAmount } from './commerceContract';
import type { StaffRole, UserRole } from '../types/user';

export type Page<T> = { count: number; next?: string; previous?: string; results: T[] };
export type AdminKycStatus = 'pending' | 'approved' | 'rejected';
export type AdminKyc = {
  id: number; storeId: string; storeName: string; storeSlug: string; ownerId: string; ownerEmail: string;
  businessName: string; registrationNumber: string; taxNumber: string; documentType: string;
  documentUrl?: string; status: AdminKycStatus; submittedAt?: string; reviewedAt?: string;
  reviewedBy?: string; reviewerEmail?: string; rejectionReason: string;
};
export type AdminPayoutStatus = 'requested' | 'processing' | 'succeeded' | 'failed' | 'unknown';
export type AdminPayout = {
  id: string; provider: 'mpesa'; amount: number; currency: string; status: AdminPayoutStatus;
  destinationPhone: string; destinationName: string; transactionReceipt: string; failureMessage: string;
  createdAt: string; updatedAt: string; processedAt?: string; sellerId: string; sellerEmail: string;
  sellerName: string; storeName: string; resolutionNote: string;
};
export type AdminFinanceSummary = {
  walletLiability: number; walletReserved: number; commissionEarned: number;
  sellerProceedsReleased: number; payoutsPending: number; payoutsCompleted: number;
  needsReconciliation: number;
};
export type FinanceTransaction = {
  id: string; entryType: string; amount: number; currency: string; reference: string; orderId: string;
  paymentId?: string; userId?: string; userEmail?: string; provider?: string; paymentStatus?: string;
  receiptNumber?: string; createdAt: string;
};
export type OperationsUser = {
  id: string; email: string; phoneNumber?: string; fullName: string; role: UserRole; staffRoles: StaffRole[];
  verified: boolean; active: boolean; staff: boolean; lastLogin?: string; dateJoined: string;
  store?: { id: string; name: string; slug: string; status: 'active' | 'suspended' };
};
export type OperationsStore = {
  id: string; ownerId: string; ownerEmail: string; name: string; slug: string; status: 'active' | 'suspended';
  city: string; country: string; createdAt: string; updatedAt: string;
  activity: { products: number; services: number; orders: number; reviews: number; lastActivityAt?: string };
};
export type AuditLog = {
  id: string; actorId?: string; actorEmail?: string; action: string; targetType: string; targetId: string;
  reason: string; metadata: Record<string, unknown>; createdAt: string;
};
export type DashboardAccessRequest = {
  id: string; requesterId: string; requesterEmail: string; requesterName: string; requestedRole: StaffRole;
  requestReason: string; status: 'pending' | 'approved' | 'rejected'; reviewerEmail?: string;
  reviewedAt?: string; reviewReason: string; createdAt: string;
};
export type TaxonomyKind = 'product-categories' | 'product-tags' | 'service-categories';
export type TaxonomyRecord = { id: string; name: string; slug: string; description: string; parent?: string; displayOrder: number };
export type TaxonomyDraft = { name: string; slug: string; description?: string; parent?: string; displayOrder?: number };

const listValue = (raw: unknown): unknown[] => Array.isArray(raw)
  ? raw
  : raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)
    ? (raw as { results: unknown[] }).results : [];
const page = <T>(raw: unknown, map: (value: any) => T): Page<T> => {
  if (Array.isArray(raw)) return { count: raw.length, results: raw.map(map) };
  const value = raw as { count?: number; next?: string | null; previous?: string | null; results?: unknown[] };
  return { count: value?.count ?? 0, next: value?.next ?? undefined, previous: value?.previous ?? undefined, results: (value?.results ?? []).map(map) };
};
const mediaUrl = (value?: string | null): string | undefined => !value ? undefined
  : /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
const query = (values: Record<string, string | number | undefined>) => {
  const params = Object.entries(values).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length ? `?${params.join('&')}` : '';
};

const mapKyc = (raw: any): AdminKyc => ({
  id: raw.id, storeId: raw.store, storeName: raw.store_name, storeSlug: raw.store_slug,
  ownerId: raw.owner_id, ownerEmail: raw.owner_email, businessName: raw.business_name,
  registrationNumber: raw.business_registration_number, taxNumber: raw.tax_identification_number,
  documentType: raw.document_type, documentUrl: mediaUrl(raw.document), status: raw.status,
  submittedAt: raw.submitted_at ?? undefined, reviewedAt: raw.reviewed_at ?? undefined,
  reviewedBy: raw.reviewed_by ?? undefined, reviewerEmail: raw.reviewer_email ?? undefined,
  rejectionReason: raw.rejection_reason ?? '',
});
const mapPayout = (raw: any): AdminPayout => ({
  id: raw.id, provider: raw.provider, amount: parseAmount(raw.amount), currency: raw.currency, status: raw.status,
  destinationPhone: raw.destination_phone, destinationName: raw.destination_name,
  transactionReceipt: raw.transaction_receipt, failureMessage: raw.failure_message,
  createdAt: raw.created_at, updatedAt: raw.updated_at, processedAt: raw.processed_at ?? undefined,
  sellerId: raw.seller_id, sellerEmail: raw.seller_email, sellerName: raw.seller_name,
  storeName: raw.store_name, resolutionNote: raw.resolution_note,
});
const mapTransaction = (raw: any): FinanceTransaction => ({
  id: raw.id, entryType: raw.entry_type, amount: parseAmount(raw.amount), currency: raw.currency,
  reference: raw.reference, orderId: raw.order_id, paymentId: raw.payment_id ?? undefined,
  userId: raw.user_id ?? undefined, userEmail: raw.user_email ?? undefined, provider: raw.provider ?? undefined,
  paymentStatus: raw.payment_status ?? undefined, receiptNumber: raw.receipt_number ?? undefined, createdAt: raw.created_at,
});
const mapUser = (raw: any): OperationsUser => ({
  id: raw.id, email: raw.email, phoneNumber: raw.phone_number ?? undefined, fullName: raw.full_name,
  role: raw.role, staffRoles: raw.staff_roles ?? [], verified: raw.is_verified, active: raw.is_active,
  staff: raw.is_staff, lastLogin: raw.last_login ?? undefined, dateJoined: raw.date_joined,
  store: raw.store ?? undefined,
});
const mapStore = (raw: any): OperationsStore => ({
  id: raw.id, ownerId: raw.owner, ownerEmail: raw.owner_email, name: raw.name, slug: raw.slug,
  status: raw.status, city: raw.city ?? '', country: raw.country ?? '', createdAt: raw.created_at,
  updatedAt: raw.updated_at, activity: {
    products: raw.activity.products, services: raw.activity.services, orders: raw.activity.orders,
    reviews: raw.activity.reviews, lastActivityAt: raw.activity.last_activity_at ?? undefined,
  },
});
const mapAudit = (raw: any): AuditLog => ({
  id: raw.id, actorId: raw.actor ?? undefined, actorEmail: raw.actor_email ?? undefined, action: raw.action,
  targetType: raw.target_type, targetId: raw.target_id, reason: raw.reason, metadata: raw.metadata ?? {}, createdAt: raw.created_at,
});
const mapAccessRequest = (raw: any): DashboardAccessRequest => ({
  id: raw.id, requesterId: raw.requester, requesterEmail: raw.requester_email,
  requesterName: raw.requester_name, requestedRole: raw.requested_role, requestReason: raw.request_reason,
  status: raw.status, reviewerEmail: raw.reviewer_email ?? undefined, reviewedAt: raw.reviewed_at ?? undefined,
  reviewReason: raw.review_reason ?? '', createdAt: raw.created_at,
});

const taxonomySchema = z.object({ id: z.string().uuid(), name: z.string(), slug: z.string(), description: z.string().optional().default(''), parent: z.string().uuid().nullish(), display_order: z.number().int().optional().default(0) });
const tagSchema = z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() });
const taxonomyPath = (kind: TaxonomyKind) => kind === 'product-categories' ? '/products/categories/' : kind === 'product-tags' ? '/products/tags/' : '/services/categories/';
const mapTaxonomy = (raw: any): TaxonomyRecord => ({ id: raw.id, name: raw.name, slug: raw.slug, description: raw.description ?? '', parent: raw.parent ?? undefined, displayOrder: raw.display_order ?? 0 });
const taxonomyPayload = (kind: TaxonomyKind, draft: TaxonomyDraft) => kind === 'product-tags'
  ? { name: draft.name.trim(), slug: draft.slug.trim() }
  : { name: draft.name.trim(), slug: draft.slug.trim(), description: draft.description?.trim() ?? '', parent: draft.parent || null, display_order: draft.displayOrder ?? 0 };

export const adminKeys = {
  kyc: (status = 'all', search = '') => ['operations', 'kyc', status, search] as const,
  finance: ['operations', 'finance-summary'] as const,
  payouts: (status = 'all', search = '') => ['operations', 'payouts', status, search] as const,
  transactions: (filters: object) => ['operations', 'transactions', filters] as const,
  users: (search = '') => ['operations', 'users', search] as const,
  stores: (search = '') => ['operations', 'stores', search] as const,
  audit: ['operations', 'audit'] as const,
  accessRequests: (status = 'pending') => ['operations', 'access-requests', status] as const,
  ownAccessRequests: ['operations', 'my-access-requests'] as const,
  taxonomy: (kind: TaxonomyKind) => ['operations', 'taxonomy', kind] as const,
};

export const adminService = {
  listKyc: async (filters: { status?: string; search?: string; limit?: number; offset?: number } = {}) => page(await apiClient(`/stores/kyc/review-queue/${query(filters)}`), mapKyc),
  reviewKyc: async (slug: string, decision: 'approved' | 'rejected', reason = ''): Promise<AdminKyc> => mapKyc(await apiClient(`/stores/${encodeURIComponent(slug)}/kyc/review/`, { method: 'POST', body: { decision, ...(decision === 'rejected' ? { rejection_reason: reason.trim() } : {}) } })),
  financeSummary: async (): Promise<AdminFinanceSummary> => {
    const raw: any = await apiClient('/payments/admin/finance-summary/');
    return { walletLiability: parseAmount(raw.wallet_liability), walletReserved: parseAmount(raw.wallet_reserved), commissionEarned: parseAmount(raw.commission_earned), sellerProceedsReleased: parseAmount(raw.seller_proceeds_released), payoutsPending: parseAmount(raw.payouts_pending), payoutsCompleted: parseAmount(raw.payouts_completed), needsReconciliation: raw.needs_reconciliation };
  },
  listPayouts: async (filters: { status?: string; search?: string; limit?: number; offset?: number } = {}) => page(await apiClient(`/payments/admin/payouts/${query(filters)}`), mapPayout),
  resolvePayout: async (id: string, resolution: 'succeeded' | 'failed', note: string, transactionReceipt = ''): Promise<AdminPayout> => mapPayout(await apiClient(`/payments/admin/payouts/${encodeURIComponent(id)}/resolve/`, { method: 'POST', body: { resolution, note: note.trim(), transaction_receipt: transactionReceipt.trim() } })),
  listTransactions: async (filters: Record<string, string | number | undefined> = {}) => page(await apiClient(`/payments/finance/transactions/${query(filters)}`), mapTransaction),
  getTransaction: async (id: string): Promise<FinanceTransaction> => mapTransaction(await apiClient(`/payments/finance/transactions/${encodeURIComponent(id)}/`)),
  downloadTransactions: async (filters: Record<string, string | number | undefined> = {}) => {
    if (Platform.OS !== 'web') throw new Error('CSV download is available from the web operations dashboard.');
    const blob = await apiDownload(`/payments/finance/transactions/export/${query(filters)}`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'africlay-finance-transactions.csv'; anchor.click(); URL.revokeObjectURL(url);
  },
  listUsers: async (filters: Record<string, string | number | undefined> = {}) => page(await apiClient(`/auth/admin/users/${query(filters)}`), mapUser),
  changeStaffRole: async (id: string, role: StaffRole, action: 'grant' | 'revoke', reason: string): Promise<OperationsUser> => mapUser(await apiClient(`/auth/admin/users/${id}/staff-roles/`, { method: 'POST', body: { role, action, reason } })),
  changeAccountStatus: async (id: string, action: 'suspend' | 'restore', reason: string): Promise<OperationsUser> => mapUser(await apiClient(`/auth/admin/users/${id}/status/`, { method: 'POST', body: { action, reason, confirm: true } })),
  listStores: async (filters: Record<string, string | number | undefined> = {}) => page(await apiClient(`/stores/admin/${query(filters)}`), mapStore),
  changeStoreStatus: async (id: string, action: 'suspend' | 'restore', reason: string): Promise<OperationsStore> => mapStore(await apiClient(`/stores/admin/${id}/status/`, { method: 'POST', body: { action, reason, confirm: true } })),
  listAuditLogs: async (filters: Record<string, string | number | undefined> = {}) => page(await apiClient(`/auth/admin/audit-logs/${query(filters)}`), mapAudit),
  listAccessRequests: async (filters: Record<string, string | number | undefined> = {}) => page(await apiClient(`/auth/admin/dashboard-access-requests/${query(filters)}`), mapAccessRequest),
  reviewAccessRequest: async (id: string, decision: 'approved' | 'rejected', reason: string): Promise<DashboardAccessRequest> => mapAccessRequest(await apiClient(`/auth/admin/dashboard-access-requests/${id}/review/`, { method: 'POST', body: { decision, reason } })),
  listOwnAccessRequests: async (): Promise<Page<DashboardAccessRequest>> => page(await apiClient('/auth/dashboard-access-requests/'), mapAccessRequest),
  requestDashboardAccess: async (requestedRole: StaffRole, requestReason: string): Promise<DashboardAccessRequest> => mapAccessRequest(await apiClient('/auth/dashboard-access-requests/', { method: 'POST', body: { requested_role: requestedRole, request_reason: requestReason } })),
  listTaxonomy: async (kind: TaxonomyKind): Promise<TaxonomyRecord[]> => {
    const values = listValue(await apiClient(taxonomyPath(kind), { auth: false }));
    return kind === 'product-tags' ? z.array(tagSchema).parse(values).map(mapTaxonomy) : z.array(taxonomySchema).parse(values).map(mapTaxonomy);
  },
  createTaxonomy: async (kind: TaxonomyKind, draft: TaxonomyDraft): Promise<TaxonomyRecord> => mapTaxonomy(await apiClient(taxonomyPath(kind), { method: 'POST', body: taxonomyPayload(kind, draft) })),
  updateTaxonomy: async (kind: TaxonomyKind, id: string, draft: TaxonomyDraft): Promise<TaxonomyRecord> => mapTaxonomy(await apiClient(`${taxonomyPath(kind)}${id}/`, { method: 'PATCH', body: taxonomyPayload(kind, draft) })),
};
