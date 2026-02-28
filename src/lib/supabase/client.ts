import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { logger } from '../logger';

export type TypedSupabaseClient = SupabaseClient<Database>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('Supabase environment variables not configured — database features will be disabled');
}

/**
 * Supabase client for browser/client-side usage.
 * Uses the anonymous key for public access.
 */
export const supabase: TypedSupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Check if Supabase is configured and available.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Create a Supabase client with a custom access token.
 * Useful for server-side operations with service role key.
 */
export function createServerClient(): TypedSupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
