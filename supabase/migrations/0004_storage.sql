-- Avatar image storage. Public-read bucket; each user may only write under a
-- folder named after their own user id (e.g. "<uid>/avatar.jpg").

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
