/**
 * Shared Stripe-Checkout finalization helpers.
 *
 * Both the return-page confirm routes (called by the buyer's browser when
 * Stripe redirects them back) AND the webhook handler (called by Stripe
 * server-to-server) call into these helpers. That gives us a single
 * source-of-truth for the atomic claim + side-effects. Whichever path
 * arrives first wins; the other is a no-op (alreadyDone).
 *
 * Helpers run on the **service-role** Supabase client and don't require a
 * user session — they identify the row purely by Stripe's session id.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { computeCommission } from '@/lib/billing';

export type FinalizeStatus =
  | { kind: 'ok'; alreadyDone?: boolean; details?: Record<string, any> }
  | { kind: 'not_paid'; payment_status: string }
  | { kind: 'not_found' }
  | { kind: 'failed' }
  | { kind: 'processing'; message: string }
  | { kind: 'error'; message: string; httpStatus: number };

/**
 * Finalize a cart-checkout session (metadata.kind === 'order').
 * Idempotent — safe to call N times. Returns 'ok' if the side-effects ran
 * (or already ran on a prior invocation).
 */
export async function finalizeCheckoutSession(sessionId: string): Promise<FinalizeStatus> {
  // Cast to any: `payments` / `subscriptions` aren't in the generated
  // Supabase types so the typed client returns `never`. Casting opts out
  // of the type check for these helpers; runtime behavior is unchanged.
  const svc = createAdminClient() as any;

  const { data: payment } = await svc
    .from('payments')
    .select('id, status, amount, metadata, user_id')
    .eq('stripe_payment_intent_id', sessionId)
    .maybeSingle();
  if (!payment) return { kind: 'not_found' };
  if (payment.status === 'succeeded') {
    return { kind: 'ok', alreadyDone: true, details: { paymentId: payment.id } };
  }
  if (payment.status === 'failed') return { kind: 'failed' };

  // Verify with Stripe that the session was actually paid.
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e: any) {
    return {
      kind: 'error',
      message: 'Stripe lookup failed: ' + (e?.message || 'unknown'),
      httpStatus: 502,
    };
  }
  const paid =
    session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) {
    if (payment.status === 'pending') {
      await svc
        .from('payments')
        .update({
          status: 'failed',
          metadata: { ...((payment.metadata as object) || {}), payment_status: session.payment_status },
        })
        .eq('id', payment.id)
        .eq('status', 'pending');
    }
    return { kind: 'not_paid', payment_status: session.payment_status || 'unknown' };
  }

  // Atomic claim: pending → processing. Stamp claimedAt so a crashed worker
  // doesn't strand the row forever — anything older than CLAIM_TIMEOUT_MS is
  // considered abandoned and may be re-claimed.
  const claimedAt = Date.now();
  const baseMeta: any = (payment.metadata as any) || {};
  const { data: claimed } = await svc
    .from('payments')
    .update({ status: 'processing', metadata: { ...baseMeta, claimedAt } })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  const CLAIM_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
  let workingMeta: any = claimed ? { ...baseMeta, claimedAt } : baseMeta;
  if (!claimed) {
    const { data: fresh } = await svc
      .from('payments')
      .select('status, metadata')
      .eq('id', payment.id)
      .maybeSingle();
    if (fresh?.status === 'succeeded') {
      return { kind: 'ok', alreadyDone: true, details: { paymentId: payment.id } };
    }
    if (fresh?.status === 'failed') return { kind: 'failed' };
    workingMeta = (fresh?.metadata as any) || workingMeta;
    const hasOrderIds = Array.isArray(workingMeta.orderIds) && workingMeta.orderIds.length > 0;
    const claimAge = Date.now() - Number(workingMeta.claimedAt || 0);
    const claimExpired = !workingMeta.claimedAt || claimAge > CLAIM_TIMEOUT_MS;
    // Recover if either: orders were already created (so we just need to
    // finish the bookkeeping), OR the previous claim has been sitting longer
    // than CLAIM_TIMEOUT_MS (the worker that took it has likely crashed).
    if (!hasOrderIds && !claimExpired) {
      return { kind: 'processing', message: 'Another worker is finalizing this payment, retry shortly.' };
    }
    // Re-stamp so a third concurrent worker doesn't also assume it's expired.
    if (!hasOrderIds && claimExpired) {
      const refreshed = { ...workingMeta, claimedAt: Date.now() };
      await svc
        .from('payments')
        .update({ metadata: refreshed })
        .eq('id', payment.id)
        .eq('status', 'processing');
      workingMeta = refreshed;
    }
  }

  let createdOrderIds: string[] = Array.isArray(workingMeta.orderIds) ? workingMeta.orderIds : [];

  if (createdOrderIds.length === 0) {
    const items = (workingMeta.items || []) as Array<{
      id: string; title: string; qty: number; price: number; seller_id: string;
    }>;
    if (items.length === 0) {
      return { kind: 'error', message: 'Payment metadata missing items snapshot', httpStatus: 500 };
    }
    const orderRows = items.map((it) => {
      const gross = it.price * it.qty;
      const { commission, payout } = computeCommission(gross);
      return {
        buyer_id: payment.user_id,
        seller_id: it.seller_id,
        item_id: it.id,
        amount: gross,
        status: 'paid' as const,
        commission_amount: commission,
        commission_pct: 3,
        seller_payout: payout,
      };
    });
    const { data: inserted, error: orderErr } = await svc
      .from('orders')
      .insert(orderRows)
      .select('id');
    if (orderErr) {
      // Stripe already has the money. Leave the row in 'processing' so a
      // retry (return-page or another webhook delivery) can finish the job.
      return { kind: 'error', message: 'Order insert failed: ' + orderErr.message, httpStatus: 500 };
    }
    createdOrderIds = (inserted || []).map((r: any) => r.id);
    await svc
      .from('payments')
      .update({ metadata: { ...workingMeta, orderIds: createdOrderIds } })
      .eq('id', payment.id);
  }

  // Best-effort cart clear; non-fatal if it fails.
  await svc.from('cart_items').delete().eq('user_id', payment.user_id);

  await svc
    .from('payments')
    .update({ status: 'succeeded' })
    .eq('id', payment.id)
    .eq('status', 'processing');

  return {
    kind: 'ok',
    details: { paymentId: payment.id, ordersCreated: createdOrderIds.length },
  };
}

