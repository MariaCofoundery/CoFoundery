-- Hinweis im Postfach: "Dein Team wurde zu einem Programm eingeladen."
--
-- Wer die Einladung einloest, stimmt fuer sich zu. Die anderen im Team bekommen
-- jetzt einen Hinweis im Postfach - sie sollen die Zustimmung nicht suchen
-- muessen. Der Hinweis nennt die Organisation (das Team hat sie durch das
-- Einloesen ja erfahren); der Name wird beim Anzeigen aus dem Programm
-- gelesen, in der Zeile steht keiner.
--
-- Er endet mit der eigenen Zustimmung und mit dem Ende des Programms.

begin;

alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request',
  'problem_interest',
  'approach_interest',
  'discovery_intro_request',
  'discovery_intro_accepted',
  'read_my_mind_handoff',
  'founder_in_the_wild_handoff',
  'collaboration_conversation_marker',
  'program_update_due',
  'program_invited'
));

create or replace function public.start_team_program(p_token_hash text, p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.team_program_invites%rowtype;
  v_program uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.founder_team_members m
    join public.founder_teams t on t.id = m.team_id and t.archived_at is null
    where m.team_id = p_team_id and m.user_id = v_user
  ) then
    raise exception 'team_program_not_your_team' using errcode = '42501';
  end if;

  select * into v_invite from public.team_program_invites
  where token_hash = p_token_hash and status = 'open' and expires_at > pg_catalog.now()
  for update;
  if not found
     or not exists (select 1 from public.advisor_orgs o where o.id = v_invite.org_id and o.status = 'active') then
    raise exception 'team_program_invite_invalid' using errcode = '22023';
  end if;

  insert into public.team_programs (org_id, team_id, started_by_user_id)
  values (v_invite.org_id, p_team_id, v_user)
  returning id into v_program;

  insert into public.team_program_consents (program_id, founder_user_id) values (v_program, v_user);
  update public.team_program_invites
  set status = 'used', used_at = pg_catalog.now(), used_by_user_id = v_user
  where id = v_invite.id;

  -- Die anderen im Team: ein Hinweis, dass sie dran sind.
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select m.user_id, v_user, 'program_invited', v_program, '/programm'
  from public.founder_team_members m
  where m.team_id = p_team_id and m.user_id <> v_user
  on conflict do nothing;

  perform public.team_program_try_activate(v_program);
  return v_program;
end;
$$;
revoke all on function public.start_team_program(text, uuid) from public, anon;
grant execute on function public.start_team_program(text, uuid) to authenticated;

create or replace function public.consent_team_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select team_id into v_team from public.team_programs where id = p_program_id and status <> 'ended';
  if v_team is null or not exists (
    select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid()
  ) then
    raise exception 'team_program_not_your_team' using errcode = '42501';
  end if;
  insert into public.team_program_consents (program_id, founder_user_id)
  values (p_program_id, auth.uid())
  on conflict do nothing;
  -- Wer zugestimmt hat, ist nicht mehr dran.
  update public.in_app_notices
  set read_at = coalesce(read_at, pg_catalog.now())
  where recipient_user_id = auth.uid() and kind = 'program_invited' and subject_id = p_program_id;
  perform public.team_program_try_activate(p_program_id);
end;
$$;
revoke all on function public.consent_team_program(uuid) from public, anon;
grant execute on function public.consent_team_program(uuid) to authenticated;

create or replace function public.end_team_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_org uuid;
begin
  select team_id, org_id into v_team, v_org from public.team_programs where id = p_program_id and status <> 'ended';
  if v_team is null then return; end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
    or public.is_advisor_org_owner_of(v_org)
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.team_programs
  set status = 'ended', ended_at = pg_catalog.now(), ended_by_user_id = auth.uid()
  where id = p_program_id;
  delete from public.team_program_contacts where program_id = p_program_id;
  delete from public.team_program_profiles where program_id = p_program_id;
  delete from public.team_program_milestones where program_id = p_program_id;
  delete from public.team_program_updates where program_id = p_program_id;
  delete from public.team_program_update_questions where program_id = p_program_id;
  -- Ein Hinweis auf ein beendetes Programm wartet auf niemanden mehr.
  update public.in_app_notices
  set read_at = coalesce(read_at, pg_catalog.now())
  where kind in ('program_invited', 'program_update_due') and subject_id = p_program_id;
end;
$$;
revoke all on function public.end_team_program(uuid) from public, anon;
grant execute on function public.end_team_program(uuid) to authenticated;

commit;
