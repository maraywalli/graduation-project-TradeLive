-- Cleanup migration: live streaming feature has been removed from the app.
-- Paste this into Supabase SQL Editor to drop the now-unused tables.
-- Safe to run multiple times.

drop table if exists public.live_moderation cascade;
drop table if exists public.livestream_messages cascade;
drop table if exists public.livestreams cascade;
