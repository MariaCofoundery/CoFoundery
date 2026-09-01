begin;

create or replace function public.bind_submitted_base_assessment_to_discovery_sessions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.module <> 'base'::public.assessment_module
     or new.submitted_at is null then
    return new;
  end if;

  insert into public.matching_session_inputs (
    matching_session_id,
    user_id,
    module,
    assessment_id
  )
  select
    session.id,
    new.user_id,
    'base'::public.assessment_module,
    new.id
  from public.matching_sessions session
  join public.discovery_matching_starts matching_start
    on matching_start.id = session.source_id
   and matching_start.status = 'ready_for_matching'
   and new.user_id in (matching_start.requester_user_id, matching_start.recipient_user_id)
  join public.matching_session_participants participant
    on participant.matching_session_id = session.id
   and participant.user_id = new.user_id
   and participant.status = 'active'
  join public.matching_session_modules session_module
    on session_module.matching_session_id = session.id
   and session_module.module = 'base'::public.assessment_module
   and session_module.required
  where session.source_type = 'discovery_matching_start'
    and session.status = 'awaiting_inputs'
    and not exists (
      select 1
      from public.matching_session_inputs existing_input
      where existing_input.matching_session_id = session.id
        and existing_input.user_id = new.user_id
        and existing_input.module = 'base'::public.assessment_module
    )
  on conflict (matching_session_id, user_id, module)
  do nothing;

  update public.matching_sessions session
  set status = 'ready_for_report',
      report_ready_at = coalesce(session.report_ready_at, now())
  where session.source_type = 'discovery_matching_start'
    and session.status = 'awaiting_inputs'
    and exists (
      select 1
      from public.discovery_matching_starts matching_start
      where matching_start.id = session.source_id
        and matching_start.status = 'ready_for_matching'
        and exists (
          select 1
          from public.matching_session_participants requester
          where requester.matching_session_id = session.id
            and requester.user_id = matching_start.requester_user_id
            and requester.status = 'active'
        )
        and exists (
          select 1
          from public.matching_session_participants recipient
          where recipient.matching_session_id = session.id
            and recipient.user_id = matching_start.recipient_user_id
            and recipient.status = 'active'
        )
    )
    and exists (
      select 1
      from public.matching_session_participants participant
      where participant.matching_session_id = session.id
        and participant.user_id = new.user_id
        and participant.status = 'active'
    )
    and exists (
      select 1
      from public.matching_session_modules session_module
      where session_module.matching_session_id = session.id
        and session_module.required
    )
    and not exists (
      select 1
      from public.matching_session_participants participant
      cross join public.matching_session_modules session_module
      where participant.matching_session_id = session.id
        and participant.status = 'active'
        and session_module.matching_session_id = session.id
        and session_module.required
        and not exists (
          select 1
          from public.matching_session_inputs input
          join public.assessments assessment
            on assessment.id = input.assessment_id
           and assessment.user_id = input.user_id
           and assessment.module = input.module
           and assessment.submitted_at is not null
          where input.matching_session_id = session.id
            and input.user_id = participant.user_id
            and input.module = session_module.module
        )
    );

  return new;
end;
$$;

revoke all on function public.bind_submitted_base_assessment_to_discovery_sessions()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_bind_inserted_base_to_discovery_sessions
  on public.assessments;

create trigger trg_bind_inserted_base_to_discovery_sessions
after insert on public.assessments
for each row
when (new.submitted_at is not null)
execute function public.bind_submitted_base_assessment_to_discovery_sessions();

drop trigger if exists trg_bind_submitted_base_to_discovery_sessions
  on public.assessments;

create trigger trg_bind_submitted_base_to_discovery_sessions
after update of submitted_at on public.assessments
for each row
when (old.submitted_at is null and new.submitted_at is not null)
execute function public.bind_submitted_base_assessment_to_discovery_sessions();

-- Bring already waiting Discovery sessions onto the same reference-only contract.
insert into public.matching_session_inputs (
  matching_session_id,
  user_id,
  module,
  assessment_id
)
select
  session.id,
  participant.user_id,
  'base'::public.assessment_module,
  assessment.id
from public.matching_sessions session
join public.discovery_matching_starts matching_start
  on matching_start.id = session.source_id
 and matching_start.status = 'ready_for_matching'
join public.matching_session_participants participant
  on participant.matching_session_id = session.id
 and participant.status = 'active'
 and participant.user_id in (
   matching_start.requester_user_id,
   matching_start.recipient_user_id
 )
join public.matching_session_modules session_module
  on session_module.matching_session_id = session.id
 and session_module.module = 'base'::public.assessment_module
 and session_module.required
join lateral (
  select candidate.id
  from public.assessments candidate
  where candidate.user_id = participant.user_id
    and candidate.module = 'base'::public.assessment_module
    and candidate.submitted_at is not null
  order by candidate.submitted_at desc, candidate.created_at desc, candidate.id desc
  limit 1
) assessment on true
where session.source_type = 'discovery_matching_start'
  and session.status = 'awaiting_inputs'
  and not exists (
    select 1
    from public.matching_session_inputs existing_input
    where existing_input.matching_session_id = session.id
      and existing_input.user_id = participant.user_id
      and existing_input.module = 'base'::public.assessment_module
  )
on conflict (matching_session_id, user_id, module)
do nothing;

update public.matching_sessions session
set status = 'ready_for_report',
    report_ready_at = coalesce(session.report_ready_at, now())
where session.source_type = 'discovery_matching_start'
  and session.status = 'awaiting_inputs'
  and exists (
    select 1
    from public.discovery_matching_starts matching_start
    where matching_start.id = session.source_id
      and matching_start.status = 'ready_for_matching'
      and exists (
        select 1
        from public.matching_session_participants requester
        where requester.matching_session_id = session.id
          and requester.user_id = matching_start.requester_user_id
          and requester.status = 'active'
      )
      and exists (
        select 1
        from public.matching_session_participants recipient
        where recipient.matching_session_id = session.id
          and recipient.user_id = matching_start.recipient_user_id
          and recipient.status = 'active'
      )
  )
  and exists (
    select 1
    from public.matching_session_participants participant
    where participant.matching_session_id = session.id
      and participant.status = 'active'
  )
  and exists (
    select 1
    from public.matching_session_modules session_module
    where session_module.matching_session_id = session.id
      and session_module.required
  )
  and not exists (
    select 1
    from public.matching_session_participants participant
    cross join public.matching_session_modules session_module
    where participant.matching_session_id = session.id
      and participant.status = 'active'
      and session_module.matching_session_id = session.id
      and session_module.required
      and not exists (
        select 1
        from public.matching_session_inputs input
        join public.assessments assessment
          on assessment.id = input.assessment_id
         and assessment.user_id = input.user_id
         and assessment.module = input.module
         and assessment.submitted_at is not null
        where input.matching_session_id = session.id
          and input.user_id = participant.user_id
          and input.module = session_module.module
      )
  );

comment on function public.bind_submitted_base_assessment_to_discovery_sessions() is
  'Binds a newly submitted Base assessment to existing waiting Discovery matching sessions and advances only fully supplied sessions. It stores assessment references, never raw answers.';

commit;
