-- Group activity feed. Surprise-Wall-safe by construction: we log lists
-- created, items added, and members joined — but NEVER claims/purchases, so a
-- recipient can never infer who is buying for them from the feed.
--
-- The table is written only by SECURITY DEFINER triggers (no client insert
-- policy); members can read their own group's feed.

create type public.activity_type as enum (
  'member_joined',
  'list_created',
  'item_added'
);

create table public.activity (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  actor_id   uuid references auth.users (id) on delete set null,
  type       public.activity_type not null,
  list_id    uuid references public.wishlists (id) on delete set null,
  list_title text,
  item_title text,
  created_at timestamptz not null default now()
);

create index on public.activity (group_id, created_at desc);

alter table public.activity enable row level security;

create policy "members read group activity" on public.activity
  for select using (public.is_group_member(group_id));

-- ---------------------------------------------------------------------------
-- Triggers that populate the feed.
-- ---------------------------------------------------------------------------

create or replace function public.log_member_joined()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity (group_id, actor_id, type)
  values (new.group_id, new.user_id, 'member_joined');
  return new;
end;
$$;

create trigger activity_member_joined
  after insert on public.memberships
  for each row execute function public.log_member_joined();

create or replace function public.log_list_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity (group_id, actor_id, type, list_id, list_title)
  values (new.group_id, new.owner_id, 'list_created', new.id, new.title);
  return new;
end;
$$;

create trigger activity_list_created
  after insert on public.wishlists
  for each row execute function public.log_list_created();

create or replace function public.log_item_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
  v_owner uuid;
  v_ltitle text;
begin
  select group_id, owner_id, title into v_group, v_owner, v_ltitle
  from public.wishlists where id = new.list_id;
  insert into public.activity (group_id, actor_id, type, list_id, list_title, item_title)
  values (v_group, v_owner, 'item_added', new.list_id, v_ltitle, new.title);
  return new;
end;
$$;

create trigger activity_item_added
  after insert on public.items
  for each row execute function public.log_item_added();
