-- Security hardening of group membership.
--
-- Problem: the "join a group as self" policy (0001) allowed ANY authenticated
-- user to insert their own membership into ANY group whose UUID they knew. That
-- bypassed invite codes, let removed members rejoin, and survived code rotation
-- — undermining member removal and `rotate_invite_code`.
--
-- Fix: the only ways to gain membership are now (a) creating the group, via the
-- SECURITY DEFINER create_group() RPC below, (b) redeem_invite() with a valid
-- code, or (c) an admin adding a member ("admins add members" policy). We drop
-- the open self-join policy.

create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.groups (name, created_by)
  values (p_name, auth.uid())
  returning * into v_group;

  insert into public.memberships (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'admin');

  return v_group;
end;
$$;

drop policy "join a group as self" on public.memberships;
