import {
  useAuth as useClerkAuth,
  useClerk,
  useSignIn,
  useSignUp,
  useUser,
} from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthFlowCancelledError,
  authRedirectUri,
  ClerkUserLike,
  createPendingUser,
  mapClerkUser,
} from '../services/authService';
import { User } from '../types/user';
import { StorefrontProfile, VerificationStatus } from '../types/seller';

export type LoginResult = 'authenticated' | 'onboarding' | 'verification';
export type VerificationResult = 'authenticated' | 'onboarding';
type ClerkUserResource = Exclude<ReturnType<typeof useUser>['user'], null | undefined>;

interface AuthState {
  user?: User;
  token?: string;
  role?: User['role'];
  pendingUser?: User;
  pendingToken?: string;
  pendingEmail?: string;
  pendingVerification?: 'signup' | 'sign_in';
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

const LEGACY_AUTH_STORAGE_KEY = 'africlay-auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultState: AuthState = {
  verificationStatus: 'none',
  isGuest: false,
  loading: true,
  initialized: false,
};

const isVerificationStatus = (value: unknown): value is VerificationStatus =>
  value === 'none' || value === 'pending' || value === 'approved' || value === 'rejected';

const sellerStateFromClerk = (providerUser: ClerkUserLike): Pick<AuthState, 'verificationStatus' | 'storefront'> => {
  const metadata = providerUser.unsafeMetadata;
  const verificationStatus = isVerificationStatus(metadata.verification_status)
    ? metadata.verification_status
    : 'none';
  const storefrontName = typeof metadata.storefront_name === 'string' ? metadata.storefront_name : undefined;
  const storefrontLogo = typeof metadata.storefront_logo === 'string' ? metadata.storefront_logo : undefined;

  return {
    verificationStatus,
    ...(storefrontName ? { storefront: { name: storefrontName, logoUrl: storefrontLogo } } : {}),
  };
};

