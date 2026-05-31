-- Secret Santa exclusions: pairs who must never be matched (e.g. couples who
-- already buy for each other, or a parent who shouldn't draw their own kid).
-- Admin-managed; the draw honors them in BOTH directions.

create table public.santa_exclusions (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_a, user_b),
  check (user_a <> user_b)
);

alter table public.santa_exclusions enable row level security;

-- Only a group's admins manage or view its exclusion list. The draw function is
-- SECURITY DEFINER, so it reads the rows regardless of this policy.
create policy "admins manage santa exclusions" on public.santa_exclusions
  for all using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- Re-define the draw to honor exclusions. A single random cycle already
-- guarantees a derangement (nobody draws themselves, everyone gives/receives
-- once); we now retry the shuffle until no giver->receiver edge — in either
-- direction — hits an exclusion. For realistic family exclusion sets this lands
-- within a few tries; if the constraints are unsatisfiable we fail loudly so the
-- admin can relax them. CREATE OR REPLACE preserves the EXECUTE grants set in
-- migration 0021 (authenticated/service_role only).
create or replace function public.draw_secret_santa(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  members  uuid[];
  n        int;
  i        int;
  attempt  int;
  valid    boolean;
  giver    uuid;
  receiver uuid;
begin
  if not exists (
    select 1 from public.memberships
    where group_id = p_group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'only a group admin can draw names';
  end if;

  select count(*) into n from public.memberships where group_id = p_group_id;
  if n < 2 then
    raise exception 'need at least 2 members to draw';
  end if;

  for attempt in 1 .. 200 loop
    select array_agg(user_id order by random()) into members
    from public.memberships where group_id = p_group_id;

    valid := true;
    for i in 1 .. n loop
      giver    := members[i];
      receiver := members[case when i = n then 1 else i + 1 end];
      if exists (
        select 1 from public.santa_exclusions e
        where e.group_id = p_group_id
          and ( (e.user_a = giver    and e.user_b = receiver)
             or (e.user_a = receiver and e.user_b = giver) )
      ) then
        valid := false;
        exit;
      end if;
    end loop;

    if valid then
      delete from public.santa_assignments where group_id = p_group_id;
      for i in 1 .. n loop
        insert into public.santa_assignments (group_id, giver_id, receiver_id)
        values (p_group_id, members[i], members[case when i = n then 1 else i + 1 end]);
      end loop;
      return;
    end if;
  end loop;

  raise exception 'could not honor the exclusions after 200 tries — relax some and try again';
end;
$$;
