-- Phase 12C.1C: Erklaerende Zugangszustaende statt 404.
--
-- Rein additiv. Diese Migration aendert keine Zugriffsregel: Sie gibt Personen,
-- die etwas einmal sehen durften, eine Statusauskunft darueber, warum sie es
-- nicht mehr sehen. Statusinformation ist kein Datenzugriff - keine der
-- Funktionen gibt Inhalte heraus.
--
-- WER WAS ERFAEHRT: Wer nie Zugang hatte, bekommt 'none' - genauso wie fuer eine
-- Kennung, die es nicht gibt. Sonst waere jede Funktion ein Existenz-Orakel.
--
--   1. founder_team_member_exits   - Austritte, damit "du gehoerst diesem Team
--                                     nicht mehr an" nur ehemalige Mitglieder
--                                     erreicht
--   2. get_team_access_state        - Zustand eines Teams fuer die eigene Person
--   3. get_advisor_team_review_state - Zustand eines Teamreviews fuer den Advisor
--   4. get_advisor_person_access_state - Zustand eines Personenzugangs
--   5. get_advisor_org_member_list  - Org-Mitglieder mit Namen fuer Mitglieder
--   6. Team-Hinweise enden mit dem Austritt (in_app_notices.read_at)

-- ===========================================================================
-- 1. Austritte
-- ===========================================================================
create table if not exists public.founder_team_member_exits (
  team_id uuid not null references public.founder_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exited_at timestamptz not null default pg_catalog.now(),
  primary key (team_id, user_id)
);
comment on table public.founder_team_member_exits is
  'Phase 12C.1C: Wer ein Team verlassen hat. Nur fuer die Statusauskunft get_team_access_state - gewaehrt keinen Zugriff auf Teaminhalte. Kein direkter Zugriff fuer Clients.';
alter table public.founder_team_member_exits enable row level security;
revoke all on public.founder_team_member_exits from public, anon, authenticated;

create or replace function public.record_founder_team_member_exit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Kontoloeschung: Die Person gibt es nicht mehr, es gibt niemanden zu
  -- informieren. Ein geloeschtes Team ebenso.
  if not exists (select 1 from auth.users where id = old.user_id)
     or not exists (select 1 from public.founder_teams where id = old.team_id) then
    return old;
  end if;
  insert into public.founder_team_member_exits (team_id, user_id, exited_at)
  values (old.team_id, old.user_id, pg_catalog.now())
  on conflict (team_id, user_id) do update set exited_at = excluded.exited_at;
  -- Hinweise in dieses Team fuehren ab jetzt nirgendwohin: erledigt.
  update public.in_app_notices
  set read_at = pg_catalog.now()
  where recipient_user_id = old.user_id
    and read_at is null
    and (path = '/teams/' || old.team_id::text or path like '/teams/' || old.team_id::text || '/%');
  return old;
end $$;
revoke all on function public.record_founder_team_member_exit() from public, anon, authenticated;
drop trigger if exists trg_founder_team_members_record_exit on public.founder_team_members;
create trigger trg_founder_team_members_record_exit
after delete on public.founder_team_members
for each row execute function public.record_founder_team_member_exit();

-- Bestand: Austritte, die sich heute belegen lassen - eine widerrufene
-- Teamfreigabe (Austritt seit 11.7B) oder ein Paar, dessen Beziehung an das
-- Team gebunden ist, ohne dass die Person noch Mitglied ist.
insert into public.founder_team_member_exits (team_id, user_id, exited_at)
select share.team_id, share.owner_user_id, coalesce(share.revoked_at, pg_catalog.now())
from public.team_shares share
where share.revoked_at is not null
  and not exists (select 1 from public.founder_team_members m
                  where m.team_id = share.team_id and m.user_id = share.owner_user_id)
on conflict do nothing;

insert into public.founder_team_member_exits (team_id, user_id, exited_at)
select distinct rel.founder_team_id, pair.user_id, pg_catalog.now()
from public.relationships rel
cross join lateral (values (rel.user_a_id), (rel.user_b_id)) as pair(user_id)
where rel.founder_team_id is not null
  and exists (select 1 from public.founder_teams t where t.id = rel.founder_team_id)
  and not exists (select 1 from public.founder_team_members m
                  where m.team_id = rel.founder_team_id and m.user_id = pair.user_id)
on conflict do nothing;

-- Bestand: offene Hinweise in Teams, denen die Person nicht mehr angehoert.
update public.in_app_notices notice
set read_at = pg_catalog.now()
where notice.read_at is null
  and notice.path ~ '^/teams/[0-9a-f-]{36}(/|$)'
  and not exists (
    select 1 from public.founder_team_members m
    where m.user_id = notice.recipient_user_id
      and m.team_id::text = substring(notice.path from '^/teams/([0-9a-f-]{36})')
  );

