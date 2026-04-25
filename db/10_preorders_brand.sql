-- =========================================================
-- Brand pages + Pre-orders
-- Adds:
--  * preorders table (waitlist entries — NOT real paid orders).
--  * Brand-name index for fast lookup by slug.
--  * RLS so users only see their own preorders + sellers see preorders
--    against items they own.
-- Idempotent — safe to re-run.
-- =========================================================

-- ---------- preorders ----------
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'waiting'
    check (status in ('waiting', 'notified', 'fulfilled', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  fulfilled_at timestamptz,
  unique (user_id, item_id)
);

create index if not exists preorders_item_idx   on public.preorders(item_id);
create index if not exists preorders_user_idx   on public.preorders(user_id);
create index if not exists preorders_status_idx on public.preorders(status);

alter table public.preorders enable row level security;

drop policy if exists "preorders_self_read" on public.preorders;
create policy "preorders_self_read" on public.preorders
  for select using (
    auth.uid() = user_id
    or auth.uid() in (select seller_id from public.items where id = item_id)
  );

drop policy if exists "preorders_self_insert" on public.preorders;
create policy "preorders_self_insert" on public.preorders
  for insert with check (auth.uid() = user_id);

-- Buyer can update only their own row, and only the fields they should mutate
-- (note/quantity/cancel). user_id and item_id can never be re-pointed.
drop policy if exists "preorders_buyer_update" on public.preorders;
create policy "preorders_buyer_update" on public.preorders
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seller can update only the workflow status fields on preorders against
-- their own items. Same WITH CHECK guarantees user_id/item_id stay pinned.
drop policy if exists "preorders_seller_update" on public.preorders;
create policy "preorders_seller_update" on public.preorders
  for update using (
    auth.uid() in (select seller_id from public.items where id = item_id)
  )
  with check (
    auth.uid() in (select seller_id from public.items where id = item_id)
  );

drop policy if exists "preorders_self_delete" on public.preorders;
create policy "preorders_self_delete" on public.preorders
  for delete using (auth.uid() = user_id);

-- ---------- items.stock parity (idempotent) ----------
-- The live DB already has these columns; this guarantees fresh schemas match.
alter table public.items
  add column if not exists stock integer not null default 1 check (stock >= 0);
alter table public.items
  add column if not exists sold_count integer not null default 0 check (sold_count >= 0);
alter table public.items
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

-- ---------- brand-ownership trigger ----------
-- Prevents a seller from attaching their item to a brand they don't own,
-- which RLS alone can't express because policies on `items` only see the
-- item row, not the joined brand row.
create or replace function public.enforce_brand_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.brand_id is not null then
    if not exists (
      select 1 from public.brands b
      where b.id = new.brand_id and b.owner_id = new.seller_id
    ) then
      raise exception 'You do not own this brand'
        using errcode = '42501'; -- insufficient_privilege
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists items_brand_ownership_check on public.items;
create trigger items_brand_ownership_check
  before insert or update of brand_id, seller_id on public.items
  for each row execute function public.enforce_brand_ownership();

-- ---------- brand slug index ----------
create unique index if not exists brands_slug_uidx on public.brands(slug);
