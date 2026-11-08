\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ed000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'rcp' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 2) n;

set local role authenticated;
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.research_consent_prompt_seen), 0, 'at first nobody has been asked');
select public.mark_research_consent_prompt_seen();
select extensions.is((select count(*)::int from public.research_consent_prompt_seen), 1, 'showing the question is recorded');
select public.mark_research_consent_prompt_seen();
select extensions.is((select count(*)::int from public.research_consent_prompt_seen), 1, 'recording twice changes nothing');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.research_consent_prompt_seen), 0, 'nobody else reads it');
reset role;
-- Gefragt zu sein ist keine Einwilligung.
select extensions.is((select count(*)::int from public.research_consent_preferences where user_id = 'ed000000-0000-4000-8000-000000000001'), 0, 'being asked is not a decision');

select * from extensions.finish();
rollback;
