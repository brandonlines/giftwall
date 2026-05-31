-- Rate-limit log for the gift-assistant Edge Function (LLM cost control).
-- The function (service role) records one row per successful request and counts
-- the caller's rows for the current day to enforce a per-user daily cap.
--
-- RLS is enabled with NO policies: only the service-role function reads/writes
-- this table; clients have no direct access and don't need it.

create table public.ai_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on public.ai_requests (user_id, created_at);

alter table public.ai_requests enable row level security;
