\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ec000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 2) n;
insert into public.profiles(user_id, display_name, roles) values ('ec000000-0000-4000-8000-000000000001', 'Gruenderin', array['founder']), ('ec000000-0000-4000-8000-000000000002', 'Beraterin', array['advisor']);

set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table t1 as select public.create_team_for_invitations('existing_team', 'Seeblick') as id;
grant select on t1 to authenticated;
select extensions.isnt((select id from t1), null, 'a founder gets a team');
select extensions.is((select team_context from public.founder_teams where id = (select id from t1)), 'existing_team', 'with the chosen context');
select extensions.is((select name from public.founder_teams where id = (select id from t1)), 'Seeblick', 'and the name');
select extensions.is(public.create_team_for_invitations('existing_team', null), (select id from t1), 'asking again returns the same team (no litter)');
select extensions.isnt(public.create_team_for_invitations('pre_founder', null), (select id from t1), 'another context is another team');
select extensions.throws_ok($$select public.create_team_for_invitations('anything', null)$$, '22023', null, 'unknown contexts are refused');

set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.create_team_for_invitations('pre_founder', null)$$, '42501', null, 'without the founder role there is no team');

select * from extensions.finish();
rollback;
