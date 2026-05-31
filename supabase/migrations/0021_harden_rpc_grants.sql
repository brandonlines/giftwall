-- Defense-in-depth: lock the app's RPCs to authenticated callers.
--
-- Every one of these functions already verifies auth.uid() internally, so an
-- anonymous caller can't actually accomplish anything (a null uid fails the
-- admin check or violates a NOT NULL on the membership insert). But there's no
-- reason the anonymous role should be able to *invoke* them at all — so we drop
-- the blanket EXECUTE that Postgres grants to PUBLIC on every new function and
-- re-grant only to the roles that need it.
--
-- IMPORTANT: revoking "FROM anon" alone would be useless — privileges granted
-- to PUBLIC reach every role regardless of role-specific revokes. The blanket
-- grant must be removed FROM PUBLIC, then re-granted to authenticated (and
-- service_role, which the Edge Functions run as).
--
-- The RLS *helper* functions (is_group_member, is_group_admin,
-- can_see_claims_for_item, item_group_id) are deliberately NOT touched: RLS
-- policies evaluate them as the querying role, so anon must keep EXECUTE or
-- anonymous reads would error instead of returning an empty set. The trigger
-- functions (handle_new_user, log_*, enforce_claim_quantity, touch_push_token)
-- are invoked by the trigger machinery, not by direct EXECUTE, so their grants
-- are irrelevant.

revoke execute on function public.create_group(text)         from public;
revoke execute on function public.redeem_invite(text)        from public;
revoke execute on function public.rotate_invite_code(uuid)   from public;
revoke execute on function public.draw_secret_santa(uuid)    from public;
revoke execute on function public.santa_is_drawn(uuid)       from public;

grant execute on function public.create_group(text)          to authenticated, service_role;
grant execute on function public.redeem_invite(text)         to authenticated, service_role;
grant execute on function public.rotate_invite_code(uuid)    to authenticated, service_role;
grant execute on function public.draw_secret_santa(uuid)     to authenticated, service_role;
grant execute on function public.santa_is_drawn(uuid)        to authenticated, service_role;
