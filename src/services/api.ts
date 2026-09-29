import { NativeModules, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:8000/api';
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);

const hostnameFromUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  const match = value.match(/^(?:https?:\/\/)?(\[[^\]]+\]|[^/:]+)(?::\d+)?(?:\/|$)/i);
  return match?.[1]?.replace(/^\[|\]$/g, '');
};

export const resolveApiUrl = (configured: string, platform: string, nativeBundleUrl?: string): string => {
  const normalized = configured.replace(/\/+$/, '');
  if (platform === 'web') return normalized;
  const parts = normalized.match(/^(https?:\/\/)(\[[^\]]+\]|[^/:]+)(:\d+)?(\/.*)?$/i);
  const configuredHost = parts?.[2]?.replace(/^\[|\]$/g, '');
  if (!parts || !configuredHost || !loopbackHosts.has(configuredHost)) return normalized;
  const developmentHost = hostnameFromUrl(nativeBundleUrl);
  if (!developmentHost || loopbackHosts.has(developmentHost)) return normalized;
  const formattedHost = developmentHost.includes(':') ? `[${developmentHost}]` : developmentHost;
  return `${parts[1]}${formattedHost}${parts[3] ?? ''}${parts[4] ?? ''}`;
};

const nativeBundleUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;
export const API_URL = resolveApiUrl(configuredApiUrl, Platform.OS, nativeBundleUrl);
export const API_ORIGIN = API_URL.match(/^https?:\/\/[^/]+/i)?.[0] ?? API_URL.replace(/\/api\/?$/, '');
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

  let response: Response;
  try {
    response = await fetch(endpointUrl(endpoint), {
      ...init,
      credentials: 'omit',
      headers: requestHeaders,
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(isWeb
      ? 'Unable to connect to AfriClay. Confirm that the backend is running.'
      : 'Unable to connect to AfriClay. Keep the phone and computer on the same network, or restore USB forwarding.');
  }
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
