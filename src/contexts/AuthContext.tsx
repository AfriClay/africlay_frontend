import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types/user';

interface AuthState {
  user?: User;
  token?: string;
  role?: 'buyer' | 'seller' | 'both';
  isGuest: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  saveProfile: (profile: Partial<User>) => Promise<void>;
}

const AUTH_STORAGE_KEY = 'africlay-auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  isGuest: false,
  loading: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(defaultState);

  const persistState = async (nextState: AuthState) => {
    setState(nextState);
    if (nextState.isGuest) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } else if (nextState.token) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
    }
  };

  useEffect(() => {
    (async () => {
      setState(current => ({ ...current, loading: true }));
      const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        try {
          setState({ ...JSON.parse(saved), loading: false, isGuest: false });
          return;
        } catch {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setState({ isGuest: false, loading: false });
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setState(current => ({ ...current, loading: true }));
    const response = await authService.login(identifier, password);
    await persistState({ user: response.user, token: response.token, role: response.user.role, isGuest: false, loading: false });
  }, []);

  const register = useCallback(async (name: string, identifier: string, password: string) => {
    setState(current => ({ ...current, loading: true }));
    const response = await authService.register(name, identifier, password);
    await persistState({ user: response.user, token: response.token, role: response.user.role, isGuest: false, loading: false });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setState({ isGuest: false, loading: false });
  }, []);

  const continueAsGuest = useCallback(async () => {
    setState({ isGuest: true, loading: false });
  }, []);

  const saveProfile = useCallback(async (profile: Partial<User>) => {
    const user = state.user ? { ...state.user, ...profile } : undefined;
    const nextState = { ...state, user };
    if (!nextState.isGuest && user && nextState.token) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
    }
    setState(nextState);
  }, [state]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      continueAsGuest,
      saveProfile,
    }),
    [state, login, register, logout, continueAsGuest, saveProfile],
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
