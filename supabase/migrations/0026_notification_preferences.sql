-- Per-user notification preferences. One row per user; absence of a row means
-- "opted in to everything" (the default), so existing users keep getting
-- notifications until they explicitly turn a category off.
--
-- new_item is enforced today by the send-push Edge Function. new_comment and
-- occasion_reminder are stored now and honored as those senders come online.

create table public.notification_preferences (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  new_item          boolean not null default true,
  new_comment       boolean not null default true,
  occasion_reminder boolean not null default true,
  updated_at        timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

-- A user manages only their own preferences (mirrors push_tokens). The send-push
-- function reads them with the service role, bypassing RLS, to decide whom to
-- skip.
create policy "manage own notification prefs" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.touch_notification_prefs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notification_prefs_touch
  before update on public.notification_preferences
  for each row execute function public.touch_notification_prefs();
