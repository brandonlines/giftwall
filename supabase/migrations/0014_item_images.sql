-- Storage for manually-uploaded item photos. Public-read bucket; a user may
-- only write under a folder named after their own user id (mirrors avatars).
-- The image URL is saved on items.image_url, which all group members can read.

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "item images are publicly readable" on storage.objects
  for select using (bucket_id = 'item-images');

create policy "users upload own item images" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own item images" on storage.objects
  for update using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own item images" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
