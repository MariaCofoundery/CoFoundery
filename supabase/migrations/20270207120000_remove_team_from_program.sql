-- Die Organisation kann ein Team aus dem Programm entfernen.
--
-- Bisher konnte nur das Team selbst die Teilnahme beenden; der Inhaber konnte es
-- in der Datenbank, hatte aber keinen Weg dorthin. Jetzt gibt es ihn - mit
-- denselben Folgen wie ein Beenden durch das Team: Der Zugriff der Organisation
-- endet, Bezugspersonen, Programmprofil, Meilensteine und Updates werden
-- geloescht (end_team_program).
--
-- Neu ist, dass das Team es ERFAEHRT: Jede Person im Team bekommt einen Hinweis im
-- Postfach. Nur der Inhaber darf, nicht eine Bezugsperson. Der Hinweis nennt die
-- Organisation nicht (das Programm ist beendet, der Name wird nicht mehr gelesen).

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
  'program_invited',
  'program_review_requested',
  'program_removed'
));

create or replace function public.remove_team_from_program(p_program_id uuid)
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
  if v_team is null then
    raise exception 'team_program_not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;

  perform public.end_team_program(p_program_id);

  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select m.user_id, auth.uid(), 'program_removed', p_program_id, '/programm'
  from public.founder_team_members m
  where m.team_id = v_team
  on conflict do nothing;
end;
$$;
revoke all on function public.remove_team_from_program(uuid) from public, anon;
grant execute on function public.remove_team_from_program(uuid) to authenticated;

commit;
