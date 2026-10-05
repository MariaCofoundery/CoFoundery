-- Phase 11.5 - Teambericht nur gegenseitig sichtbar.
--
-- Vorher: get_workstyle_product_team lud jedes Profil aus Sicht der lesenden
-- Person. Gab A fuer B frei, sah B den Teambericht, A nicht (bei 3-4 Foundern
-- auch "A und B ja, C nein").
--
-- Jetzt:
-- - workstyle_core_visible_to(owner, viewer): intern, ob das aktuelle
--   v0.4-Arbeitsprofil (8.5a-v3, Manifest 3.0.0) von owner fuer viewer
--   vollstaendig sichtbar ist (eigene Person, oder wirksame Freigabe ohne
--   ausgeblendete Bloecke). Keine Daten, nur ein Wahrheitswert.
-- - get_workstyle_product_team: fuer Teammitglieder erst 'ready', wenn alle
--   gerichteten Paare freigegeben haben. Advisor-Zugriff bleibt unveraendert.
-- - get_workstyle_team_share_readiness(team): nur fuer Teammitglieder; je
--   aktuellem Mitglied "aktuelles Arbeitsprofil vorhanden" und "fuer alle
--   Teammitglieder vollstaendig freigegeben", plus Gesamtstatus.
--
-- Keine neue Tabelle, keine automatische Freigabe, keine Consent-Aenderung.
-- Snapshots folgen automatisch (get_workstyle_product_snapshot vergleicht mit
-- dem aktuellen Ergebnis).
begin;

create function public.workstyle_core_visible_to(p_owner uuid, p_viewer uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments;
begin
 if p_owner is null or p_viewer is null then return false; end if;
 select * into a from public.assessments where user_id=p_owner and instrument_id like 'founder-workstyle-pretest-%'
  and submitted_at is not null order by created_at desc,id limit 1;
 if a.id is null or a.instrument_id<>'founder-workstyle-pretest-8-5a-v3' then return false; end if;
 if not exists(select 1 from public.workstyle_pretest_sessions where assessment_id=a.id and manifest_version='3.0.0') then return false; end if;
 if p_owner=p_viewer then return true; end if;
 if not public.alignment_share_is_effective(a.id,p_viewer) then return false; end if;
 return not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id
  where s.assessment_id=a.id and s.recipient_user_id=p_viewer and s.revoked_at is null);
end $$;
revoke all on function public.workstyle_core_visible_to(uuid,uuid) from public,anon,authenticated;

create or replace function public.get_workstyle_product_team(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare team public.founder_teams; member record; profile jsonb; people jsonb:='[]'; caps jsonb; alignment jsonb; setup jsonb:='[]'; a public.assessments; rel record; allowed_setup boolean:=false;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 select * into team from public.founder_teams where id=p_team_id;
 if not found then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 -- Phase 11.5: Ein gemeinsamer Teambericht ist ein gemeinsames Artefakt. Fuer
 -- Teammitglieder gibt es ihn erst, wenn JEDE Person ihr aktuelles Arbeitsprofil
 -- fuer JEDE andere vollstaendig freigegeben hat - sonst fuer niemanden. Die
 -- Freigaben selbst bleiben gerichtet; hier wird nichts freigegeben.
 if public.is_current_user_founder_team_member(p_team_id) and exists(
  select 1 from public.founder_team_members x join public.founder_team_members y on y.team_id=x.team_id and y.user_id<>x.user_id
  where x.team_id=p_team_id and not public.workstyle_core_visible_to(x.user_id,y.user_id)) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select m.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members m left join public.profiles p on p.user_id=m.user_id where m.team_id=p_team_id order by m.created_at,m.user_id loop
  profile:=public.get_workstyle_product_profile(member.user_id);
  if profile is null or jsonb_array_length(profile->'answers')<>29 then return jsonb_build_object('status','not_ready'); end if;
  caps:='[]';
  if member.user_id=auth.uid() then
   select coalesce(jsonb_agg(jsonb_build_object('area_id',area_id,'application_level',application_level,'ownership_wish',ownership_wish) order by area_id),'[]') into caps from public.person_capability_entries where user_id=member.user_id;
  elsif public.is_current_user_founder_team_member(p_team_id) then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_disclosed_capability(member.user_id,'team') c;
  elsif public.has_advisor_person_access(member.user_id,'capability') then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_advisor_person_capability(member.user_id) c;
  end if;
  alignment:=null;
  select * into a from public.assessments where user_id=member.user_id and instrument_id='venture-alignment-v1' and venture_id=p_team_id and submitted_at is not null order by created_at desc,id limit 1;
  if a.id is not null and (member.user_id=auth.uid() or public.alignment_share_is_effective(a.id,auth.uid())) then
   select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'value',r.value,'missing_reason',r.missing_code) order by r.block_id),'[]') into alignment from public.alignment_answers r where r.assessment_id=a.id
   and (member.user_id=auth.uid() or not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id));
  end if;
  people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'name',member.name,'workstyle',profile,'capabilities',caps,'alignment',alignment));
 end loop;
 if public.is_current_user_founder_team_member(p_team_id) then
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

create function public.get_workstyle_team_share_readiness(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare members jsonb:='[]'; m record; has_profile boolean; shared_all boolean; all_ready boolean:=true; member_count integer;
begin
 if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then return null; end if;
 select count(*) into member_count from public.founder_team_members where team_id=p_team_id;
 if member_count not between 2 and 4 then return jsonb_build_object('status','unavailable','members','[]'::jsonb); end if;
 for m in select tm.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members tm
  left join public.profiles p on p.user_id=tm.user_id where tm.team_id=p_team_id order by tm.created_at,tm.user_id loop
  has_profile:=public.workstyle_core_visible_to(m.user_id,m.user_id);
  shared_all:=has_profile and not exists(select 1 from public.founder_team_members o where o.team_id=p_team_id and o.user_id<>m.user_id
   and not public.workstyle_core_visible_to(m.user_id,o.user_id));
  all_ready:=all_ready and shared_all;
  members:=members||jsonb_build_array(jsonb_build_object('person_id',m.user_id,'name',m.name,'is_viewer',m.user_id=auth.uid(),
   'has_current_workstyle',has_profile,'shared_with_all_members',shared_all));
 end loop;
 return jsonb_build_object('status',case when all_ready then 'ready' else 'missing' end,'members',members);
end $$;
revoke all on function public.get_workstyle_team_share_readiness(uuid) from public,anon;
grant execute on function public.get_workstyle_team_share_readiness(uuid) to authenticated;

commit;
