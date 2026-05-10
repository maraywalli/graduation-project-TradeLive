-- Delivery map coordinates used by customer requests and courier tracking.
-- Idempotent: safe to run more than once.

alter table public.deliveries add column if not exists pickup_lat double precision;
alter table public.deliveries add column if not exists pickup_lng double precision;
alter table public.deliveries add column if not exists drop_lat double precision;
alter table public.deliveries add column if not exists drop_lng double precision;
alter table public.deliveries add column if not exists driver_lat double precision;
alter table public.deliveries add column if not exists driver_lng double precision;
alter table public.deliveries add column if not exists driver_phone text;

create index if not exists deliveries_user_created_idx on public.deliveries(user_id, created_at desc);
create index if not exists deliveries_status_idx on public.deliveries(status);
