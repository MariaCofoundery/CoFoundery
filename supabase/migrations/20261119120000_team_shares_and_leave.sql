-- Phase 11.7B - Teamfreigabe, Team verlassen, Advisor-Fehler.
--
-- Vorher (Phase 11.5/11.6): Jede Person gab ihr Arbeitsprofil und ihre
-- Vorhaben-Antworten einzeln je Mitglied frei (alignment_shares, gerichtet).
-- Ein 4er-Team brauchte 12 gerichtete Freigaben je Bereich; der Teambericht
-- erschien erst, wenn alle Paare vollstaendig freigegeben hatten. Faehigkeiten
-- folgten der Profil-Sichtbarkeitsstufe (capability_disclosure). Ein Team
-- verlassen ging nicht.
--
-- Jetzt (Hybridmodell, Audit 11.7A Option C):
-- - team_shares: EINE Teamfreigabe je Person und Team. Sie umfasst das
--   aktuelle Arbeitsprofil (29 Core-Antworten, v0.4) und die Angaben zu
--   Faehigkeiten (Erfahrungsstufe + Verantwortungswunsch). Forschung nie.
--   Sie gilt fuer die aktuellen UND spaeter hinzukommenden Mitglieder, bis sie
--   zurueckgenommen wird oder die Person das Team verlaesst.
-- - Gerichtete Freigaben (alignment_shares) bleiben fuer Einzelkontakte,
--   Advisors und den Bestand. Bestehende Freigaben bleiben gueltig.
-- - Teambericht bereit, wenn jedes aktuelle Mitglied ein aktuelles Arbeitsprofil
--   hat und fuer dieses Team geteilt hat (Teamfreigabe; Bestand: vollstaendige
--   gerichtete Freigaben an alle anderen aktuellen Mitglieder zaehlen weiter).
-- - Vorhaben (venture-alignment-v1): keine eigene Freigabe mehr. Abgegebene
--   Antworten sind fuer die aktuellen Mitglieder desselben Teams sichtbar.
--   Advisors weiterhin nur ueber ihre eigene, ausdrueckliche Freigabe.
-- - leave_founder_team: Austritt der eigenen Person. Keine Entfernung anderer.
-- - accept_invitation_with_team_share: Beitritt und - nur auf ausdruecklichen
--   Wunsch - Teamfreigabe im selben Schritt. Beitritt allein teilt nichts.
-- - Advisor-Fehler: Ein nicht aktiver advisor_person_grants-Eintrag entwertet
--   keine Freigabe zwischen zwei Foundern mehr.
--
-- Keine Datenuebernahme, keine Loeschung historischer Inhalte, keine
-- Aenderung an FIND, Forschung oder Advisor-Grants.
begin;

-- ---------------------------------------------------------------------------
-- 1. Teamfreigaben
-- ---------------------------------------------------------------------------
create table public.team_shares(
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.founder_teams(id) on delete cascade,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 -- Ein Paket statt vieler Schalter: Arbeitsprofil (Core) + Faehigkeiten
 -- (Erfahrung und Verantwortungswunsch). Weitere Scopes nur mit eigener
 -- Produktentscheidung.
 scope text not null default 'workstyle_capability' check(scope in('workstyle_capability')),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(team_id,owner_user_id,scope),
 check(revoked_at is null or revoked_at>=granted_at)
);
create index team_shares_owner_idx on public.team_shares(owner_user_id) where revoked_at is null;
comment on table public.team_shares is
 'Phase 11.7B: eine Teamfreigabe je Person und Team (Arbeitsprofil-Core + Faehigkeiten-Tiefe). Gilt fuer aktuelle und spaeter hinzukommende Mitglieder, bis revoked_at gesetzt ist oder die Person das Team verlaesst. Nie fuer Advisors, FIND oder Forschung. Schreiben nur ueber set_team_share / leave_founder_team.';
alter table public.team_shares enable row level security;
revoke all on public.team_shares from public,anon,authenticated;
grant select on public.team_shares to authenticated;
create policy team_shares_select_owner_or_member on public.team_shares for select to authenticated
 using(owner_user_id=auth.uid() or public.is_current_user_founder_team_member(team_id));

-- Aktive Teamfreigabe einer Person fuer genau dieses Team - nur solange sie
-- aktuelles Mitglied ist.
create function public.team_share_active(p_team_id uuid,p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_shares s join public.founder_team_members m on m.team_id=s.team_id and m.user_id=s.owner_user_id
  where s.team_id=p_team_id and s.owner_user_id=p_owner and s.scope='workstyle_capability' and s.revoked_at is null)
$$;
revoke all on function public.team_share_active(uuid,uuid) from public,anon,authenticated;

