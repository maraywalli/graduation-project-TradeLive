import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Only run middleware on routes that actually depend on a fresh server-side
// auth cookie. Public catalog pages (/, /brands, /courses, /events, /items,
// /u/*) read auth client-side via the AuthProvider, so the middleware adds
// pure latency for them.
export const config = {
  matcher: [
    '/profile/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/seller/:path*',
    '/courier/:path*',
    '/delivery/:path*',
    '/admin/:path*',
    '/messages/:path*',
    '/billing/:path*',
    // /api/* needs auth refresh, except webhooks (no cookies, signed by Stripe).
    '/api/((?!webhooks/).*)',
    '/auth/:path*',
  ],
};
