import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:8000/api';
const ACCESS_TOKEN_KEY = 'africlay.accessToken';
const REFRESH_TOKEN_KEY = 'africlay.refreshToken';

export type TokenPair = {
  access: string;
  refresh: string;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown, fallback: string) {
    super(extractApiErrorMessage(data) || fallback);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

export const tokenManager = {
  async getAccessToken(): Promise<string | undefined> {
    if (isWeb) return localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
    const SecureStore = await import('expo-secure-store');
    return (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? undefined;
  },

  async getRefreshToken(): Promise<string | undefined> {
    if (isWeb) return localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
    const SecureStore = await import('expo-secure-store');
    return (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? undefined;
  },

  async setTokens(tokens?: TokenPair): Promise<void> {
    if (!tokens?.access || !tokens?.refresh) throw new Error('Missing session tokens.');
    if (isWeb) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh),
    ]);
  },

  async clearTokens(): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};

const endpointUrl = (endpoint: string): string => {
  const base = API_URL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildHeaders = (headers?: HeadersInit): Headers => {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has('Accept')) {
    nextHeaders.set('Accept', 'application/json');
  }
  return nextHeaders;
};

const sessionListeners = new Set<() => void>();
export const onSessionExpired = (listener: () => void): (() => void) => {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
};
let refreshPromise: Promise<void> | undefined;
const refreshTokens = async (): Promise<void> => {
  const refresh = await tokenManager.getRefreshToken();
  if (!refresh) {
    throw new Error('No refresh token is available.');
  }

  const data = await apiClient<Partial<TokenPair>>('/auth/token/refresh/', {
    method: 'POST',
    auth: false,
    body: { refresh },
  });
  const tokens = data as Partial<TokenPair>;
  if (!tokens.access || !tokens.refresh) {
    await tokenManager.clearTokens();
    throw new Error('The server did not return a complete token pair.');
  }

  await tokenManager.setTokens({ access: tokens.access, refresh: tokens.refresh });
};

export const apiClient = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const { body, headers, auth = true, retryOnUnauthorized = true, ...init } = options;
  const requestHeaders = buildHeaders(headers);
  if (!auth) {
    requestHeaders.delete('Authorization');
  }

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const accessToken = auth ? await tokenManager.getAccessToken() : undefined;
  if (auth) {
    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(endpointUrl(endpoint), {
    ...init,
    credentials: 'omit',
    headers: requestHeaders,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await parseResponse(response);
  if (response.status === 401 && auth && retryOnUnauthorized) {
    try {
      const currentAccess = await tokenManager.getAccessToken();
      if (currentAccess === accessToken) {
        refreshPromise ??= refreshTokens().finally(() => { refreshPromise = undefined; });
        await refreshPromise;
      }
    } catch {
      await tokenManager.clearTokens();
      sessionListeners.forEach(listener => listener());
      throw new ApiError(401, data, 'Your session has expired. Please log in again.');
    }
    return apiClient<T>(endpoint, { ...options, retryOnUnauthorized: false });
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      await tokenManager.clearTokens();
      sessionListeners.forEach(listener => listener());
    }
    throw new ApiError(response.status, data, 'Request failed.');
  }

  return data as T;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const extractApiErrorMessage = (data: unknown): string | undefined => {
  if (!data) {
    return undefined;
  }
  if (typeof data === 'string') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => extractApiErrorMessage(item)).find(Boolean);
  }
  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const detail = record.detail ?? record.message ?? record.non_field_errors;
    if (detail) {
      return extractApiErrorMessage(detail);
    }

    for (const value of Object.values(record)) {
      const message = extractApiErrorMessage(value);
      if (message) {
        return message;
      }
    }
  }
  return undefined;
};
