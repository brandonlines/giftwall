-- ---------------------------------------------------------------------------
-- Reactions: members react to wishlist items with an emoji (❤️ 👍 🎉).
--
-- NOTE: reactions are NOT Surprise-Wall secret — a "❤️ love this idea" is
-- encouragement, not a spoiler about who's buying. So ANY group member,
-- INCLUDING the recipient, may see and add their own reactions. (Claims and
-- contributions remain hidden from the recipient; reactions are public to the
-- group.)
-- ---------------------------------------------------------------------------

-- Group id for an item (SECURITY DEFINER avoids RLS recursion on the join).
create or replace function public.item_group_id(p_item_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select w.group_id
  from public.items i
  join public.wishlists w on w.id = i.list_id
  where i.id = p_item_id;
$$;

create table public.reactions (
  item_id    uuid not null references public.items (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (item_id, user_id, emoji)
);

create index on public.reactions (item_id);

alter table public.reactions enable row level security;

-- SELECT: any member of the item's group (recipient included).
create policy "members see reactions in their group" on public.reactions
  for select using (
    public.is_group_member(public.item_group_id(item_id))
  );

-- INSERT: react as yourself on an item in a group you belong to.
create policy "react to an item in your group" on public.reactions
  for insert with check (
    user_id = auth.uid()
    and public.is_group_member(public.item_group_id(item_id))
  );

-- DELETE: remove only your own reaction.
create policy "remove own reaction" on public.reactions
  for delete using (user_id = auth.uid());

alter publication supabase_realtime add table public.reactions;