-- Sieht viewer die Teamdaten von owner? Ja, wenn beide aktuell in einem Team
-- sind, fuer das owner geteilt hat. Personenbezogene Daten - fuer die Frage
-- "darf diese Person das sehen". Ob ein bestimmter Teambericht bereit ist,
-- entscheidet team_member_shares_with_team (teamgenau).
create function public.team_share_visible(p_owner uuid,p_viewer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_owner is not null and p_viewer is not null and p_owner<>p_viewer and exists(
  select 1 from public.team_shares s
  join public.founder_team_members o on o.team_id=s.team_id and o.user_id=s.owner_user_id
  join public.founder_team_members v on v.team_id=s.team_id and v.user_id=p_viewer
  where s.owner_user_id=p_owner and s.scope='workstyle_capability' and s.revoked_at is null)
$$;
revoke all on function public.team_share_visible(uuid,uuid) from public,anon,authenticated;

-- Zwei Founder, die ueber eine Einladung, FIND oder ein gemeinsames Team
-- verbunden sind (Paarbeziehung oder aktuelles gemeinsames Team).
create function public.are_founder_peers(p_a uuid,p_b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_a is not null and p_b is not null and p_a<>p_b and (
  exists(select 1 from public.relationships r where r.user_low=least(p_a,p_b) and r.user_high=greatest(p_a,p_b))
  or exists(select 1 from public.founder_team_members x join public.founder_team_members y on y.team_id=x.team_id where x.user_id=p_a and y.user_id=p_b))
$$;
revoke all on function public.are_founder_peers(uuid,uuid) from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- 2. Advisor-Fehler: nicht aktive Grants entwerten keine Founder-Freigabe
-- ---------------------------------------------------------------------------
-- 20261060120000 wollte: Wer eine Advisor-Zusammenarbeit beendet, muss nicht
-- auch noch die Antworten einzeln entziehen. Die Bedingung traf aber JEDE
-- Freigabe zwischen zwei Personen mit irgendeinem nicht aktiven Grant - auch
-- zwischen zwei Foundern (angefragt, abgelehnt, widerrufen). Jetzt gilt die
-- Advisor-Regel nur dort, wo die beiden keine Founder-Peers sind. Fuer
-- Advisor-Freigaben bleibt alles wie bisher.
create or replace function public.alignment_share_is_effective(
  p_assessment_id uuid,
  p_recipient_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alignment_shares share
    join public.assessments assessment on assessment.id = share.assessment_id
    where share.assessment_id = p_assessment_id
      and share.recipient_user_id = p_recipient_user_id
      and share.revoked_at is null
      and (
        -- Phase 11.7B: Founder untereinander - der Advisor-Status spielt keine Rolle.
        public.are_founder_peers(assessment.user_id, p_recipient_user_id)
        or not exists (
          select 1 from public.advisor_person_grants grant_row
          where grant_row.subject_user_id = assessment.user_id
            and grant_row.advisor_user_id = p_recipient_user_id
        )
        or exists (
          select 1 from public.advisor_person_grants grant_row
          where grant_row.subject_user_id = assessment.user_id
            and grant_row.advisor_user_id = p_recipient_user_id
            and grant_row.status = 'active'
        )
      )
  );
$$;
comment on function public.alignment_share_is_effective(uuid, uuid) is
  'Gilt die gerichtete Freigabe gerade? Zurueckgezogene zaehlen nicht. Besteht zwischen den beiden eine Advisor-Beziehung und sind sie keine Founder-Peers, muss sie aktiv sein. Seit Phase 11.7B entwertet ein nicht aktiver Grant keine Freigabe zwischen zwei Foundern.';

-- ---------------------------------------------------------------------------
-- 3. Zentrale Sichtbarkeit des Arbeitsprofils
-- ---------------------------------------------------------------------------
-- Aktuelles Produkt-Arbeitsprofil (8.5a-v3, Manifest 3.0.0) oder null.
create function public.workstyle_current_core_assessment(p_owner uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments;
begin
 if p_owner is null then return null; end if;
 select * into a from public.assessments where user_id=p_owner and instrument_id like 'founder-workstyle-pretest-%'
  and submitted_at is not null order by created_at desc,id limit 1;
 if a.id is null or a.instrument_id<>'founder-workstyle-pretest-8-5a-v3' then return null; end if;
 if not exists(select 1 from public.workstyle_pretest_sessions where assessment_id=a.id and manifest_version='3.0.0') then return null; end if;
 return a.id;
end $$;
revoke all on function public.workstyle_current_core_assessment(uuid) from public,anon,authenticated;

-- Vollstaendige gerichtete Freigabe (wirksam, keine ausgeblendeten Bloecke).
create function public.alignment_share_is_complete(p_assessment_id uuid,p_viewer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.alignment_share_is_effective(p_assessment_id,p_viewer) and not exists(
  select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id
  where s.assessment_id=p_assessment_id and s.recipient_user_id=p_viewer and s.revoked_at is null)
$$;
revoke all on function public.alignment_share_is_complete(uuid,uuid) from public,anon,authenticated;

-- Die zentrale Regel: eigene Person, ODER aktive Teamfreigabe bei aktueller
-- gemeinsamer Mitgliedschaft, ODER vollstaendige gerichtete Freigabe.
create or replace function public.workstyle_core_visible_to(p_owner uuid, p_viewer uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare a uuid;
begin
 if p_owner is null or p_viewer is null then return false; end if;
 a:=public.workstyle_current_core_assessment(p_owner);
 if a is null then return false; end if;
 if p_owner=p_viewer then return true; end if;
 return public.team_share_visible(p_owner,p_viewer) or public.alignment_share_is_complete(a,p_viewer);
end $$;
revoke all on function public.workstyle_core_visible_to(uuid,uuid) from public,anon,authenticated;

-- Hat dieses Mitglied fuer DIESES Team geteilt? Teamfreigabe fuer dieses Team,
-- oder (Bestand) vollstaendige gerichtete Freigaben an alle anderen aktuellen
-- Mitglieder. Plus ein aktuelles Arbeitsprofil.
create function public.team_member_shares_with_team(p_team_id uuid,p_member uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare a uuid;
begin
 if not exists(select 1 from public.founder_team_members where team_id=p_team_id and user_id=p_member) then return false; end if;
 a:=public.workstyle_current_core_assessment(p_member);
 if a is null then return false; end if;
 if public.team_share_active(p_team_id,p_member) then return true; end if;
 return not exists(select 1 from public.founder_team_members o where o.team_id=p_team_id and o.user_id<>p_member
  and not public.alignment_share_is_complete(a,o.user_id));
end $$;
revoke all on function public.team_member_shares_with_team(uuid,uuid) from public,anon,authenticated;

create or replace function public.get_workstyle_product_profile(p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments; rows jsonb; manifest text; via_team boolean:=false;
begin
 if auth.uid() is null then return null; end if;
 select * into a from public.assessments where user_id=p_person_id and instrument_id like 'founder-workstyle-pretest-%'
 and submitted_at is not null order by created_at desc,id limit 1;
 if a.id is null or a.instrument_id<>'founder-workstyle-pretest-8-5a-v3' then return null; end if;
 if p_person_id<>auth.uid() then
  -- Phase 11.7B: Teamfreigabe (immer vollstaendig) oder gerichtete Freigabe.
  via_team:=public.team_share_visible(p_person_id,auth.uid());
  if not via_team and not public.alignment_share_is_effective(a.id,auth.uid()) then return null; end if;
 end if;
 select manifest_version into manifest from public.workstyle_pretest_sessions where assessment_id=a.id;
 if manifest is distinct from '3.0.0' then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'item_version',r.item_version,'value',r.value,'missing_reason',r.missing_code) order by i.position),'[]') into rows
 from public.alignment_answers r join public.workstyle_item_versions i on i.instrument_id=a.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
 where r.assessment_id=a.id and i.item_version='8.4-v0.4' and i.definition->>'scientific_status'='core'
 and i.definition->>'usage'='core' and i.definition->>'research_only'='false'
 and (p_person_id=auth.uid() or via_team or not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id));
 if jsonb_array_length(rows)=0 then return null; end if;
 return jsonb_build_object('person_id',p_person_id,'assessment_id',a.id,'instrument_id',a.instrument_id,'manifest_version',manifest,'item_version','8.4-v0.4','completed_at',a.submitted_at,'answers',rows);
end $$;
revoke all on function public.get_workstyle_product_profile(uuid) from public,anon;
grant execute on function public.get_workstyle_product_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Faehigkeiten im Team
-- ---------------------------------------------------------------------------
-- Mit aktiver Teamfreigabe sieht das Team Bereiche, Erfahrungsstufe und
-- Verantwortungswunsch - unabhaengig von capability_disclosure, das weiter
-- fuer FIND und CONNECT gilt. Ohne Teamfreigabe bleibt die bisherige Regel
-- (20261022120000) unveraendert.
create or replace function public.get_disclosed_capability(p_user_id uuid, p_context text)
returns table (
  area_id text,
  family_id text,
  application_level smallint,
  ownership_wish text
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select auth.uid() as user_id
  ),
  team_package as (
    select p_context = 'team' and public.team_share_visible(p_user_id, (select user_id from viewer)) as active
  ),
  shared_team as (
    select exists (
      select 1
      from public.founder_team_members mine
      join public.founder_team_members theirs on theirs.team_id = mine.team_id
      cross join viewer
      where mine.user_id = viewer.user_id
        and theirs.user_id = p_user_id
    ) as together
  ),
  eligible as (
    select
      core.capability_disclosure,
      exists (
        select 1 from public.discovery_intro_requests intro, viewer
        where intro.status = 'accepted'
          and ((intro.requester_user_id = viewer.user_id and intro.recipient_user_id = p_user_id)
            or (intro.recipient_user_id = viewer.user_id and intro.requester_user_id = p_user_id))
      ) or exists (
        select 1 from public.network_contact_requests request, viewer
        where request.status = 'accepted'
          and ((request.sender_user_id = viewer.user_id and request.recipient_user_id = p_user_id)
            or (request.recipient_user_id = viewer.user_id and request.sender_user_id = p_user_id))
      ) or (select together from shared_team) as connected
    from public.person_core core, viewer
    where core.user_id = p_user_id
      and viewer.user_id is not null
      and core.capability_disclosure in ('areas', 'areas_depth_on_contact')
      and (
        (p_context = 'discovery' and exists (
          select 1 from public.founder_discovery_profiles discovery
          where discovery.user_id = p_user_id and discovery.status = 'active'))
        or
        (p_context = 'connect' and exists (
          select 1 from public.network_profiles connect
          join public.network_memberships membership on membership.user_id = connect.user_id
          where connect.user_id = p_user_id
            and connect.status = 'active'
            and membership.status = 'active'))
        or
        (p_context = 'team' and (select together from shared_team))
      )
  ),
  visible_rows as (
    -- Teamfreigabe: volle Tiefe im Team.
    select entry.area_id, area.family_id, area.sort_order, entry.application_level, entry.ownership_wish
    from public.person_capability_entries entry
    join public.capability_areas area on area.area_id = entry.area_id
    where entry.user_id = p_user_id and (select active from team_package)
    union all
    -- Sonst: unveraendert nach Freigabestufe.
    select entry.area_id,
      area.family_id,
      area.sort_order,
      case when eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected
        then entry.application_level end,
      case when eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected
        then entry.ownership_wish end
    from public.person_capability_entries entry
    join public.capability_areas area on area.area_id = entry.area_id
    cross join eligible
    where entry.user_id = p_user_id and not (select active from team_package)
  )
  select visible_rows.area_id, visible_rows.family_id, visible_rows.application_level, visible_rows.ownership_wish
  from visible_rows
  order by visible_rows.family_id, visible_rows.sort_order;
$$;
revoke all on function public.get_disclosed_capability(uuid, text) from public;
revoke all on function public.get_disclosed_capability(uuid, text) from anon;
grant execute on function public.get_disclosed_capability(uuid, text) to authenticated;
comment on function public.get_disclosed_capability(uuid, text) is
  'Die freigegebene Sicht auf die Faehigkeiten einer Person, je Kontext (discovery, connect, team). Seit Phase 11.7B: Im Kontext team mit aktiver Teamfreigabe Bereiche, Stufe und Verantwortungswunsch unabhaengig von capability_disclosure. Sonst Bereiche ab "areas"; Stufe und Wunsch nur bei "areas_depth_on_contact" UND angenommener Verbindung (geteilte Teammitgliedschaft zaehlt).';

-- ---------------------------------------------------------------------------
-- 5. Vorhaben: Abgeben = mit dem Team teilen
-- ---------------------------------------------------------------------------
create function public.venture_visible_in_team(p_assessment_id uuid,p_viewer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_viewer is not null and exists(
  select 1 from public.assessments a
  join public.founder_team_members owner_member on owner_member.team_id=a.venture_id and owner_member.user_id=a.user_id
  join public.founder_team_members viewer_member on viewer_member.team_id=a.venture_id and viewer_member.user_id=p_viewer
  where a.id=p_assessment_id and a.instrument_id='venture-alignment-v1' and a.submitted_at is not null and a.user_id<>p_viewer)
$$;
revoke all on function public.venture_visible_in_team(uuid,uuid) from public,anon;
grant execute on function public.venture_visible_in_team(uuid,uuid) to authenticated;
comment on function public.venture_visible_in_team(uuid,uuid) is
 'Phase 11.7B: Abgegebene Vorhaben-Antworten (venture-alignment-v1) sind fuer aktuelle Mitglieder desselben Teams sichtbar, solange auch die antwortende Person Mitglied ist. Advisors nie ueber diese Regel.';

create policy assessments_select_venture_team on public.assessments for select to authenticated
 using(instrument_id='venture-alignment-v1' and public.venture_visible_in_team(id,auth.uid()));
create policy alignment_answers_select_venture_team on public.alignment_answers for select to authenticated
 using(public.venture_visible_in_team(assessment_id,auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Teamleser
-- ---------------------------------------------------------------------------
-- Paar-Advisor-Weg nur, wenn beide Personen der Paarbeziehung noch Mitglied
-- sind - sonst koennte nach einem Austritt der Advisor eines frueheren Paares
-- ein neues 2er-Team lesen.
create or replace function public.can_read_workstyle_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 public.is_current_user_founder_team_member(p_team_id)
 or exists(select 1 from public.advisor_team_reviews r where public.has_advisor_team_review_access(r.id,auth.uid())
 and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.advisor_team_review_members rm where rm.review_id=r.id and rm.subject_user_id=m.user_id and rm.decision='approved'))
 and (select count(*) from public.advisor_team_review_members rm where rm.review_id=r.id)=(select count(*) from public.founder_team_members m where m.team_id=p_team_id))
 or ((select count(*) from public.founder_team_members where team_id=p_team_id)=2 and exists(
 select 1 from public.relationships r join public.relationship_advisors ra on ra.relationship_id=r.id
 where r.founder_team_id=p_team_id and ra.advisor_user_id=auth.uid() and ra.status='linked'
 and ra.revoked_at is null and ra.founder_a_approved and ra.founder_b_approved
 and exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and m.user_id=r.user_a_id)
 and exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and m.user_id=r.user_b_id))))
$$;
revoke all on function public.can_read_workstyle_team(uuid) from public,anon;
grant execute on function public.can_read_workstyle_team(uuid) to authenticated;

create or replace function public.get_workstyle_product_team(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare team public.founder_teams; member record; profile jsonb; people jsonb:='[]'; caps jsonb; alignment jsonb; setup jsonb:='[]'; a public.assessments; rel record; allowed_setup boolean:=false; viewer_member boolean;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 select * into team from public.founder_teams where id=p_team_id;
 if not found then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 viewer_member:=public.is_current_user_founder_team_member(p_team_id);
 -- Phase 11.7B: Der gemeinsame Bericht ist bereit, wenn JEDES aktuelle Mitglied
 -- ein aktuelles Arbeitsprofil hat und fuer dieses Team geteilt hat - sonst fuer
 -- niemanden, auch fuer Advisors nicht. Advisors brauchen zusaetzlich weiterhin
 -- ihre eigenen Freigaben (unten ueber get_workstyle_product_profile).
 if exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not public.team_member_shares_with_team(p_team_id,m.user_id)) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select m.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members m left join public.profiles p on p.user_id=m.user_id where m.team_id=p_team_id order by m.created_at,m.user_id loop
  profile:=public.get_workstyle_product_profile(member.user_id);
  if profile is null or jsonb_array_length(profile->'answers')<>29 then return jsonb_build_object('status','not_ready'); end if;
  caps:='[]';
  if member.user_id=auth.uid() then
   select coalesce(jsonb_agg(jsonb_build_object('area_id',area_id,'application_level',application_level,'ownership_wish',ownership_wish) order by area_id),'[]') into caps from public.person_capability_entries where user_id=member.user_id;
  elsif viewer_member then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_disclosed_capability(member.user_id,'team') c;
  elsif public.has_advisor_person_access(member.user_id,'capability') then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_advisor_person_capability(member.user_id) c;
  end if;
  alignment:=null;
  select * into a from public.assessments where user_id=member.user_id and instrument_id='venture-alignment-v1' and venture_id=p_team_id and submitted_at is not null order by created_at desc,id limit 1;
  if a.id is not null and (member.user_id=auth.uid() or public.venture_visible_in_team(a.id,auth.uid())) then
   -- Eigene Antworten oder Teamkontext: vollstaendig, keine Ausblendung.
   select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'value',r.value,'missing_reason',r.missing_code) order by r.block_id),'[]') into alignment from public.alignment_answers r where r.assessment_id=a.id;
  elsif a.id is not null and public.alignment_share_is_effective(a.id,auth.uid()) then
   -- Advisor: nur ueber die eigene gerichtete Freigabe, mit Ausblendungen.
   select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'value',r.value,'missing_reason',r.missing_code) order by r.block_id),'[]') into alignment from public.alignment_answers r where r.assessment_id=a.id
   and not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id);
  end if;
  people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'name',member.name,'workstyle',profile,'capabilities',caps,'alignment',alignment));
 end loop;
 if viewer_member then
  allowed_setup:=true;
  select coalesce(jsonb_agg(jsonb_build_object('item_key',i.item_key,'resolution_status',r.resolution_status,'note',r.note,'confirmed_at',r.confirmed_at) order by i.item_key),'[]') into setup
  from public.founder_team_setup_items i join public.founder_team_setup_revisions r on r.id=i.current_confirmed_revision_id and r.setup_item_id=i.id
  where i.team_id=p_team_id and r.confirmed_at is not null and r.superseded_at is null
  and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.founder_team_setup_confirmations c where c.revision_id=r.id and c.user_id=m.user_id));
 else
  for rel in select id from public.relationships where founder_team_id=p_team_id order by id loop
   select coalesce(jsonb_agg(to_jsonb(s) order by s.item_key),'[]') into setup from public.get_advisor_confirmed_founder_setup(rel.id) s
   where exists(select 1 from public.founder_team_setup_items i where i.team_id=p_team_id and i.item_key=s.item_key
    and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.founder_team_setup_confirmations c where c.revision_id=i.current_confirmed_revision_id and c.user_id=m.user_id)));
   if jsonb_array_length(setup)>0 then allowed_setup:=true; exit; end if;
  end loop;
 end if;
 return jsonb_build_object('status','ready','alignment_instrument_id','venture-alignment-v1','alignment_manifest_version','1.0.0','team_id',team.id,'team_name',team.name,'team_context',team.team_context,'people',people,'setup',setup,'setup_available',allowed_setup,
 'taxonomy',jsonb_build_object('areas',(select jsonb_agg(jsonb_build_object('area_id',area_id,'family_id',family_id,'sourcing',sourcing,'sort_order',sort_order) order by sort_order,area_id) from public.capability_areas),'families',(select jsonb_agg(to_jsonb(f) order by f.sort_order,f.family_id) from public.capability_families f)));
