-- Thank-you notes — closes the gifting loop after the post-occasion reveal. The
-- recipient (giftee) thanks a giver for a specific gift; the giver sees it in
-- their inbox.
--
--   from_id = the recipient sending thanks (must own the item's list)
--   to_id   = the giver being thanked
-- One note per (item, recipient, giver); editable.

create table public.thank_yous (
  item_id    uuid not null references public.items (id) on delete cascade,
  from_id    uuid not null references auth.users (id) on delete cascade,
  to_id      uuid not null references auth.users (id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now(),
  primary key (item_id, from_id, to_id),
  check (from_id <> to_id)
);

alter table public.thank_yous enable row level security;

-- You can read thanks you sent or thanks addressed to you.
create policy "see thanks you sent or received" on public.thank_yous
  for select using (from_id = auth.uid() or to_id = auth.uid());

-- You can only send thanks AS yourself, and only for a gift on a list you own
-- (i.e. you're the recipient). This doesn't touch the Surprise Wall — you're
-- choosing to express your own gratitude, not reading hidden claim data.
create policy "thank a giver for a gift on your own list" on public.thank_yous
  for insert with check (
    from_id = auth.uid()
    and exists (
      select 1 from public.items i
      join public.wishlists w on w.id = i.list_id
      where i.id = item_id and w.owner_id = auth.uid()
    )
  );

create policy "edit your own thanks" on public.thank_yous
  for update using (from_id = auth.uid()) with check (from_id = auth.uid());

create policy "delete your own thanks" on public.thank_yous
  for delete using (from_id = auth.uid());
