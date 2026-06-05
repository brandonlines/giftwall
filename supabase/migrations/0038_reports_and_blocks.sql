-- 0038_reports_and_blocks.sql
-- User-level moderation for user-generated content (App Store Guideline 1.2):
--   * Block — symmetric. If either user blocks the other, each stops seeing the
--     other's comments and group messages. Enforced in RLS, so it can't be
--     bypassed by inspecting network traffic.
--   * Report — members flag content; the table is write-only for them and is
--     reviewed out-of-band by the operator (service role). Regular users cannot
--     read reports.

-- 1) Blocks ------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "see your own blocks" on public.blocks
  for select using (blocker_id = auth.uid());
create policy "create your own blocks" on public.blocks
  for insert with check (blocker_id = auth.uid());
create policy "remove your own blocks" on public.blocks
  for delete using (blocker_id = auth.uid());

-- Symmetric block check: true if the caller and p_other have blocked each other
-- in EITHER direction. SECURITY DEFINER so it can see the reverse-direction row
-- that the caller's own RLS would hide.
create or replace function public.is_blocked(p_other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = p_other)
       or (blocker_id = p_other and blocked_id = auth.uid())
  );
$$;

-- 2) Reports -----------------------------------------------------------------
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (content_type in ('comment','message','item','profile')),
  content_id   uuid not null,
  group_id     uuid references public.groups (id) on delete set null,
  reason       text,
  created_at   timestamptz not null default now()
);
create index on public.reports (created_at desc);

alter table public.reports enable row level security;

-- Insert-only for signed-in users. There are deliberately NO select/update/
-- delete policies: the table is reviewed by the operator via the service role.
create policy "file your own report" on public.reports
  for insert with check (reporter_id = auth.uid());

-- 3) Hide blocked users' content ---------------------------------------------
-- Amend the SELECT policies on the two user-generated-content tables to drop
-- rows authored by someone in a block relationship with the caller.
alter policy "see comments unless you are the recipient" on public.item_comments
  using (public.can_see_claims_for_item(item_id) and not public.is_blocked(author_id));

alter policy "members read group messages" on public.group_messages
  using (public.is_group_member(group_id) and not public.is_blocked(author_id));
