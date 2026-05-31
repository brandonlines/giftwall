-- ---------------------------------------------------------------------------
-- Event types + Secret Santa.
-- ---------------------------------------------------------------------------

-- 1) Event type on a group — tailors the experience.
alter table public.groups
  add column event_type text not null default 'general'
  check (event_type in ('general', 'christmas', 'secret_santa', 'birthday', 'gift_shower'));

-- 2) Secret Santa assignments: who each giver buys for.
--    *** SECRET ***  You can only ever read YOUR OWN row (the giftee you drew).
--    No member — not even the admin who runs the draw — can read the full map.
create table public.santa_assignments (
  group_id    uuid not null references public.groups (id) on delete cascade,
  giver_id    uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (group_id, giver_id),
  check (giver_id <> receiver_id)   -- never draw yourself
);

alter table public.santa_assignments enable row level security;

-- SELECT: only your own assignment. (There are deliberately NO insert/update/
-- delete policies — only the SECURITY DEFINER draw function below may write, so
-- members can never peek at or forge the mapping.)
create policy "see only your own santa assignment" on public.santa_assignments
  for select using (giver_id = auth.uid());

-- 3) The draw — admin-only, server-side, atomic, and secret.
--    Builds a single random cycle over the members (shuffle, then everyone gives
--    to the NEXT person, last wraps to first). That guarantees a derangement:
--    nobody gets themselves, and everyone gives and receives exactly once.
--    Returns nothing, so the caller never learns the mapping.
create or replace function public.draw_secret_santa(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  members uuid[];
  n int;
  i int;
begin
  if not exists (
    select 1 from public.memberships
    where group_id = p_group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'only a group admin can draw names';
  end if;

  select array_agg(user_id order by random()) into members
  from public.memberships where group_id = p_group_id;

  n := coalesce(array_length(members, 1), 0);
  if n < 2 then
    raise exception 'need at least 2 members to draw';
  end if;

  delete from public.santa_assignments where group_id = p_group_id;
  for i in 1 .. n loop
    insert into public.santa_assignments (group_id, giver_id, receiver_id)
    values (p_group_id, members[i], members[case when i = n then 1 else i + 1 end]);
  end loop;
end;
$$;

-- Whether a draw has happened (members may see the count, not the contents) —
-- used by the UI to show "names are drawn". Safe: returns only a boolean.
create or replace function public.santa_is_drawn(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.santa_assignments where group_id = p_group_id);
$$;

-- Realtime so a member's "you're buying for ___" appears right after the draw.
alter publication supabase_realtime add table public.santa_assignments;
