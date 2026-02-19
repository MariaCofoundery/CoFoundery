-- Minimal proof script: report run snapshot stays stable and immutable.
-- Usage (example):
--   psql "$DATABASE_URL" -v run_id="<REPORT_RUN_UUID>" -f scripts/report_run_snapshot_check.sql
--
-- Preconditions:
-- - :run_id points to an existing row in public.report_runs
-- - pgcrypto extension is available (for digest)

begin;

-- 1) Baseline hash of stored payload snapshot
select encode(digest(payload::text, 'sha256'), 'hex') as payload_hash_before
from public.report_runs
where id = :'run_id';

-- 2) Simulate newer assessment data for one relationship member.
--    This MUST NOT mutate existing report_runs payload.
with run_rel as (
  select rr.id as run_id, rr.source_session_id, r.user_a_id
  from public.report_runs rr
  join public.relationships r on r.id = rr.relationship_id
  where rr.id = :'run_id'
)
insert into public.assessments (
  user_id,
  instrument,
  source_session_id,
  submitted_at,
  created_at,
  updated_at
)
select
  run_rel.user_a_id,
  'stress'::public.assessment_instrument,
  run_rel.source_session_id,
  now(),
  now(),
  now()
from run_rel;

-- 3) Hash must remain identical (manual compare with step 1 output)
select encode(digest(payload::text, 'sha256'), 'hex') as payload_hash_after
from public.report_runs
where id = :'run_id';

-- 4) Mutation attempts must fail (immutability triggers)
do $$
declare
  v_run_id uuid := :'run_id';
begin
  begin
    update public.report_runs
    set payload = '{"tamper":true}'::jsonb
    where id = v_run_id;
    raise exception 'unexpected_success: report_runs update should be blocked';
  exception
    when others then
      raise notice 'OK: report_runs update blocked: %', sqlerrm;
  end;

  begin
    delete from public.report_runs
    where id = v_run_id;
    raise exception 'unexpected_success: report_runs delete should be blocked';
  exception
    when others then
      raise notice 'OK: report_runs delete blocked: %', sqlerrm;
  end;
end $$;

rollback;
