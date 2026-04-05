update public.profiles
set avatar_url = null
where coalesce(avatar_url, '') like 'data:image/%';

update auth.users as u
set raw_user_meta_data = coalesce(
  (
    select jsonb_object_agg(entry.key, entry.value)
    from jsonb_each(coalesce(u.raw_user_meta_data, '{}'::jsonb)) as entry(key, value)
    where not (
      jsonb_typeof(entry.value) = 'string'
      and trim(both '"' from entry.value::text) like 'data:image/%'
    )
  ),
  '{}'::jsonb
)
where exists (
  select 1
  from jsonb_each(coalesce(u.raw_user_meta_data, '{}'::jsonb)) as entry(key, value)
  where jsonb_typeof(entry.value) = 'string'
    and trim(both '"' from entry.value::text) like 'data:image/%'
);
