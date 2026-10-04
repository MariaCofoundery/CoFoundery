begin;
-- Preserve pair invitation semantics; extend the explicitly supported team size to four.
create or replace function public.enforce_founder_team_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_count integer;
begin
  if tg_op = 'UPDATE'
     and (new.team_id is distinct from old.team_id or new.user_id is distinct from old.user_id) then
    raise exception 'founder_team_membership_identity_is_immutable' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    perform 1
    from public.founder_teams team
    where team.id = new.team_id
    for update;

    if not found then
      raise exception 'founder_team_not_found' using errcode = '23503';
    end if;

    select count(*)
      into v_member_count
    from public.founder_team_members member
    where member.team_id = new.team_id;

    if v_member_count >= 4 and not exists(select 1 from public.founder_team_members where team_id=new.team_id and user_id=new.user_id) then
      raise exception 'founder_team_member_limit_reached' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
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
    return v_relationship.founder_team_id;
  end if;

  if p_founder_team_id is null then
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
comment on table public.founder_teams is 'Durable founder team; currently supports up to four members. Pair relationships remain independent.';
create or replace function public.get_workstyle_team_inputs(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member record; core_id uuid; venture_id uuid; core_instrument text; core_version text; manifest text;
 first_instrument text; first_manifest text; core_data jsonb; venture_data jsonb; people jsonb:='[]'; expected_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.can_read_workstyle_team(p_team_id) then return jsonb_build_object('status','not_ready'); end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 for member in select user_id from public.founder_team_members where team_id=p_team_id order by user_id loop
   -- Latest completed portable profile, never silently fall back to an older compatible version.
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
   if member.user_id<>auth.uid() and (not public.alignment_share_is_effective(core_id,auth.uid())
     or not public.alignment_share_is_effective(venture_id,auth.uid())) then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'item_version',a.item_version,'value',a.value,'missing_reason',a.missing_code) || case when core_version='8.5a-v3' then jsonb_build_object('response_format',i.definition->>'response_format','rendered_order',a.workstyle_rendered_order) else '{}'::jsonb end order by i.position),'[]') into core_data
   from public.alignment_answers a join public.workstyle_item_versions i on i.item_key=a.block_id and i.item_version=a.item_version
   and i.instrument_id=core_instrument and i.definition->>'usage'='core' and not (i.definition->>'research_only')::boolean
   and (core_version<>'8.5a-v3' or i.definition->>'scientific_status'='core')
   where a.assessment_id=core_id and (member.user_id=auth.uid() or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=core_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(core_data)<>expected_count then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'value',a.value,'missing_reason',a.missing_code)),'[]') into venture_data
   from public.alignment_answers a where a.assessment_id=venture_id and (member.user_id=auth.uid() or not exists(
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

-- Product reader: never joins the research response table. Select latest BEFORE authorization;
-- an older shared assessment must not masquerade as the current one.
create function public.get_workstyle_product_profile(p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments; rows jsonb; manifest text;
begin
 if auth.uid() is null then return null; end if;
 select * into a from public.assessments where user_id=p_person_id and instrument_id like 'founder-workstyle-pretest-%'
 and submitted_at is not null order by created_at desc,id limit 1;
 if a.id is null or a.instrument_id<>'founder-workstyle-pretest-8-5a-v3' then return null; end if;
 if p_person_id<>auth.uid() and not public.alignment_share_is_effective(a.id,auth.uid()) then return null; end if;
 select manifest_version into manifest from public.workstyle_pretest_sessions where assessment_id=a.id;
 if manifest is distinct from '3.0.0' then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'item_version',r.item_version,'value',r.value,'missing_reason',r.missing_code) order by i.position),'[]') into rows
 from public.alignment_answers r join public.workstyle_item_versions i on i.instrument_id=a.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
 where r.assessment_id=a.id and i.item_version='8.4-v0.4' and i.definition->>'scientific_status'='core'
 and i.definition->>'usage'='core' and i.definition->>'research_only'='false'
 and (p_person_id=auth.uid() or not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id));
 if jsonb_array_length(rows)=0 then return null; end if;
 return jsonb_build_object('person_id',p_person_id,'assessment_id',a.id,'instrument_id',a.instrument_id,'manifest_version',manifest,'item_version','8.4-v0.4','completed_at',a.submitted_at,'answers',rows);
end $$;
revoke all on function public.get_workstyle_product_profile(uuid) from public,anon;
grant execute on function public.get_workstyle_product_profile(uuid) to authenticated;

