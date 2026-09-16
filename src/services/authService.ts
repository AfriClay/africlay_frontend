import { apiClient, getApiErrorMessage, TokenPair, tokenManager, usesCookieAuth } from './api';
import { User } from '../types/user';

export class AuthFlowCancelledError extends Error {
  constructor() {
    super('Google sign-in is not available with Django authentication.');
    this.name = 'AuthFlowCancelledError';
  }
}

type BackendRole = 'buyer' | 'seller' | 'both';

type BackendProfile = {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
};

type BackendUser = {
  id: string;
  email?: string;
  phone_number?: string | null;
  role?: BackendRole;
  is_verified?: boolean;
  full_name?: string;
  profile?: BackendProfile | null;
};

type AuthResponse = {
  user: BackendUser;
  tokens?: TokenPair;
};

export const mapBackendUser = (backendUser: BackendUser): User => {
  const profile = backendUser.profile;
  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const name = backendUser.full_name?.trim() || profileName || backendUser.email?.split('@')[0] || 'AfriClay Member';

  return {
    id: backendUser.id,
    name,
    email: backendUser.email,
    location: 'Kenya',
    verified: backendUser.is_verified ?? false,
    onboardingCompleted: true,
    role: backendUser.role ?? 'buyer',
    avatarUrl: profile?.avatar_url ?? undefined,
    stats: {
      orders: 0,
      wishlist: 0,
      reviews: 0,
    },
  };
};

const splitName = (name: string): { first_name: string; last_name: string } => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first_name = parts.shift() ?? '';
  return {
    first_name,
    last_name: parts.join(' '),
  };
};

export const createPendingUser = (name: string, email: string): User => ({
  id: 'pending-django-sign-up',
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

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; tokens?: TokenPair }> {
    const response = await apiClient<AuthResponse>('/auth/login/', {
      method: 'POST',
      auth: false,
      body: { email: email.trim().toLowerCase(), password },
    });
    await tokenManager.setTokens(response.tokens);
    return { user: mapBackendUser(response.user), tokens: response.tokens };
  },

  async register(name: string, email: string, password: string): Promise<User> {
    const names = splitName(name);
    const response = await apiClient<{ user: BackendUser }>('/auth/register/', {
      method: 'POST',
      auth: false,
      body: {
        email: email.trim().toLowerCase(),
        password,
        password_confirm: password,
        role: 'buyer',
        ...names,
      },
    });
    return mapBackendUser(response.user);
  },

  async verifyEmail(email: string, code: string): Promise<{ user: User; tokens?: TokenPair }> {
    const response = await apiClient<AuthResponse>('/auth/verify-email/', {
      method: 'POST',
      auth: false,
      body: {
        email: email.trim().toLowerCase(),
        otp_code: code.trim(),
      },
    });
    await tokenManager.setTokens(response.tokens);
    return { user: mapBackendUser(response.user), tokens: response.tokens };
  },

  async resendVerification(email: string): Promise<void> {
    await apiClient('/auth/resend-otp/', {
      method: 'POST',
      auth: false,
      body: {
        email: email.trim().toLowerCase(),
        otp_type: 'email_verification',
      },
    });
  },

  async sendPasswordReset(email: string): Promise<void> {
    await apiClient('/auth/password-reset/', {
      method: 'POST',
      auth: false,
      body: { email: email.trim().toLowerCase() },
    });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await apiClient('/auth/password-reset/confirm/', {
      method: 'POST',
      auth: false,
      body: {
        email: email.trim().toLowerCase(),
        otp_code: code.trim(),
        new_password: newPassword,
        new_password_confirm: newPassword,
      },
    });
  },

  async logout(): Promise<void> {
    const refresh = await tokenManager.getRefreshToken();
    try {
      if (usesCookieAuth || refresh) {
        await apiClient('/auth/logout/', {
          method: 'POST',
          auth: false,
          body: usesCookieAuth ? {} : { refresh },
        });
      }
    } finally {
      await tokenManager.clearTokens();
    }
  },

  async currentUser(): Promise<User> {
    const response = await apiClient<BackendUser>('/auth/me/', { method: 'GET' });
    return mapBackendUser(response);
  },

  async updateProfile(profile: Partial<User>, role: User['role']): Promise<User> {
    const names = profile.name ? splitName(profile.name) : {};
    const response = await apiClient<{ user: BackendUser }>('/auth/me/', {
      method: 'PATCH',
      body: {
        ...names,
        role,
        ...(profile.avatarUrl ? { avatar_url: profile.avatarUrl } : {}),
      },
    });
    return { ...mapBackendUser(response.user), ...profile, role, onboardingCompleted: true };
  },
};

export const getAuthErrorMessage = getApiErrorMessage;
