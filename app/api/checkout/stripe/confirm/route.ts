import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finalizeCheckoutSession } from '@/lib/stripe-finalize';

export const runtime = 'nodejs';

/**
 * Browser-driven confirm: called by /checkout/return after Stripe bounces
 * the buyer back. Authenticates the user, verifies they own the payment row,
 * then defers to the shared finalizer (which is also called by the webhook).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderRef } = await req.json().catch(() => ({} as { orderRef?: string }));
  if (!orderRef) return NextResponse.json({ error: 'Missing orderRef' }, { status: 400 });

  // Cast: `payments` isn't in the generated supabase types (typed `never`).
  // Verify ownership: only the buyer can confirm their own payment from the
  // browser. The webhook path skips this because Stripe is the caller.
  const { data: payment } = await (supabase as any)
    .from('payments')
    .select('id, stripe_payment_intent_id')
    .eq('user_id', user.id)
    .eq('stripe_client_secret', orderRef)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  const sessionId = payment.stripe_payment_intent_id;
  if (!sessionId) return NextResponse.json({ error: 'Missing Stripe session id' }, { status: 500 });

  const r = await finalizeCheckoutSession(sessionId);

  switch (r.kind) {
    case 'ok':
      return NextResponse.json({ ok: true, alreadyDone: r.alreadyDone, ...r.details });
    case 'not_paid':
      return NextResponse.json({ error: 'Payment not completed', payment_status: r.payment_status }, { status: 402 });
    case 'not_found':
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    case 'failed':
      return NextResponse.json({ error: 'Payment was marked failed' }, { status: 409 });
    case 'processing':
      return NextResponse.json({ ok: false, processing: true, message: r.message }, { status: 202 });
    case 'error':
      return NextResponse.json({ error: r.message }, { status: r.httpStatus });
  }
}
