// Single source of truth for platform pricing & commission.
// Subscription / role upgrades are billed in USD via Stripe.

export const COMMISSION_PCT = 3; // 3% of every transaction

// Indicative USD prices.
export const ROLE_PRICES_USD = {
  seller: 5,    // one-time upgrade
  delivery: 5,  // one-time upgrade
} as const;

export const TIER_PRICES_USD = {
  gold: 5,      // monthly
  premium: 15,  // monthly
} as const;

export type UpgradeKind =
  | { kind: 'role'; value: 'seller' | 'delivery' }
  | { kind: 'tier'; value: 'gold' | 'premium' };

export function priceForUpgrade(u: UpgradeKind): number {
  if (u.kind === 'role') return ROLE_PRICES_USD[u.value];
  return TIER_PRICES_USD[u.value];
}

export function priceCentsForUpgrade(u: UpgradeKind): number {
  return Math.round(priceForUpgrade(u) * 100);
}

export function computeCommission(gross: number): { commission: number; payout: number } {
  const commission = +(gross * COMMISSION_PCT / 100).toFixed(2);
  const payout = +(gross - commission).toFixed(2);
  return { commission, payout };
}
