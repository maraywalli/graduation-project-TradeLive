-- Expand status enums to support atomic-claim race protection across
-- /api/checkout/qi/confirm + /api/billing/qi/confirm (QiCard gateway).
-- We add 'processing' (claimed-but-not-finalized) and 'failed' (terminal error).

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'active'::text, 'expired'::text, 'refunded'::text, 'failed'::text]));

-- payments.status currently has no check constraint, so 'processing'/'failed'
-- already work. We add an explicit constraint to make the contract clear.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text]));
