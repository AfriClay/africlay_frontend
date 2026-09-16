import { Platform } from 'react-native';

export const usesCookieAuth = Platform.OS === 'web';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  'http://localhost:8000/api';
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
    if (usesCookieAuth) return undefined;
    const SecureStore = await import('expo-secure-store');
    return (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? undefined;
  },

  async getRefreshToken(): Promise<string | undefined> {
    if (usesCookieAuth) return undefined;
    const SecureStore = await import('expo-secure-store');
    return (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? undefined;
  },

  async setTokens(tokens?: TokenPair): Promise<void> {
    if (usesCookieAuth) return;
    if (!tokens?.access || !tokens?.refresh) throw new Error('Missing session tokens.');
    const SecureStore = await import('expo-secure-store');
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh),
    ]);
  },

  async clearTokens(): Promise<void> {
    if (usesCookieAuth) return;
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
let csrfPromise: Promise<string> | undefined;
const csrfToken = (): Promise<string> => {
  csrfPromise ??= fetch(endpointUrl('/auth/csrf/'), {
    credentials: 'include', headers: { 'X-Auth-Transport': 'cookie' },
  }).then(async response => {
    if (!response.ok) throw new Error('Unable to initialize browser authentication.');
    const data = await response.json();
    return data.csrfToken as string;
  }).catch(error => { csrfPromise = undefined; throw error; });
  return csrfPromise;
};

let refreshPromise: Promise<void> | undefined;
const refreshTokens = async (): Promise<void> => {
  const refresh = await tokenManager.getRefreshToken();
  if (!usesCookieAuth && !refresh) {
    throw new Error('No refresh token is available.');
  }

  const data = await apiClient<Partial<TokenPair>>('/auth/token/refresh/', {
    method: 'POST',
    auth: false,
    body: usesCookieAuth ? {} : { refresh },
  });
  if (usesCookieAuth) return;

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
  if (usesCookieAuth) {
    requestHeaders.delete('Authorization');
    requestHeaders.set('X-Auth-Transport', 'cookie');
    if (!['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase())) {
      requestHeaders.set('X-CSRFToken', await csrfToken());
    }
  }

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const accessToken = await tokenManager.getAccessToken();
    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(endpointUrl(endpoint), {
    ...init,
    credentials: usesCookieAuth ? 'include' : 'omit',
    headers: requestHeaders,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await parseResponse(response);
  if (usesCookieAuth && response.ok && ['/auth/login/', '/auth/verify-email/'].includes(endpoint)) {
    csrfPromise = undefined;
  }

  if (response.status === 401 && auth && retryOnUnauthorized) {
    try {
      refreshPromise ??= (usesCookieAuth && navigator.locks
        ? navigator.locks.request('africlay-session-refresh', refreshTokens)
        : refreshTokens()).finally(() => { refreshPromise = undefined; });
      await refreshPromise;
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
    if (response.status === 403) csrfPromise = undefined;
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

export const simulateNetwork = async <T>(value: T, _delayMs?: number): Promise<T> => value;
