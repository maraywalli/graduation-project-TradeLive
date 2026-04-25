import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { priceForUpgrade, priceCentsForUpgrade, type UpgradeKind } from '@/lib/billing';

export const runtime = 'nodejs';

function originFromRequest(req: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, '');
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  return `${proto}://${host}`;
}

const VALID = {
  role: ['seller', 'delivery'] as const,
  tier: ['gold', 'premium'] as const,
};

const LABELS: Record<string, string> = {
  seller: 'TradeLive Seller upgrade',
  delivery: 'TradeLive Courier upgrade',
  gold: 'TradeLive Gold (monthly)',
  premium: 'TradeLive Premium (monthly)',
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind as 'role' | 'tier';
  const value = body?.value as string;
  if (!kind || !value || !(VALID as any)[kind]?.includes(value)) {
    return NextResponse.json({ error: 'Invalid upgrade' }, { status: 400 });
  }

  const upgrade = { kind, value } as UpgradeKind;
  const priceUsd = priceForUpgrade(upgrade);
  const priceCents = priceCentsForUpgrade(upgrade);

  const orderRef = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const origin = originFromRequest(req);
  const successUrl = `${origin}/billing/return?orderRef=${encodeURIComponent(orderRef)}&kind=${kind}&value=${value}&session_id={CHECKOUT_SESSION_ID}&status=success`;
  const cancelUrl = `${origin}/billing/return?orderRef=${encodeURIComponent(orderRef)}&kind=${kind}&value=${value}&status=cancel`;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: priceCents,
          product_data: { name: LABELS[value] || `Upgrade: ${value}` },
        },
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orderRef,
      metadata: {
        kind: 'upgrade',
        upgradeKind: kind,
        upgradeValue: value,
        orderRef,
        userId: user.id,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Stripe session creation failed' }, { status: 502 });
  }

  // Encode "<orderRef>__<sessionId>" so concurrent upgrades don't collide.
  const composedRef = `${orderRef}__${session.id}`;
  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    kind,
    value,
    price_usd: priceUsd,
    stripe_payment_intent_id: composedRef,
    status: 'pending',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    url: session.url,
    sessionId: session.id,
    orderRef,
    priceUsd,
  });
}
