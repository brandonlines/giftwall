-- giftwall initial schema + Surprise Wall RLS
-- The privacy guarantee lives HERE, in the database, not in the app.
-- A list owner (the gift recipient) must never be able to read claims on
-- their own list, no matter what the client does.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'member');
create type public.claim_status as enum ('claimed', 'purchased');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Mirror of auth.users for app-facing profile data.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- A family/friends circle.
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- Who belongs to which group.
create table public.memberships (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- A wishlist owned by one person (the recipient) inside a group.
create table public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);

-- Items on a wishlist.
create table public.items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.wishlists (id) on delete cascade,
  title       text not null,
  url         text,
  image_url   text,
  price_cents integer,
  currency    text,
  note        text,
  created_at  timestamptz not null default now()
);

-- Who is buying what. This is the protected table.
create table public.claims (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items (id) on delete cascade,
  buyer_id   uuid not null references auth.users (id) on delete cascade,
  status     public.claim_status not null default 'claimed',
  created_at timestamptz not null default now(),
  -- one active claim per item keeps the "button turns grey" logic honest
  unique (item_id)
);

create index on public.memberships (user_id);
create index on public.wishlists (group_id);
create index on public.wishlists (owner_id);
create index on public.items (list_id);
create index on public.claims (buyer_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids RLS recursion on memberships)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

-- True only when the current user is a member of the item's group AND is NOT
-- the recipient (list owner). This single predicate is the Surprise Wall.
create or replace function public.can_see_claims_for_item(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.items i
    join public.wishlists w on w.id = i.list_id
    join public.memberships m on m.group_id = w.group_id
    where i.id = p_item_id
      and m.user_id = auth.uid()
      and w.owner_id <> auth.uid()   -- recipient is blocked
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on everything
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.groups      enable row level security;
alter table public.memberships enable row level security;
alter table public.wishlists   enable row level security;
alter table public.items       enable row level security;
alter table public.claims      enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "read profiles of group co-members" on public.profiles
  for select using (
    exists (
      select 1 from public.memberships a
      join public.memberships b on a.group_id = b.group_id
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );

create policy "upsert own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
-- Members can read their groups; the creator can always read their own (needed
-- so `insert ... returning` works at create time, before the membership row
-- exists — PostgREST applies this SELECT policy to the inserted row).
create policy "read groups you belong to or created" on public.groups
  for select using (public.is_group_member(id) or created_by = auth.uid());

create policy "anyone can create a group" on public.groups
  for insert with check (created_by = auth.uid());

create policy "admins update their group" on public.groups
  for update using (
    exists (
      select 1 from public.memberships
      where group_id = groups.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create policy "members read memberships of their groups" on public.memberships
  for select using (public.is_group_member(group_id));

-- A user may add themselves (invite-code/join flow validated in app layer)...
create policy "join a group as self" on public.memberships
  for insert with check (user_id = auth.uid());

-- ...or an admin may add others.
create policy "admins add members" on public.memberships
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.group_id = memberships.group_id
        and m.user_id = auth.uid() and m.role = 'admin'
    )
  );

create policy "leave a group" on public.memberships
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------------------------
create policy "members read group wishlists" on public.wishlists
  for select using (public.is_group_member(group_id));

create policy "create own wishlist in a group you belong to" on public.wishlists
  for insert with check (owner_id = auth.uid() and public.is_group_member(group_id));

create policy "owner updates own wishlist" on public.wishlists
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner deletes own wishlist" on public.wishlists
  for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create policy "members read items in group lists" on public.items
  for select using (
    exists (
      select 1 from public.wishlists w
      where w.id = items.list_id and public.is_group_member(w.group_id)
    )
  );

create policy "list owner manages items" on public.items
  for all using (
    exists (
      select 1 from public.wishlists w
      where w.id = items.list_id and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.wishlists w
      where w.id = items.list_id and w.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- claims  ***  THE SURPRISE WALL  ***
-- ---------------------------------------------------------------------------

-- SELECT: visible to group members who are NOT the recipient, or to the buyer.
create policy "see claims unless you are the recipient" on public.claims
  for select using (
    public.can_see_claims_for_item(item_id)
    or buyer_id = auth.uid()
  );

-- INSERT: you can claim an item only if you can see claims for it (i.e. you're
-- in the group and not the recipient) and the claim is recorded as yours.
create policy "claim an item you are allowed to buy for" on public.claims
  for insert with check (
    buyer_id = auth.uid()
    and public.can_see_claims_for_item(item_id)
  );

-- UPDATE/DELETE: only the buyer can change or release their own claim.
create policy "buyer updates own claim" on public.claims
  for update using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
create policy "buyer releases own claim" on public.claims
  for delete using (buyer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: add tables to the publication so postgres_changes can stream.
-- RLS above is enforced on these change feeds, so the recipient's device
-- never receives claim rows for their own list. Do NOT broadcast claim
-- payloads over Realtime "Broadcast" (that channel bypasses RLS).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.claims;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
