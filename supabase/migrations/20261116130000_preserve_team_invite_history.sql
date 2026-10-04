begin;

-- Removing the final member must not fail on the new invitation FK. Keep the
-- empty context while historical/pending invitations reference it. Such invites
-- cannot authorize a join: acceptance rechecks the inviter's current membership.
create or replace function public.delete_empty_founder_team_after_member_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 delete from public.founder_teams team
 where team.id=old.team_id
 and not exists(select 1 from public.founder_team_members m where m.team_id=old.team_id)
 and not exists(select 1 from public.invitations i where i.target_founder_team_id=old.team_id);
 return old;
end $$;

commit;