end $$;
revoke all on function public.get_workstyle_product_team(uuid) from public,anon;
grant execute on function public.get_workstyle_product_team(uuid) to authenticated;

-- Bereitschaft: je Person nur noch "aktuelles Arbeitsprofil" und "fuer dieses
-- Team geteilt" - keine Paarmatrix. shared_with_all_members bleibt als
-- gleichbedeutender Alias fuer bestehende Leser.
create or replace function public.get_workstyle_team_share_readiness(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare members jsonb:='[]'; m record; has_profile boolean; shared boolean; team_share boolean; all_ready boolean:=true; member_count integer;
begin
 if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then return null; end if;
 select count(*) into member_count from public.founder_team_members where team_id=p_team_id;
 if member_count not between 2 and 4 then return jsonb_build_object('status','unavailable','members','[]'::jsonb,
  'viewer_team_share',public.team_share_active(p_team_id,auth.uid())); end if;
 for m in select tm.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members tm
  left join public.profiles p on p.user_id=tm.user_id where tm.team_id=p_team_id order by tm.created_at,tm.user_id loop
  has_profile:=public.workstyle_current_core_assessment(m.user_id) is not null;
  team_share:=public.team_share_active(p_team_id,m.user_id);
  shared:=public.team_member_shares_with_team(p_team_id,m.user_id);
  all_ready:=all_ready and shared;
  members:=members||jsonb_build_array(jsonb_build_object('person_id',m.user_id,'name',m.name,'is_viewer',m.user_id=auth.uid(),
   'has_current_workstyle',has_profile,'team_share_active',team_share,'shared_with_team',shared,'shared_with_all_members',shared));
 end loop;
 return jsonb_build_object('status',case when all_ready then 'ready' else 'missing' end,'members',members,
  'viewer_team_share',public.team_share_active(p_team_id,auth.uid()));
end $$;
revoke all on function public.get_workstyle_team_share_readiness(uuid) from public,anon;
grant execute on function public.get_workstyle_team_share_readiness(uuid) to authenticated;

-- Historischer Team-Adapter (v1-v3): dieselbe Teamregel. Die Teamfreigabe gilt
-- nur fuer das aktuelle Arbeitsprofil (8.5a-v3); aeltere Fassungen brauchen
-- weiterhin vollstaendige gerichtete Freigaben. Vorhaben im Teamkontext ohne
-- eigene Freigabe.
create or replace function public.get_workstyle_team_inputs(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member record; core_id uuid; venture_id uuid; core_instrument text; core_version text; manifest text;
 first_instrument text; first_manifest text; core_data jsonb; venture_data jsonb; people jsonb:='[]'; expected_count integer;
 viewer_member boolean; core_via_team boolean; venture_via_team boolean;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.can_read_workstyle_team(p_team_id) then return jsonb_build_object('status','not_ready'); end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 viewer_member:=public.is_current_user_founder_team_member(p_team_id);
 if exists(select 1 from public.founder_team_members x join public.founder_team_members y on y.team_id=x.team_id and y.user_id<>x.user_id
  cross join lateral (select l.id,l.instrument_id from public.assessments l where l.user_id=x.user_id
   and l.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3')
   and l.submitted_at is not null order by l.created_at desc,l.id limit 1) latest
  where x.team_id=p_team_id and not (public.alignment_share_is_complete(latest.id,y.user_id)
   or (latest.instrument_id='founder-workstyle-pretest-8-5a-v3' and public.team_share_active(p_team_id,x.user_id)))) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select user_id from public.founder_team_members where team_id=p_team_id order by user_id loop
   select a.id,a.instrument_id,s.assessment_version,coalesce(s.manifest_version,case when s.assessment_version='8.5a-v1' then '1.0.0' end)
   into core_id,core_instrument,core_version,manifest
   from public.assessments a join public.workstyle_pretest_sessions s on s.assessment_id=a.id
   where a.user_id=member.user_id and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3')
   and a.submitted_at is not null order by a.created_at desc,a.id limit 1;
   select id into venture_id from public.assessments where user_id=member.user_id
     and instrument_id='venture-alignment-v1' and public.assessments.venture_id=p_team_id
     and submitted_at is not null order by created_at desc,id limit 1;
   if core_id is null or venture_id is null or core_instrument is distinct from public.workstyle_instrument_for(core_version)
     or manifest is distinct from (case core_version when '8.5a-v1' then '1.0.0' when '8.5a-v2' then '2.0.0' when '8.5a-v3' then '3.0.0' end) then
     return jsonb_build_object('status','not_ready'); end if;
   if first_instrument is not null and (core_instrument<>first_instrument or manifest<>first_manifest) then
     return jsonb_build_object('status','not_ready'); end if;
   first_instrument:=core_instrument; first_manifest:=manifest;
   expected_count:=case core_version when '8.5a-v3' then 29 when '8.5a-v2' then 30 else 20 end;
   core_via_team:=viewer_member and core_version='8.5a-v3' and public.team_share_active(p_team_id,member.user_id);
   venture_via_team:=public.venture_visible_in_team(venture_id,auth.uid());
   if member.user_id<>auth.uid() and (not (core_via_team or public.alignment_share_is_effective(core_id,auth.uid()))
     or not (venture_via_team or public.alignment_share_is_effective(venture_id,auth.uid()))) then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'item_version',a.item_version,'value',a.value,'missing_reason',a.missing_code) || case when core_version='8.5a-v3' then jsonb_build_object('response_format',i.definition->>'response_format','rendered_order',a.workstyle_rendered_order) else '{}'::jsonb end order by i.position),'[]') into core_data
   from public.alignment_answers a join public.workstyle_item_versions i on i.item_key=a.block_id and i.item_version=a.item_version
   and i.instrument_id=core_instrument and i.definition->>'usage'='core' and not (i.definition->>'research_only')::boolean
   and (core_version<>'8.5a-v3' or i.definition->>'scientific_status'='core')
   where a.assessment_id=core_id and (member.user_id=auth.uid() or core_via_team or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=core_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(core_data)<>expected_count then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'value',a.value,'missing_reason',a.missing_code)),'[]') into venture_data
   from public.alignment_answers a where a.assessment_id=venture_id and (member.user_id=auth.uid() or venture_via_team or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=venture_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(venture_data)=0 then return jsonb_build_object('status','not_ready'); end if;
   people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'workstyle_assessment_id',core_id,
     'instrument_id',core_instrument,'assessment_version',core_version,'manifest_version',manifest,'core',core_data,
     'venture_assessment_id',venture_id,'venture_instrument','venture-alignment-v1',
     'venture_alignment',venture_data,'access_status','explicit_share_or_owner'));
 end loop;
 return jsonb_build_object('status','ready','team_id',p_team_id,'team_context',
   (select team_context from public.founder_teams where id=p_team_id),'people',people);
