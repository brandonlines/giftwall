-- Let group admins delete a group. (Rename already works via the
-- "admins update their group" policy from 0001; wishlist owner-delete also
-- already exists. This fills the missing DELETE policy.)
-- Deleting a group cascades its memberships, wishlists, items, claims,
-- comments and activity.

create policy "admins delete their group" on public.groups
  for delete using (public.is_group_admin(id));
