begin;
-- A purpose-specific opt-in on the existing owner-private search preferences.
-- Existing team, advisor, research and historical discovery consents are not inherited.
alter table public.founder_search_preferences
 add column workstyle_discovery_enabled boolean not null default false,
 add column workstyle_discovery_consent_version text,
 add column workstyle_discovery_consented_at timestamptz,
 add constraint workstyle_discovery_consent_check check (not workstyle_discovery_enabled or
   (workstyle_discovery_consent_version is not distinct from 'workstyle_discovery_v1' and workstyle_discovery_consented_at is not null));

create function public.set_discovery_workstyle_consent(p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_current_user_discovery_founder() then
  raise exception 'not_a_discovery_founder' using errcode='42501'; end if;
 if p_enabled is null then raise exception 'invalid_consent' using errcode='22023'; end if;
 insert into public.founder_search_preferences(user_id,workstyle_discovery_enabled,workstyle_discovery_consent_version,workstyle_discovery_consented_at)
 values(auth.uid(),p_enabled,case when p_enabled then 'workstyle_discovery_v1' end,case when p_enabled then now() end)
 on conflict(user_id) do update set workstyle_discovery_enabled=excluded.workstyle_discovery_enabled,
 workstyle_discovery_consent_version=excluded.workstyle_discovery_consent_version,
 workstyle_discovery_consented_at=excluded.workstyle_discovery_consented_at;
end $$;
revoke all on function public.set_discovery_workstyle_consent(boolean) from public,anon;
grant execute on function public.set_discovery_workstyle_consent(boolean) to authenticated;

-- This private helper uses the same per-item bands as the product report.
-- FC remains A/B (never numeric); behavioral categories are deliberately not projected.
-- No median, sum, distance, ranking or psychometric score is calculated.
create function public.discovery_workstyle_band(v jsonb, missing text, definition jsonb) returns text
language sql immutable set search_path='' as $$
 select case when missing is not null then null
 when definition->>'response_format'='comparative' and exists(
  select 1 from jsonb_array_elements(definition->'options') o where o->>'option_id'=v->>'optionId')
 then case when v->>'optionId' in ('strong_a','lean_a') then 'A' when v->>'optionId' in ('strong_b','lean_b') then 'B' end
 when definition->>'response_format' in ('likelihood','seriousness','influence','ambiguity_discomfort')
 and jsonb_typeof(v->'scale')='number' then case v->>'scale' when '1' then 'lower' when '2' then 'lower' when '3' then 'middle' when '4' then 'upper' when '5' then 'upper' end
 end
$$;
revoke all on function public.discovery_workstyle_band(jsonb,text,jsonb) from public,anon,authenticated;

create function public.get_discovery_workstyle_signals(p_candidate_user_id uuid)
returns table(area_key text,pattern text)
language plpgsql stable security definer set search_path='' as $$
declare mine public.assessments; theirs public.assessments;
begin
 if auth.uid() is null or auth.uid()=p_candidate_user_id or not public.is_current_user_discovery_founder() then return; end if;
 if not exists(select 1 from public.founder_discovery_profiles where user_id=p_candidate_user_id and status='active') then return; end if;
 -- Each participant has explicitly enabled this purpose. A missing grant is not disclosed.
 if (select count(*) from public.founder_search_preferences where user_id in(auth.uid(),p_candidate_user_id)
   and workstyle_discovery_enabled and workstyle_discovery_consent_version='workstyle_discovery_v1' and workstyle_discovery_consented_at is not null)<>2 then return; end if;
 select * into mine from public.assessments where user_id=auth.uid() and instrument_id like 'founder-workstyle-pretest-%'
  and submitted_at is not null order by created_at desc,id limit 1;
 select * into theirs from public.assessments where user_id=p_candidate_user_id and instrument_id like 'founder-workstyle-pretest-%'
  and submitted_at is not null order by created_at desc,id limit 1;
 if mine.instrument_id is distinct from 'founder-workstyle-pretest-8-5a-v3' or theirs.instrument_id is distinct from mine.instrument_id then return; end if;
 if (select count(*) from public.workstyle_pretest_sessions where assessment_id in(mine.id,theirs.id) and manifest_version='3.0.0' and assessment_version='8.5a-v3')<>2 then return; end if;
 if (select count(*) from public.alignment_answers r join public.workstyle_item_versions i
  on i.instrument_id=mine.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
  where r.assessment_id in(mine.id,theirs.id) and i.item_version='8.4-v0.4' and i.definition->>'usage'='core'
  and i.definition->>'scientific_status'='core' and i.definition->>'research_only'='false' and i.definition->>'area_status'='development_area')<>58 then return; end if;
 return query with pairs as (
  select i.definition->>'area_key' area,
   public.discovery_workstyle_band(a.value,a.missing_code,i.definition) a,
   public.discovery_workstyle_band(b.value,b.missing_code,i.definition) b
  from public.workstyle_item_versions i
  join public.alignment_answers a on a.assessment_id=mine.id and a.block_id=i.item_key and a.item_version=i.item_version
  join public.alignment_answers b on b.assessment_id=theirs.id and b.block_id=i.item_key and b.item_version=i.item_version
  where i.instrument_id=mine.instrument_id and i.item_version='8.4-v0.4' and i.definition->>'scientific_status'='core'
  and i.definition->>'usage'='core' and i.definition->>'research_only'='false' and i.definition->>'area_status'='development_area'
  and i.definition->>'response_format' in ('likelihood','seriousness','influence','ambiguity_discomfort','comparative')
 ) select area,case when count(*) filter(where a is not null and b is not null)<greatest(2,ceil(count(*)/2.0)) then 'INSUFFICIENT_DATA'
 when bool_and(a=b) filter(where a is not null and b is not null) then 'SIMILAR_PATTERN' else 'DISCUSSION_POINT' end
 from pairs group by area order by area;
end $$;
revoke all on function public.get_discovery_workstyle_signals(uuid) from public,anon;
grant execute on function public.get_discovery_workstyle_signals(uuid) to authenticated;

-- Retire only the unconsented FIND delivery endpoint. Historical answers, theme
-- mappings, preferences and report readers remain intact. Even a direct RPC call
-- must no longer bypass the new purpose-specific contract.
create or replace function public.discovery_theme_distances(p_candidate_user_id uuid)
returns table(theme_id text,comparable integer,total integer,mean_distance numeric)
language sql stable security definer set search_path='' as $$
 select null::text,null::integer,null::integer,null::numeric where false
$$;
comment on function public.discovery_theme_distances(uuid) is 'Historical interface; delivery retired in Phase 9.1. Use explicit-consent get_discovery_workstyle_signals.';
-- Aggregate readiness only, available to exactly the existing report audience.
create function public.get_workstyle_product_team_status(p_team_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare m record; a public.assessments; result jsonb;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id) not between 2 and 4 then return 'unavailable'; end if;
 for m in select user_id from public.founder_team_members where team_id=p_team_id loop
  select * into a from public.assessments where user_id=m.user_id and instrument_id like 'founder-workstyle-pretest-%'
   and submitted_at is not null order by created_at desc,id limit 1;
  if a.instrument_id is distinct from 'founder-workstyle-pretest-8-5a-v3' or not exists(select 1 from public.workstyle_pretest_sessions where assessment_id=a.id and manifest_version='3.0.0') then return 'unavailable'; end if;
 end loop;
 result:=public.get_workstyle_product_team(p_team_id);
 if result->>'status'='not_ready' then return 'share_missing'; end if;
 return 'available';
end $$;
revoke all on function public.get_workstyle_product_team_status(uuid) from public,anon;
grant execute on function public.get_workstyle_product_team_status(uuid) to authenticated;
-- Reuse a mutually confirmed FIND start without requiring a legacy scored report
-- or legacy workbook first. This creates only the existing relationship/team.
create function public.open_discovery_workstyle_team(p_start_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.discovery_matching_starts; r uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into s from public.discovery_matching_starts where id=p_start_id for update;
 if s.id is null or auth.uid() not in(s.requester_user_id,s.recipient_user_id)
  or s.status<>'ready_for_matching' or s.confirmed_at is null or s.requested_by_user_id=s.confirmed_by_user_id
  or not exists(select 1 from public.discovery_intro_requests i where i.id=s.intro_request_id and i.status='accepted'
   and i.requester_user_id=s.requester_user_id and i.recipient_user_id=s.recipient_user_id)
 then raise exception 'discovery_start_unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.matching_sessions m where m.source_type='discovery_matching_start' and m.source_id=s.id and m.status='canceled') then
  raise exception 'discovery_start_unavailable' using errcode='42501'; end if;
 insert into public.relationships(user_a_id,user_b_id) values(s.requester_user_id,s.recipient_user_id)
 on conflict(user_low,user_high) do nothing;
 select id into r from public.relationships where user_low=least(s.requester_user_id,s.recipient_user_id) and user_high=greatest(s.requester_user_id,s.recipient_user_id);
 return public.ensure_founder_team_for_relationship(r,'pre_founder');
end $$;
revoke all on function public.open_discovery_workstyle_team(uuid) from public,anon;
grant execute on function public.open_discovery_workstyle_team(uuid) to authenticated;
commit;
