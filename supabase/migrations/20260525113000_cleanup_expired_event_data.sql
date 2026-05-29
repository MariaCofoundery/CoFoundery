create or replace function public.cleanup_expired_event_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed_events integer := 0;
  v_deleted_answers integer := 0;
  v_deleted_participants integer := 0;
begin
  update public.events
  set status = 'closed'
  where ends_at is not null
    and ends_at < now()
    and status = 'live';

  get diagnostics v_closed_events = row_count;

  with expired_events as (
    select id
    from public.events
    where ends_at is not null
      and ends_at < now() - interval '24 hours'
  )
  delete from public.event_answers answer
  using expired_events event
  where answer.event_id = event.id;

  get diagnostics v_deleted_answers = row_count;

  with expired_events as (
    select id
    from public.events
    where ends_at is not null
      and ends_at < now() - interval '24 hours'
  )
  delete from public.event_participants participant
  using expired_events event
  where participant.event_id = event.id;

  get diagnostics v_deleted_participants = row_count;

  return jsonb_build_object(
    'closedEvents', v_closed_events,
    'deletedAnswers', v_deleted_answers,
    'deletedParticipants', v_deleted_participants
  );
end;
$$;

create or replace function public.schedule_event_data_cleanup_job(
  p_cleanup_schedule text default '15 * * * *'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_pg_cron boolean := exists(select 1 from pg_extension where extname = 'pg_cron');
  v_cleanup_job_id bigint;
begin
  if not v_has_pg_cron then
    return jsonb_build_object(
      'scheduled', false,
      'reason', 'pg_cron_not_installed',
      'cleanupCommand', 'select public.cleanup_expired_event_data();'
    );
  end if;

  execute $sql$
    select cron.unschedule(jobid)
    from cron.job
    where jobname = 'event_data_cleanup'
  $sql$;

  execute format(
    'select cron.schedule(%L, %L, %L)',
    'event_data_cleanup',
    p_cleanup_schedule,
    'select public.cleanup_expired_event_data();'
  )
  into v_cleanup_job_id;

  return jsonb_build_object(
    'scheduled', true,
    'cleanupJobId', v_cleanup_job_id,
    'schedule', p_cleanup_schedule
  );
end;
$$;

revoke execute on function public.cleanup_expired_event_data() from public;
revoke execute on function public.cleanup_expired_event_data() from anon;
revoke execute on function public.cleanup_expired_event_data() from authenticated;
grant execute on function public.cleanup_expired_event_data() to service_role;

revoke execute on function public.schedule_event_data_cleanup_job(text) from public;
revoke execute on function public.schedule_event_data_cleanup_job(text) from anon;
revoke execute on function public.schedule_event_data_cleanup_job(text) from authenticated;
grant execute on function public.schedule_event_data_cleanup_job(text) to service_role;
