begin;

-- Exact, current approval is shared by the pilot list, evidence and handoffs.
create function public.radar_signal_usable(r public.radar_signals,s public.radar_sources,p_revision integer default null)
returns boolean language sql stable set search_path='' as $$
 select coalesce(r.id is not null and s.id=r.source_id and public.radar_source_usable(s)
 and r.review_status='relevant' and not r.usage_block and r.sensitivity='clear' and r.availability<>'removed'
 and r.review_due_at>now() and (r.delete_after is null or r.delete_after>now())
 and r.approved_source_revision=s.revision and (p_revision is null or r.revision=p_revision),false);
$$;

create table public.radar_hypotheses (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 1 and 160),
 problem_statement text not null check(length(btrim(problem_statement)) between 1 and 2000),
 affected_context text not null check(length(btrim(affected_context)) between 1 and 400),
 geographic_context text not null default '' check(length(geographic_context)<=200),
 hypothesis_language text not null check(hypothesis_language in ('de','en')),
 open_questions text not null default '' check(length(open_questions)<=2000),
 counter_observations text not null default '' check(length(counter_observations)<=2000),
 evidence_limits text not null default '' check(length(evidence_limits)<=2000),
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 revision integer not null default 1 check(revision>0),
 created_by uuid references auth.users on delete set null, created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users on delete set null, reviewed_at timestamptz, review_due_at timestamptz,
 delete_after timestamptz not null default now()+interval '30 days', updated_at timestamptz not null default now()
);
create table public.radar_hypothesis_signals (
 hypothesis_id uuid not null references public.radar_hypotheses on delete cascade,
 signal_key uuid not null, -- opaque tombstone survives signal retention, never a text snapshot
 signal_id uuid references public.radar_signals on delete set null,
 signal_revision integer not null check(signal_revision>0),
 origin_key text check(length(btrim(origin_key)) between 1 and 80),
 primary key(hypothesis_id,signal_key), check(signal_id is null or signal_id=signal_key)
);
create index radar_hypothesis_signal_lookup on public.radar_hypothesis_signals(signal_id);
create table public.radar_hypothesis_events (
 id uuid primary key default gen_random_uuid(), hypothesis_id uuid references public.radar_hypotheses on delete cascade,
 actor uuid references auth.users on delete set null, happened_at timestamptz not null default now(),
 revision integer not null, action text not null check(action in ('created','edited','linked','unlinked','reviewed','archived','handoff'))
);
create table public.radar_workspace_handoffs (
 id uuid primary key, hypothesis_id uuid references public.radar_hypotheses on delete set null,
 hypothesis_key uuid not null, hypothesis_revision integer not null,
 workspace_id uuid not null unique references public.network_problem_workspaces on delete cascade,
 actor uuid not null references auth.users on delete cascade, created_at timestamptz not null default now(),
 request_hash text not null
);
create table public.radar_workspace_handoff_items (
 id uuid primary key default gen_random_uuid(), handoff_id uuid not null references public.radar_workspace_handoffs on delete cascade,
 signal_id uuid references public.radar_signals on delete set null, signal_key uuid not null, signal_revision integer not null,
 entry_id uuid not null references public.network_problem_workspace_entries on delete cascade,
 kind text not null check(kind in ('assumption','signal')),
 content_state text not null default 'controlled' check(content_state in ('controlled','owner_edited','redacted')),
 link_state text not null default 'none' check(link_state in ('none','controlled','owner_edited','redacted')),
 redacted_by uuid references auth.users on delete set null, redacted_at timestamptz,
 unique(handoff_id,signal_key,entry_id), check(signal_id is null or signal_id=signal_key)
);
create index radar_handoff_item_entry on public.radar_workspace_handoff_items(entry_id);
create index radar_handoff_item_signal on public.radar_workspace_handoff_items(signal_key);

