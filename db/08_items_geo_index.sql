-- Optional but recommended: index on (latitude, longitude) for the map view
-- on the marketplace. Already-existing items have NULL coords; new posts
-- collected through the seller form will populate them.

create index if not exists items_geo_idx
  on public.items (latitude, longitude)
  where latitude is not null and longitude is not null;
