-- Admin member management: let group admins remove members and change roles.
-- Self-leave (policy "leave a group" in 0001) still applies — policies are OR'd.

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where group_id = p_group_id and user_id = auth.uid() and role = 'admin'
  );
$$;

create policy "admins remove members" on public.memberships
  for delete using (public.is_group_admin(group_id));

create policy "admins change roles" on public.memberships
  for update using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));
