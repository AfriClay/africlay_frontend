import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { User } from '../types/user';

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'africlay';
const AUTH_CALLBACK_PATH = 'auth/callback';

export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
export const isClerkConfigured = clerkPublishableKey.startsWith('pk_');
export const authRedirectUri = makeRedirectUri({
  scheme: APP_SCHEME,
  path: AUTH_CALLBACK_PATH,
});

export class AuthFlowCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'AuthFlowCancelledError';
  }
}

export interface ClerkUserLike {
  id: string;
  fullName: string | null;
  unsafeMetadata: Record<string, unknown>;
  externalAccounts: Array<{ provider: string }>;
  primaryEmailAddress: {
    emailAddress: string;
    verification: { status: string | null };
  } | null;
  hasImage: boolean;
  imageUrl: string;
}

const isRole = (value: unknown): value is User['role'] =>
  value === 'buyer' || value === 'seller' || value === 'both';

const metadataValue = (metadata: ClerkUserLike['unsafeMetadata'], key: string): unknown => metadata[key];

export const mapClerkUser = (clerkUser: ClerkUserLike): User => {
  const fullNameMetadata = metadataValue(clerkUser.unsafeMetadata, 'full_name');
  const locationMetadata = metadataValue(clerkUser.unsafeMetadata, 'location');
  const roleMetadata = metadataValue(clerkUser.unsafeMetadata, 'role');
  const onboardingMetadata = metadataValue(clerkUser.unsafeMetadata, 'onboarding_completed');
  const signedInWithGoogle = clerkUser.externalAccounts.some(account => account.provider === 'google');
  const email = clerkUser.primaryEmailAddress?.emailAddress;

  return {
    id: clerkUser.id,
    name:
      clerkUser.fullName ||
      (typeof fullNameMetadata === 'string' ? fullNameMetadata : undefined) ||
      email?.split('@')[0] ||
      'AfriClay Member',
    email,
    location: typeof locationMetadata === 'string' ? locationMetadata : 'Kenya',
    verified: clerkUser.primaryEmailAddress?.verification.status === 'verified',
    onboardingCompleted: onboardingMetadata === true || signedInWithGoogle,
    role: isRole(roleMetadata) ? roleMetadata : 'buyer',
    avatarUrl: clerkUser.hasImage ? clerkUser.imageUrl : undefined,
    stats: {
      orders: 0,
      wishlist: 0,
      reviews: 0,
    },
  };
};

export const createPendingUser = (name: string, email: string): User => ({
  id: 'pending-clerk-sign-up',
  name: name.trim(),
  email: email.trim().toLowerCase(),
  location: 'Kenya',
  verified: false,
  onboardingCompleted: false,
  role: 'buyer',
  stats: {
    orders: 0,
    wishlist: 0,
    reviews: 0,
  },
});

type ErrorShape = {
  code?: unknown;
  longMessage?: unknown;
  message?: unknown;
  errors?: unknown;
};

const errorDetails = (error: unknown): ErrorShape | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as ErrorShape;
  if (Array.isArray(candidate.errors) && candidate.errors.length > 0) {
    const firstError = candidate.errors[0];
    return firstError && typeof firstError === 'object' ? (firstError as ErrorShape) : candidate;
  }
  return candidate;
};

export const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  const details = errorDetails(error);
  const code = typeof details?.code === 'string' ? details.code : undefined;

  switch (code) {
    case 'form_password_incorrect':
    case 'form_identifier_not_found':
    case 'identifier_not_found':
      return 'The email or password is incorrect.';
    case 'form_identifier_exists':
    case 'identifier_already_exists':
      return 'An account with this email already exists.';
    case 'form_code_incorrect':
    case 'verification_failed':
    case 'verification_expired':
      return 'That code is invalid or has expired. Request a new code.';
    case 'too_many_requests':
    case 'rate_limit_exceeded':
      return 'Too many requests. Please wait a little while and try again.';
    case 'oauth_access_denied':
      return 'Google sign-in was cancelled.';
    case 'strategy_for_user_invalid':
      return 'This account uses a different sign-in method.';
    default: {
      const message =
        typeof details?.longMessage === 'string'
          ? details.longMessage
          : typeof details?.message === 'string'
            ? details.message
            : undefined;
      return message || fallback;
    }
  }
};
