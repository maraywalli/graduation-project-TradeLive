import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finalizeBillingSession } from '@/lib/stripe-finalize';

export const runtime = 'nodejs';

/**
 * Browser-driven confirm: called by /billing/return after Stripe bounces the
 * buyer back from a tier/role upgrade Checkout. Authenticates the user,
 * verifies ownership, then defers to the shared finalizer (also reached by
 * the webhook handler).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId, orderRef } = await req.json().catch(() => ({} as { sessionId?: string; orderRef?: string }));
  if (!sessionId || !orderRef) {
    return NextResponse.json({ error: 'Missing sessionId or orderRef' }, { status: 400 });
  }

  const composedRef = `${orderRef}__${sessionId}`;

  // Ownership check — only the upgrading user may finalize from the browser.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('stripe_payment_intent_id', composedRef)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  const r = await finalizeBillingSession(sessionId, orderRef);

  switch (r.kind) {
    case 'ok':
      return NextResponse.json({ ok: true, alreadyDone: r.alreadyDone, ...r.details });
    case 'not_paid':
      return NextResponse.json({ error: 'Payment not completed', payment_status: r.payment_status }, { status: 402 });
    case 'not_found':
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    case 'failed':
      return NextResponse.json({ error: 'Payment was marked failed' }, { status: 409 });
    case 'processing':
      return NextResponse.json({ ok: false, processing: true, message: r.message }, { status: 202 });
    case 'error':
      return NextResponse.json({ error: r.message }, { status: r.httpStatus });
  }
}
