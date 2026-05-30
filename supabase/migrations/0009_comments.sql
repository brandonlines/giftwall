-- Per-item discussion so buyers can coordinate ("I'll get the blue one").
-- Surprise-Wall-safe: visibility reuses can_see_claims_for_item(), which is
-- true only for group members who are NOT the list owner. So a recipient can
-- never read (or post) comments on items in their own list.

create table public.item_comments (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index on public.item_comments (item_id, created_at);

alter table public.item_comments enable row level security;

create policy "see comments unless you are the recipient" on public.item_comments
  for select using (public.can_see_claims_for_item(item_id));

create policy "comment on items you can discuss" on public.item_comments
  for insert with check (
    author_id = auth.uid() and public.can_see_claims_for_item(item_id)
  );

create policy "edit own comment" on public.item_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "delete own comment" on public.item_comments
  for delete using (author_id = auth.uid());
