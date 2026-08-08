-- Body photos are highly sensitive: consent is explicit and files live in a separate private bucket.
alter table public.profiles
  add column if not exists body_analysis_consent_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('body-photos', 'body-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own body photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users view own body photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own body photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
