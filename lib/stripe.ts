import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET_KEY;

if (!secret) {
  // Fail fast — silent test-key fallbacks have caused real-money mishaps in
  // production. Better to surface the misconfiguration immediately.
  throw new Error(
    '[stripe] STRIPE_SECRET_KEY is not set. Set it via Replit secrets (or your Vercel env) before any Stripe code is loaded.',
  );
}

export const stripe = new Stripe(secret, {
  typescript: true,
});

/** True when the configured key is a live (non-test) key. */
export function isStripeLive(): boolean {
  return !secret.startsWith('sk_test_');
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
