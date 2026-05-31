-- Group-wide chat / announcements — coordination that isn't tied to one item
-- ("who's hosting?", "let's all chip in for Mom"). Visible to all members
-- (NOT a Surprise-Wall surface — it's general group talk, gated on membership,
-- not can_see_claims_for_item). Modeled on item_comments.

create table public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index on public.group_messages (group_id, created_at);

alter table public.group_messages enable row level security;

create policy "members read group messages" on public.group_messages
  for select using (public.is_group_member(group_id));

create policy "members post group messages" on public.group_messages
  for insert with check (
    author_id = auth.uid() and public.is_group_member(group_id)
  );

create policy "authors edit their message" on public.group_messages
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "authors delete their message" on public.group_messages
  for delete using (author_id = auth.uid());

-- Live chat.
alter publication supabase_realtime add table public.group_messages;