create function public.radar_hypothesis_ready(h public.radar_hypotheses) returns boolean
language sql stable set search_path='' as $$
 select coalesce(h.status='reviewed' and h.review_due_at>now() and h.delete_after>now()
 and exists(select 1 from public.radar_hypothesis_signals l where l.hypothesis_id=h.id)
 and not exists(select 1 from public.radar_hypothesis_signals l
 left join public.radar_signals r on r.id=l.signal_id left join public.radar_sources s on s.id=r.source_id
 where l.hypothesis_id=h.id and not public.radar_signal_usable(r,s,l.signal_revision)),false);
$$;
create function public.radar_hypothesis_changed(p_id uuid,p_action text) returns void
language plpgsql set search_path='' as $$
begin
 update public.radar_hypotheses set status='draft',revision=revision+1,reviewed_by=null,reviewed_at=null,review_due_at=null,
 delete_after=now()+interval '30 days',updated_at=now() where id=p_id;
 insert into public.radar_hypothesis_events(hypothesis_id,actor,revision,action)
 select id,auth.uid(),revision,p_action from public.radar_hypotheses where id=p_id;
end $$;
create function public.save_radar_hypothesis(p_id uuid,p_revision integer,p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare h public.radar_hypotheses; v_id uuid; k text;
begin
 perform public.radar_require_admin();
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'radar_invalid' using errcode='23514'; end if;
 for k in select jsonb_object_keys(p_input) loop
 if k not in ('title','problem_statement','affected_context','geographic_context','hypothesis_language','open_questions','counter_observations','evidence_limits') then raise exception 'radar_field_invalid' using errcode='23514'; end if;
 end loop;
 h:=jsonb_populate_record(null::public.radar_hypotheses,p_input);
 if p_id is null then
 insert into public.radar_hypotheses(title,problem_statement,affected_context,geographic_context,hypothesis_language,open_questions,counter_observations,evidence_limits,created_by)
 values(btrim(h.title),btrim(h.problem_statement),btrim(h.affected_context),coalesce(h.geographic_context,''),h.hypothesis_language,coalesce(h.open_questions,''),coalesce(h.counter_observations,''),coalesce(h.evidence_limits,''),auth.uid()) returning id into v_id;
 insert into public.radar_hypothesis_events(hypothesis_id,actor,revision,action) values(v_id,auth.uid(),1,'created');
 else
 perform 1 from public.radar_hypotheses where id=p_id and revision=p_revision and status<>'archived' and delete_after>now() for update;
 if not found then raise exception 'radar_conflict' using errcode='40001'; end if;
 update public.radar_hypotheses set title=btrim(h.title),problem_statement=btrim(h.problem_statement),affected_context=btrim(h.affected_context),geographic_context=coalesce(h.geographic_context,''),hypothesis_language=h.hypothesis_language,open_questions=coalesce(h.open_questions,''),counter_observations=coalesce(h.counter_observations,''),evidence_limits=coalesce(h.evidence_limits,'') where id=p_id;
 perform public.radar_hypothesis_changed(p_id,'edited'); v_id:=p_id;
 end if;
 return v_id;
end $$;

create function public.link_radar_hypothesis_signal(p_id uuid,p_revision integer,p_signal uuid,p_signal_revision integer,p_origin text default null,p_remove boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare r public.radar_signals; s public.radar_sources;
begin
 perform public.radar_require_admin();
 perform 1 from public.radar_hypotheses where id=p_id and revision=p_revision and status<>'archived' and delete_after>now() for update;
 if not found then raise exception 'radar_conflict' using errcode='40001'; end if;
 if p_remove is true then
 delete from public.radar_hypothesis_signals where hypothesis_id=p_id and signal_key=p_signal;
 if not found then raise exception 'radar_invalid' using errcode='23514'; end if;
 perform public.radar_hypothesis_changed(p_id,'unlinked');
 else
 select s0.* into s from public.radar_sources s0 join public.radar_signals r0 on r0.source_id=s0.id where r0.id=p_signal for share of s0;
 select * into r from public.radar_signals where id=p_signal for share;
 if p_signal_revision is null or not public.radar_signal_usable(r,s,p_signal_revision) then raise exception 'radar_signal_unavailable' using errcode='23514'; end if;
 if not exists(select 1 from public.radar_hypothesis_signals where hypothesis_id=p_id and signal_key=p_signal) and (select count(*) from public.radar_hypothesis_signals where hypothesis_id=p_id)>=100 then raise exception 'radar_limit' using errcode='23514'; end if;
 insert into public.radar_hypothesis_signals(hypothesis_id,signal_key,signal_id,signal_revision,origin_key)
 values(p_id,p_signal,p_signal,p_signal_revision,nullif(btrim(p_origin),''))
 on conflict(hypothesis_id,signal_key) do update set signal_id=excluded.signal_id,signal_revision=excluded.signal_revision,origin_key=excluded.origin_key;
 perform public.radar_hypothesis_changed(p_id,'linked');
 end if;
end $$;
-- Lock order: hypothesis -> sources sorted -> signals sorted. Source/signal
-- writers never acquire hypothesis locks; expiry remains dynamically checked.
create function public.radar_lock_evidence(p_id uuid) returns void language plpgsql set search_path='' as $$
begin
 perform s.id from public.radar_sources s where s.id in(select r.source_id from public.radar_signals r join public.radar_hypothesis_signals l on l.signal_id=r.id where l.hypothesis_id=p_id) order by s.id for share;
 perform r.id from public.radar_signals r join public.radar_hypothesis_signals l on l.signal_id=r.id where l.hypothesis_id=p_id order by r.id for share of r;
end $$;
create function public.review_radar_hypothesis(p_id uuid,p_revision integer,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare h public.radar_hypotheses;
begin
 perform public.radar_require_admin();
 select * into h from public.radar_hypotheses where id=p_id for update;
 if not found or h.revision is distinct from p_revision or h.status='archived' or h.delete_after<=now() then raise exception 'radar_conflict' using errcode='40001'; end if;
 if p_action is null or p_action not in ('reviewed','archived') then raise exception 'radar_invalid' using errcode='23514'; end if;
 if p_action='reviewed' then
 perform public.radar_lock_evidence(p_id);
 h.status:='reviewed'; h.review_due_at:=now()+interval '180 days';
 if not public.radar_hypothesis_ready(h) then raise exception 'radar_evidence_unavailable' using errcode='23514'; end if;
 end if;
 update public.radar_hypotheses set status=p_action,reviewed_by=auth.uid(),reviewed_at=now(),
 review_due_at=case when p_action='reviewed' then now()+interval '180 days' end,
 delete_after=now()+case when p_action='reviewed' then interval '210 days' else interval '30 days' end,
 updated_at=now() where id=p_id;
 insert into public.radar_hypothesis_events(hypothesis_id,actor,revision,action) values(p_id,auth.uid(),h.revision,p_action);
end $$;

create function public.list_radar_hypotheses(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.radar_require_admin();
 if p_offset is null or p_offset<0 or p_offset>250000 then raise exception 'radar_invalid' using errcode='23514'; end if;
 return coalesce((select jsonb_agg(v.payload order by v.updated_at desc,v.id) from (
 select h.id,h.updated_at,jsonb_build_object('id',h.id,'title',h.title,'revision',h.revision,'hypothesis_language',h.hypothesis_language,'updated_at',h.updated_at,'review_due_at',h.review_due_at,
 'status',case when h.status='reviewed' and not public.radar_hypothesis_ready(h) then 'draft' else h.status end) payload
 from public.radar_hypotheses h where h.delete_after>now() order by h.updated_at desc,h.id limit 26 offset p_offset)v),'[]');
end $$;
create function public.get_radar_hypothesis(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare h public.radar_hypotheses; links jsonb; evidence jsonb;
begin
 perform public.radar_require_admin();
 select * into h from public.radar_hypotheses where id=p_id and delete_after>now();
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.signal_key,'revision',l.signal_revision,'usable',public.radar_signal_usable(r,s,l.signal_revision))
 ||case when public.radar_signal_usable(r,s,l.signal_revision) then jsonb_build_object('origin_key',l.origin_key,'summary',r.summary,'problem_observation',r.problem_observation,'source_url',r.source_url,'source_date',r.source_date,'source_name',s.name,'domain',s.domain,'source_language',r.source_language,'summary_language',r.summary_language,'region',s.region,'tags',r.tags) else '{}'::jsonb end order by l.signal_key),'[]') into links
 from public.radar_hypothesis_signals l left join public.radar_signals r on r.id=l.signal_id left join public.radar_sources s on s.id=r.source_id where l.hypothesis_id=p_id;
 select jsonb_build_object('signals',count(*),'sources',count(distinct s.id),'domains',count(distinct s.domain),
 'origins',count(distinct l.origin_key),'unknown_origins',count(*) filter(where l.origin_key is null),
 'earliest_date',min(r.source_date),'latest_date',max(r.source_date),'unknown_dates',count(*) filter(where r.source_date is null),
 'languages',coalesce(jsonb_agg(distinct r.source_language),'[]'),'regions',coalesce(jsonb_agg(distinct s.region),'[]'),
 'tags',coalesce((select jsonb_agg(distinct tag) from jsonb_array_elements(links) x cross join lateral jsonb_array_elements_text(x->'tags') tag where (x->>'usable')::boolean),'[]')) into evidence
 from public.radar_hypothesis_signals l join public.radar_signals r on r.id=l.signal_id join public.radar_sources s on s.id=r.source_id where l.hypothesis_id=p_id and public.radar_signal_usable(r,s,l.signal_revision);
 return to_jsonb(h)||jsonb_build_object('status',case when h.status='reviewed' and not public.radar_hypothesis_ready(h) then 'draft' else h.status end,
 'needs_review',h.status='reviewed' and not public.radar_hypothesis_ready(h),'ready',public.radar_hypothesis_ready(h),
 'can_handoff',public.is_network_member() and exists(select 1 from public.network_profiles where user_id=auth.uid() and status='active'),
 'signals',links,'evidence',evidence);
end $$;
create function public.find_radar_evidence(p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.radar_require_admin();
 if p_query is null or length(p_query)>100 or p_offset is null or p_offset<0 or p_offset>250000 then raise exception 'radar_invalid' using errcode='23514'; end if;
 return coalesce((select jsonb_agg(to_jsonb(v) order by v.captured_at desc,v.id) from (
 select r.id,r.revision,r.problem_observation,r.captured_at,s.name source_name
 from public.radar_signals r join public.radar_sources s on s.id=r.source_id where public.radar_signal_usable(r,s)
 and (p_query='' or strpos(lower(r.problem_observation||' '||r.summary||' '||s.name),lower(p_query))>0)
 order by r.captured_at desc,r.id limit 26 offset p_offset)v),'[]');
end $$;

-- Provenance is not a workspace authorization. Projection is called only AFTER
-- ordinary workspace membership checks. No RPC accepts a free entry/workspace ID.
create function public.radar_import_unusable(i public.radar_workspace_handoff_items) returns boolean
language sql stable set search_path='' as $$
 select not coalesce((select public.radar_signal_usable(r,s,i.signal_revision) from public.radar_signals r join public.radar_sources s on s.id=r.source_id where r.id=i.signal_id),false);
$$;
create function public.radar_project_workspace_entry(e public.network_problem_workspace_entries) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
 'content',case when exists(select 1 from public.radar_workspace_handoff_items i where i.entry_id=e.id and i.content_state='controlled' and public.radar_import_unusable(i)) then '[Radar import unavailable / Radar-Import nicht verfügbar]' else e.content end,
 'source_url',case when exists(select 1 from public.radar_workspace_handoff_items i where i.entry_id=e.id and i.link_state='controlled' and public.radar_import_unusable(i)) then null else e.source_url end,
 'source_label',case when exists(select 1 from public.radar_workspace_handoff_items i where i.entry_id=e.id and i.link_state='controlled' and public.radar_import_unusable(i)) then null else e.source_label end,
 'radar_import',exists(select 1 from public.radar_workspace_handoff_items i where i.entry_id=e.id));
$$;
create function public.radar_detach_edited_import() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.content is distinct from old.content or new.type is distinct from old.type then
 update public.radar_workspace_handoff_items set content_state='owner_edited' where entry_id=old.id and content_state='controlled';
 end if;
 if new.source_url is distinct from old.source_url or new.source_label is distinct from old.source_label then
 update public.radar_workspace_handoff_items set link_state='owner_edited' where entry_id=old.id and link_state='controlled';
 end if;
 return new;
end $$;
create trigger radar_detach_edited_import before update on public.network_problem_workspace_entries for each row execute function public.radar_detach_edited_import();

create function public.handoff_radar_hypothesis(p_id uuid,p_revision integer,p_request uuid,p_title text,p_description text,p_signals uuid[],p_links uuid[],p_confirm boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare h public.radar_hypotheses; old public.radar_workspace_handoffs; w uuid; assumption_id uuid; entry_id uuid; r record; fingerprint text;
begin
 perform public.radar_require_admin();
 -- Session eligibility, including profile, is never replaced by admin privilege.
 perform 1 from public.network_memberships where user_id=auth.uid() and status='active' for share;
 if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 perform 1 from public.network_profiles where user_id=auth.uid() and status='active' for share;
 if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 if p_confirm is distinct from true or p_request is null or p_signals is null or p_links is null or cardinality(p_signals)>100 or cardinality(p_links)>100
 or array_position(p_signals,null) is not null or array_position(p_links,null) is not null or not p_links<@p_signals
 or cardinality(p_signals)<>(select count(distinct x) from unnest(p_signals)x) or cardinality(p_links)<>(select count(distinct x) from unnest(p_links)x) then raise exception 'radar_invalid' using errcode='23514'; end if;
 fingerprint:=encode(extensions.digest(jsonb_build_object('id',p_id,'revision',p_revision,'title',p_title,'description',p_description,'signals',p_signals,'links',p_links)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into old from public.radar_workspace_handoffs where id=p_request;
 if found then
 if old.actor<>auth.uid() or old.request_hash<>fingerprint then raise exception 'radar_conflict' using errcode='40001'; end if;
 return old.workspace_id;
 end if;
 select * into h from public.radar_hypotheses where id=p_id for update;
 if not found or h.revision is distinct from p_revision then raise exception 'radar_conflict' using errcode='40001'; end if;
 perform public.radar_lock_evidence(p_id);
 if not public.radar_hypothesis_ready(h) then raise exception 'radar_review_required' using errcode='23514'; end if;
 if exists(select 1 from unnest(p_signals)x where not exists(select 1 from public.radar_hypothesis_signals l where l.hypothesis_id=p_id and l.signal_id=x)) then raise exception 'radar_signal_unavailable' using errcode='23514'; end if;
 w:=public.create_problem_workspace(p_title,p_description);
 insert into public.radar_workspace_handoffs(id,hypothesis_id,hypothesis_key,hypothesis_revision,workspace_id,actor,request_hash)
 values(p_request,p_id,p_id,h.revision,w,auth.uid(),fingerprint);
 assumption_id:=public.save_problem_workspace_entry(w,'assumption',h.problem_statement);
 -- The assumption depends on its reviewed evidence. Individual signal copies
 -- remain opt-in; dependency IDs store no additional signal text or URLs.
 insert into public.radar_workspace_handoff_items(handoff_id,signal_id,signal_key,signal_revision,entry_id,kind)
 select p_request,l.signal_id,l.signal_key,l.signal_revision,assumption_id,'assumption' from public.radar_hypothesis_signals l where l.hypothesis_id=p_id;
 for r in select s.* from public.radar_signals s where s.id=any(p_signals) order by s.id loop
 entry_id:=public.save_problem_workspace_entry(w,'perspective',case when h.hypothesis_language='de' then 'Externe Quelle · redaktionelle Kurzfassung: ' else 'External source · editorial summary: ' end||r.summary,
 case when r.id=any(p_links) then r.source_url end,case when r.id=any(p_links) then case when h.hypothesis_language='de' then 'Externe Quelle' else 'External source' end end);
 insert into public.radar_workspace_handoff_items(handoff_id,signal_id,signal_key,signal_revision,entry_id,kind,link_state)
 values(p_request,r.id,r.id,r.revision,entry_id,'signal',case when r.id=any(p_links) then 'controlled' else 'none' end);
 end loop;
 insert into public.radar_hypothesis_events(hypothesis_id,actor,revision,action) values(p_id,auth.uid(),h.revision,'handoff');
 return w;
end $$;

-- Counts only. No private titles, owner identities, members, text, or IDs.
create function public.list_radar_imports() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.radar_require_admin();
 return coalesce((select jsonb_agg(to_jsonb(v) order by v.signal_key) from (
 select i.signal_key,count(distinct i.handoff_id) workspaces,count(distinct i.entry_id) entries,
 bool_or(public.radar_import_unusable(i)) restricted,
 count(distinct i.entry_id) filter(where i.content_state='controlled' and public.radar_import_unusable(i)) redactable_texts,
 count(distinct i.entry_id) filter(where i.link_state='controlled' and public.radar_import_unusable(i)) redactable_links
 from public.radar_workspace_handoff_items i group by i.signal_key)v),'[]');
end $$;
create function public.redact_radar_imports(p_signal uuid,p_confirm boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare e record; redact_text boolean; redact_link boolean; n integer:=0;
begin
 perform public.radar_require_admin();
 if p_confirm is distinct from true then raise exception 'radar_confirmation_required' using errcode='23514'; end if;
 if not exists(select 1 from public.radar_workspace_handoff_items i where i.signal_key=p_signal and public.radar_import_unusable(i)) then raise exception 'radar_invalid' using errcode='23514'; end if;
 -- Lock only known import rows, never a client-supplied workspace/entry. The
 -- SELECT intentionally retrieves only IDs, not existing private content.
 for e in select w.id from public.network_problem_workspace_entries w where exists(select 1 from public.radar_workspace_handoff_items i where i.entry_id=w.id and i.signal_key=p_signal) order by w.id for update loop
 select coalesce(bool_or(i.content_state='controlled' and public.radar_import_unusable(i)),false),coalesce(bool_or(i.link_state='controlled' and public.radar_import_unusable(i)),false)
 into redact_text,redact_link from public.radar_workspace_handoff_items i where i.entry_id=e.id and i.signal_key=p_signal;
 -- State first: the edit trigger must not classify administrative redaction as
 -- independent owner writing. Shared assumption dependencies are all retired.
 if redact_text then
 update public.radar_workspace_handoff_items set content_state='redacted',redacted_by=auth.uid(),redacted_at=now() where entry_id=e.id and content_state='controlled';
 update public.network_problem_workspace_entries set content='[Radar import removed / Radar-Import entfernt]',updated_at=now() where id=e.id;
 end if;
 if redact_link then
 update public.radar_workspace_handoff_items set link_state='redacted',redacted_by=auth.uid(),redacted_at=now() where entry_id=e.id and link_state='controlled';
 update public.network_problem_workspace_entries set source_url=null,source_label=null,updated_at=now() where id=e.id;
 end if;
 if redact_text or redact_link then n:=n+1; end if;
 end loop;
 return n;
end $$;
create function public.purge_radar_hypotheses() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform public.radar_require_admin();
 delete from public.radar_hypotheses where id in(select id from public.radar_hypotheses where delete_after<=now() order by delete_after limit 250 for update skip locked);
 get diagnostics n=row_count;
 delete from public.radar_hypothesis_events where happened_at<=now()-interval '180 days';
 return n;
end $$;

-- Every new table is private; API is limited to the explicitly named RPCs.
do $$ declare t text; f record; begin
 foreach t in array array['radar_hypotheses','radar_hypothesis_signals','radar_hypothesis_events','radar_workspace_handoffs','radar_workspace_handoff_items'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname in (
 'radar_signal_usable','radar_hypothesis_ready','radar_hypothesis_changed','save_radar_hypothesis','link_radar_hypothesis_signal','radar_lock_evidence','review_radar_hypothesis','list_radar_hypotheses','get_radar_hypothesis','find_radar_evidence','radar_import_unusable','radar_project_workspace_entry','radar_detach_edited_import','handoff_radar_hypothesis','list_radar_imports','redact_radar_imports','purge_radar_hypotheses') loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',f.sig);
 end loop;
end $$;
grant execute on function public.save_radar_hypothesis(uuid,integer,jsonb),public.link_radar_hypothesis_signal(uuid,integer,uuid,integer,text,boolean),public.review_radar_hypothesis(uuid,integer,text),public.list_radar_hypotheses(integer),public.get_radar_hypothesis(uuid),public.find_radar_evidence(text,integer),public.handoff_radar_hypothesis(uuid,integer,uuid,text,text,uuid[],uuid[],boolean),public.list_radar_imports(),public.redact_radar_imports(uuid,boolean),public.purge_radar_hypotheses() to authenticated;

-- Replace existing projection bodies below without changing their access gates.
create or replace function public.list_radar_signals(p_status text default null,p_source uuid default null,p_language text default null,p_offset integer default 0,p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.radar_require_admin();
 if p_offset is null or p_offset<0 or p_offset>250000 or (p_status is not null and p_status not in ('new','reviewed','relevant','discarded')) or (p_language is not null and p_language not in ('de','en')) then raise exception 'radar_filter_invalid' using errcode='23514'; end if;
 return coalesce((select jsonb_agg(v.payload order by v.captured_at desc,v.id) from (
 select r.id,r.captured_at,
 (to_jsonb(r)-'url_fingerprint'-'item_fingerprint') || jsonb_build_object('source_name',s.name,'source_type',s.source_type,'source_region',s.region,
 'usable',public.radar_signal_usable(r,s),
 'source_usable',public.radar_source_usable(s),'overdue',r.review_due_at<=now(),'expired',coalesce(r.delete_after<=now(),false))
 || case when r.delete_after<=now() then jsonb_build_object('source_url',null,'source_title',null,'source_date',null,'summary',null,'problem_observation',null,'affected_context',null,'tags','[]'::jsonb) else '{}'::jsonb end as payload
 from public.radar_signals r join public.radar_sources s on s.id=r.source_id
 where (p_id is null or r.id=p_id) and (p_status is null or r.review_status=p_status) and (p_source is null or r.source_id=p_source) and (p_language is null or r.source_language=p_language)
 order by r.captured_at desc,r.id limit 26 offset p_offset
 )v),'[]');
end $$;

create or replace function public.get_problem_workspace(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.network_problem_workspaces; v_role text:=public.problem_workspace_role(p_workspace);
begin
 if v_role is null then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 select * into w from public.network_problem_workspaces where id=p_workspace;
 return jsonb_build_object('id',w.id,'title',w.title,'description',w.description,'status',w.status,'role',v_role,'updated_at',w.updated_at,
 -- Only its original author gets a source link; no rights to the source are conferred.
 'source_problem_id',case when v_role='owner' then w.source_problem_id end,
 'members',(select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',coalesce(nullif(c.display_name,''),'Member')) order by m.role,m.user_id)
 from (select w.owner_user_id user_id,'owner'::text role union all select user_id,role from public.network_problem_workspace_members where workspace_id=w.id) m left join public.person_core c on c.user_id=m.user_id),
 'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'author_user_id',e.author_user_id,'author_name',coalesce(nullif(c.display_name,''),'Member'),'type',e.type,'created_at',e.created_at,'updated_at',e.updated_at)||public.radar_project_workspace_entry(e) order by e.created_at,e.id)
 from public.network_problem_workspace_entries e left join public.person_core c on c.user_id=e.author_user_id where e.workspace_id=w.id and not public.is_network_interaction_blocked(e.author_user_id,auth.uid())),'[]'::jsonb),
 'invites',case when v_role='owner' then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,'expires_at',i.expires_at) order by i.created_at desc) from public.network_problem_workspace_invites i where i.workspace_id=w.id),'[]'::jsonb) else '[]'::jsonb end);
end; $$;

notify pgrst,'reload schema';
commit;
