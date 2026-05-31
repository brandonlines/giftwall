-- Optional shipping address on a profile — "where do I send it?" for
-- distributed families. Reuses the existing profiles RLS: a member may read it
-- for their group co-members ("read profiles of group co-members") and edit only
-- their own ("update own profile"). No new policy needed; it's exactly as
-- private as display_name/avatar (co-members only, never public). Nullable, so
-- it's opt-in — leaving it blank keeps it out of view.
alter table public.profiles
  add column shipping_address text;
