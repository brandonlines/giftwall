-- Consistency hardening: pair the groups UPDATE policy's USING with a matching
-- WITH CHECK.
--
-- "admins update their group" (0001) only had a USING clause, so the *post*-
-- update row was never re-validated. It isn't exploitable today — no column on
-- groups grants any privilege (roles live on memberships), and `id` is immutable
-- — but every other UPDATE policy in the schema (profiles, wishlists, claims,
-- contributions, comments, memberships roles) pairs USING with an equal WITH
-- CHECK. Matching that here means a column added to groups in the future can't
-- be transformed through an update by a non-admin slipping past a USING-only
-- gate. Legitimate admin edits are unaffected: id is immutable, so an admin who
-- satisfies USING also satisfies WITH CHECK.
alter policy "admins update their group" on public.groups
  with check (public.is_group_admin(id));