const throwClerkError = (error: Error | null): void => {
  if (error) {
    throw error;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(defaultState);
  const clerkAuth = useClerkAuth();
  const clerk = useClerk();
  const { user: clerkUser, isLoaded: isClerkUserLoaded } = useUser();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const requireClerk = useCallback(() => {
    if (!clerkAuth.isLoaded) {
      throw new Error('Clerk is still loading. Please try again.');
    }
  }, [clerkAuth.isLoaded]);

  const sessionUser = useCallback(async (sessionId?: string | null): Promise<ClerkUserResource | undefined> => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const providerUser =
        (sessionId ? clerk.client?.sessions.find(session => session.id === sessionId)?.user : undefined) ??
        clerk.user ??
        undefined;
      if (providerUser) {
        await providerUser.reload();
        return providerUser;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return undefined;
  }, [clerk.client?.sessions, clerk.user]);

  const applySignedInUser = useCallback(async (providerUser: ClerkUserLike): Promise<VerificationResult> => {
    const appUser = mapClerkUser(providerUser);
    const sellerState = sellerStateFromClerk(providerUser);
    const token = clerkAuth.isLoaded ? (await clerkAuth.getToken()) ?? undefined : undefined;

    if (appUser.onboardingCompleted) {
      setState({
        user: appUser,
        token,
        role: appUser.role,
        ...sellerState,
        isGuest: false,
        loading: false,
        initialized: true,
      });
      return 'authenticated';
    }

    setState({
      pendingUser: appUser,
      pendingToken: token,
      pendingEmail: appUser.email,
      role: appUser.role,
      ...sellerState,
      isGuest: false,
      loading: false,
      initialized: true,
    });
    return 'onboarding';
  }, [clerkAuth]);

  const applyCompletedSession = useCallback(async (sessionId?: string | null): Promise<VerificationResult> => {
    const providerUser = await sessionUser(sessionId);
    if (providerUser) {
      return applySignedInUser(providerUser);
    }

    setState(current => ({ ...current, loading: false, initialized: true }));
    return 'authenticated';
  }, [applySignedInUser, sessionUser]);

  useEffect(() => {
    void AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!clerkAuth.isLoaded || !isClerkUserLoaded) {
      return;
    }

    let active = true;
    if (!clerkAuth.isSignedIn || !clerkUser) {
      setState(current => {
        if (current.pendingVerification || current.pendingUser) {
          return { ...current, loading: false, initialized: true };
        }
        return { verificationStatus: 'none', isGuest: current.isGuest, loading: false, initialized: true };
      });
      return;
    }

    void (async () => {
      const appUser = mapClerkUser(clerkUser);
      const sellerState = sellerStateFromClerk(clerkUser);
      const token = (await clerkAuth.getToken()) ?? undefined;
      if (!active) {
        return;
      }

      if (appUser.onboardingCompleted) {
        setState({
          user: appUser,
          token,
          role: appUser.role,
          ...sellerState,
          isGuest: false,
          loading: false,
          initialized: true,
        });
      } else {
        setState({
          pendingUser: appUser,
          pendingToken: token,
          pendingEmail: appUser.email,
          role: appUser.role,
          ...sellerState,
          isGuest: false,
          loading: false,
          initialized: true,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, clerkAuth.sessionId, clerkUser, isClerkUserLoaded]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    requireClerk();
    setState(current => ({ ...current, loading: true }));
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await signIn.password({ emailAddress: normalizedEmail, password });
      throwClerkError(error);

      if (signIn.status === 'complete') {
        const finalizeResult = await signIn.finalize();
        throwClerkError(finalizeResult.error);
        return applyCompletedSession(signIn.createdSessionId);
      }

      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const emailCodeAvailable = signIn.supportedSecondFactors.some(factor => factor.strategy === 'email_code');
        if (!emailCodeAvailable) {
          throw new Error('This account requires a verification method that is not available on this screen.');
        }
        const sendResult = await signIn.mfa.sendEmailCode();
        throwClerkError(sendResult.error);
        setState({
          pendingEmail: normalizedEmail,
          pendingVerification: 'sign_in',
          verificationStatus: 'none',
          isGuest: false,
          loading: false,
          initialized: true,
        });
        return 'verification';
      }

      throw new Error(`Clerk needs another sign-in step (${signIn.status}).`);
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [applyCompletedSession, requireClerk, signIn]);

  const loginWithGoogle = useCallback(async () => {
    requireClerk();
    setState(current => ({ ...current, loading: true }));
    try {
      const result = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: authRedirectUri,
        unsafeMetadata: {
          role: 'buyer',
          onboarding_completed: true,
        },
      });

      if (result.authSessionResult?.type === 'cancel' || result.authSessionResult?.type === 'dismiss') {
        throw new AuthFlowCancelledError();
      }
      if (!result.createdSessionId) {
        throw new Error('Google did not create an AfriClay session. Check the Google connection in Clerk.');
      }

      const providerUser = await sessionUser(result.createdSessionId);
      if (!providerUser) {
        setState(current => ({ ...current, loading: false }));
        return;
      }

      const metadata = providerUser.unsafeMetadata as Record<string, unknown>;
      if (metadata.onboarding_completed !== true) {
        await providerUser.updateMetadata({
          unsafeMetadata: {
            role: metadata.role ?? 'buyer',
            onboarding_completed: true,
          },
        });
        await providerUser.reload();
      }
      await applySignedInUser(providerUser);
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [applySignedInUser, requireClerk, sessionUser, startSSOFlow]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    requireClerk();
    setState(current => ({ ...current, loading: true }));
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await signUp.password({
        emailAddress: normalizedEmail,
        password,
        legalAccepted: true,
        unsafeMetadata: {
          full_name: name.trim(),
          role: 'buyer',
          onboarding_completed: false,
        },
      });
      throwClerkError(error);

      const sendResult = await signUp.verifications.sendEmailCode();
      throwClerkError(sendResult.error);
      setState({
        pendingUser: createPendingUser(name, normalizedEmail),
        pendingEmail: normalizedEmail,
        pendingVerification: 'signup',
        role: 'buyer',
        verificationStatus: 'none',
        isGuest: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [requireClerk, signUp]);

  const verifyEmail = useCallback(async (code: string): Promise<VerificationResult> => {
    if (!state.pendingEmail || !state.pendingVerification) {
      throw new Error('Your verification attempt is missing. Please start again.');
    }

    setState(current => ({ ...current, loading: true }));
    try {
      if (state.pendingVerification === 'signup') {
        const verificationResult = await signUp.verifications.verifyEmailCode({ code });
        throwClerkError(verificationResult.error);
        if (signUp.status !== 'complete') {
          throw new Error(`Clerk still needs these sign-up fields: ${signUp.missingFields.join(', ') || 'unknown'}.`);
        }
        const finalizeResult = await signUp.finalize();
        throwClerkError(finalizeResult.error);
        return applyCompletedSession(signUp.createdSessionId);
      }

      const verificationResult = await signIn.mfa.verifyEmailCode({ code });
      throwClerkError(verificationResult.error);
      if (signIn.status !== 'complete') {
        throw new Error(`Clerk needs another sign-in step (${signIn.status}).`);
      }
      const finalizeResult = await signIn.finalize();
      throwClerkError(finalizeResult.error);
      return applyCompletedSession(signIn.createdSessionId);
    } catch (error) {
      setState(current => ({ ...current, loading: false }));
      throw error;
    }
  }, [applyCompletedSession, signIn, signUp, state.pendingEmail, state.pendingVerification]);

  const resendVerification = useCallback(async () => {
    if (!state.pendingVerification) {
      throw new Error('Your verification attempt is missing. Please start again.');
    }
    const result =
      state.pendingVerification === 'signup'
        ? await signUp.verifications.sendEmailCode()
        : await signIn.mfa.sendEmailCode();
    throwClerkError(result.error);
  }, [signIn, signUp, state.pendingVerification]);

  const sendPasswordReset = useCallback(async (email: string) => {
    requireClerk();
    const createResult = await signIn.create({ identifier: email.trim().toLowerCase() });
    throwClerkError(createResult.error);
    const sendResult = await signIn.resetPasswordEmailCode.sendCode();
    throwClerkError(sendResult.error);
  }, [requireClerk, signIn]);

  const resetPassword = useCallback(async (code: string, newPassword: string) => {
    const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({ code });
    throwClerkError(verifyResult.error);
    if (signIn.status !== 'needs_new_password') {
      throw new Error('Clerk did not accept that reset code.');
    }
    const passwordResult = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
      signOutOfOtherSessions: true,
    });
    throwClerkError(passwordResult.error);
    if ((signIn.status as string) !== 'complete') {
      throw new Error(`Clerk needs another password-reset step (${signIn.status}).`);
    }
    const finalizeResult = await signIn.finalize();
    throwClerkError(finalizeResult.error);
    await applyCompletedSession(signIn.createdSessionId);
  }, [applyCompletedSession, signIn]);

  const logout = useCallback(async () => {
    if (clerkAuth.isLoaded && clerkAuth.isSignedIn) {
      await clerkAuth.signOut();
    }
    setState({ verificationStatus: 'none', isGuest: false, loading: false, initialized: true });
  }, [clerkAuth]);

  const continueAsGuest = useCallback(async () => {
    if (clerkAuth.isLoaded && clerkAuth.isSignedIn) {
      await clerkAuth.signOut();
    }
    setState({ verificationStatus: 'none', isGuest: true, loading: false, initialized: true });
  }, [clerkAuth]);

  const selectRole = useCallback((role: User['role']) => {
    setState(current => ({
      ...current,
      role,
      pendingUser: current.pendingUser ? { ...current.pendingUser, role } : current.pendingUser,
    }));
  }, []);

  const beginSellerVerification = useCallback(async () => {
    const providerUser = clerk.user;
    if (!providerUser) {
      throw new Error('Log in before starting seller verification.');
    }
    const nextRole: User['role'] = state.role === 'buyer' || !state.role ? 'both' : state.role;
    await providerUser.updateMetadata({
      unsafeMetadata: {
        role: nextRole,
        verification_status: 'pending',
      },
    });
    await providerUser.reload();
    setState(current => ({
      ...current,
      role: nextRole,
      verificationStatus: 'pending',
      user: current.user ? { ...current.user, role: nextRole } : current.user,
      pendingUser: current.pendingUser ? { ...current.pendingUser, role: nextRole } : current.pendingUser,
    }));
  }, [clerk.user, state.role]);

  const approveSellerVerification = useCallback(async () => {
    const providerUser = clerk.user;
    if (!providerUser) {
      throw new Error('Your session expired. Please log in again.');
    }
    await providerUser.updateMetadata({
      unsafeMetadata: { verification_status: 'approved' },
    });
    await providerUser.reload();
    setState(current => ({ ...current, verificationStatus: 'approved' }));
  }, [clerk.user]);

  const saveStorefront = useCallback(async (storefront: StorefrontProfile) => {
    const providerUser = clerk.user;
    if (!providerUser) {
      throw new Error('Your session expired. Please log in again.');
    }
    await providerUser.updateMetadata({
      unsafeMetadata: {
        storefront_name: storefront.name,
        storefront_logo: storefront.logoUrl ?? null,
        verification_status: 'approved',
      },
    });
    await providerUser.reload();
    setState(current => ({ ...current, storefront, verificationStatus: 'approved' }));
  }, [clerk.user]);

  const saveProfile = useCallback(async (profile: Partial<User>) => {
    const providerUser = clerk.user;
    if (!providerUser) {
      throw new Error('Your session expired. Please log in again.');
    }

    const role = state.role ?? 'buyer';
    setState(current => ({ ...current, loading: true }));
    try {
      await providerUser.updateMetadata({
        unsafeMetadata: {
          role,
          onboarding_completed: true,
          verification_status: state.verificationStatus,
          ...(state.storefront?.name ? { storefront_name: state.storefront.name } : {}),
          ...(state.storefront?.logoUrl ? { storefront_logo: state.storefront.logoUrl } : {}),
          ...(profile.name ? { full_name: profile.name } : {}),
          ...(profile.location ? { location: profile.location } : {}),
          ...(profile.avatarUrl ? { avatar_url: profile.avatarUrl } : {}),
        },
      });
      await providerUser.reload();
      const appUser = { ...mapClerkUser(providerUser), ...profile, role, onboardingCompleted: true };
      const token = clerkAuth.isLoaded ? (await clerkAuth.getToken()) ?? undefined : undefined;
      setState({
        user: appUser,
        token,
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
  }, [clerk.user, clerkAuth, state.role, state.storefront, state.verificationStatus]);

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