-- ===========================================================================
-- 2. Teamzustand fuer die eigene Person
-- ===========================================================================
-- Rueckgabe:
--   member              aktuelles Mitglied
--   readable            Advisor mit gueltigem Teamberichts-Zugang
--   left                ehemaliges Mitglied, Team besteht weiter
--   archived            ehemaliges Mitglied, Team archiviert
--   team_inactive       ehemaliger Advisor-Zugang, Team archiviert
--   org_membership_ended  Advisor-Zugang lief ueber eine Organisation, deren Mitglied
--                       die Person nicht mehr ist
--   org_suspended       Organisation ausgesetzt
--   review_ended        Teamreview beendet
--   roster_changed      Teamzusammensetzung hat sich seit der Freigabe veraendert
--   access_ended        Paar-Advisor-Zugang beendet
--   none                nie Zugang - oder das Team gibt es nicht
create or replace function public.get_team_access_state(p_team_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_archived timestamptz;
  v_review record;
  v_member_count integer;
begin
  if v_user is null or p_team_id is null then return 'none'; end if;
  select archived_at into v_archived from public.founder_teams where id = p_team_id;
  if not found then return 'none'; end if;

  if exists (select 1 from public.founder_team_members where team_id = p_team_id and user_id = v_user) then
    return 'member';
  end if;

  if exists (select 1 from public.founder_team_member_exits where team_id = p_team_id and user_id = v_user) then
    return case when v_archived is not null then 'archived' else 'left' end;
  end if;

  if public.can_read_workstyle_team(p_team_id) then return 'readable'; end if;

  -- Teamreviews, die an genau dieses Team gebunden waren.
  select review.id, review.status, review.org_id, review.team_access_ended_at
  into v_review
  from public.advisor_team_reviews review
  where review.team_id = p_team_id
    and public.was_ever_advisor_for_team_review(review.id, v_user)
  order by review.team_bound_at desc nulls last, review.created_at desc
  limit 1;

  if found then
    if v_review.org_id is not null then
      if not exists (select 1 from public.advisor_org_members m
                     where m.org_id = v_review.org_id and m.user_id = v_user and m.status = 'active') then
        return 'org_membership_ended';
      end if;
      if exists (select 1 from public.advisor_orgs o where o.id = v_review.org_id and o.status <> 'active') then
        return 'org_suspended';
      end if;
    end if;
    if v_archived is not null then return 'team_inactive'; end if;
    if v_review.status <> 'active' then return 'review_ended'; end if;
    if v_review.team_access_ended_at is not null then return 'roster_changed'; end if;
    -- Gueltiger Review, aber der Bericht ist nicht lesbar: kein Grund je Person.
    return 'review_ended';
  end if;

  -- Paar-Advisor (relationship_advisors) einer Beziehung dieses Teams.
  if exists (
    select 1 from public.relationships rel
    join public.relationship_advisors ra on ra.relationship_id = rel.id
    where rel.founder_team_id = p_team_id and ra.advisor_user_id = v_user
      and ra.status = 'linked'
  ) then
    if v_archived is not null then return 'team_inactive'; end if;
    select count(*) into v_member_count from public.founder_team_members where team_id = p_team_id;
    if exists (
      select 1 from public.relationships rel
      join public.relationship_advisors ra on ra.relationship_id = rel.id
      where rel.founder_team_id = p_team_id and ra.advisor_user_id = v_user
        and ra.status = 'linked' and ra.revoked_at is null
        and ra.founder_a_approved and ra.founder_b_approved
    ) and v_member_count <> 2 then
      return 'roster_changed';
    end if;
    return 'access_ended';
  end if;

  return 'none';
end $$;
revoke all on function public.get_team_access_state(uuid) from public, anon;
grant execute on function public.get_team_access_state(uuid) to authenticated;

-- ===========================================================================
-- 3. Teamreview-Zustand fuer den Advisor
-- ===========================================================================
-- Rueckgabe jsonb {state, team_id}:
--   requested              noch nicht von allen beantwortet
--   active_with_team       aktiv, an ein Team gebunden, Teambericht lesbar (team_id gesetzt)
--   active_without_team    aktiv, aber bei der Aktivierung entsprach kein Team der Gruppe
--   active_team_changed    aktiv, Teamzusammensetzung seit der Bindung veraendert
--   active_team_inactive   aktiv, gebundenes Team archiviert
--   active_team_unavailable aktiv und gebunden, Bericht aber nicht lesbar
--   ended                  abgelehnt oder zurueckgezogen (ohne Angabe, von wem)
--   org_membership_ended / org_suspended
--   none                   nie Advisor dieses Reviews - oder es gibt ihn nicht
create or replace function public.get_advisor_team_review_state(p_review_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_review record;
  v_archived timestamptz;
begin
  if v_user is null or p_review_id is null then return jsonb_build_object('state', 'none'); end if;
  select review.id, review.status, review.org_id, review.team_id, review.team_access_ended_at
  into v_review
  from public.advisor_team_reviews review
  where review.id = p_review_id
    and public.was_ever_advisor_for_team_review(review.id, v_user);
  if not found then return jsonb_build_object('state', 'none'); end if;

  if v_review.org_id is not null then
    if not exists (select 1 from public.advisor_org_members m
                   where m.org_id = v_review.org_id and m.user_id = v_user and m.status = 'active') then
      return jsonb_build_object('state', 'org_membership_ended');
    end if;
    if exists (select 1 from public.advisor_orgs o where o.id = v_review.org_id and o.status <> 'active') then
      return jsonb_build_object('state', 'org_suspended');
    end if;
  end if;

  if v_review.status = 'requested' then return jsonb_build_object('state', 'requested'); end if;
  if v_review.status <> 'active' then return jsonb_build_object('state', 'ended'); end if;
  if v_review.team_id is null then return jsonb_build_object('state', 'active_without_team'); end if;

  select archived_at into v_archived from public.founder_teams where id = v_review.team_id;
  if v_archived is not null then return jsonb_build_object('state', 'active_team_inactive'); end if;
  if v_review.team_access_ended_at is not null then return jsonb_build_object('state', 'active_team_changed'); end if;
  if public.can_read_workstyle_team(v_review.team_id) then
    return jsonb_build_object('state', 'active_with_team', 'team_id', v_review.team_id);
  end if;
  return jsonb_build_object('state', 'active_team_unavailable');
end $$;
revoke all on function public.get_advisor_team_review_state(uuid) from public, anon;
grant execute on function public.get_advisor_team_review_state(uuid) to authenticated;

-- ===========================================================================
-- 4. Personenzugang-Zustand fuer den Advisor
-- ===========================================================================
-- Rueckgabe: active | pending | ended | org_membership_ended | org_suspended | none
create or replace function public.get_advisor_person_access_state(p_subject_user_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or p_subject_user_id is null or p_subject_user_id = v_user then return 'none'; end if;

  if exists (
    select 1 from public.advisor_person_grants g
    where g.subject_user_id = p_subject_user_id
      and public.has_advisor_person_access(p_subject_user_id, g.scope, v_user)
  ) then
    return 'active';
  end if;

  -- Org-Zugaenge, die noch gelten, deren Weg fuer diese Person aber endete.
  if exists (
    select 1 from public.advisor_person_grants g
    join public.advisor_org_members m on m.org_id = g.org_id and m.user_id = v_user
    where g.subject_user_id = p_subject_user_id and g.status in ('active', 'requested')
      and m.status <> 'active'
  ) then
    return 'org_membership_ended';
  end if;
  if exists (
    select 1 from public.advisor_person_grants g
    join public.advisor_org_members m on m.org_id = g.org_id and m.user_id = v_user and m.status = 'active'
    join public.advisor_orgs o on o.id = g.org_id
    where g.subject_user_id = p_subject_user_id and g.status in ('active', 'requested')
      and o.status <> 'active'
  ) then
    return 'org_suspended';
  end if;

  if exists (
    select 1 from public.advisor_person_grants g
    left join public.advisor_org_members m on m.org_id = g.org_id and m.user_id = v_user and m.status = 'active'
    where g.subject_user_id = p_subject_user_id and g.status = 'requested'
      and (g.advisor_user_id = v_user or m.user_id is not null)
  ) then
    return 'pending';
  end if;

  if exists (
    select 1 from public.advisor_person_grants g
    left join public.advisor_org_members m on m.org_id = g.org_id and m.user_id = v_user
    where g.subject_user_id = p_subject_user_id
      and (g.advisor_user_id = v_user or m.user_id is not null)
  ) then
    return 'ended';
  end if;

  return 'none';
end $$;
revoke all on function public.get_advisor_person_access_state(uuid) from public, anon;
grant execute on function public.get_advisor_person_access_state(uuid) to authenticated;

-- ===========================================================================
-- 5. Org-Mitglieder mit Namen
-- ===========================================================================
-- Nur fuer aktive Mitglieder der Organisation. Inhaberinnen sehen auch beendete
-- Mitgliedschaften, Advisors nur die aktiven. Nur der Anzeigename - keine
-- Mailadresse, kein Profil.
create or replace function public.get_advisor_org_member_list(p_org_id uuid)
returns table (user_id uuid, role text, status text, display_name text, is_self boolean)
language sql stable security definer set search_path = '' as $$
  with viewer as (
    select m.role from public.advisor_org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid() and m.status = 'active'
  )
  select m.user_id, m.role, m.status, nullif(btrim(core.display_name), ''), m.user_id = auth.uid()
  from public.advisor_org_members m
  left join public.person_core core on core.user_id = m.user_id
  where m.org_id = p_org_id
    and exists (select 1 from viewer)
    and (m.status = 'active' or (select v.role from viewer v) = 'owner')
  order by (m.status = 'active') desc, (m.role = 'owner') desc, m.created_at;
$$;
revoke all on function public.get_advisor_org_member_list(uuid) from public, anon;
grant execute on function public.get_advisor_org_member_list(uuid) to authenticated;
