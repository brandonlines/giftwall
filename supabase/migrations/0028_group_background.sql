-- Group cover/background image — any member can set or change it (not just
-- admins), so it can't go through the admin-only "admins update their group"
-- policy. Two parts:
--   1. a public-read storage bucket where any member may write to their group's
--      folder (path = "<group_id>/bg.<ext>"), and
--   2. a column-scoped SECURITY DEFINER RPC that records the URL on the group
--      (so members touch ONLY background_url, never name/event_type/etc.).

alter table public.groups add column background_url text;

insert into storage.buckets (id, name, public)
values ('group-backgrounds', 'group-backgrounds', true)
on conflict (id) do nothing;

create policy "group backgrounds are publicly readable" on storage.objects
  for select using (bucket_id = 'group-backgrounds');

-- A user may write under a folder named after a group they belong to. Compare
-- the folder as TEXT (no uuid cast) so a malformed path simply never matches
-- instead of raising a cast error.
create policy "members upload group background" on storage.objects
  for insert with check (
    bucket_id = 'group-backgrounds'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.group_id::text = (storage.foldername(name))[1]
    )
  );

create policy "members update group background" on storage.objects
  for update using (
    bucket_id = 'group-backgrounds'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.group_id::text = (storage.foldername(name))[1]
    )
  );

create policy "members delete group background" on storage.objects
  for delete using (
    bucket_id = 'group-backgrounds'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.group_id::text = (storage.foldername(name))[1]
    )
  );

-- Record (or clear, with NULL) the background URL. Member-gated and column-
-- scoped, so a non-admin member can change the cover without being able to edit
-- anything else on the group.
create or replace function public.set_group_background(p_group_id uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'only a group member can change the background';
  end if;
  update public.groups set background_url = p_url where id = p_group_id;
end;
$$;

-- Authenticated callers only (mirrors 0021). RLS helpers stay PUBLIC.
revoke execute on function public.set_group_background(uuid, text) from public;
grant execute on function public.set_group_background(uuid, text) to authenticated, service_role;
