-- TradeLive Pro: Supabase schema
-- Idempotent: safe to run multiple times

-- ============ ENUMS ============
do $$ begin
  create type user_role as enum ('user', 'seller', 'brand', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_tier as enum ('free', 'premium', 'gold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_condition as enum ('new', 'like_new', 'good', 'fair', 'used');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_status as enum ('active', 'sold', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('valid', 'used', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('requested', 'assigned', 'picked_up', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============ TABLES ============

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique,
  full_name text,
  avatar_url text,
  bio text,
  role user_role not null default 'user',
  tier user_tier not null default 'free',
  rating numeric(3,2) not null default 0,
  sales_count integer not null default 0,
  language text not null default 'ku',
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  verified boolean not null default false,
  platform_fee numeric(4,2) not null default 5.0,
  rating numeric(3,2) not null default 0,
  sales_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  title text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'IQD',
  condition item_condition not null default 'new',
  category text not null default 'other',
  images text[] not null default '{}',
  location text,
  latitude double precision,
  longitude double precision,
  status item_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_seller_idx on public.items(seller_id);
create index if not exists items_status_idx on public.items(status);
create index if not exists items_created_idx on public.items(created_at desc);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  venue text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  ticket_price numeric(12,2) not null default 0,
  total_tickets integer not null default 100,
  tickets_sold integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  qr_code text not null default encode(gen_random_bytes(16), 'hex'),
  status ticket_status not null default 'valid',
  purchased_at timestamptz not null default now()
);
create unique index if not exists tickets_qr_idx on public.tickets(qr_code);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  price numeric(12,2) not null default 0,
  category text not null default 'other',
  content_url text,
  duration_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress integer not null default 0,
  enrolled_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  amount numeric(12,2) not null,
  status order_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists cart_items_user_idx on public.cart_items(user_id);
create index if not exists cart_items_item_idx on public.cart_items(item_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_chat_idx on public.messages(chat_id, created_at);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pickup_address text not null,
  drop_address text not null,
  status delivery_status not null default 'requested',
  driver_name text,
  cost numeric(12,2) not null default 0,
  eta_minutes integer,
  created_at timestamptz not null default now()
);

-- ============ TRIGGERS ============

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username',
                    split_part(new.email, '@', 1));
  -- Ensure unique username
  while exists (select 1 from public.profiles where username = uname) loop
    uname := uname || floor(random() * 1000)::text;
  end loop;
  insert into public.profiles (id, email, username, full_name, language)
  values (new.id, new.email, uname,
          new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'language', 'ku'));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- updated_at trigger for items
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at before update on public.items
for each row execute procedure public.set_updated_at();

drop trigger if exists cart_items_updated_at on public.cart_items;
create trigger cart_items_updated_at before update on public.cart_items
for each row execute procedure public.set_updated_at();

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.items enable row level security;
alter table public.events enable row level security;
alter table public.tickets enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.orders enable row level security;
alter table public.cart_items enable row level security;
alter table public.messages enable row level security;
alter table public.deliveries enable row level security;

-- profiles: anyone can read, owners can update
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- brands: anyone read; owner full
drop policy if exists "brands_select" on public.brands;
create policy "brands_select" on public.brands for select using (true);
drop policy if exists "brands_insert_own" on public.brands;
create policy "brands_insert_own" on public.brands for insert with check (auth.uid() = owner_id);
drop policy if exists "brands_update_own" on public.brands;
create policy "brands_update_own" on public.brands for update using (auth.uid() = owner_id);
drop policy if exists "brands_delete_own" on public.brands;
create policy "brands_delete_own" on public.brands for delete using (auth.uid() = owner_id);

-- items: anyone read active; owner CRUD
drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items for select using (true);
drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items for insert with check (auth.uid() = seller_id);
drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items for update using (auth.uid() = seller_id);
drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own" on public.items for delete using (auth.uid() = seller_id);

