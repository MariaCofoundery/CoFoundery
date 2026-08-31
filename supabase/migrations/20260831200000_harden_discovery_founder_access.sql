begin;

create or replace function public.is_current_user_discovery_founder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles profile
      where profile.user_id = auth.uid()
        and 'founder' = any(coalesce(profile.roles, '{}'::text[]))
    );
$$;

revoke all on function public.is_current_user_discovery_founder()
from public, anon, authenticated, service_role;
grant execute on function public.is_current_user_discovery_founder()
to authenticated;

drop policy if exists founder_discovery_profiles_select_owner_or_active
on public.founder_discovery_profiles;
create policy founder_discovery_profiles_select_founders
on public.founder_discovery_profiles
for select
to authenticated
using (
  public.is_current_user_discovery_founder()
  and (user_id = auth.uid() or status = 'active')
);

drop policy if exists founder_discovery_profiles_insert_owner
on public.founder_discovery_profiles;
create policy founder_discovery_profiles_insert_founder_owner
on public.founder_discovery_profiles
for insert
to authenticated
with check (
  public.is_current_user_discovery_founder()
  and user_id = auth.uid()
);

drop policy if exists founder_discovery_profiles_update_owner
on public.founder_discovery_profiles;
create policy founder_discovery_profiles_update_founder_owner
on public.founder_discovery_profiles
for update
to authenticated
using (
  public.is_current_user_discovery_founder()
  and user_id = auth.uid()
)
with check (
  public.is_current_user_discovery_founder()
  and user_id = auth.uid()
);

drop policy if exists founder_discovery_profiles_delete_owner
on public.founder_discovery_profiles;
create policy founder_discovery_profiles_delete_founder_owner
on public.founder_discovery_profiles
for delete
to authenticated
using (
  public.is_current_user_discovery_founder()
  and user_id = auth.uid()
);

comment on function public.is_current_user_discovery_founder() is
  'Fail-closed role guard for the founder-only Discovery profile projection. Founder+advisor accounts retain founder access; advisor-only accounts do not.';

commit;
