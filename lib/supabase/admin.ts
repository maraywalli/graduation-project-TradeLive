/**
 * Service-role Supabase client. Server-only — never import from client code.
 * Bypasses RLS. Use sparingly and always after verifying caller identity yourself.
 */
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let cached: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('createAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  cached = createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
