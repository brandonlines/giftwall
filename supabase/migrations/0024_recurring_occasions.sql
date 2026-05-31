-- Recurring yearly occasions (birthdays). event_date (0016) is a single date;
-- this flag tells the app to roll it forward to the next anniversary instead of
-- letting it read "300 days ago". Pure display concern — the stored date keeps
-- its original year; the client computes the next occurrence.
alter table public.wishlists
  add column recurs_yearly boolean not null default false;
