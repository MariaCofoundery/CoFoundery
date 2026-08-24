-- Expose only the presentation fields needed to render current members of a founder team.
-- The profiles table remains self-readable; this narrow projection performs its own membership check.

create or replace function public.get_founder_team_member_presentations(p_team_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_id text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    member.user_id,
    profile.display_name,
    profile.avatar_id,
    profile.avatar_url
  from public.founder_team_members member
  left join public.profiles profile on profile.user_id = member.user_id
  where member.team_id = p_team_id
    and auth.uid() is not null
    and exists (
      select 1
      from public.founder_team_members current_member
      where current_member.team_id = p_team_id
        and current_member.user_id = auth.uid()
    )
  order by member.created_at asc, member.user_id asc;
$$;

revoke all on function public.get_founder_team_member_presentations(uuid) from public;
revoke all on function public.get_founder_team_member_presentations(uuid) from anon;
revoke all on function public.get_founder_team_member_presentations(uuid) from authenticated;
revoke all on function public.get_founder_team_member_presentations(uuid) from service_role;
grant execute on function public.get_founder_team_member_presentations(uuid) to authenticated;
