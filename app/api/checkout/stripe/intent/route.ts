import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, iqdToUsdCents, IQD_PER_USD } from '@/lib/stripe';

export const runtime = 'nodejs';

function originFromRequest(req: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, '');
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select('id, quantity, item:items(id, title, price, currency, seller_id, images)')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });
  }

  const totalIqd = cartItems.reduce(
    (s, ci: any) => s + Number(ci.item.price) * ci.quantity,
    0,
  );
  if (totalIqd <= 0) {
    return NextResponse.json({ error: 'Cart total must be greater than zero' }, { status: 400 });
  }

  const orderRef = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const origin = originFromRequest(req);
  const successUrl = `${origin}/checkout/return?orderRef=${encodeURIComponent(orderRef)}&session_id={CHECKOUT_SESSION_ID}&status=success`;
  const cancelUrl = `${origin}/checkout/return?orderRef=${encodeURIComponent(orderRef)}&status=cancel`;

  const itemsSnapshot = cartItems.map((ci: any) => ({
    id: ci.item.id,
    title: ci.item.title,
    qty: ci.quantity,
    price: Number(ci.item.price),
    seller_id: ci.item.seller_id,
    image: ci.item.images?.[0] || null,
  }));

  // Build Stripe line items in USD (Stripe doesn't support IQD).
  const lineItems = itemsSnapshot.map((it) => {
    const lineUsdCents = iqdToUsdCents(it.price * it.qty);
    return {
      quantity: 1, // we already multiplied qty into the line total
      price_data: {
        currency: 'usd',
        unit_amount: lineUsdCents,
        product_data: {
          name: `${it.title} × ${it.qty}`,
          images: it.image ? [it.image] : undefined,
          metadata: { itemId: it.id, qty: String(it.qty) },
        },
      },
    };
  });

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems as any,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orderRef,
      metadata: {
        kind: 'order',
        orderRef,
        userId: user.id,
        totalIqd: String(totalIqd),
        iqdPerUsd: String(IQD_PER_USD),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Stripe session creation failed' }, { status: 502 });
  }

  const totalUsdCents = iqdToUsdCents(totalIqd);

  // Persist a pending payment row. We reuse `stripe_payment_intent_id` to store
  // the Stripe Checkout Session id so /confirm can look it up by orderRef.
  const { error: payErr } = await supabase.from('payments').insert({
    user_id: user.id,
    amount: totalIqd,
    currency: 'IQD',
    stripe_payment_intent_id: session.id,
    stripe_client_secret: orderRef,
    status: 'pending',
    metadata: {
      gateway: 'stripe',
      orderRef,
      sessionId: session.id,
      totalIqd,
      totalUsdCents,
      iqdPerUsd: IQD_PER_USD,
      items: itemsSnapshot,
    },
  });
  if (payErr) {
    return NextResponse.json({ error: payErr.message }, { status: 500 });
  }

  return NextResponse.json({
    url: session.url,
    sessionId: session.id,
    orderRef,
    totalIqd,
    totalUsdCents,
  });
}
