-- An item the owner marks as a "group gift": members pool money (chip in)
-- toward it instead of one person claiming it solo. This removes the confusing
-- overlap where an item could be both claimed AND chipped-in — the flag picks
-- one path. The contributions table (0017) already enforces the Surprise Wall
-- on the pooled amounts, so nothing else changes here.
alter table public.items
  add column is_group_gift boolean not null default false;
