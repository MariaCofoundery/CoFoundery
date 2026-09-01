\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_discovery_journey(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'discovery journey continuity assertion failed: %', message;
  end if;
end;
$$;

-- Repeats the migration's one-time backfill so the exact selection can be
-- exercised twice against the same local fixture.
create or replace function pg_temp.run_discovery_input_backfill()
returns void language plpgsql as $$
begin
  insert into public.matching_session_inputs (
    matching_session_id, user_id, module, assessment_id
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
   and participant.user_id in (matching_start.requester_user_id, matching_start.recipient_user_id)
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
  on conflict (matching_session_id, user_id, module) do nothing;

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
          select 1 from public.matching_session_participants requester
          where requester.matching_session_id = session.id
            and requester.user_id = matching_start.requester_user_id
            and requester.status = 'active'
        )
        and exists (
          select 1 from public.matching_session_participants recipient
          where recipient.matching_session_id = session.id
            and recipient.user_id = matching_start.recipient_user_id
            and recipient.status = 'active'
        )
    )
    and exists (
      select 1 from public.matching_session_participants participant
      where participant.matching_session_id = session.id
        and participant.status = 'active'
    )
    and exists (
      select 1 from public.matching_session_modules session_module
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
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd4111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'journey-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'journey-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'journey-outsider@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'journey-inactive@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'journey-history-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'journey-history-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'journey-no-submit@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.assessments (id, user_id, module, submitted_at, created_at) values
  ('d4a11111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'base', '2026-01-01 10:00:00+00', '2026-01-01 09:00:00+00'),
  ('d4a11222-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'base', '2026-02-01 10:00:00+00', '2026-02-01 09:00:00+00'),
  ('d4a22222-2222-4222-8222-222222222222', 'd4222222-2222-4222-8222-222222222222', 'base', null, now()),
  ('d4a33333-3333-4333-8333-333333333333', 'd4333333-3333-4333-8333-333333333333', 'base', null, now()),
  ('d4a44444-4444-4444-8444-444444444444', 'd4444444-4444-4444-8444-444444444444', 'base', null, now()),
  ('d4a55111-5555-4555-8555-555555555555', 'd4555555-5555-4555-8555-555555555555', 'base', '2026-03-01 10:00:00+00', '2026-03-01 09:00:00+00'),
  ('d4a55222-5555-4555-8555-555555555555', 'd4555555-5555-4555-8555-555555555555', 'base', '2026-04-01 10:00:00+00', '2026-04-01 09:00:00+00'),
  ('d4a66111-6666-4666-8666-666666666666', 'd4666666-6666-4666-8666-666666666666', 'base', '2026-03-15 10:00:00+00', '2026-03-15 09:00:00+00'),
  ('d4a66222-6666-4666-8666-666666666666', 'd4666666-6666-4666-8666-666666666666', 'base', '2026-04-15 10:00:00+00', '2026-04-15 09:00:00+00'),
  ('d4a77777-7777-4777-8777-777777777777', 'd4777777-7777-4777-8777-777777777777', 'base', null, now());

insert into public.discovery_intro_requests (
  id, requester_user_id, recipient_user_id, status, responded_at
) values
  ('d4011111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'accepted', now()),
  ('d4022222-2222-4222-8222-222222222222', 'd4111111-1111-4111-8111-111111111111', 'd4444444-4444-4444-8444-444444444444', 'accepted', now()),
  ('d4033333-3333-4333-8333-333333333333', 'd4111111-1111-4111-8111-111111111111', 'd4444444-4444-4444-8444-444444444444', 'accepted', now()),
  ('d4044444-4444-4444-8444-444444444444', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'accepted', now()),
  ('d4055555-5555-4555-8555-555555555555', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'accepted', now()),
  ('d4066666-6666-4666-8666-666666666666', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'accepted', now()),
  ('d4077777-7777-4777-8777-777777777777', 'd4555555-5555-4555-8555-555555555555', 'd4666666-6666-4666-8666-666666666666', 'accepted', now()),
  ('d4088888-8888-4888-8888-888888888888', 'd4555555-5555-4555-8555-555555555555', 'd4777777-7777-4777-8777-777777777777', 'accepted', now());

insert into public.discovery_matching_starts (
  id, intro_request_id, initiator_user_id, requester_user_id,
  recipient_user_id, status, requested_by_user_id, requested_at,
  confirmed_by_user_id, confirmed_at
) values
  ('d4c11111-1111-4111-8111-111111111111', 'd4011111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'ready_for_matching', 'd4111111-1111-4111-8111-111111111111', now(), 'd4222222-2222-4222-8222-222222222222', now()),
  ('d4c22222-2222-4222-8222-222222222222', 'd4022222-2222-4222-8222-222222222222', 'd4111111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4444444-4444-4444-8444-444444444444', 'ready_for_matching', 'd4111111-1111-4111-8111-111111111111', now(), 'd4444444-4444-4444-8444-444444444444', now()),
  ('d4c33333-3333-4333-8333-333333333333', 'd4033333-3333-4333-8333-333333333333', 'd4111111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4444444-4444-4444-8444-444444444444', 'ready_for_matching', 'd4111111-1111-4111-8111-111111111111', now(), 'd4444444-4444-4444-8444-444444444444', now()),
  ('d4c44444-4444-4444-8444-444444444444', 'd4044444-4444-4444-8444-444444444444', 'd4111111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'ready_for_matching', 'd4111111-1111-4111-8111-111111111111', now(), 'd4222222-2222-4222-8222-222222222222', now()),
  ('d4c55555-5555-4555-8555-555555555555', 'd4055555-5555-4555-8555-555555555555', 'd4111111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'ready_for_matching', 'd4111111-1111-4111-8111-111111111111', now(), 'd4222222-2222-4222-8222-222222222222', now()),
  ('d4c66666-6666-4666-8666-666666666666', 'd4066666-6666-4666-8666-666666666666', 'd4111111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'ready_for_matching', 'd4111111-1111-4111-8111-111111111111', now(), 'd4222222-2222-4222-8222-222222222222', now()),
  ('d4c77777-7777-4777-8777-777777777777', 'd4077777-7777-4777-8777-777777777777', 'd4555555-5555-4555-8555-555555555555', 'd4555555-5555-4555-8555-555555555555', 'd4666666-6666-4666-8666-666666666666', 'ready_for_matching', 'd4555555-5555-4555-8555-555555555555', now(), 'd4666666-6666-4666-8666-666666666666', now()),
  ('d4c88888-8888-4888-8888-888888888888', 'd4088888-8888-4888-8888-888888888888', 'd4555555-5555-4555-8555-555555555555', 'd4555555-5555-4555-8555-555555555555', 'd4777777-7777-4777-8777-777777777777', 'ready_for_matching', 'd4555555-5555-4555-8555-555555555555', now(), 'd4777777-7777-4777-8777-777777777777', now());

insert into public.matching_sessions (
  id, source_type, source_id, status, created_by_user_id, canceled_at, report_ready_at
) values
  ('d4b11111-1111-4111-8111-111111111111', 'discovery_matching_start', 'd4c11111-1111-4111-8111-111111111111', 'awaiting_inputs', 'd4111111-1111-4111-8111-111111111111', null, null),
  ('d4b22222-2222-4222-8222-222222222222', 'discovery_matching_start', 'd4c22222-2222-4222-8222-222222222222', 'awaiting_inputs', 'd4111111-1111-4111-8111-111111111111', null, null),
  ('d4b33333-3333-4333-8333-333333333333', 'discovery_matching_start', 'd4c33333-3333-4333-8333-333333333333', 'canceled', 'd4111111-1111-4111-8111-111111111111', now(), null),
  ('d4b44444-4444-4444-8444-444444444444', 'discovery_matching_start', 'd4c44444-4444-4444-8444-444444444444', 'ready_for_report', 'd4111111-1111-4111-8111-111111111111', null, now()),
  ('d4b55555-5555-4555-8555-555555555555', 'discovery_matching_start', 'd4c55555-5555-4555-8555-555555555555', 'report_ready', 'd4111111-1111-4111-8111-111111111111', null, now()),
  ('d4b66666-6666-4666-8666-666666666666', 'discovery_matching_start', 'd4c66666-6666-4666-8666-666666666666', 'report_ready', 'd4111111-1111-4111-8111-111111111111', null, now()),
  ('d4b77777-7777-4777-8777-777777777777', 'discovery_matching_start', 'd4c77777-7777-4777-8777-777777777777', 'awaiting_inputs', 'd4555555-5555-4555-8555-555555555555', null, null),
  ('d4b88888-8888-4888-8888-888888888888', 'discovery_matching_start', 'd4c88888-8888-4888-8888-888888888888', 'awaiting_inputs', 'd4555555-5555-4555-8555-555555555555', null, null),
  ('d4b99999-9999-4999-8999-999999999999', 'manual', null, 'awaiting_inputs', 'd4555555-5555-4555-8555-555555555555', null, null);

insert into public.matching_session_participants (
  matching_session_id, user_id, role, status, confirmed_at
) values
  ('d4b11111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'founder', 'active', now()),
  ('d4b11111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222', 'founder', 'active', now()),
  ('d4b22222-2222-4222-8222-222222222222', 'd4111111-1111-4111-8111-111111111111', 'founder', 'active', now()),
  ('d4b22222-2222-4222-8222-222222222222', 'd4444444-4444-4444-8444-444444444444', 'founder', 'left', now()),
  ('d4b33333-3333-4333-8333-333333333333', 'd4111111-1111-4111-8111-111111111111', 'founder', 'active', now()),
  ('d4b33333-3333-4333-8333-333333333333', 'd4444444-4444-4444-8444-444444444444', 'founder', 'active', now()),
  ('d4b44444-4444-4444-8444-444444444444', 'd4111111-1111-4111-8111-111111111111', 'founder', 'active', now()),
  ('d4b44444-4444-4444-8444-444444444444', 'd4222222-2222-4222-8222-222222222222', 'founder', 'active', now()),
  ('d4b55555-5555-4555-8555-555555555555', 'd4111111-1111-4111-8111-111111111111', 'founder', 'active', now()),
  ('d4b55555-5555-4555-8555-555555555555', 'd4222222-2222-4222-8222-222222222222', 'founder', 'active', now()),
  ('d4b66666-6666-4666-8666-666666666666', 'd4111111-1111-4111-8111-111111111111', 'founder', 'active', now()),
  ('d4b66666-6666-4666-8666-666666666666', 'd4222222-2222-4222-8222-222222222222', 'founder', 'active', now()),
  ('d4b77777-7777-4777-8777-777777777777', 'd4555555-5555-4555-8555-555555555555', 'founder', 'active', now()),
  ('d4b77777-7777-4777-8777-777777777777', 'd4666666-6666-4666-8666-666666666666', 'founder', 'active', now()),
  ('d4b88888-8888-4888-8888-888888888888', 'd4555555-5555-4555-8555-555555555555', 'founder', 'active', now()),
  ('d4b88888-8888-4888-8888-888888888888', 'd4777777-7777-4777-8777-777777777777', 'founder', 'active', now()),
  ('d4b99999-9999-4999-8999-999999999999', 'd4555555-5555-4555-8555-555555555555', 'founder', 'active', now()),
  ('d4b99999-9999-4999-8999-999999999999', 'd4666666-6666-4666-8666-666666666666', 'founder', 'active', now());

insert into public.matching_session_modules (matching_session_id, module, required)
select id, 'base'::public.assessment_module, true
from public.matching_sessions
where id::text like 'd4b%';

insert into public.matching_session_inputs (
  matching_session_id, user_id, module, assessment_id
) values
  ('d4b11111-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'base', 'd4a11111-1111-4111-8111-111111111111'),
  ('d4b44444-4444-4444-8444-444444444444', 'd4111111-1111-4111-8111-111111111111', 'base', 'd4a11111-1111-4111-8111-111111111111'),
  ('d4b55555-5555-4555-8555-555555555555', 'd4111111-1111-4111-8111-111111111111', 'base', 'd4a11111-1111-4111-8111-111111111111'),
  ('d4b66666-6666-4666-8666-666666666666', 'd4111111-1111-4111-8111-111111111111', 'base', 'd4a11111-1111-4111-8111-111111111111'),
  ('d4b77777-7777-4777-8777-777777777777', 'd4555555-5555-4555-8555-555555555555', 'base', 'd4a55111-5555-4555-8555-555555555555'),
  ('d4b88888-8888-4888-8888-888888888888', 'd4555555-5555-4555-8555-555555555555', 'base', 'd4a55111-5555-4555-8555-555555555555');

insert into public.matching_report_runs (
  id, matching_session_id, modules, input_assessment_ids, payload, created_by_user_id
) values
  ('d4d55555-5555-4555-8555-555555555555', 'd4b55555-5555-4555-8555-555555555555', array['base']::public.assessment_module[], array['d4a11111-1111-4111-8111-111111111111']::uuid[], '{"reportType":"founder_alignment_v1"}', 'd4111111-1111-4111-8111-111111111111'),
  ('d4d66666-6666-4666-8666-666666666666', 'd4b66666-6666-4666-8666-666666666666', array['base']::public.assessment_module[], array['d4a11111-1111-4111-8111-111111111111']::uuid[], '{"reportType":"founder_alignment_v1"}', 'd4111111-1111-4111-8111-111111111111');

insert into public.relationships (id, user_a_id, user_b_id)
values ('d4e66666-6666-4666-8666-666666666666', 'd4111111-1111-4111-8111-111111111111', 'd4222222-2222-4222-8222-222222222222');

insert into public.matching_workspaces (
  id, matching_session_id, matching_report_run_id, relationship_id,
  created_by_user_id, status
) values (
  'd4f66666-6666-4666-8666-666666666666',
  'd4b66666-6666-4666-8666-666666666666',
  'd4d66666-6666-4666-8666-666666666666',
  'd4e66666-6666-4666-8666-666666666666',
  'd4111111-1111-4111-8111-111111111111',
  'prepared'
);

update public.assessments set submitted_at = now()
where id in ('d4a33333-3333-4333-8333-333333333333', 'd4a44444-4444-4444-8444-444444444444');

select pg_temp.assert_discovery_journey(
  (select status = 'awaiting_inputs' from public.matching_sessions where id = 'd4b11111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.matching_session_inputs where assessment_id in ('d4a33333-3333-4333-8333-333333333333', 'd4a44444-4444-4444-8444-444444444444'))
  and (select status = 'canceled' from public.matching_sessions where id = 'd4b33333-3333-4333-8333-333333333333'),
  'non-participant, inactive-participant, or canceled-session submit changed a session'
);

-- A later A submission must not replace A's existing session snapshot.
insert into public.assessments (id, user_id, module, submitted_at)
values ('d4a11333-1111-4111-8111-111111111111', 'd4111111-1111-4111-8111-111111111111', 'base', now());

select pg_temp.assert_discovery_journey(
  exists (select 1 from public.matching_session_inputs where matching_session_id = 'd4b11111-1111-4111-8111-111111111111' and user_id = 'd4111111-1111-4111-8111-111111111111' and assessment_id = 'd4a11111-1111-4111-8111-111111111111'),
  'trigger overwrote an existing founder input snapshot'
);

update public.assessments set submitted_at = now()
where id = 'd4a22222-2222-4222-8222-222222222222';

select pg_temp.assert_discovery_journey(
  (select status = 'ready_for_report' and report_ready_at is not null from public.matching_sessions where id = 'd4b11111-1111-4111-8111-111111111111')
  and exists (select 1 from public.matching_session_inputs where matching_session_id = 'd4b11111-1111-4111-8111-111111111111' and user_id = 'd4222222-2222-4222-8222-222222222222' and assessment_id = 'd4a22222-2222-4222-8222-222222222222'),
  'later participant submit did not bind the missing input and complete readiness'
);

update public.assessments
set submitted_at = submitted_at
where id = 'd4a22222-2222-4222-8222-222222222222';

select pg_temp.assert_discovery_journey(
  (select count(*) = 2 from public.matching_session_inputs where matching_session_id = 'd4b11111-1111-4111-8111-111111111111')
  and exists (select 1 from public.matching_session_inputs where matching_session_id = 'd4b11111-1111-4111-8111-111111111111' and user_id = 'd4111111-1111-4111-8111-111111111111' and assessment_id = 'd4a11111-1111-4111-8111-111111111111')
  and exists (select 1 from public.matching_session_inputs where matching_session_id = 'd4b11111-1111-4111-8111-111111111111' and user_id = 'd4222222-2222-4222-8222-222222222222' and assessment_id = 'd4a22222-2222-4222-8222-222222222222'),
  'a repeated technical assessment update changed the trigger result'
);

select pg_temp.run_discovery_input_backfill();

create temporary table discovery_backfill_snapshot as
select session.id, session.status, session.report_ready_at,
  coalesce(jsonb_agg(jsonb_build_object('user', input.user_id, 'assessment', input.assessment_id) order by input.user_id) filter (where input.id is not null), '[]'::jsonb) as inputs
from public.matching_sessions session
left join public.matching_session_inputs input on input.matching_session_id = session.id
group by session.id, session.status, session.report_ready_at;

select pg_temp.run_discovery_input_backfill();

select pg_temp.assert_discovery_journey(
  exists (select 1 from public.matching_session_inputs where matching_session_id = 'd4b77777-7777-4777-8777-777777777777' and user_id = 'd4555555-5555-4555-8555-555555555555' and assessment_id = 'd4a55111-5555-4555-8555-555555555555')
  and exists (select 1 from public.matching_session_inputs where matching_session_id = 'd4b77777-7777-4777-8777-777777777777' and user_id = 'd4666666-6666-4666-8666-666666666666' and assessment_id = 'd4a66222-6666-4666-8666-666666666666')
  and (select status = 'ready_for_report' from public.matching_sessions where id = 'd4b77777-7777-4777-8777-777777777777'),
  'backfill overwrote an existing snapshot, chose the wrong historical assessment, or missed readiness'
);

select pg_temp.assert_discovery_journey(
  (select status = 'awaiting_inputs' from public.matching_sessions where id = 'd4b88888-8888-4888-8888-888888888888')
  and (select count(*) = 1 from public.matching_session_inputs where matching_session_id = 'd4b88888-8888-4888-8888-888888888888')
  and (select status = 'awaiting_inputs' from public.matching_sessions where id = 'd4b99999-9999-4999-8999-999999999999'),
  'partial Discovery input advanced readiness or a non-Discovery session was backfilled'
);

select pg_temp.assert_discovery_journey(
  not exists (
    select 1
    from discovery_backfill_snapshot snapshot
    join public.matching_sessions session on session.id = snapshot.id
    left join lateral (
      select coalesce(jsonb_agg(jsonb_build_object('user', input.user_id, 'assessment', input.assessment_id) order by input.user_id), '[]'::jsonb) as inputs
      from public.matching_session_inputs input
      where input.matching_session_id = session.id
    ) current_inputs on true
    where snapshot.status is distinct from session.status
       or snapshot.report_ready_at is distinct from session.report_ready_at
       or snapshot.inputs is distinct from current_inputs.inputs
  ),
  'repeated backfill changed references, status, or readiness timestamp'
);

select pg_temp.assert_discovery_journey(
  (select status = 'ready_for_report' from public.matching_sessions where id = 'd4b44444-4444-4444-8444-444444444444')
  and (select status = 'report_ready' from public.matching_sessions where id = 'd4b55555-5555-4555-8555-555555555555')
  and exists (select 1 from public.matching_report_runs where matching_session_id = 'd4b55555-5555-4555-8555-555555555555')
  and (select status = 'report_ready' from public.matching_sessions where id = 'd4b66666-6666-4666-8666-666666666666')
  and exists (select 1 from public.matching_workspaces where matching_session_id = 'd4b66666-6666-4666-8666-666666666666'),
  'ready, reported, or workspace history was modified'
);

select pg_temp.assert_discovery_journey(
  not has_function_privilege('authenticated', 'public.bind_submitted_base_assessment_to_discovery_sessions()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.bind_submitted_base_assessment_to_discovery_sessions()', 'EXECUTE'),
  'the trigger-only lifecycle function is directly executable by clients'
);

select extensions.pass('Discovery continuity is no-overwrite, participant-bound, lifecycle-safe and idempotent');
select * from extensions.finish();

rollback;
