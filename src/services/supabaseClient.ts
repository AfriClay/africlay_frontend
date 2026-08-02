import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { authStorage } from './authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

let client: SupabaseClient | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export class AuthConfigurationError extends Error {
  constructor() {
    super(
      'Authentication is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env file.',
    );
    this.name = 'AuthConfigurationError';
  }
}

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new AuthConfigurationError();
  }

  if (!client) {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
};
