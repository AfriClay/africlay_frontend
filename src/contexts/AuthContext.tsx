import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, AuthFlowCancelledError, createPendingUser } from '../services/authService';
import { tokenManager, usesCookieAuth, onSessionExpired } from '../services/api';
import { User } from '../types/user';
import { StorefrontProfile, VerificationStatus } from '../types/seller';

export type LoginResult = 'authenticated' | 'onboarding' | 'verification';
export type VerificationResult = 'authenticated' | 'onboarding';

interface AuthState {
  user?: User;
  token?: string;
  role?: User['role'];
  pendingUser?: User;
  pendingToken?: string;
  pendingEmail?: string;
  pendingVerification?: 'signup' | 'sign_in' | 'password_reset';
  verificationStatus: VerificationStatus;
  storefront?: StorefrontProfile;
  isGuest: boolean;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<VerificationResult>;
  resendVerification: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  selectRole: (role: User['role']) => void;
  beginSellerVerification: () => Promise<void>;
  approveSellerVerification: () => Promise<void>;
  saveStorefront: (storefront: StorefrontProfile) => Promise<void>;
  saveProfile: (profile: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  verificationStatus: 'none',
  isGuest: false,
  loading: true,
  initialized: false,
};

const signedInState = async (user: User): Promise<AuthState> => ({
  user,
  token: await tokenManager.getAccessToken(),
  role: user.role,
  verificationStatus: 'none',
  isGuest: false,
  loading: false,
  initialized: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(defaultState);

  useEffect(() => onSessionExpired(() => {
    setState({ ...defaultState, loading: false, initialized: true });
  }), []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
      const access = await tokenManager.getAccessToken();
      const refresh = await tokenManager.getRefreshToken();
      if (!usesCookieAuth && !access && !refresh) {
        if (active) {
          setState({ ...defaultState, loading: false, initialized: true });
        }
        return;
      }

        const user = await authService.currentUser();
        if (active) {
          setState(await signedInState(user));
        }
      } catch {
        await tokenManager.clearTokens();
        if (active) {
          setState({ ...defaultState, loading: false, initialized: true });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setState(current => ({ ...current, loading: true }));
    try {
      const { user } = await authService.login(email, password);
      setState(await signedInState(user));
      return 'authenticated';
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    throw new AuthFlowCancelledError();
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setState(current => ({ ...current, loading: true }));
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const pendingUser = await authService.register(name, normalizedEmail, password);
      setState({
        pendingUser: { ...createPendingUser(name, normalizedEmail), id: pendingUser.id, role: pendingUser.role },
        pendingEmail: normalizedEmail,
        pendingVerification: 'signup',
        role: pendingUser.role,
        verificationStatus: 'none',
        isGuest: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, []);

  const verifyEmail = useCallback(async (code: string): Promise<VerificationResult> => {
    if (!state.pendingEmail) {
      throw new Error('Your verification attempt is missing. Please start again.');
    }

    setState(current => ({ ...current, loading: true }));
    try {
      const { user } = await authService.verifyEmail(state.pendingEmail, code);
      const selectedRole = state.role ?? user.role;
      const nextUser = { ...user, role: selectedRole, onboardingCompleted: false };
      setState({
        pendingUser: nextUser,
        pendingToken: await tokenManager.getAccessToken(),
        pendingEmail: user.email,
        role: selectedRole,
        verificationStatus: 'none',
        isGuest: false,
        loading: false,
        initialized: true,
      });
      return 'onboarding';
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [state.pendingEmail, state.role]);

  const resendVerification = useCallback(async () => {
    if (!state.pendingEmail) {
      throw new Error('Your verification attempt is missing. Please start again.');
    }
    await authService.resendVerification(state.pendingEmail);
  }, [state.pendingEmail]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    await authService.sendPasswordReset(normalizedEmail);
    setState(current => ({
      ...current,
      pendingEmail: normalizedEmail,
      pendingVerification: 'password_reset',
      loading: false,
      initialized: true,
    }));
  }, []);

  const resetPassword = useCallback(async (code: string, newPassword: string) => {
    if (!state.pendingEmail) {
      throw new Error('Enter your email before resetting your password.');
    }
    await authService.resetPassword(state.pendingEmail, code, newPassword);
    setState({ verificationStatus: 'none', isGuest: false, loading: false, initialized: true });
  }, [state.pendingEmail]);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ verificationStatus: 'none', isGuest: false, loading: false, initialized: true });
  }, []);

  const continueAsGuest = useCallback(async () => {
    await authService.logout();
    setState({ verificationStatus: 'none', isGuest: true, loading: false, initialized: true });
  }, []);

  const selectRole = useCallback((role: User['role']) => {
    setState(current => ({
      ...current,
      role,
      pendingUser: current.pendingUser ? { ...current.pendingUser, role } : current.pendingUser,
      user: current.user ? { ...current.user, role } : current.user,
    }));
  }, []);

  const beginSellerVerification = useCallback(async () => {
    const nextRole: User['role'] = state.role === 'buyer' || !state.role ? 'both' : state.role;
    setState(current => ({
      ...current,
      role: nextRole,
      verificationStatus: 'pending',
      user: current.user ? { ...current.user, role: nextRole } : current.user,
      pendingUser: current.pendingUser ? { ...current.pendingUser, role: nextRole } : current.pendingUser,
    }));
  }, [state.role]);

  const approveSellerVerification = useCallback(async () => {
    setState(current => ({ ...current, verificationStatus: 'approved' }));
  }, []);

  const saveStorefront = useCallback(async (storefront: StorefrontProfile) => {
    setState(current => ({ ...current, storefront, verificationStatus: 'approved' }));
  }, []);

  const saveProfile = useCallback(async (profile: Partial<User>) => {
    const baseUser = state.user ?? state.pendingUser;
    if (!baseUser) {
      throw new Error('Your session expired. Please log in again.');
    }

    const role = state.role ?? baseUser.role;
    setState(current => ({ ...current, loading: true }));
    try {
      const updatedUser = await authService.updateProfile({ ...baseUser, ...profile }, role);
      setState({
        user: updatedUser,
        token: await tokenManager.getAccessToken(),
        role,
        verificationStatus: state.verificationStatus,
        storefront: state.storefront,
        isGuest: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [state.pendingUser, state.role, state.storefront, state.user, state.verificationStatus]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      sendPasswordReset,
      resetPassword,
      logout,
      continueAsGuest,
      selectRole,
      beginSellerVerification,
      approveSellerVerification,
      saveStorefront,
      saveProfile,
    }),
    [
      state,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      sendPasswordReset,
      resetPassword,
      logout,
      continueAsGuest,
      selectRole,
      beginSellerVerification,
      approveSellerVerification,
      saveStorefront,
      saveProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
