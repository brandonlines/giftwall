-- ---------------------------------------------------------------------------
-- Group gifting ("chip in"): members pool money toward one item.
--
-- *** THE SURPRISE WALL APPLIES ***  Contributions are protected exactly like
-- claims — the recipient (list owner) must never see who chipped in (or how
-- much) on their own items. We reuse the same proven predicate,
-- public.can_see_claims_for_item(), so the privacy guarantee is identical and
-- already covered by the RLS test suite.
-- ---------------------------------------------------------------------------

create table public.contributions (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.items (id) on delete cascade,
  contributor_id uuid not null references auth.users (id) on delete cascade,
  amount_cents   integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  note           text,
  created_at     timestamptz not null default now(),
  -- one (editable) contribution per person per item
  unique (item_id, contributor_id)
);

create index on public.contributions (item_id);
create index on public.contributions (contributor_id);

alter table public.contributions enable row level security;

-- SELECT: group members who are NOT the recipient (the Surprise Wall), plus
-- your own row so you can always see what you pledged.
create policy "see contributions unless you are the recipient" on public.contributions
  for select using (
    public.can_see_claims_for_item(item_id)
    or contributor_id = auth.uid()
  );

-- INSERT: only as yourself, and only on an item you're allowed to buy for
-- (in the group and not the recipient).
create policy "chip in on an item you can buy for" on public.contributions
  for insert with check (
    contributor_id = auth.uid()
    and public.can_see_claims_for_item(item_id)
  );

-- UPDATE / DELETE: only your own contribution.
create policy "update own contribution" on public.contributions
  for update using (contributor_id = auth.uid()) with check (contributor_id = auth.uid());
create policy "remove own contribution" on public.contributions
  for delete using (contributor_id = auth.uid());

-- Realtime (RLS-enforced; the recipient's device never receives rows for their
-- own item, same as claims). Never use Realtime Broadcast for this data.
alter publication supabase_realtime add table public.contributions;
