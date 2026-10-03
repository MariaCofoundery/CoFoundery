begin;

-- Internal, purpose-bound storage. No external text archive and no public objects.
create table public.radar_sources (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 160),
 domain text not null check (domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' and length(domain)<=253),
 allowed_path text not null default '/' check (left(allowed_path,1)='/' and length(allowed_path)<=1000),
 source_type text not null check(source_type in ('rss','public_api','public_web','public_forum','public_repository_issues','public_review_source','other')),
 retrieval_method text not null check(retrieval_method in ('manual_url','rss','official_api','approved_http')),
 is_public boolean not null default false,
 permission_state text not null default 'pending' check(permission_state in ('pending','approved','denied')),
 status text not null default 'paused' check(status in ('active','paused','withdrawn')),
 source_language text not null check(source_language in ('de','en')),
 region text not null default 'unknown' check(length(region) between 1 and 120),
 target_context text not null check(length(target_context) between 1 and 400),
 source_nature text not null check(source_nature in ('direct','editorial','aggregated','mixed','unknown')),
 source_origin text not null check(source_origin in ('primary','secondary','unknown')),
 policy_references text not null default '' check(length(policy_references)<=2000),
 review_note text not null default '' check(length(review_note)<=1000),
 reviewed_by uuid references auth.users on delete set null, reviewed_at timestamptz, review_due_at timestamptz,
 revision integer not null default 1,
 created_by uuid references auth.users on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.radar_signals (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.radar_sources on delete restrict,
 source_url text, source_title text check(length(source_title)<=200), source_date date,
 captured_at timestamptz not null default now(), source_language text not null check(source_language in ('de','en')),
 summary_language text not null check(summary_language in ('de','en')),
 summary text check(length(summary) between 1 and 800), problem_observation text check(length(problem_observation) between 1 and 1000),
 affected_context text check(length(affected_context) between 1 and 400), tags text[] not null default '{}',
 review_status text not null default 'new' check(review_status in ('new','reviewed','relevant','discarded')),
 sensitivity text not null default 'clear' check(sensitivity in ('clear','sensitive')),
 usage_block boolean not null default false,
 availability text not null default 'unchecked' check(availability in ('unchecked','available','unreachable','removed')),
 created_by uuid references auth.users on delete set null, reviewed_by uuid references auth.users on delete set null,
 reviewed_at timestamptz, review_due_at timestamptz not null default now()+interval '30 days',
 delete_after timestamptz default now()+interval '30 days', revision integer not null default 1, approved_source_revision integer,
 url_fingerprint text not null, item_fingerprint text, normalization_version integer not null default 1 check(normalization_version=1),
 updated_at timestamptz not null default now(),
 unique(source_id,url_fingerprint), unique(source_id,item_fingerprint),
 check(cardinality(tags)<=8),
 check(review_status='discarded' or (source_url is not null and summary is not null and problem_observation is not null and affected_context is not null))
);
create index radar_signals_list_idx on public.radar_signals(review_status,captured_at desc,id);
create table public.radar_review_events (
 id uuid primary key default gen_random_uuid(), source_id uuid references public.radar_sources on delete cascade,
 signal_id uuid references public.radar_signals on delete cascade,
 actor uuid references auth.users on delete set null, happened_at timestamptz not null default now(),
 revision integer not null, action text not null check(action in ('created','edited','source_state','reviewed','relevant','blocked','unblocked','discarded')),
 reason_code text check(reason_code in ('manual_review','scope_changed','sensitive','takedown','not_relevant','source_stop')),
 check(num_nonnulls(source_id,signal_id)=1)
);
alter table public.radar_sources enable row level security;
alter table public.radar_signals enable row level security;
alter table public.radar_review_events enable row level security;
revoke all on public.radar_sources, public.radar_signals, public.radar_review_events from public, anon, authenticated;

create function public.radar_require_admin() returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode='42501'; end if;
end $$;

-- Pure lexical URL handling, NEVER a network request. v1 deliberately preserves
-- query order and all parameters except named tracking keys; no semantic merge.
create function public.radar_normalize_url(p_url text) returns text language plpgsql immutable set search_path='' as $$
declare m text[]; q text; base text; path text;
begin
 if p_url is null or length(p_url)>2048 or p_url ~ '[[:space:][:cntrl:]\\]' then raise exception 'radar_url_invalid' using errcode='23514'; end if;
 m := regexp_match(p_url, '^(https?)://([A-Za-z0-9][A-Za-z0-9.-]*)(:(80|443))?(/[^?#]*)?(\?[^#]*)?(#.*)?$','i');
 if m is null or m[2] like '%..%' or right(m[2],1)='.' then raise exception 'radar_url_invalid' using errcode='23514'; end if;
 if m[3] is not null and not ((lower(m[1])='http' and m[4]='80') or (lower(m[1])='https' and m[4]='443')) then raise exception 'radar_url_invalid' using errcode='23514'; end if;
 path := coalesce(nullif(m[5],''),'/');
 if path ~* '(%2e|%2f|%5c|/\.\.?(/|$))' then raise exception 'radar_url_invalid' using errcode='23514'; end if;
 base := lower(m[1]) || '://' || lower(m[2]) || path;
 select string_agg(value,'&' order by ordinal) into q
 from unnest(string_to_array(substr(coalesce(m[6],''),2),'&')) with ordinality as t(value,ordinal)
 where value<>'' and lower(split_part(value,'=',1)) !~ '^(utm_[a-z0-9_]+|fbclid|gclid)$';
 return base || case when q is not null then '?'||q else '' end;
end $$;
create function public.radar_source_usable(s public.radar_sources) returns boolean language sql stable set search_path='' as $$
 select s.status='active' and s.permission_state='approved' and s.is_public and s.retrieval_method='manual_url' and s.review_due_at>now();
$$;
create function public.radar_check_scope(s public.radar_sources,u text) returns void language plpgsql set search_path='' as $$
declare host text := split_part(split_part(u,'://',2),'/',1); path text := split_part(substring(u from '://[^/]+(.*)$'),'?',1);
begin
 if host<>s.domain or not (s.allowed_path='/' or path=s.allowed_path or starts_with(path,rtrim(s.allowed_path,'/')||'/')) then
 raise exception 'radar_scope_invalid' using errcode='23514'; end if;
end $$;

create function public.save_radar_source(p_id uuid,p_revision integer,p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.radar_sources; v_id uuid; k text;
begin
 perform public.radar_require_admin();
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'radar_invalid' using errcode='23514'; end if;
 for k in select jsonb_object_keys(p_input) loop
 if k not in ('name','domain','allowed_path','source_type','retrieval_method','is_public','source_language','region','target_context','source_nature','source_origin','policy_references','review_note') then raise exception 'radar_field_invalid' using errcode='23514'; end if;
 end loop;
 s := jsonb_populate_record(null::public.radar_sources,p_input);
 s.domain:=lower(btrim(s.domain)); s.name:=btrim(s.name); s.region:=coalesce(nullif(btrim(s.region),''),'unknown');
 s.policy_references:=coalesce(s.policy_references,''); s.review_note:=coalesce(s.review_note,'');
 perform public.radar_normalize_url('https://'||s.domain||s.allowed_path);
 if s.allowed_path ~ '[?#]' then raise exception 'radar_scope_invalid' using errcode='23514'; end if;
 if p_id is null then
 insert into public.radar_sources(name,domain,allowed_path,source_type,retrieval_method,is_public,source_language,region,target_context,source_nature,source_origin,policy_references,review_note,created_by)
 values(s.name,s.domain,s.allowed_path,s.source_type,s.retrieval_method,s.is_public,s.source_language,s.region,s.target_context,s.source_nature,s.source_origin,s.policy_references,s.review_note,auth.uid()) returning id into v_id;
 else
 perform 1 from public.radar_sources where id=p_id and revision=p_revision for update;
 if not found then raise exception 'radar_conflict' using errcode='40001'; end if;
 update public.radar_sources set name=s.name,domain=s.domain,allowed_path=s.allowed_path,source_type=s.source_type,retrieval_method=s.retrieval_method,is_public=s.is_public,source_language=s.source_language,region=s.region,target_context=s.target_context,source_nature=s.source_nature,source_origin=s.source_origin,policy_references=s.policy_references,review_note=s.review_note,
 status='paused',permission_state='pending',reviewed_at=null,reviewed_by=null,review_due_at=null,revision=revision+1,updated_at=now() where id=p_id;
 v_id:=p_id;
 end if;
 insert into public.radar_review_events(source_id,actor,revision,action,reason_code) select id,auth.uid(),revision,case when p_id is null then 'created' else 'edited' end,case when p_id is null then null else 'scope_changed' end from public.radar_sources where id=v_id;
 return v_id;
end $$;
create function public.review_radar_source(p_id uuid,p_revision integer,p_permission text,p_status text,p_due timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare s public.radar_sources;
begin
 perform public.radar_require_admin();
 select * into s from public.radar_sources where id=p_id for update;
 if not found or s.revision is distinct from p_revision then raise exception 'radar_conflict' using errcode='40001'; end if;
 if p_permission is null or p_permission not in ('pending','approved','denied') or p_status is null or p_status not in ('active','paused','withdrawn')
 or (p_status='active' and p_permission<>'approved') then raise exception 'radar_invalid' using errcode='23514'; end if;
 if p_permission='approved' and (not s.is_public or length(btrim(s.policy_references))=0 or length(btrim(s.review_note))=0 or p_due is null or p_due<=now() or p_due>now()+interval '180 days') then raise exception 'radar_approval_incomplete' using errcode='23514'; end if;
 update public.radar_sources set permission_state=p_permission,status=p_status,reviewed_by=auth.uid(),reviewed_at=now(),review_due_at=case when p_permission='approved' then p_due else null end,revision=revision+1,updated_at=now() where id=p_id;
 insert into public.radar_review_events(source_id,actor,revision,action,reason_code) values(p_id,auth.uid(),s.revision+1,'source_state',case when p_status='active' then 'manual_review' else 'source_stop' end);
end $$;

create function public.save_radar_signal(p_id uuid,p_revision integer,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.radar_sources; r public.radar_signals; old public.radar_signals; k text; u text; fp text; item_fp text; duplicate_id uuid; v_id uuid;
begin
 perform public.radar_require_admin();
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'radar_invalid' using errcode='23514'; end if;
 for k in select jsonb_object_keys(p_input) loop
 if k not in ('source_id','source_url','source_title','source_date','source_language','summary_language','summary','problem_observation','affected_context','tags','stable_public_item_id','availability','sensitivity') then raise exception 'radar_field_invalid' using errcode='23514'; end if;
 end loop;
 r:=jsonb_populate_record(null::public.radar_signals,p_input);
 select * into s from public.radar_sources where id=r.source_id for share;
 if not found or not public.radar_source_usable(s) then raise exception 'radar_source_unavailable' using errcode='23514'; end if;
 u:=public.radar_normalize_url(r.source_url); perform public.radar_check_scope(s,u);
 fp:=encode(extensions.digest(u,'sha256'),'hex');
 if length(coalesce(p_input->>'stable_public_item_id',''))>120 or coalesce(p_input->>'stable_public_item_id','') ~ '[[:space:][:cntrl:]@/]' then raise exception 'radar_item_invalid' using errcode='23514'; end if;
 item_fp:=case when nullif(p_input->>'stable_public_item_id','') is not null then encode(extensions.digest(p_input->>'stable_public_item_id','sha256'),'hex') else null end;
 r.summary:=btrim(r.summary); r.problem_observation:=btrim(r.problem_observation); r.affected_context:=btrim(r.affected_context);
 r.tags:=coalesce(r.tags,'{}');
 if exists(select 1 from unnest(r.tags) t where t is null or length(btrim(t)) not between 1 and 40) then raise exception 'radar_tags_invalid' using errcode='23514'; end if;
 if r.sensitivity is null or r.sensitivity not in ('clear','sensitive') or r.availability is null then raise exception 'radar_invalid' using errcode='23514'; end if;
 -- Known sensitive case material is never persisted through the editor.
 if r.sensitivity='sensitive' then raise exception 'radar_sensitive_input' using errcode='23514'; end if;
 if p_id is not null then
 select * into old from public.radar_signals where id=p_id for update;
 if not found or old.revision is distinct from p_revision then raise exception 'radar_conflict' using errcode='40001'; end if;
 if old.review_status='discarded' or old.usage_block or old.sensitivity='sensitive' or old.source_id<>r.source_id or (old.delete_after is not null and old.delete_after<=now()) then raise exception 'radar_signal_locked' using errcode='23514'; end if;
 -- Identity is immutable once captured; edits cannot move a tombstone to another URL.
 if old.url_fingerprint<>fp or item_fp is not null and old.item_fingerprint is distinct from item_fp then raise exception 'radar_identity_immutable' using errcode='23514'; end if;
 update public.radar_signals set source_title=nullif(btrim(r.source_title),''),source_date=r.source_date,source_language=r.source_language,summary_language=r.summary_language,summary=r.summary,problem_observation=r.problem_observation,affected_context=r.affected_context,tags=r.tags,availability=r.availability,
 review_status='new',reviewed_by=null,reviewed_at=null,approved_source_revision=null,revision=revision+1,updated_at=now(),
 delete_after=coalesce(old.delete_after,now()+interval '30 days'),review_due_at=coalesce(old.delete_after,now()+interval '30 days') where id=p_id;
 v_id:=p_id;
 else
 insert into public.radar_signals(source_id,source_url,source_title,source_date,source_language,summary_language,summary,problem_observation,affected_context,tags,availability,sensitivity,created_by,url_fingerprint,item_fingerprint)
 values(r.source_id,u,nullif(btrim(r.source_title),''),r.source_date,r.source_language,r.summary_language,r.summary,r.problem_observation,r.affected_context,r.tags,r.availability,r.sensitivity,auth.uid(),fp,item_fp)
 on conflict do nothing returning id into v_id;
 if v_id is null then
 select id into duplicate_id from public.radar_signals where source_id=s.id and (url_fingerprint=fp or item_fingerprint=item_fp) order by captured_at,id limit 1;
 return jsonb_build_object('id',duplicate_id,'duplicate',true);
 end if;
 end if;
 insert into public.radar_review_events(signal_id,actor,revision,action) select id,auth.uid(),revision,case when p_id is null then 'created' else 'edited' end from public.radar_signals where id=v_id;
 return jsonb_build_object('id',v_id,'duplicate',false);
end $$;

create function public.review_radar_signal(p_id uuid,p_revision integer,p_action text,p_reason text default 'manual_review') returns void
language plpgsql security definer set search_path='' as $$
declare r public.radar_signals; s public.radar_sources; sid uuid;
begin
 perform public.radar_require_admin();
 select source_id into sid from public.radar_signals where id=p_id;
 select * into s from public.radar_sources where id=sid for share;
 select * into r from public.radar_signals where id=p_id for update;
 if not found or r.revision is distinct from p_revision then raise exception 'radar_conflict' using errcode='40001'; end if;
 if p_action is null or p_action not in ('reviewed','relevant','blocked','unblocked','discarded') or p_reason is null or p_reason not in ('manual_review','sensitive','takedown','not_relevant') then raise exception 'radar_invalid' using errcode='23514'; end if;
 if r.review_status='discarded' then raise exception 'radar_signal_locked' using errcode='23514'; end if;
 if p_action in ('reviewed','relevant','unblocked') and ((r.delete_after is not null and r.delete_after<=now()) or not public.radar_source_usable(s)) then raise exception 'radar_source_unavailable' using errcode='23514'; end if;
 if p_action in ('reviewed','relevant') and (r.usage_block or r.sensitivity='sensitive' or r.availability='removed') then raise exception 'radar_signal_locked' using errcode='23514'; end if;
 if p_action='relevant' and r.review_status not in ('reviewed','relevant') then raise exception 'radar_review_required' using errcode='23514'; end if;
 if p_action='discarded' then
 update public.radar_signals set review_status='discarded',source_url=null,source_title=null,source_date=null,summary=null,problem_observation=null,affected_context=null,tags='{}',usage_block=true,approved_source_revision=null,
 delete_after=now()+interval '30 days',review_due_at=now()+interval '30 days' where id=p_id;
 elsif p_action='blocked' then
 update public.radar_signals set usage_block=true,sensitivity=case when p_reason='sensitive' then 'sensitive' else sensitivity end,approved_source_revision=null,review_status='new',delete_after=least(coalesce(delete_after,now()+interval '30 days'),now()+interval '30 days'),review_due_at=now() where id=p_id;
 elsif p_action='unblocked' then
 update public.radar_signals set usage_block=false,sensitivity='clear',review_status='new',approved_source_revision=null where id=p_id;
 else
 update public.radar_signals set review_status=p_action,approved_source_revision=case when p_action='relevant' then s.revision else null end,
 review_due_at=case when p_action='relevant' then now()+interval '180 days' else coalesce(delete_after,now()+interval '30 days') end,
 delete_after=case when p_action='relevant' then null else coalesce(delete_after,now()+interval '30 days') end where id=p_id;
 end if;
 update public.radar_signals set reviewed_by=auth.uid(),reviewed_at=now(),revision=revision+1,updated_at=now() where id=p_id;
 insert into public.radar_review_events(signal_id,actor,revision,action,reason_code) values(p_id,auth.uid(),r.revision+1,p_action,p_reason);
end $$;

-- Explicit manual maintenance, bounded and later schedulable; reads also mask
-- expired unreviewed content so a missed operator run cannot keep serving it.
create function public.purge_radar_expired() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform public.radar_require_admin();
 delete from public.radar_signals where id in (select id from public.radar_signals where delete_after<=now() order by delete_after limit 250 for update skip locked);
 get diagnostics n=row_count;
 delete from public.radar_review_events where happened_at<=now()-interval '180 days';
 return n;
end $$;
create function public.list_radar_sources() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.radar_require_admin();
 return coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('usable',public.radar_source_usable(s)) order by s.name,s.id) from public.radar_sources s),'[]');
end $$;
create function public.list_radar_signals(p_status text default null,p_source uuid default null,p_language text default null,p_offset integer default 0,p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.radar_require_admin();
 if p_offset is null or p_offset<0 or p_offset>250000 or (p_status is not null and p_status not in ('new','reviewed','relevant','discarded')) or (p_language is not null and p_language not in ('de','en')) then raise exception 'radar_filter_invalid' using errcode='23514'; end if;
 return coalesce((select jsonb_agg(v.payload order by v.captured_at desc,v.id) from (
 select r.id,r.captured_at,
 (to_jsonb(r)-'url_fingerprint'-'item_fingerprint') || jsonb_build_object('source_name',s.name,'source_type',s.source_type,'source_region',s.region,
 'usable',public.radar_source_usable(s) and r.review_status='relevant' and not r.usage_block and r.sensitivity='clear' and r.availability<>'removed' and r.review_due_at>now() and r.approved_source_revision=s.revision,
 'source_usable',public.radar_source_usable(s),'overdue',r.review_due_at<=now(),'expired',coalesce(r.delete_after<=now(),false))
 || case when r.delete_after<=now() then jsonb_build_object('source_url',null,'source_title',null,'source_date',null,'summary',null,'problem_observation',null,'affected_context',null,'tags','[]'::jsonb) else '{}'::jsonb end as payload
 from public.radar_signals r join public.radar_sources s on s.id=r.source_id
 where (p_id is null or r.id=p_id) and (p_status is null or r.review_status=p_status) and (p_source is null or r.source_id=p_source) and (p_language is null or r.source_language=p_language)
 order by r.captured_at desc,r.id limit 26 offset p_offset
 )v),'[]');
end $$;

-- PostgreSQL defaults grant PUBLIC execute; revoke explicitly for every helper
-- and API function, including service_role defaults. Only named APIs exposed.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'radar_%' or p.proname in ('save_radar_source','review_radar_source','save_radar_signal','review_radar_signal','purge_radar_expired','list_radar_sources','list_radar_signals')) loop
 execute format('revoke all on function %s from public, anon, authenticated, service_role',f.sig);
 end loop;
end $$;
grant execute on function public.save_radar_source(uuid,integer,jsonb),public.review_radar_source(uuid,integer,text,text,timestamptz),public.save_radar_signal(uuid,integer,jsonb),public.review_radar_signal(uuid,integer,text,text),public.purge_radar_expired(),public.list_radar_sources(),public.list_radar_signals(text,uuid,text,integer,uuid) to authenticated;
comment on table public.radar_signals is 'Internal manual problem observations; no excerpts, external people or public CONNECT content. Relevant is a reviewed hypothesis input, not proof.';
notify pgrst,'reload schema';
commit;
