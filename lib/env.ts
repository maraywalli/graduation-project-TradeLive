// Centralised env access. Hardcoded fallbacks for the Supabase project URL because
// the Replit-stored NEXT_PUBLIC_SUPABASE_URL secret currently holds a malformed value
// (the publishable key) that cannot be overwritten through the agent tooling.
const RAW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const DEFAULT_URL = 'https://gbyullcidcacsxpsrwtn.supabase.co';

export const SUPABASE_URL =
  RAW_URL.startsWith('http://') || RAW_URL.startsWith('https://') ? RAW_URL : DEFAULT_URL;

export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
