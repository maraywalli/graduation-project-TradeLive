-- Free users may post at most 5 items per rolling 30-day window.
-- Gold and Premium users are unlimited.
create or replace function public.enforce_free_post_limit()
returns trigger language plpgsql security definer as $$
declare
  seller_tier public.user_tier;
  recent_count int;
begin
  select tier into seller_tier from public.profiles where id = new.seller_id;
  if seller_tier is null or seller_tier <> 'free' then
    return new;
  end if;
  select count(*) into recent_count
    from public.items
    where seller_id = new.seller_id
      and created_at > now() - interval '30 days';
  if recent_count >= 5 then
    raise exception 'FREE_POST_LIMIT: Free accounts are limited to 5 posts per month. Upgrade to Gold or Premium for unlimited posts.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists items_free_limit on public.items;
create trigger items_free_limit
  before insert on public.items
  for each row execute function public.enforce_free_post_limit();
