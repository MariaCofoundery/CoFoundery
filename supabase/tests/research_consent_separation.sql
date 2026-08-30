\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_research(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'research consent assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','ea111111-1111-4111-8111-111111111111','authenticated','authenticated','research-founder@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','ea222222-2222-4222-8222-222222222222','authenticated','authenticated','research-advisor@example.com','',now(),'{}','{}',now(),now());

select pg_temp.assert_research(
  not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_analytics_events' and column_name in ('user_id','subject_hash','team_id','dyad_id','flow_hash','choice_value','answer_text','free_text','properties')),
  'product analytics contains an identity, choice, or generic properties column'
);

select set_config('request.jwt.claims', '{"sub":"ea111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_research((select count(*) = 0 from public.research_consent_preferences), 'undecided should be represented by no preference row');
select * from public.set_my_research_consent('accepted');
select pg_temp.assert_research((select state = 'accepted' from public.research_consent_preferences), 'owner cannot accept research');
reset role;

set local role service_role;
insert into public.research_events (
  event_name, subject_hash, module, instrument_version, question_id, properties, research_consent_version
)
select 'answer_saved', encode(digest(research_subject_id::text, 'sha256'), 'hex'), 'base', 'founder_base_v2', 'cl_core_1', '{"choiceValue":"75"}', 'research_consent_v1'
from public.research_consent_preferences where user_id = 'ea111111-1111-4111-8111-111111111111';
select pg_temp.assert_research((select count(*) = 1 from public.research_events where research_consent_version = 'research_consent_v1'), 'accepted structured research event was not stored');
do $$
begin
  begin
    insert into public.research_events (event_name, subject_hash, properties, research_consent_version)
    select 'answer_saved', encode(digest(research_subject_id::text, 'sha256'), 'hex'), '{"freeText":"private note"}', 'research_consent_v1'
    from public.research_consent_preferences where user_id = 'ea111111-1111-4111-8111-111111111111';
    raise exception 'free-text research payload was accepted';
  exception when sqlstate '22023' then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"sub":"ea222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_research(not has_table_privilege('authenticated', 'public.research_events', 'SELECT'), 'advisor/authenticated client can read research rows');
reset role;

select set_config('request.jwt.claims', '{"sub":"ea111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.set_my_research_consent('declined');
select pg_temp.assert_research((select state = 'declined' and withdrawn_at is not null from public.research_consent_preferences), 'withdrawal state was not persisted');
reset role;

set local role service_role;
select pg_temp.assert_research((select count(*) = 0 from public.research_events where research_consent_version = 'research_consent_v1'), 'withdrawal did not delete attributable raw research events');
do $$
begin
  begin
    insert into public.research_events (event_name, subject_hash, properties, research_consent_version)
    select 'question_viewed', encode(digest(research_subject_id::text, 'sha256'), 'hex'), '{}', 'research_consent_v1'
    from public.research_consent_preferences where user_id = 'ea111111-1111-4111-8111-111111111111';
    raise exception 'research event after withdrawal was accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select pg_temp.assert_research(not has_table_privilege('authenticated', 'public.research_events', 'INSERT'), 'authenticated can insert research events directly');
select pg_temp.assert_research(not has_table_privilege('authenticated', 'public.product_analytics_events', 'SELECT'), 'authenticated can read product analytics');
select pg_temp.assert_research(
  public.aggregate_phase1_dimension_score_buckets_for_date(current_date - 1) ->> 'dataSource' = 'disabled_pending_explicit_research_consent_contract',
  'non-consented report score aggregation remains enabled'
);
reset role;

select extensions.pass('research consent, service-only access, data separation, and withdrawal are enforced');
select * from extensions.finish();
rollback;
