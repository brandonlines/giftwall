-- Short, shareable, revocable invite codes for joining a group.
-- Replaces handing out the raw group UUID.

-- Generates an 8-char code from an unambiguous alphabet (no 0/O/1/I).
create or replace function public.gen_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

alter table public.groups
  add column invite_code text not null default public.gen_invite_code();

create unique index groups_invite_code_key on public.groups (invite_code);

-- Backfill any rows created before this migration (defensive; new projects have none).
update public.groups set invite_code = public.gen_invite_code() where invite_code is null;

-- Redeem a code: adds the caller to the group and returns the group id.
-- SECURITY DEFINER so the caller can join without first knowing the group id
-- (which RLS on memberships would otherwise require).
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select id into v_group_id
  from public.groups
  where invite_code = upper(trim(p_code));

  if v_group_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.memberships (group_id, user_id)
  values (v_group_id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

-- Rotate (revoke + replace) a group's code. Admins only.
create or replace function public.rotate_invite_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not exists (
    select 1 from public.memberships
    where group_id = p_group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only group admins can rotate the invite code';
  end if;

  v_code := public.gen_invite_code();
  update public.groups set invite_code = v_code where id = p_group_id;
  return v_code;
end;
$$;
