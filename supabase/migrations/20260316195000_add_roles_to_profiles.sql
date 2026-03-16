alter table public.profiles
  add column if not exists roles text[] not null default array['founder']::text[];

update public.profiles
set roles = array['founder']::text[]
where roles is null or cardinality(roles) = 0;
