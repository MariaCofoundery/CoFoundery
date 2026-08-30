begin;

-- Shared Founder Setup snapshots remain team data when one founder leaves. Keep the
-- snapshot, but do not retain a dangling or falsely reassigned author reference.
alter table public.founder_team_setup_items
  drop constraint founder_team_setup_items_updated_by_user_id_fkey,
  alter column updated_by_user_id drop not null,
  add constraint founder_team_setup_items_updated_by_user_id_fkey
    foreign key (updated_by_user_id) references auth.users(id) on delete set null;

alter table public.founder_team_setup_revisions
  drop constraint founder_team_setup_revisions_proposed_by_user_id_fkey,
  alter column proposed_by_user_id drop not null,
  add constraint founder_team_setup_revisions_proposed_by_user_id_fkey
    foreign key (proposed_by_user_id) references auth.users(id) on delete set null;

-- Discussion entries are authored free text, not durable team snapshots. Deleting
-- the author removes their entries; reply rows follow the existing parent cascade.
alter table public.founder_team_setup_discussion_entries
  drop constraint founder_team_setup_discussion_entries_author_user_id_fkey,
  add constraint founder_team_setup_discussion_entries_author_user_id_fkey
    foreign key (author_user_id) references auth.users(id) on delete cascade;

alter table public.commitment_lab_discussion_entries
  drop constraint commitment_lab_discussion_entries_author_user_id_fkey,
  add constraint commitment_lab_discussion_entries_author_user_id_fkey
    foreign key (author_user_id) references auth.users(id) on delete cascade;

-- A surviving team-level advisor grant must not invent a replacement creator.
-- Its live access remains governed by the current-member consent projection.
alter table public.founder_team_advisor_setup_grants
  drop constraint founder_team_advisor_setup_grants_created_by_user_id_fkey,
  alter column created_by_user_id drop not null,
  add constraint founder_team_advisor_setup_grants_created_by_user_id_fkey
    foreign key (created_by_user_id) references auth.users(id) on delete set null;

create or replace function public.refresh_founder_team_advisor_setup_grants_after_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant_id uuid;
begin
  for v_grant_id in
    select grant_row.id
    from public.founder_team_advisor_setup_grants grant_row
    where grant_row.team_id = old.team_id
      and grant_row.revoked_at is null
  loop
    perform public.refresh_founder_team_advisor_setup_grant(v_grant_id);
  end loop;
  return old;
end;
$$;

drop trigger if exists trg_founder_team_members_refresh_advisor_setup_grants_delete
  on public.founder_team_members;
create trigger trg_founder_team_members_refresh_advisor_setup_grants_delete
after delete on public.founder_team_members
for each row execute function public.refresh_founder_team_advisor_setup_grants_after_member_delete();

revoke all on function public.refresh_founder_team_advisor_setup_grants_after_member_delete()
from public, anon, authenticated, service_role;

comment on function public.refresh_founder_team_advisor_setup_grants_after_member_delete() is
  'Re-evaluates surviving Founder Setup advisor grants after account or membership removal.';

create or replace function public.delete_empty_founder_team_after_member_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.founder_teams team
  where team.id = old.team_id
    and not exists (
      select 1
      from public.founder_team_members member
      where member.team_id = old.team_id
    );
  return old;
end;
$$;

drop trigger if exists trg_founder_team_members_delete_empty_team
  on public.founder_team_members;
create trigger trg_founder_team_members_delete_empty_team
after delete on public.founder_team_members
for each row execute function public.delete_empty_founder_team_after_member_delete();

revoke all on function public.delete_empty_founder_team_after_member_delete()
from public, anon, authenticated, service_role;

comment on function public.delete_empty_founder_team_after_member_delete() is
  'Deletes a Founder Team shell transactionally once its final membership is removed.';

-- These legacy/prototype tables deliberately have no durable auth-user FK for the
-- person represented by the row. Remove only rows that can still be attributed by
-- the auth identity at deletion time, before SET NULL can erase that linkage.
create or replace function public.delete_unlinked_personal_data_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.event_participants participant
  where old.email is not null
    and lower(btrim(participant.email)) = lower(btrim(old.email));

  delete from public.advisor_team_invites team_invite
  where team_invite.founder_a_user_id = old.id
     or team_invite.founder_b_user_id = old.id
     or (
       old.email is not null
       and lower(btrim(old.email)) in (
         lower(btrim(team_invite.founder_a_email)),
         lower(btrim(team_invite.founder_b_email))
       )
     );

  delete from public.relationship_advisors advisor_access
  where advisor_access.advisor_user_id = old.id;

  return old;
end;
$$;

drop trigger if exists trg_auth_users_delete_unlinked_personal_data on auth.users;
create trigger trg_auth_users_delete_unlinked_personal_data
before delete on auth.users
for each row execute function public.delete_unlinked_personal_data_for_auth_user();

revoke all on function public.delete_unlinked_personal_data_for_auth_user()
from public, anon, authenticated, service_role;

comment on function public.delete_unlinked_personal_data_for_auth_user() is
  'Deletes attributable event and advisor invitation/access residues before an auth identity is removed.';

commit;