end $$;

-- ---------------------------------------------------------------------------
-- 7. Teamfreigabe setzen, Team verlassen, Beitritt mit Freigabe
-- ---------------------------------------------------------------------------
create function public.set_team_share(p_team_id uuid,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.team_shares;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_team_id is null or p_enabled is null or not public.is_current_user_founder_team_member(p_team_id) then
  raise exception 'not_team_member' using errcode='42501'; end if;
 if p_enabled then
  insert into public.team_shares as existing(team_id,owner_user_id) values(p_team_id,auth.uid())
  on conflict(team_id,owner_user_id,scope) do update set
   granted_at=case when existing.revoked_at is null then existing.granted_at else now() end,
   revoked_at=null,updated_at=now()
  returning * into s;
 else
  update public.team_shares set revoked_at=now(),updated_at=now()
  where team_id=p_team_id and owner_user_id=auth.uid() and revoked_at is null returning * into s;
 end if;
 return jsonb_build_object('team_id',p_team_id,'enabled',coalesce(s.revoked_at is null and s.id is not null,false),'granted_at',s.granted_at);
end $$;
revoke all on function public.set_team_share(uuid,boolean) from public,anon;
grant execute on function public.set_team_share(uuid,boolean) to authenticated;

-- Austritt der eigenen Person. Mitgliedschaft endet, die Teamfreigabe fuer
-- dieses Team wird zurueckgenommen. Nichts Historisches wird geloescht oder
-- umgeschrieben: Setup-Revisionen und -Bestaetigungen bleiben, gelten aber nur
-- noch, wenn alle AKTUELLEN Mitglieder bestaetigt haben (bestehende Regel).
-- Paarbeziehungen bleiben (founder_team_id ist unveraenderlich); die Leser
-- pruefen die aktuelle Mitgliedschaft. Das Team bleibt bestehen - auch mit
-- einer oder keiner Person (Solo-Vorhaben ist ein bekannter Zustand).
create function public.leave_founder_team(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare remaining integer; g record;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 perform 1 from public.founder_teams where id=p_team_id for update;
 if not found or not exists(select 1 from public.founder_team_members where team_id=p_team_id and user_id=auth.uid()) then
  raise exception 'not_team_member' using errcode='42501'; end if;
 update public.team_shares set revoked_at=now(),updated_at=now()
  where team_id=p_team_id and owner_user_id=auth.uid() and revoked_at is null;
 delete from public.founder_team_members where team_id=p_team_id and user_id=auth.uid();
 -- Offene Einladungen dieser Person in dieses Team enden mit dem Austritt.
 update public.invitations set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
  where inviter_user_id=auth.uid() and target_founder_team_id=p_team_id and status::text in('sent','opened');
 -- Setup-Advisor-Freigaben neu bewerten (einstimmig unter den verbleibenden).
 for g in select id from public.founder_team_advisor_setup_grants where team_id=p_team_id and revoked_at is null loop
  perform public.refresh_founder_team_advisor_setup_grant(g.id);
 end loop;
 select count(*) into remaining from public.founder_team_members where team_id=p_team_id;
 return jsonb_build_object('team_id',p_team_id,'left',true,'remaining_members',remaining);
end $$;
revoke all on function public.leave_founder_team(uuid) from public,anon;
grant execute on function public.leave_founder_team(uuid) to authenticated;

-- Beitritt mit ausdruecklicher Wahl. p_share=false ist "Erst beitreten, spaeter
-- entscheiden" und entspricht accept_invitation. p_share=true setzt im selben
-- Schritt die Teamfreigabe fuer das Team der Einladung.
create function public.accept_invitation_with_team_share(p_token text,p_share boolean)
returns table(invitation_id uuid,relationship_id uuid,team_id uuid)
language plpgsql security definer set search_path='' as $$
declare r record; t uuid;
begin
 if p_share is null then raise exception 'share_choice_required' using errcode='22023'; end if;
 select * into r from public.accept_invitation(p_token) limit 1;
 select founder_team_id into t from public.relationships where id=r.relationship_id;
 if p_share and t is not null and public.is_current_user_founder_team_member(t) then
  perform public.set_team_share(t,true);
 end if;
 return query select r.invitation_id,r.relationship_id,t;
end $$;
revoke all on function public.accept_invitation_with_team_share(text,boolean) from public,anon;
grant execute on function public.accept_invitation_with_team_share(text,boolean) to authenticated;

-- Wiederbeitritt: Ist die Paarbeziehung schon an ein Team gebunden (etwa nach
-- einem Austritt), fuegt eine neue Einladungsannahme bzw. ein neuer FIND-Start
-- die beiden wieder als Mitglieder hinzu, statt still nichts zu tun. Sonst
-- unveraendert (20261114120000).
create or replace function public.ensure_founder_team_for_relationship(
  p_relationship_id uuid,
  p_team_context text,
  p_founder_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_relationship public.relationships%rowtype;
  v_team public.founder_teams%rowtype;
  v_team_id uuid;
  v_resulting_member_count integer;
begin
  if p_team_context not in ('pre_founder', 'existing_team') then
    raise exception 'invalid_founder_team_context' using errcode = '22023';
  end if;

  select *
    into v_relationship
  from public.relationships relationship
  where relationship.id = p_relationship_id
  for update;

  if not found then
    raise exception 'relationship_not_found' using errcode = 'P0002';
  end if;

  if v_relationship.founder_team_id is not null then
    v_team_id := v_relationship.founder_team_id;
    perform 1 from public.founder_teams team where team.id = v_team_id for update;
  elsif p_founder_team_id is null then
    insert into public.founder_teams (team_context)
    values (p_team_context)
    returning id into v_team_id;
  else
    select *
      into v_team
    from public.founder_teams team
    where team.id = p_founder_team_id
    for update;

    if not found then
      raise exception 'founder_team_not_found' using errcode = 'P0002';
    end if;

    if v_team.team_context <> p_team_context then
      raise exception 'founder_team_context_mismatch' using errcode = '22023';
    end if;

    v_team_id := v_team.id;
  end if;

  select count(distinct member_user_id)
    into v_resulting_member_count
  from (
    select member.user_id as member_user_id
    from public.founder_team_members member
    where member.team_id = v_team_id
    union all
    select v_relationship.user_a_id
    union all
    select v_relationship.user_b_id
  ) resulting_members;

  if v_resulting_member_count > 4 then
    raise exception 'founder_team_member_limit_reached' using errcode = '23514';
  end if;

  insert into public.founder_team_members (team_id, user_id)
  values
    (v_team_id, v_relationship.user_a_id),
    (v_team_id, v_relationship.user_b_id)
  on conflict (team_id, user_id) do nothing;

  update public.relationships
  set founder_team_id = v_team_id
  where id = v_relationship.id
    and founder_team_id is null;

  return v_team_id;
end;
$$;

commit;
