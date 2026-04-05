alter table public.profiles
  add column if not exists headline text,
  add column if not exists experience jsonb,
  add column if not exists skills jsonb,
  add column if not exists linkedin_url text,
  add column if not exists imported_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_experience_is_array'
  ) then
    alter table public.profiles
      add constraint profiles_experience_is_array
      check (experience is null or jsonb_typeof(experience) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_skills_is_array'
  ) then
    alter table public.profiles
      add constraint profiles_skills_is_array
      check (skills is null or jsonb_typeof(skills) = 'array');
  end if;
end
$$;
