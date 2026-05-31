-- Manual wishlist ordering. The list owner can reorder items; `position` drives
-- the sort. Never-reordered items (NULL) fall to the bottom in creation order,
-- so existing lists are unaffected until the owner arranges them. No RLS change:
-- the existing "list owner manages items" policy already governs updates.
alter table public.items add column position int;

create index on public.items (list_id, position);
