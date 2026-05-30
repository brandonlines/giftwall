-- "Most wanted" flag so owners can highlight top picks; sorted first in the UI.
alter table public.items
  add column is_priority boolean not null default false;
