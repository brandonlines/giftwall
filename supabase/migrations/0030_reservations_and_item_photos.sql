-- Two additions:
--   1. reservations — a soft "I'm thinking about this" signal that sits BELOW a
--      hard claim. Same Surprise Wall as claims: co-members see it, the recipient
--      never does. Reuses can_see_claims_for_item, so the privacy guarantee is
--      identical to claims by construction.
--   2. items.images — an ordered set of photo URLs so an item can carry several
--      pictures. items.image_url stays the cover (images[1]) for back-compat with
--      everything that already reads a single image (shopping list, etc.).

-- ---------------------------------------------------------------------------
-- 1. Reservations (soft interest)  ***  SURPRISE WALL  ***
-- ---------------------------------------------------------------------------
create table public.reservations (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- one reservation per person per item (toggle, not a tally)
  unique (item_id, user_id)
);

create index on public.reservations (item_id);
create index on public.reservations (user_id);

alter table public.reservations enable row level security;

-- SELECT: visible to non-recipient group members, or to the reserver themselves.
-- Identical predicate to claims — the recipient (list owner) is blocked.
create policy "see reservations unless you are the recipient" on public.reservations
  for select using (
    public.can_see_claims_for_item(item_id)
    or user_id = auth.uid()
  );

-- INSERT: you may reserve an item only if you can see claims for it (in the group
-- and not the recipient) and the row is recorded as yours.
create policy "reserve an item you are allowed to buy for" on public.reservations
  for insert with check (
    user_id = auth.uid()
    and public.can_see_claims_for_item(item_id)
  );

-- DELETE: only the reserver can drop their own reservation.
create policy "release own reservation" on public.reservations
  for delete using (user_id = auth.uid());

-- Realtime: RLS is enforced on this feed, so the recipient's device never
-- receives reservation rows for their own list (same as claims).
alter publication supabase_realtime add table public.reservations;

-- ---------------------------------------------------------------------------
-- 2. Multiple photos per item
-- ---------------------------------------------------------------------------
alter table public.items
  add column images text[] not null default '{}';

-- Backfill: existing single image becomes the first (cover) photo.
update public.items
  set images = array[image_url]
  where image_url is not null;
