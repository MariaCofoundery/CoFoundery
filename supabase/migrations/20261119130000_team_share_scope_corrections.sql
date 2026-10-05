-- Phase 11.7B.1 - Teamgenaue Faehigkeiten und autoritativer Widerruf.
--
-- Korrigiert zwei Stellen aus 20261119120000_team_shares_and_leave.sql:
--
-- 1. Faehigkeiten-Tiefe war an eine Teamfreigabe in IRGENDEINEM gemeinsamen
--    Team gebunden (get_disclosed_capability(..., 'team') ueber
--    team_share_visible). Produktregel: Eine Teamfreigabe gilt ausschliesslich
--    fuer das Team, fuer das sie erteilt wurde. Jetzt:
--    - get_team_capability(team, person): expliziter Teamkontext. Tiefe nur
--      bei aktiver Teamfreigabe dieser Person fuer genau dieses Team (oder fuer
--      sich selbst); sonst die unveraenderte Freigabeleiter.
--    - get_disclosed_capability ist wieder exakt die Fassung aus
--      20261022120000 (FIND/CONNECT/Team nach capability_disclosure) - ohne
--      Teamfreigabe-Abkuerzung.
--    - get_workstyle_product_team liest Faehigkeiten ueber get_team_capability.
--
-- 2. Bestand (vollstaendige gerichtete Freigaben) durfte einen Widerruf der
--    Teamfreigabe uebersteuern. Jetzt ist eine einmal getroffene
--    Teamentscheidung autoritativ:
--    - kein team_shares-Datensatz fuer Person + Team -> Bestand zaehlt;
--    - aktiver Datensatz -> geteilt;
--    - widerrufener Datensatz -> ausdruecklich NICHT geteilt, kein Bestand.
--    Gilt auch fuer den historischen Adapter get_workstyle_team_inputs.
--    Gerichtete Freigaben werden nicht geloescht oder veraendert; sie gelten
--    weiter fuer Einzelansichten, Advisors und den historischen Bestand.
begin;

create or replace function public.team_member_shares_with_team(p_team_id uuid,p_member uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare a uuid; decision public.team_shares;
begin
 if not exists(select 1 from public.founder_team_members where team_id=p_team_id and user_id=p_member) then return false; end if;
 a:=public.workstyle_current_core_assessment(p_member);
 if a is null then return false; end if;
 select * into decision from public.team_shares where team_id=p_team_id and owner_user_id=p_member and scope='workstyle_capability';
 -- Eine getroffene Teamentscheidung (aktiv ODER widerrufen) ist autoritativ.
 if decision.id is not null then return decision.revoked_at is null; end if;
 -- Nur wer das Teamfreigabe-Modell fuer dieses Team nie benutzt hat: Bestand.
 return not exists(select 1 from public.founder_team_members o where o.team_id=p_team_id and o.user_id<>p_member
  and not public.alignment_share_is_complete(a,o.user_id));
end $$;
revoke all on function public.team_member_shares_with_team(uuid,uuid) from public,anon,authenticated;

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
  -- Ein gemeinsames Founder-Team. Einmal berechnet, weil es unten zweimal
  -- gebraucht wird: als Kontext UND als Beziehung.
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
      -- Bedingung 3: angenommene Verbindung, im jeweiligen Kontext
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
      -- Bedingung 1: das Kontextprofil muss aktiv sein
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
        -- Im Team ist die Mitgliedschaft selbst der Kontext: Es gibt kein
        -- "Teamprofil", das aktiv sein koennte.
        (p_context = 'team' and (select together from shared_team))
      )
  )
  select entry.area_id,
    area.family_id,
    case when eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected
      then entry.application_level end,
    case when eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected
      then entry.ownership_wish end
  from public.person_capability_entries entry
  join public.capability_areas area on area.area_id = entry.area_id
  cross join eligible
  where entry.user_id = p_user_id
  order by area.family_id, area.sort_order;
$$;

revoke all on function public.get_disclosed_capability(uuid, text) from public;
revoke all on function public.get_disclosed_capability(uuid, text) from anon;
grant execute on function public.get_disclosed_capability(uuid, text) to authenticated;

comment on function public.get_disclosed_capability(uuid, text) is
  'Die freigegebene Sicht auf die Faehigkeiten einer Person, je Kontext (discovery, connect, team). Bereiche ab Freigabestufe "areas"; Stufe und Verantwortungswunsch nur bei "areas_depth_on_contact" UND einer angenommenen Verbindung - seit 21.09.2026 gilt eine geteilte Founder-Team-Mitgliedschaft als solche, weil in einem Team niemand versehentlich landet. Die Stufe der Freigabe bleibt davon unberuehrt.';

-- Faehigkeiten im expliziten Teamkontext.
create function public.get_team_capability(p_team_id uuid,p_user_id uuid)
returns table(area_id text,family_id text,application_level smallint,ownership_wish text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or p_team_id is null or p_user_id is null
  or not public.is_current_user_founder_team_member(p_team_id)
  or not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and m.user_id=p_user_id) then
  return;
 end if;
 if p_user_id=auth.uid() or public.team_share_active(p_team_id,p_user_id) then
  return query select e.area_id,a.family_id,e.application_level,e.ownership_wish
   from public.person_capability_entries e join public.capability_areas a on a.area_id=e.area_id
   where e.user_id=p_user_id order by a.family_id,a.sort_order;
 else
  return query select d.area_id,d.family_id,d.application_level,d.ownership_wish from public.get_disclosed_capability(p_user_id,'team') d;
 end if;
end $$;
revoke all on function public.get_team_capability(uuid,uuid) from public,anon;
grant execute on function public.get_team_capability(uuid,uuid) to authenticated;
comment on function public.get_team_capability(uuid,uuid) is
 'Phase 11.7B.1: Faehigkeiten einer Person im Kontext GENAU eines Teams. Nur fuer aktuelle Mitglieder dieses Teams ueber aktuelle Mitglieder. Bereich, Stufe und Wunsch bei aktiver Teamfreigabe fuer dieses Team; sonst die Freigabeleiter (get_disclosed_capability team).';

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
   -- Phase 11.7B.1: teamgenau - nur die Teamfreigabe fuer GENAU dieses Team zaehlt.
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_team_capability(p_team_id,member.user_id) c;
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
  where x.team_id=p_team_id and not (case
   -- Phase 11.7B.1: eine Teamentscheidung (aktiv oder widerrufen) ist autoritativ.
   when exists(select 1 from public.team_shares d where d.team_id=p_team_id and d.owner_user_id=x.user_id and d.scope='workstyle_capability')
    then latest.instrument_id='founder-workstyle-pretest-8-5a-v3' and public.team_share_active(p_team_id,x.user_id)
   else public.alignment_share_is_complete(latest.id,y.user_id) end)) then
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

commit;
