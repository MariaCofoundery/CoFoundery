begin;
-- Reapproval must respect today's approved URL scope, not only the source ID.
create or replace function public.review_radar_signal(p_id uuid,p_revision integer,p_action text,p_reason text default 'manual_review') returns void
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
 if p_action in ('reviewed','relevant','unblocked') then perform public.radar_check_scope(s,r.source_url); end if;
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

notify pgrst,'reload schema';
commit;
