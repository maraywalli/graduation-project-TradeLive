/**
 * Stripe webhook endpoint.
 *
 * Stripe POSTs payment events to this URL server-to-server. We verify the
 * signature with STRIPE_WEBHOOK_SECRET, then call the same finalization
 * helpers used by the return-page confirm routes. Whichever path arrives
 * first finalizes the payment; the other is a no-op.
 *
 * Setup (one-time, in your Stripe Dashboard):
 *   1. Developers → Webhooks → Add endpoint.
 *   2. URL: https://<your-domain>/api/webhooks/stripe
 *   3. Events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *      checkout.session.async_payment_failed, checkout.session.expired
 *   4. Copy the "Signing secret" (whsec_...) into env var STRIPE_WEBHOOK_SECRET.
 */
import { stripe } from '@/lib/stripe';
import { finalizeCheckoutSession, finalizeBillingSession } from '@/lib/stripe-finalize';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
// Webhooks must never be cached and must always run server-side.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // 503 (rather than 500) so Stripe retries later — the operator can add
    // the secret without losing in-flight events.
    return new Response('Webhook secret not configured', { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature header', { status: 400 });

  // Stripe requires the *raw* request body for signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e: any) {
    console.error('[stripe webhook] signature verification failed:', e?.message);
    return new Response(`Bad signature: ${e?.message || 'unknown'}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const kind = session.metadata?.kind;
        const orderRef = session.client_reference_id || session.metadata?.orderRef || '';

        // For both kinds: only return non-2xx on transient *infrastructure*
        // errors (DB/Stripe lookup failures) so Stripe retries. For terminal
        // states (not_found / not_paid / failed / processing / alreadyDone)
        // we ack with 200 so Stripe stops re-delivering.
        if (kind === 'order') {
          const r = await finalizeCheckoutSession(session.id);
          if (r.kind === 'error') {
            console.error('[stripe webhook] order finalize error:', r.message);
            return new Response(r.message, { status: r.httpStatus });
          }
          if (r.kind === 'not_found') {
            console.warn('[stripe webhook] no payment row for session', session.id, '— likely from another env. Acking.');
          }
        } else if (kind === 'upgrade' && orderRef) {
          const r = await finalizeBillingSession(session.id, orderRef);
          if (r.kind === 'error') {
            console.error('[stripe webhook] billing finalize error:', r.message);
            return new Response(r.message, { status: r.httpStatus });
          }
          if (r.kind === 'not_found') {
            console.warn('[stripe webhook] no subscription row for session', session.id, '— likely from another env. Acking.');
          }
        } else {
          console.warn('[stripe webhook] unrecognized session metadata.kind:', kind);
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        // The finalize helpers already mark sessions as failed when Stripe
        // says they didn't complete; calling them here is harmless and gives
        // us symmetric handling.
        const session = event.data.object as Stripe.Checkout.Session;
        const kind = session.metadata?.kind;
        const orderRef = session.client_reference_id || session.metadata?.orderRef || '';
        if (kind === 'order') {
          await finalizeCheckoutSession(session.id);
        } else if (kind === 'upgrade' && orderRef) {
          await finalizeBillingSession(session.id, orderRef);
        }
        break;
      }

      default:
        // Ignore other event types — we just acknowledge them.
        break;
    }
  } catch (e: any) {
    console.error('[stripe webhook] handler crashed:', e?.message);
    return new Response('Internal handler error', { status: 500 });
  }

  return Response.json({ received: true });
}
