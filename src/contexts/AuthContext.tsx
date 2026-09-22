import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, createPendingUser } from '../services/authService';
import { tokenManager, onSessionExpired } from '../services/api';
import { RegistrationRole, User } from '../types/user';

export type LoginResult = 'authenticated' | 'onboarding' | 'verification';
export type VerificationResult = 'authenticated' | 'onboarding';

interface AuthState {
  user?: User;
  role?: User['role'];
  pendingUser?: User;
  pendingEmail?: string;
  pendingVerification?: 'signup' | 'sign_in' | 'password_reset';
  isGuest: boolean;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string, role?: RegistrationRole) => Promise<void>;
  verifyEmail: (code: string) => Promise<VerificationResult>;
  resendVerification: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  saveProfile: (profile: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const signedOut = { isGuest: false, loading: false, initialized: true } as const;
const signedInState = (user: User): AuthState => ({ user, role: user.role, ...signedOut });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ isGuest: false, loading: true, initialized: false });

  useEffect(() => onSessionExpired(() => setState(signedOut)), []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const access = await tokenManager.getAccessToken();
        const refresh = await tokenManager.getRefreshToken();
        if (!access && !refresh) { if (active) setState(signedOut); return; }
        const user = await authService.currentUser();
        if (active) setState(signedInState(user));
      } catch {
        await tokenManager.clearTokens();
        if (active) setState(signedOut);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setState(current => ({ ...current, loading: true }));
    try {
      const { user } = await authService.login(email, password);
      setState(signedInState(user));
      return 'authenticated';
    } catch (error) { setState(current => ({ ...current, loading: false })); throw error; }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: RegistrationRole = 'buyer') => {
    setState(current => ({ ...current, loading: true }));
    try {
      const normalized = email.trim().toLowerCase();
      const pending = await authService.register(name, normalized, password, role);
      setState({ pendingUser: { ...createPendingUser(name, normalized), id: pending.id, role: pending.role },
        pendingEmail: normalized, pendingVerification: 'signup', role: pending.role,
        isGuest: false, loading: false, initialized: true });
    } catch (error) { setState(current => ({ ...current, loading: false })); throw error; }
  }, []);

  const verifyEmail = useCallback(async (code: string): Promise<VerificationResult> => {
    if (!state.pendingEmail) throw new Error('Your verification attempt is missing. Please start again.');
    setState(current => ({ ...current, loading: true }));
    try {
      const { user } = await authService.verifyEmail(state.pendingEmail, code);
      setState({ pendingUser: { ...user, onboardingCompleted: false }, pendingEmail: user.email,
        role: user.role, isGuest: false, loading: false, initialized: true });
      return 'onboarding';
    } catch (error) { setState(current => ({ ...current, loading: false })); throw error; }
  }, [state.pendingEmail]);

  const resendVerification = useCallback(async () => {
    if (!state.pendingEmail) throw new Error('Your verification attempt is missing. Please start again.');
    await authService.resendVerification(state.pendingEmail);
  }, [state.pendingEmail]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    await authService.sendPasswordReset(normalized);
    setState(current => ({ ...current, pendingEmail: normalized, pendingVerification: 'password_reset', loading: false, initialized: true }));
  }, []);

  const resetPassword = useCallback(async (code: string, newPassword: string) => {
    if (!state.pendingEmail) throw new Error('Enter your email before resetting your password.');
    await authService.resetPassword(state.pendingEmail, code, newPassword);
    setState(signedOut);
  }, [state.pendingEmail]);

  const logout = useCallback(async () => {
    try { await authService.logout(); }
    finally { setState(signedOut); }
  }, []);
  const continueAsGuest = useCallback(async () => {
    try { await authService.logout(); }
    finally { setState({ ...signedOut, isGuest: true }); }
  }, []);

  const saveProfile = useCallback(async (profile: Partial<User>) => {
    if (!state.user && !state.pendingUser) throw new Error('Your session expired. Please log in again.');
    setState(current => ({ ...current, loading: true }));
    try {
      const updated = await authService.updateProfile(profile);
      setState(signedInState(updated));
    } catch (error) { setState(current => ({ ...current, loading: false })); throw error; }
  }, [state.pendingUser, state.user]);

  const value = useMemo(() => ({ ...state, login, register, verifyEmail, resendVerification,
    sendPasswordReset, resetPassword, logout, continueAsGuest, saveProfile }),
    [state, login, register, verifyEmail, resendVerification, sendPasswordReset, resetPassword, logout, continueAsGuest, saveProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
