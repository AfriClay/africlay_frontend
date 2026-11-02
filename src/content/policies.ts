import generatedPolicies from './policies.generated.json';
import type { RegistrationRole, UserRole } from '../types/user';

export const policyIds = ['partner-terms', 'shipping-and-delivery', 'seller-commission'] as const;
export type PolicyId = (typeof policyIds)[number];
export type PolicyAudience = 'buyer' | 'seller';
export type RegistrationPolicyCode = 'buyer_shipping_delivery' | 'seller_partner_terms' | 'seller_commission';

export type PolicyTextBlock = {
  kind: 'paragraph' | 'bullet';
  text: string;
};

export type PolicyTableBlock = {
  kind: 'table';
  rows: string[][];
};

export type PolicySection = {
  title: string;
  blocks: Array<PolicyTextBlock | PolicyTableBlock>;
};

export type PolicyDocument = {
  id: PolicyId;
  source: string;
  downloadPath: string;
  title: string;
  subtitle: string;
  audience: string;
  version?: string;
  summary: string;
  highlights: string[];
  hasPlaceholders: boolean;
  sections: PolicySection[];
};

export const POLICY_NOTICE_VERSION = 'role-policy-consent-v2';
export const policies = generatedPolicies as PolicyDocument[];
export const getPolicy = (id?: string) => policies.find(policy => policy.id === id);

export const policyIdsByAudience: Record<PolicyAudience, readonly PolicyId[]> = {
  buyer: ['shipping-and-delivery'],
  seller: ['partner-terms', 'seller-commission'],
};

export const registrationPolicyRequirements: Record<RegistrationRole, readonly RegistrationPolicyCode[]> = {
  buyer: ['buyer_shipping_delivery'],
  seller: ['seller_partner_terms', 'seller_commission'],
  both: ['buyer_shipping_delivery', 'seller_partner_terms', 'seller_commission'],
};

export const registrationPolicyDetails: Record<RegistrationPolicyCode, { policyId: PolicyId; audience: PolicyAudience; label: string }> = {
  buyer_shipping_delivery: { policyId: 'shipping-and-delivery', audience: 'buyer', label: 'Shipping & Delivery Policy' },
  seller_partner_terms: { policyId: 'partner-terms', audience: 'seller', label: 'Partner General Terms' },
  seller_commission: { policyId: 'seller-commission', audience: 'seller', label: 'Seller Commission Policy' },
};

export const policyAudienceForRole = (role?: UserRole): PolicyAudience | undefined => {
  if (role === 'buyer') return 'buyer';
  if (role === 'seller') return 'seller';
  return undefined;
};
