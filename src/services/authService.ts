import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types/user';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'africlay';
const AUTH_CALLBACK_PATH = 'auth/callback';

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegistrationResponse {
  user: User;
  email: string;
}

export class AuthFlowCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'AuthFlowCancelledError';
  }
}

const authRedirectUri = makeRedirectUri({
  scheme: APP_SCHEME,
  path: AUTH_CALLBACK_PATH,
});

const isRole = (value: unknown): value is User['role'] =>
  value === 'buyer' || value === 'seller' || value === 'both';

const mapUser = (providerUser: SupabaseUser): User => {
  const metadata = providerUser.user_metadata;
  const signedInWithGoogle =
    providerUser.app_metadata.provider === 'google' ||
    providerUser.identities?.some(identity => identity.provider === 'google') === true;
  const fullName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : providerUser.email?.split('@')[0] ?? 'AfriClay Member';
  const location = typeof metadata.location === 'string' ? metadata.location : 'Kenya';
  const avatarUrl =
    typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : typeof metadata.picture === 'string'
        ? metadata.picture
        : undefined;

  return {
    id: providerUser.id,
    name: fullName,
    email: providerUser.email,
    location,
    verified: Boolean(providerUser.email_confirmed_at),
    onboardingCompleted: metadata.onboarding_completed === true || signedInWithGoogle,
    role: isRole(metadata.role) ? metadata.role : 'buyer',
    avatarUrl,
    stats: {
      orders: 0,
      wishlist: 0,
      reviews: 0,
    },
  };
};

const toAuthResponse = (session: Session): AuthResponse => ({
  user: mapUser(session.user),
  token: session.access_token,
});

const sessionFromCallbackUrl = async (url: string): Promise<Session> => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = typeof params.access_token === 'string' ? params.access_token : undefined;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;
  if (!accessToken || !refreshToken) {
    throw new Error('Google did not return a valid AfriClay session.');
  }

  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error('Unable to create an AfriClay session from Google sign-in.');
  }

  return data.session;
};

export const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  switch (code) {
    case 'invalid_credentials':
      return 'The email or password is incorrect.';
    case 'email_not_confirmed':
      return 'Verify your email before logging in.';
    case 'user_already_exists':
      return 'An account with this email already exists.';
    case 'email_address_not_authorized':
      return 'Email delivery is not configured for this address yet.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many requests. Please wait a little while and try again.';
    case 'otp_expired':
      return 'That code is invalid or has expired. Request a new code.';
    case 'oauth_provider_not_supported':
      return 'Google sign-in has not been enabled in Supabase yet.';
    default:
      return error.message || fallback;
  }
};

export const authService = {
  configured: isSupabaseConfigured,
  redirectUri: authRedirectUri,

  getCurrentSession: async (): Promise<AuthResponse | undefined> => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) {
      throw error;
    }
    return data.session ? toAuthResponse(data.session) : undefined;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      throw error;
    }
    if (!data.session) {
      throw new Error('Unable to create a session.');
    }
    return toAuthResponse(data.session);
  },

  register: async (name: string, email: string, password: string): Promise<RegistrationResponse> => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
          role: 'buyer',
          onboarding_completed: false,
        },
      },
    });
    if (error) {
      throw error;
    }
    if (!data.user) {
      throw new Error('Unable to create your account.');
    }
    if (data.session) {
      await getSupabaseClient().auth.signOut();
      throw new Error('Email confirmation is disabled in Supabase. Enable it before registering users.');
    }

    return {
      user: mapUser(data.user),
      email: normalizedEmail,
    };
  },

  verifyEmail: async (email: string, code: string): Promise<AuthResponse> => {
    const { data, error } = await getSupabaseClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });
    if (error) {
      throw error;
    }
    if (!data.session) {
      throw new Error('Unable to verify your email.');
    }
    return toAuthResponse(data.session);
  },

  resendVerification: async (email: string): Promise<void> => {
    const { error } = await getSupabaseClient().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) {
      throw error;
    }
  },

  loginWithGoogle: async (): Promise<AuthResponse> => {
    const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUri,
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      throw error;
    }
    if (!data.url) {
      throw new Error('Unable to start Google sign-in.');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
    if (result.type !== 'success') {
      throw new AuthFlowCancelledError();
    }

    return toAuthResponse(await sessionFromCallbackUrl(result.url));
  },

  sendPasswordReset: async (email: string): Promise<void> => {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) {
      throw error;
    }
  },

  updateProfile: async (profile: Partial<User>, role: User['role']): Promise<AuthResponse> => {
    const metadata: Record<string, string | boolean> = { role, onboarding_completed: true };
    if (profile.name) {
      metadata.full_name = profile.name;
    }
    if (profile.location) {
      metadata.location = profile.location;
    }
    if (profile.avatarUrl) {
      metadata.avatar_url = profile.avatarUrl;
    }

    const { data, error } = await getSupabaseClient().auth.updateUser({ data: metadata });
    if (error) {
      throw error;
    }
    const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    if (!sessionData.session) {
      throw new Error('Your session expired. Please log in again.');
    }

    return {
      user: { ...mapUser(data.user), ...profile, role },
      token: sessionData.session.access_token,
    };
  },

  logout: async (): Promise<void> => {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      throw error;
    }
  },

  subscribeToAutoRefresh: (): (() => void) => {
    if (!isSupabaseConfigured || Platform.OS === 'web') {
      return () => undefined;
    }

    const supabase = getSupabaseClient();
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  },
};
