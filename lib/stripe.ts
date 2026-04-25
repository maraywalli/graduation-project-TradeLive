import Stripe from 'stripe';

/**
 * Lazy Stripe client.
 *
 * Why a Proxy: Next.js loads every route module at build time to collect
 * metadata, even routes that won't be hit. If we instantiate Stripe at
 * import time, the build crashes whenever STRIPE_SECRET_KEY is missing
 * from the build environment. The Proxy defers instantiation until the
 * client is actually *used*, so the build always succeeds and runtime
 * still fails fast (with a clear message) if the key is missing.
 */
let _client: Stripe | null = null;

function getClient(): Stripe {
  if (_client) return _client;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      '[stripe] STRIPE_SECRET_KEY is not set. Add it to Replit Secrets ' +
        '(or your Vercel project env vars) before calling any Stripe code.',
    );
  }
  _client = new Stripe(secret, { typescript: true });
  return _client;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as any, prop, receiver);
  },
});

/** True when the configured key is a live (non-test) key. */
export function isStripeLive(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY || '';
  return secret.length > 0 && !secret.startsWith('sk_test_');
}

// Stripe does not support IQD. We display IQD throughout the UI but charge
// the customer in USD. The conversion rate is configurable via env so it can
// be tuned without a redeploy. Bad values fall back to 1310 to keep the
// platform from creating malformed Checkout Sessions.
const IQD_PER_USD_RAW = Number(process.env.IQD_PER_USD);
export const IQD_PER_USD =
  Number.isFinite(IQD_PER_USD_RAW) && IQD_PER_USD_RAW > 0 ? IQD_PER_USD_RAW : 1310;

export function iqdToUsdCents(amountIqd: number): number {
  if (!Number.isFinite(amountIqd) || amountIqd <= 0) return 0;
  // Stripe's minimum chargeable amount is $0.50 (50 cents) for USD.
  return Math.max(50, Math.round((amountIqd / IQD_PER_USD) * 100));
}

export function usdCentsToUsd(cents: number): number {
  return +(cents / 100).toFixed(2);
}
