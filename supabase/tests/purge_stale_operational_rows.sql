\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e2000000-0000-4000-8000-000000000001','authenticated','authenticated','purge@example.com','',now(),'{}','{}',now(),now());

-- Vier Aufgaben: alt und fertig, alt und fehlgeschlagen, neu und fertig, alt aber noch laufend.
insert into public.ai_jobs(id, job_type, subject_user_id, status, created_at, claimed_at, completed_at) values
('e2000000-0000-4000-8000-0000000000a1','ping','e2000000-0000-4000-8000-000000000001','completed', now() - interval '200 days', now() - interval '200 days', now() - interval '199 days'),
('e2000000-0000-4000-8000-0000000000a2','ping','e2000000-0000-4000-8000-000000000001','failed',    now() - interval '200 days', now() - interval '200 days', now() - interval '199 days'),
('e2000000-0000-4000-8000-0000000000a3','ping','e2000000-0000-4000-8000-000000000001','completed', now() - interval '3 days',   now() - interval '3 days',   now() - interval '2 days');
insert into public.ai_jobs(id, job_type, subject_user_id, status, created_at, claimed_at)
values ('e2000000-0000-4000-8000-0000000000a4','ping','e2000000-0000-4000-8000-000000000001','running', now() - interval '200 days', now() - interval '200 days');

-- Zwei Hinweise: ein alter und ein neuer.
insert into public.in_app_notices(recipient_user_id, kind, subject_id, path, created_at) values
('e2000000-0000-4000-8000-000000000001', 'contact_request', 'e2000000-0000-4000-8000-0000000000b1', '/x', now() - interval '400 days'),
('e2000000-0000-4000-8000-000000000001', 'contact_request', 'e2000000-0000-4000-8000-0000000000b2', '/x', now() - interval '5 days');

select extensions.is(
  (public.purge_stale_operational_rows(90, 180) ->> 'deletedAiJobs')::int, 2,
  'zwei alte, abgeschlossene Jobs (fertig und fehlgeschlagen) werden geloescht'
);
select extensions.ok(
  exists(select 1 from public.ai_jobs where id = 'e2000000-0000-4000-8000-0000000000a3'),
  'ein neuer, fertiger Job bleibt'
);
select extensions.ok(
  exists(select 1 from public.ai_jobs where id = 'e2000000-0000-4000-8000-0000000000a4'),
  'ein alter, aber noch laufender Job bleibt - laufende Arbeit wird nie geloescht'
);
select extensions.is(
  (select count(*)::int from public.in_app_notices where subject_id in ('e2000000-0000-4000-8000-0000000000b1','e2000000-0000-4000-8000-0000000000b2')), 1,
  'der alte Hinweis ist weg, der neue bleibt'
);

select extensions.throws_ok($$select public.purge_stale_operational_rows(1, 180)$$, 'P0001', 'invalid_retention_days', 'eine zu kurze Frist wird abgelehnt');
select extensions.throws_ok($$select public.purge_stale_operational_rows(90, 5000)$$, 'P0001', 'invalid_retention_days', 'eine zu lange Frist wird abgelehnt');

select extensions.is(has_function_privilege('anon', 'public.purge_stale_operational_rows(integer,integer)', 'execute'), false, 'anon darf nicht');
select extensions.is(has_function_privilege('authenticated', 'public.purge_stale_operational_rows(integer,integer)', 'execute'), false, 'angemeldete Konten duerfen nicht');
select extensions.is(has_function_privilege('service_role', 'public.purge_stale_operational_rows(integer,integer)', 'execute'), true, 'nur service_role darf');

select * from extensions.finish();
rollback;
