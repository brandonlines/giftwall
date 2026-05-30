-- How many of an item the owner wants (e.g. "4 dining chairs").
alter table public.items
  add column quantity integer not null default 1 check (quantity >= 1);
