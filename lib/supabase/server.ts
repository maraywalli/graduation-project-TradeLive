import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<any>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Cookie-less anon client for use in cacheable Server Components
 * (`export const revalidate = N`). The regular `createClient()` reads cookies,
 * which Next.js treats as a dynamic API and that opts the page out of ISR /
 * the full-route cache on Vercel. Use this client for purely public reads
 * (catalog, brand pages, etc.) so the page actually gets cached.
 */
export function createPublicClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
