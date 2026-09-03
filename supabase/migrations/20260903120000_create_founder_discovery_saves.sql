begin;

create table public.founder_discovery_saves (
  owner_user_id uuid not null
    references public.profiles(user_id) on delete cascade,
  saved_profile_id uuid not null
    references public.founder_discovery_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, saved_profile_id)
);

create index founder_discovery_saves_owner_created_idx
  on public.founder_discovery_saves (owner_user_id, created_at desc);

create or replace function public.enforce_founder_discovery_save_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_user_id uuid;
  v_target_status text;
begin
  select profile.user_id, profile.status
    into v_target_user_id, v_target_status
  from public.founder_discovery_profiles profile
  where profile.id = new.saved_profile_id;

  if v_target_user_id is null then
    raise exception using errcode = '23503', message = 'discovery_save_target_not_found';
  end if;

  if v_target_user_id = new.owner_user_id then
    raise exception using errcode = '23514', message = 'discovery_save_self_not_allowed';
  end if;

  if v_target_status <> 'active' then
    raise exception using errcode = '23514', message = 'discovery_save_target_not_active';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_founder_discovery_save_target()
from public, anon, authenticated;

create trigger trg_founder_discovery_saves_validate_target
before insert on public.founder_discovery_saves
for each row execute function public.enforce_founder_discovery_save_target();

alter table public.founder_discovery_saves enable row level security;

create policy founder_discovery_saves_select_owner
on public.founder_discovery_saves
for select
to authenticated
using (
  owner_user_id = auth.uid()
  and public.is_current_user_discovery_founder()
);

create policy founder_discovery_saves_insert_owner
on public.founder_discovery_saves
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and public.is_current_user_discovery_founder()
  and exists (
    select 1
    from public.founder_discovery_profiles target
    where target.id = saved_profile_id
      and target.status = 'active'
      and target.user_id <> auth.uid()
  )
);

create policy founder_discovery_saves_delete_owner
on public.founder_discovery_saves
for delete
to authenticated
using (
  owner_user_id = auth.uid()
  and public.is_current_user_discovery_founder()
);

revoke all on table public.founder_discovery_saves from public, anon;
grant select, insert, delete on table public.founder_discovery_saves to authenticated;

comment on table public.founder_discovery_saves is
  'Private owner-only bookmarks for active Founder Discovery profiles. Saves do not affect search, ranking, analytics, or notifications.';

commit;
