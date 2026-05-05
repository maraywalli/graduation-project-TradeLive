-- Performance optimization indexes for TradeLive marketplace
-- Run these in Supabase SQL editor to fix 2-3 second delays

-- Cart items indexes
CREATE INDEX IF NOT EXISTS cart_items_user_idx ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS cart_items_item_idx ON public.cart_items(item_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_idx ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at DESC);

-- Deliveries index
CREATE INDEX IF NOT EXISTS deliveries_user_idx ON public.deliveries(user_id);

-- Events index
CREATE INDEX IF NOT EXISTS events_starts_idx ON public.events(starts_at);

-- Items indexes for better marketplace queries
CREATE INDEX IF NOT EXISTS items_status_created_idx ON public.items(status, created_at DESC);
CREATE INDEX IF NOT EXISTS items_category_idx ON public.items(category);
CREATE INDEX IF NOT EXISTS items_seller_idx ON public.items(seller_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_created_idx ON public.profiles(created_at DESC);