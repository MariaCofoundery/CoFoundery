begin;
-- Distinct explicitly identified items may share a collection-page URL. A URL
-- alone remains a conservative fallback, never a semantic grouping rule.
alter table public.radar_signals drop constraint radar_signals_source_id_url_fingerprint_key;
create unique index radar_signals_url_identity_idx on public.radar_signals(source_id,url_fingerprint) where item_fingerprint is null;
create or replace function public.save_radar_signal(p_id uuid,p_revision integer,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.radar_sources; r public.radar_signals; old public.radar_signals; k text; u text; fp text; item_fp text; duplicate_id uuid; v_id uuid;
begin
 perform public.radar_require_admin();
 if p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'radar_invalid' using errcode='23514'; end if;
 for k in select jsonb_object_keys(p_input) loop
 if k not in ('source_id','source_url','source_title','source_date','source_language','summary_language','summary','problem_observation','affected_context','tags','stable_public_item_id','availability','sensitivity') then raise exception 'radar_field_invalid' using errcode='23514'; end if;
 end loop;
 r:=jsonb_populate_record(null::public.radar_signals,p_input);
 select * into s from public.radar_sources where id=r.source_id for update;
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
 -- Serialize this small manual write flow on its source. Item identity wins;
 -- URL-only captures cannot silently create a second copy of an existing item.
 select id into duplicate_id from public.radar_signals where source_id=s.id and
   ((item_fp is not null and item_fingerprint=item_fp)
    or (url_fingerprint=fp and (item_fp is null or item_fingerprint is null)))
 order by captured_at,id limit 1;
 if duplicate_id is not null then return jsonb_build_object('id',duplicate_id,'duplicate',true); end if;
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

notify pgrst,'reload schema';
commit;
