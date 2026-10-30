-- Anfrage pro Team: Eine Bezugsperson (oder der Inhaber) bittet ein
-- Programm-Team um eine Team-Review.
--
-- Die Anfrage ist KEINE Freigabe. Sie legt dieselbe Review-Anfrage an, die es
-- schon gibt: Jedes Teammitglied entscheidet selbst (unter Konto), und erst
-- wenn ALLE zugestimmt haben, wird die Review aktiv und an das Team gebunden.
-- Bei jedem Rosterwechsel endet ihr Zugriff, wie bisher.
--
-- Neu ist nur, WORAUF sich die Anfrage stuetzt: nicht auf Personenfreigaben
-- ("begleitet"), sondern auf das aktive Programm. Halter ist die anfragende
-- Person, nicht die ganze Organisation.

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
  'program_review_requested'
));

create or replace function public.request_program_team_review(p_program_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
  v_team uuid;
  v_members uuid[];
  v_member uuid;
  v_id uuid;
begin
  if v_advisor is null or not public.can_manage_team_program(p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  select team_id into v_team from public.team_programs where id = p_program_id;
  select array_agg(m.user_id) into v_members
  from public.founder_team_members m where m.team_id = v_team and m.user_id <> v_advisor;
  if v_members is null or array_length(v_members, 1) < 2 then
    raise exception 'team_review_needs_two' using errcode = '22023';
  end if;
  foreach v_member in array v_members loop
    -- Dieselbe Antwort wie "nicht begleitet": Der Grund bleibt verborgen.
    if public.is_network_interaction_blocked(v_advisor, v_member) then
      raise exception 'team_review_subject_not_accompanied' using errcode = '42501';
    end if;
  end loop;

  -- Eine offene oder aktive Anfrage fuer genau dieses Team gibt es schon.
  if exists (
    select 1 from public.advisor_team_reviews r
    where r.advisor_user_id = v_advisor and r.status in ('requested', 'active')
      and (select count(*) from public.advisor_team_review_members x where x.review_id = r.id) = array_length(v_members, 1)
      and not exists (
        select 1 from public.advisor_team_review_members x
        where x.review_id = r.id and not (x.subject_user_id = any (v_members))
      )
  ) then
    raise exception 'team_review_already_requested' using errcode = '23505';
  end if;

  insert into public.advisor_team_reviews (advisor_user_id, org_id, requested_by_user_id, request_note)
  values (v_advisor, null, v_advisor, left(nullif(btrim(coalesce(p_note, '')), ''), 400))
  returning id into v_id;
  insert into public.advisor_team_review_members (review_id, subject_user_id)
  select v_id, s from unnest(v_members) as s;

  -- Ein Hinweis im Postfach; Entscheiden kann jede Person unter Konto.
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select s, v_advisor, 'program_review_requested', v_id, '/account'
  from unnest(v_members) as s
  on conflict do nothing;

  return v_id;
end;
$$;
revoke all on function public.request_program_team_review(uuid, text) from public, anon;
grant execute on function public.request_program_team_review(uuid, text) to authenticated;

-- Die Uebersicht kennt jetzt auch "angefragt" bei der Team-Review.
create or replace function public.get_program_access_for_me(p_org_id uuid)
returns table (program_id uuid, team_review text, founder_setup text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when exists (
        select 1 from public.advisor_team_reviews r
        where r.team_id = p.team_id
          and r.status = 'active'
          and r.team_access_ended_at is null
          and (
            r.advisor_user_id = auth.uid()
            or (r.org_id = p.org_id and public.is_advisor_org_member(p.org_id))
          )
      ) then 'active'
      when exists (
        select 1 from public.advisor_team_reviews r
        where r.advisor_user_id = auth.uid() and r.status = 'requested'
          and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id)
          and not exists (
            select 1 from public.advisor_team_review_members x
            where x.review_id = r.id
              and not exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = x.subject_user_id)
          )
          and not exists (
            select 1 from public.founder_team_members m
            where m.team_id = p.team_id and m.user_id <> auth.uid()
              and not exists (select 1 from public.advisor_team_review_members x where x.review_id = r.id and x.subject_user_id = m.user_id)
          )
      ) then 'requested'
      else 'none'
    end,
    case
      when exists (
        select 1 from public.founder_team_advisor_setup_grants g
        where g.team_id = p.team_id and g.advisor_user_id = auth.uid() and g.status = 'active'
          and not exists (
            select 1 from public.founder_team_members m
            where m.team_id = p.team_id
              and not exists (
                select 1 from public.founder_team_advisor_setup_consents c
                where c.grant_id = g.id and c.founder_user_id = m.user_id
              )
          )
      ) then 'active'
      when exists (
        select 1 from public.founder_team_advisor_setup_grants g
        where g.team_id = p.team_id and g.advisor_user_id = auth.uid() and g.status in ('pending', 'active')
      ) then 'requested'
      else 'none'
    end
  from public.team_programs p
  where p.org_id = p_org_id
    and p.status <> 'ended'
    and public.team_program_is_active(p.id)
    and public.is_advisor_org_member(p_org_id)
    and (
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    );
$$;
revoke all on function public.get_program_access_for_me(uuid) from public, anon;
grant execute on function public.get_program_access_for_me(uuid) to authenticated;

commit;
