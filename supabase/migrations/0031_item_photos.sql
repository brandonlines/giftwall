-- Multiple photos per item. `image_url` stays the cover/thumbnail (used by lists,
-- shopping, scrape) — `photos` holds ADDITIONAL gallery images, so nothing that
-- reads image_url breaks. No RLS change: "list owner manages items" governs it.
alter table public.items
  add column photos text[] not null default '{}';
