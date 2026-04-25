-- =========================================================
-- Role + tier billing migration
-- Adds: 'delivery' role, subscriptions table, commission tracking on orders
-- Idempotent — safe to re-run.
-- =========================================================

-- 1. Extend user_role enum to include 'delivery'
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'delivery' and enumtypid = 'public.user_role'::regtype
  ) then
    alter type public.user_role add value 'delivery';
  end if;
end $$;

-- 2. Subscriptions / one-time upgrade ledger
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('role','tier')),
  value text not null, -- 'seller' | 'delivery' | 'gold' | 'premium'
  price_usd numeric(10,2) not null,
  stripe_payment_intent_id text unique,
  status text not null default 'pending' check (status in ('pending','active','expired','refunded')),
  started_at timestamptz,
  expires_at timestamptz, -- null for one-time role upgrades
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id, status);

alter table public.subscriptions enable row level security;
drop policy if exists "subs_select_self" on public.subscriptions;
create policy "subs_select_self" on public.subscriptions for select using (auth.uid() = user_id);
-- Inserts/updates only by service role (server route)

-- 3. Commission tracking on orders (3% platform fee)
alter table public.orders add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists commission_pct numeric(5,2) not null default 3.00;
alter table public.orders add column if not exists seller_payout numeric(12,2);

-- 4. Delivery assignments — orders that need couriering get picked up by delivery role users
alter table public.deliveries add column if not exists courier_id uuid references public.profiles(id) on delete set null;
alter table public.deliveries add column if not exists assigned_at timestamptz;
alter table public.deliveries add column if not exists delivered_at timestamptz;
create index if not exists deliveries_courier_idx on public.deliveries(courier_id, status);

-- Couriers (delivery role) can read open deliveries to claim them
drop policy if exists "deliveries_select_couriers" on public.deliveries;
create policy "deliveries_select_couriers" on public.deliveries for select using (
  exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text in ('delivery','admin'))
);
drop policy if exists "deliveries_update_couriers" on public.deliveries;
create policy "deliveries_update_couriers" on public.deliveries for update using (
  exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text in ('delivery','admin'))
);
