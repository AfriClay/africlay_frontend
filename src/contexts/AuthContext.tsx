import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types/user';

interface AuthState {
  user?: User;
  token?: string;
  role?: User['role'];
  pendingUser?: User;
  pendingToken?: string;
  pendingEmail?: string;
  isGuest: boolean;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  selectRole: (role: User['role']) => void;
  saveProfile: (profile: Partial<User>) => Promise<void>;
}

const LEGACY_AUTH_STORAGE_KEY = 'africlay-auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  isGuest: false,
  loading: true,
  initialized: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(defaultState);

  useEffect(() => {
    let active = true;
    let unsubscribeFromAutoRefresh: () => void = () => undefined;

    (async () => {
      await AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      if (!authService.configured) {
        if (active) {
          setState({ isGuest: false, loading: false, initialized: true });
        }
        return;
      }

      unsubscribeFromAutoRefresh = authService.subscribeToAutoRefresh();
      try {
        const response = await authService.getCurrentSession();
        if (active) {
          setState(
            response?.user.onboardingCompleted
              ? {
                  user: response.user,
                  token: response.token,
                  role: response.user.role,
                  isGuest: false,
                  loading: false,
                  initialized: true,
                }
              : response
                ? {
                    pendingUser: response.user,
                    pendingToken: response.token,
                    pendingEmail: response.user.email,
                    role: response.user.role,
                    isGuest: false,
                    loading: false,
                    initialized: true,
                  }
                : { isGuest: false, loading: false, initialized: true },
          );
        }
      } catch {
        if (active) {
          setState({ isGuest: false, loading: false, initialized: true });
        }
      }
    })();

    return () => {
      active = false;
      unsubscribeFromAutoRefresh();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(current => ({ ...current, loading: true }));
    try {
      const response = await authService.login(email, password);
      if (response.user.onboardingCompleted) {
        setState({
          user: response.user,
          token: response.token,
          role: response.user.role,
          isGuest: false,
          loading: false,
          initialized: true,
        });
        return false;
      }

      setState({
        pendingUser: response.user,
        pendingToken: response.token,
        pendingEmail: response.user.email,
        role: response.user.role,
        isGuest: false,
        loading: false,
        initialized: true,
      });
      return true;
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setState(current => ({ ...current, loading: true }));
    try {
      const response = await authService.loginWithGoogle();
      setState({
        user: response.user,
        token: response.token,
        role: response.user.role,
        isGuest: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setState(current => ({ ...current, loading: true }));
    try {
      const response = await authService.register(name, email, password);
      setState({
        pendingUser: response.user,
        pendingEmail: response.email,
        role: response.user.role,
        isGuest: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    if (!state.pendingEmail) {
      throw new Error('Your registration email is missing. Please create your account again.');
    }

    setState(current => ({ ...current, loading: true }));
    try {
      const response = await authService.verifyEmail(state.pendingEmail, code);
      setState(current => ({
        ...current,
        pendingUser: response.user,
        pendingToken: response.token,
        role: current.role ?? response.user.role,
        loading: false,
      }));
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [state.pendingEmail]);

  const resendVerification = useCallback(async () => {
    if (!state.pendingEmail) {
      throw new Error('Your registration email is missing. Please create your account again.');
    }
    await authService.resendVerification(state.pendingEmail);
  }, [state.pendingEmail]);

  const logout = useCallback(async () => {
    if (authService.configured) {
      await authService.logout();
    }
    setState({ isGuest: false, loading: false, initialized: true });
  }, []);

  const continueAsGuest = useCallback(async () => {
    if (authService.configured) {
      await authService.logout();
    }
    setState({ isGuest: true, loading: false, initialized: true });
  }, []);

  const selectRole = useCallback((role: User['role']) => {
    setState(current => ({
      ...current,
      role,
      pendingUser: current.pendingUser ? { ...current.pendingUser, role } : current.pendingUser,
    }));
  }, []);

  const saveProfile = useCallback(async (profile: Partial<User>) => {
    const baseUser = state.user ?? state.pendingUser;
    const role = state.role ?? baseUser?.role ?? 'buyer';
    if (!baseUser || (!state.token && !state.pendingToken)) {
      throw new Error('Your session expired. Please log in again.');
    }

    setState(current => ({ ...current, loading: true }));
    try {
      const response = await authService.updateProfile(profile, role);
      setState({
        user: response.user,
        token: response.token,
        role,
        isGuest: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [state.pendingToken, state.pendingUser, state.role, state.token, state.user]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      logout,
      continueAsGuest,
      selectRole,
      saveProfile,
    }),
    [
      state,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      logout,
      continueAsGuest,
      selectRole,
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
