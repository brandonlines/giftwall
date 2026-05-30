-- Make account deletion clean: groups.created_by referenced auth.users with no
-- ON DELETE action, which would block deleting a user who ever created a group.
-- Switch it to ON DELETE SET NULL so deleting a user cascades through their
-- claims/comments/wishlists/memberships and simply orphans the created_by
-- pointer (the group lives on for its remaining members).

alter table public.groups alter column created_by drop not null;
alter table public.groups drop constraint groups_created_by_fkey;
alter table public.groups
  add constraint groups_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;
