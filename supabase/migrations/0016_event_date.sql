-- Optional occasion date for a wishlist (birthday, Christmas, …) so the app can
-- show a countdown and, later, time reminder notifications.
alter table public.wishlists add column event_date date;
