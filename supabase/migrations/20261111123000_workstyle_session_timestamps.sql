begin;
-- Distinguish reassessments even inside the same transaction. now() is constant
-- for the whole transaction and can otherwise make a resumed session ambiguous.
alter table public.workstyle_pretest_sessions alter column started_at set default clock_timestamp();
alter table public.workstyle_pretest_sessions alter column consent_given_at set default clock_timestamp();

create or replace function public.complete_workstyle_pretest(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; completed_time timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.completed_at is not null then return; end if;
 if (select count(*) from public.alignment_answers where assessment_id=p_assessment_id)<>20
   or (select count(*) from public.workstyle_research_responses where assessment_id=p_assessment_id)<>
     (select count(*) from public.workstyle_item_versions where definition->>'form'=s.form and instrument_id='founder-workstyle-pretest-8-5a-v1') then
   raise exception 'workstyle_incomplete' using errcode='23514';
 end if;
 completed_time:=clock_timestamp();
 update public.assessments set submitted_at=completed_time where id=p_assessment_id;
 update public.workstyle_pretest_sessions set completed_at=completed_time where assessment_id=p_assessment_id;
end $$;
commit;
