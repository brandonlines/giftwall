-- Optional spending cap for a Secret Santa / gift exchange, shown to every
-- participant so nobody over- or under-spends. Admin-set: the existing "admins
-- update their group" policy governs writes; members read it via the groups
-- SELECT policy. No new RLS.
alter table public.groups
  add column santa_budget_cents int;
