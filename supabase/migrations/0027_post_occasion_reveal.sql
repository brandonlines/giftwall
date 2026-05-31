-- Post-occasion reveal — TWO-PARTY, mutual opt-in.
--
-- After the gifts are given, a recipient may finally see who gave what (to say
-- thanks). This deliberately relaxes the Surprise Wall, so it is gated on BOTH
-- parties consenting, per gift:
--   • the recipient (giftee) opts in once on their list  -> wishlists.reveal_requested
--   • the giver opts in on their own claim/contribution   -> claims.revealed / contributions.revealed
-- The recipient sees a gift ONLY when both are true. Neither side can act alone:
-- a nosy recipient who flips reveal_requested still sees nothing until each giver
-- chooses to reveal their own gift, and a giver who reveals early is invisible
-- until the recipient also opts in. No time gate is needed — a giver simply
-- won't reveal before they've given.
--
-- The default Surprise Wall predicate (can_see_claims_for_item) is left UNTOUCHED;
-- this is a purely additive reveal path. Comments are not revealed.

alter table public.wishlists add column reveal_requested boolean not null default false;
alter table public.claims        add column revealed boolean not null default false;
alter table public.contributions add column revealed boolean not null default false;

-- Is the current user the opted-in recipient of the list this item belongs to?
-- SECURITY DEFINER + locked search_path, mirroring can_see_claims_for_item so it
-- can read wishlists during RLS evaluation regardless of the caller.
create or replace function public.recipient_opted_in_for_item(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.items i
    join public.wishlists w on w.id = i.list_id
    where i.id = p_item_id
      and w.owner_id = auth.uid()
      and w.reveal_requested
  );
$$;

-- Claims: add the reveal path. (USING can't be appended to — drop + recreate.)
drop policy "see claims unless you are the recipient" on public.claims;
create policy "see claims unless you are the recipient" on public.claims
  for select using (
    public.can_see_claims_for_item(item_id)
    or buyer_id = auth.uid()
    or (revealed and public.recipient_opted_in_for_item(item_id))
  );

-- Contributions (group gifts): same two-party reveal path.
drop policy "see contributions unless you are the recipient" on public.contributions;
create policy "see contributions unless you are the recipient" on public.contributions
  for select using (
    public.can_see_claims_for_item(item_id)
    or contributor_id = auth.uid()
    or (revealed and public.recipient_opted_in_for_item(item_id))
  );

-- Writes are already covered by existing policies: the owner edits their own
-- wishlist ("owner updates own wishlist"), the buyer edits their own claim
-- ("buyer updates own claim"), the contributor edits their own contribution
-- ("update own contribution") — each WITH CHECK binds to auth.uid().
