-- Push notification device tokens.

create table public.push_tokens (
  token      text primary key,             -- Expo push token (unique per device)
  user_id    uuid not null references auth.users (id) on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);

create index on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- A user may only see/manage their own device tokens. The send-push Edge
-- Function reads tokens with the service role, bypassing RLS, so it can fan
-- out to other group members.
create policy "manage own push tokens" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Keep updated_at fresh on re-register (token re-upsert).
create or replace function public.touch_push_token()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_tokens_touch
  before update on public.push_tokens
  for each row execute function public.touch_push_token();
