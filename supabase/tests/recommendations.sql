\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(18);

-- 1 Autorin, 2 empfohlene Person, 3 Mitglied (liest), 4 Nicht-Mitglied, 5 Plattformteam, 6 zweite Melderin.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f2100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'empf' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 6) n;
insert into public.network_memberships(user_id, status) select ('f2100000-0000-4000-8000-00000000000' || n)::uuid, 'active' from generate_series(1, 3) n union all select 'f2100000-0000-4000-8000-000000000006', 'active';
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at) select ('f2100000-0000-4000-8000-00000000000' || n)::uuid, 'Person ' || n, 'Zeile ' || n, 'Ein Text mit genug Zeichen drin.', array['founder'], 'active', now() from generate_series(1, 3) n;
insert into public.platform_admins(user_id) values ('f2100000-0000-4000-8000-000000000005');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.create_recommendation('software', 'Plausible', null, 'https://plausible.io', null, null, array['marketing'], 'Online', 'Einfach und europaeisch.', false)$$, '22023', 'recommendation_guidelines', 'the guidelines must be confirmed');
insert into ids values ('sw', public.create_recommendation('software', 'Plausible', null, 'https://plausible.io', null, null, array['marketing'], 'Online', 'Einfach und europaeisch.', true));
select extensions.is((select status from public.network_recommendations where id = (select id from ids where key = 'sw')), 'review', 'a new recommendation waits for a human review');
select extensions.throws_ok($$select public.create_recommendation('software', 'X', null, 'http://unsicher.example', null, null, array[]::text[], null, 'Gut.', true)$$, '22023', 'recommendation_invalid', 'links must be https');
select extensions.throws_ok($$select public.create_recommendation('software', 'X', null, 'https://x.de', null, null, array['ki','recht','finanzen','marketing']::text[], null, 'Gut.', true)$$, '22023', 'recommendation_invalid', 'at most three topics');
select extensions.throws_ok($$select public.create_recommendation('person', null, null, null, 'f2100000-0000-4000-8000-000000000001', null, array[]::text[], null, 'Selbst.', true)$$, '22023', 'recommendation_invalid', 'you cannot recommend yourself');
insert into ids values ('pe', public.create_recommendation('person', 'egal', 'egal', null, 'f2100000-0000-4000-8000-000000000002', null, array['recht'], 'Leipzig', 'Erklaert verstaendlich.', true));
select extensions.is((select title from public.network_recommendations where id = (select id from ids where key = 'pe')), 'Person 2', 'name and line of a person come from their profile, not from the author');
select extensions.is((select status from public.network_recommendations where id = (select id from ids where key = 'pe')), 'pending_consent', 'a person is asked first');

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_recommendations(null, null, null, null, null, null, null, null)), 0, 'nothing is visible before review and consent');

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_recommendations(null, null, null, null, null, null, null, null)), 0, 'and a non-member sees nothing at all');

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.ok(public.decide_recommendation_consent((select id from ids where key = 'pe'), true), 'the recommended person can agree');
select extensions.is((select status from public.network_recommendations where id = (select id from ids where key = 'pe')), 'review', 'which only sends it to the review');

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.admin_decide_recommendation((select id from ids where key = 'sw'), true, null)$$, '42501', 'recommendation_not_yours', 'only the platform team decides');

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.admin_list_recommendations('review')), 2, 'the platform team sees the queue');
select public.admin_decide_recommendation((select id from ids where key = 'sw'), true, null);
select public.admin_decide_recommendation((select id from ids where key = 'pe'), false, 'Nicht passend.');

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_recommendations(null, null, null, null, null, null, null, null)), 1, 'only the approved one appears (a removed one never does)');
select extensions.is((select count(*)::int from public.list_recommendations(array['person'], null, null, null, null, null, null, null)), 0, 'the filters work');
select public.report_recommendation((select id from ids where key = 'sw'), 'misleading', 'Irrefuehrend.');
reset role;
select extensions.is((select status from public.network_recommendations where id = (select id from ids where key = 'sw')), 'published', 'one report does not take it down');
set local role authenticated;

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000006","role":"authenticated"}';
select public.report_recommendation((select id from ids where key = 'sw'), 'discrimination', null);
reset role;
select extensions.is((select status from public.network_recommendations where id = (select id from ids where key = 'sw')), 'review', 'two different reporters take it off until the team decides');
set local role authenticated;

set local request.jwt.claims = '{"sub":"f2100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(public.withdraw_recommendation((select id from ids where key = 'sw')), 'the author can withdraw');

select * from extensions.finish();
rollback;
