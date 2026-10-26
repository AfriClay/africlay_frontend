import generatedPolicies from './policies.generated.json';

export const policyIds = ['partner-terms', 'shipping-and-delivery', 'seller-commission'] as const;
export type PolicyId = (typeof policyIds)[number];

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

export const POLICY_NOTICE_VERSION = 'policy-library-v1';
export const policies = generatedPolicies as PolicyDocument[];
export const getPolicy = (id?: string) => policies.find(policy => policy.id === id);
