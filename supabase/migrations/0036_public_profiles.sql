-- Public shareable profile ("Linktree for gifts").
--
-- Two additions:
--   • profiles.username — a unique, URL-safe handle (gift-well.ca/u/<handle>).
--   • wishlists.is_public — the owner opts a specific list in to being shown on
--     their public page. Default false: nothing is public until chosen.
--
-- IMPORTANT — Surprise Wall: this migration adds NO anon/public RLS policies.
-- The public page is rendered by the `public-profile` Edge Function using the
-- service role, which selects ONLY safe fields (handle, display name, avatar,
-- and the items of public lists) and NEVER reads claims/contributions/
-- reservations. So there is no new database path for a stranger — or the
-- recipient — to see who claimed what. The wall is untouched.
--
-- Writes ride existing policies: the self-upsert policy on profiles covers
-- username; the owner-update policy on wishlists covers is_public.

alter table public.profiles add column username text;

-- Lowercase, 3–30 chars, [a-z0-9_]. Storing already-lowercased keeps the unique
-- index effectively case-insensitive without citext.
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,30}$');

create unique index profiles_username_key
  on public.profiles (username)
  where username is not null;

alter table public.wishlists
  add column is_public boolean not null default false;