/**
 * Finalize a tier/role upgrade session (metadata.kind === 'upgrade').
 * Looks up the subscription via the composed `<orderRef>__<sessionId>` ref
 * stored in `subscriptions.stripe_payment_intent_id`. `orderRef` is also
 * Stripe's `client_reference_id` so the webhook can reconstruct it.
 */
export async function finalizeBillingSession(
  sessionId: string,
  orderRef: string,
): Promise<FinalizeStatus> {
  const svc = createAdminClient() as any;
  const composedRef = `${orderRef}__${sessionId}`;

  const { data: sub } = await svc
    .from('subscriptions')
    .select('id, kind, value, status, user_id')
    .eq('stripe_payment_intent_id', composedRef)
    .maybeSingle();
  if (!sub) return { kind: 'not_found' };
  if (sub.status === 'active') return { kind: 'ok', alreadyDone: true, details: { subId: sub.id } };
  if (sub.status === 'failed') return { kind: 'failed' };

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e: any) {
    return { kind: 'error', message: 'Stripe lookup failed: ' + (e?.message || 'unknown'), httpStatus: 502 };
  }
  const paid =
    session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) {
    if (sub.status === 'pending') {
      await svc
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', sub.id)
        .eq('status', 'pending');
    }
    return { kind: 'not_paid', payment_status: session.payment_status || 'unknown' };
  }

  const { data: claimed } = await svc
    .from('subscriptions')
    .update({ status: 'processing' })
    .eq('id', sub.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (!claimed) {
    const { data: fresh } = await svc
      .from('subscriptions')
      .select('status')
      .eq('id', sub.id)
      .maybeSingle();
    if (fresh?.status === 'active') return { kind: 'ok', alreadyDone: true, details: { subId: sub.id } };
    if (fresh?.status === 'failed') return { kind: 'failed' };
    // status === 'processing'. The side effects below (set role/tier to a
    // fixed value, then mark active) are idempotent, so it's safe to fall
    // through and recover instead of leaving the row stuck.
  }

  const now = new Date();
  const profilePatch: Record<string, any> = {};
  if (sub.kind === 'role') profilePatch.role = sub.value;
  if (sub.kind === 'tier') profilePatch.tier = sub.value;

  if (Object.keys(profilePatch).length > 0) {
    const { error: profErr } = await svc.from('profiles').update(profilePatch).eq('id', sub.user_id);
    if (profErr) {
      return { kind: 'error', message: 'Failed to apply upgrade: ' + profErr.message, httpStatus: 500 };
    }
  }

  const subPatch: Record<string, any> = {
    status: 'active',
    started_at: now.toISOString(),
  };
  if (sub.kind === 'tier') {
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);
    subPatch.expires_at = exp.toISOString();
  }
  await svc
    .from('subscriptions')
    .update(subPatch)
    .eq('id', sub.id)
    .in('status', ['processing']);

  return { kind: 'ok', details: { subId: sub.id, applied: profilePatch } };
}
