insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_public_read'
  ) then
    create policy avatars_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_authenticated_insert_own'
  ) then
    create policy avatars_authenticated_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_authenticated_update_own'
  ) then
    create policy avatars_authenticated_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      )
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_authenticated_delete_own'
  ) then
    create policy avatars_authenticated_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;
end
$$;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'avatar_url'
where coalesce(raw_user_meta_data ->> 'avatar_url', '') like 'data:image/%';