-- events
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select using (true);
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert with check (auth.uid() = organizer_id);
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events for update using (auth.uid() = organizer_id);
drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events for delete using (auth.uid() = organizer_id);

-- tickets: user sees own, organizer sees event's tickets
drop policy if exists "tickets_select" on public.tickets;
create policy "tickets_select" on public.tickets for select using (
  auth.uid() = user_id
  or auth.uid() in (select organizer_id from public.events where events.id = tickets.event_id)
);
drop policy if exists "tickets_insert_self" on public.tickets;
create policy "tickets_insert_self" on public.tickets for insert with check (auth.uid() = user_id);

-- courses
drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses for select using (true);
drop policy if exists "courses_insert_own" on public.courses;
create policy "courses_insert_own" on public.courses for insert with check (auth.uid() = instructor_id);
drop policy if exists "courses_update_own" on public.courses;
create policy "courses_update_own" on public.courses for update using (auth.uid() = instructor_id);
drop policy if exists "courses_delete_own" on public.courses;
create policy "courses_delete_own" on public.courses for delete using (auth.uid() = instructor_id);

-- enrollments: user sees own, instructor sees their course enrollments
drop policy if exists "enroll_select" on public.course_enrollments;
create policy "enroll_select" on public.course_enrollments for select using (
  auth.uid() = user_id
  or auth.uid() in (select instructor_id from public.courses where courses.id = course_enrollments.course_id)
);
drop policy if exists "enroll_insert_self" on public.course_enrollments;
create policy "enroll_insert_self" on public.course_enrollments for insert with check (auth.uid() = user_id);
drop policy if exists "enroll_update_self" on public.course_enrollments;
create policy "enroll_update_self" on public.course_enrollments for update using (auth.uid() = user_id);

-- orders: buyer or seller can see
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select using (
  auth.uid() = buyer_id or auth.uid() = seller_id
);
drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer" on public.orders for insert with check (auth.uid() = buyer_id);
drop policy if exists "orders_update_party" on public.orders;
create policy "orders_update_party" on public.orders for update using (
  auth.uid() = buyer_id or auth.uid() = seller_id
);

-- cart: each user owns their cart rows
drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own" on public.cart_items for select using (auth.uid() = user_id);
drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own" on public.cart_items for insert with check (auth.uid() = user_id);
drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own" on public.cart_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own" on public.cart_items for delete using (auth.uid() = user_id);

-- messages: sender or recipient
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self" on public.messages for insert with check (auth.uid() = sender_id);

-- deliveries: requester sees own
drop policy if exists "deliveries_select" on public.deliveries;
create policy "deliveries_select" on public.deliveries for select using (auth.uid() = user_id);
drop policy if exists "deliveries_insert_self" on public.deliveries;
create policy "deliveries_insert_self" on public.deliveries for insert with check (auth.uid() = user_id);
drop policy if exists "deliveries_update_self" on public.deliveries;
create policy "deliveries_update_self" on public.deliveries for update using (auth.uid() = user_id);

-- ============ STORAGE BUCKETS ============
insert into storage.buckets (id, name, public)
values
  ('item-images', 'item-images', true),
  ('avatars', 'avatars', true),
  ('brand-logos', 'brand-logos', true),
  ('event-covers', 'event-covers', true),
  ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

-- Public read for all buckets above
drop policy if exists "public_read" on storage.objects;
create policy "public_read" on storage.objects for select using (
  bucket_id in ('item-images','avatars','brand-logos','event-covers','course-covers')
);

drop policy if exists "auth_upload" on storage.objects;
create policy "auth_upload" on storage.objects for insert with check (
  bucket_id in ('item-images','avatars','brand-logos','event-covers','course-covers')
  and auth.role() = 'authenticated'
);

drop policy if exists "owner_delete" on storage.objects;
create policy "owner_delete" on storage.objects for delete using (
  bucket_id in ('item-images','avatars','brand-logos','event-covers','course-covers')
  and auth.uid() = owner
);