-- A team report needs membership OR an explicit group consent for exactly these members.
-- A pair's relationship-advisor grant is sufficient only for that exact two-person team.
create function public.can_read_workstyle_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 public.is_current_user_founder_team_member(p_team_id)
 or exists(select 1 from public.advisor_team_reviews r where public.has_advisor_team_review_access(r.id,auth.uid())
 and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.advisor_team_review_members rm where rm.review_id=r.id and rm.subject_user_id=m.user_id and rm.decision='approved'))
 and (select count(*) from public.advisor_team_review_members rm where rm.review_id=r.id)=(select count(*) from public.founder_team_members m where m.team_id=p_team_id))
 or ((select count(*) from public.founder_team_members where team_id=p_team_id)=2 and exists(
 select 1 from public.relationships r join public.relationship_advisors ra on ra.relationship_id=r.id
 where r.founder_team_id=p_team_id and ra.advisor_user_id=auth.uid() and ra.status='linked'
 and ra.revoked_at is null and ra.founder_a_approved and ra.founder_b_approved)))
$$;
revoke all on function public.can_read_workstyle_team(uuid) from public,anon;
grant execute on function public.can_read_workstyle_team(uuid) to authenticated;

create function public.get_workstyle_product_team(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare team public.founder_teams; member record; profile jsonb; people jsonb:='[]'; caps jsonb; alignment jsonb; setup jsonb:='[]'; a public.assessments; rel record; allowed_setup boolean:=false;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 select * into team from public.founder_teams where id=p_team_id;
 if not found then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
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

-- Existing report_runs require a pair relationship AND invitation and immutable legacy payloads.
-- One small product snapshot store is therefore needed; no new identity/team/access architecture.
create table public.workstyle_product_snapshots(
 id uuid primary key default gen_random_uuid(),
 viewer_id uuid not null references auth.users(id) on delete cascade,
 team_id uuid references public.founder_teams(id) on delete cascade,
 subject_id uuid references auth.users(id) on delete cascade,
 schema_version text not null check(schema_version='workstyle-report/1.0.0'),
 input jsonb not null,
 generated_at timestamptz not null default clock_timestamp(),
 check(num_nonnulls(team_id,subject_id)=1)
);
alter table public.workstyle_product_snapshots enable row level security;
revoke all on public.workstyle_product_snapshots from public,anon,authenticated;
-- Snapshot creation never accepts a client payload. Read rechecks current disclosure, including
-- hidden blocks, taxonomy and capability depth. Changed disclosure requires a fresh snapshot.
create function public.create_workstyle_product_snapshot(p_team_id uuid default null,p_subject_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare payload jsonb; result uuid;
begin
 if auth.uid() is null or num_nonnulls(p_team_id,p_subject_id)<>1 then raise exception 'not_authorized' using errcode='42501'; end if;
 payload:=case when p_team_id is not null then public.get_workstyle_product_team(p_team_id) else public.get_workstyle_product_profile(p_subject_id) end;
 if payload is null or payload->>'status'='not_ready' then raise exception 'report_not_ready' using errcode='42501'; end if;
 select id into result from public.workstyle_product_snapshots where viewer_id=auth.uid() and team_id is not distinct from p_team_id and subject_id is not distinct from p_subject_id and input=payload order by generated_at desc limit 1;
 if result is null then
 insert into public.workstyle_product_snapshots(viewer_id,team_id,subject_id,schema_version,input) values(auth.uid(),p_team_id,p_subject_id,'workstyle-report/1.0.0',payload) returning id into result;
 end if;
 return result;
end $$;
create function public.get_workstyle_product_snapshot(p_snapshot_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.workstyle_product_snapshots; current_input jsonb;
begin
 select * into s from public.workstyle_product_snapshots where id=p_snapshot_id and viewer_id=auth.uid();
 if not found then return null; end if;
 current_input:=case when s.team_id is not null then public.get_workstyle_product_team(s.team_id) else public.get_workstyle_product_profile(s.subject_id) end;
 if current_input is distinct from s.input then return null; end if;
 return jsonb_build_object('id',s.id,'schema_version',s.schema_version,'generated_at',s.generated_at,'input',s.input);
end $$;
revoke all on function public.create_workstyle_product_snapshot(uuid,uuid),public.get_workstyle_product_snapshot(uuid) from public,anon;
grant execute on function public.create_workstyle_product_snapshot(uuid,uuid),public.get_workstyle_product_snapshot(uuid) to authenticated;

-- Recipient discovery reuses existing connections. Eligibility never creates a share.
-- Org advisors are selected individually; org membership alone grants no answer access.
create function public.get_workstyle_share_recipients() returns table(user_id uuid,display_name text)
language sql stable security definer set search_path='' as $$
 with eligible as (
  select other.user_id from public.founder_team_members mine join public.founder_team_members other on other.team_id=mine.team_id where mine.user_id=auth.uid()
  union select case when i.inviter_user_id=auth.uid() then i.invitee_user_id else i.inviter_user_id end from public.invitations i where i.status::text='accepted' and i.revoked_at is null and auth.uid() in (i.inviter_user_id,i.invitee_user_id)
  union select coalesce(g.advisor_user_id,m.user_id) from public.advisor_person_grants g left join public.advisor_org_members m on m.org_id=g.org_id and m.status='active' left join public.advisor_orgs o on o.id=g.org_id where g.subject_user_id=auth.uid() and g.status='active' and g.revoked_at is null and (g.org_id is null or o.status='active')
  union select ra.advisor_user_id from public.relationship_advisors ra join public.relationships r on r.id=ra.relationship_id where auth.uid() in (r.user_a_id,r.user_b_id) and ra.status='linked' and ra.revoked_at is null and ra.founder_a_approved and ra.founder_b_approved
 ) select e.user_id,coalesce(nullif(p.display_name,''),'Kontakt') from eligible e left join public.profiles p on p.user_id=e.user_id where auth.uid() is not null and e.user_id<>auth.uid() order by 2,1
$$;
revoke all on function public.get_workstyle_share_recipients() from public,anon;
grant execute on function public.get_workstyle_share_recipients() to authenticated;

-- Reuse answer shares atomically; no momentary exposure while hidden blocks are replaced.
create function public.share_workstyle_product(p_recipient uuid,p_hidden text[] default '{}',p_revoke boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a uuid; s uuid;
begin
 if auth.uid() is null or p_recipient=auth.uid() or p_recipient is null then raise exception 'not_authorized' using errcode='42501'; end if;
 select id into a from public.assessments where user_id=auth.uid() and instrument_id='founder-workstyle-pretest-8-5a-v3' and submitted_at is not null order by created_at desc,id limit 1;
 if a is null then raise exception 'not_ready' using errcode='23514'; end if;
 if p_revoke then update public.alignment_shares set revoked_at=now() where assessment_id=a and recipient_user_id=p_recipient; return; end if;
 if not exists(select 1 from public.get_workstyle_share_recipients() where user_id=p_recipient) then raise exception 'recipient_not_connected' using errcode='42501'; end if;
 if p_hidden is null or exists(select 1 from unnest(p_hidden) k where not exists(select 1 from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v3' and item_key=k and definition->>'scientific_status'='core')) then raise exception 'invalid_item' using errcode='22023'; end if;
 insert into public.alignment_shares(assessment_id,recipient_user_id,revoked_at) values(a,p_recipient,null) on conflict(assessment_id,recipient_user_id) do update set revoked_at=null returning id into s;
 delete from public.alignment_share_hidden_blocks where share_id=s;
 insert into public.alignment_share_hidden_blocks(share_id,block_id) select s,k from (select distinct unnest(p_hidden) k) x;
end $$;
revoke all on function public.share_workstyle_product(uuid,text[],boolean) from public,anon;
grant execute on function public.share_workstyle_product(uuid,text[],boolean) to authenticated;
create function public.guard_workstyle_snapshot_update() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'product_snapshot_immutable' using errcode='23514'; end $$;
create trigger workstyle_snapshot_immutable before update on public.workstyle_product_snapshots for each row execute function public.guard_workstyle_snapshot_update();
revoke all on function public.guard_workstyle_snapshot_update() from public,anon,authenticated;
create function public.get_workstyle_report_teams() returns table(team_id uuid,team_name text,member_ids uuid[])
language sql stable security definer set search_path='' as $$
 select t.id,t.name,array(select m.user_id from public.founder_team_members m where m.team_id=t.id order by m.user_id)
 from public.founder_teams t where public.can_read_workstyle_team(t.id)
 order by t.created_at desc,t.id
$$;
revoke all on function public.get_workstyle_report_teams() from public,anon;
grant execute on function public.get_workstyle_report_teams() to authenticated;
commit;
