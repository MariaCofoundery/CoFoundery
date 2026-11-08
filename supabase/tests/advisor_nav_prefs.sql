\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ef000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'nav' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 2) n;

set local role authenticated;
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_advisor_nav_prefs(array['pages', 'funding'], array['tasks', 'calendar', 'chat']);
select extensions.is((select hidden from public.advisor_nav_prefs), array['pages', 'funding'], 'a person hides stations');
select extensions.is((select item_order from public.advisor_nav_prefs), array['tasks', 'calendar', 'chat'], 'and sorts them');
select public.save_advisor_nav_prefs(array['pages'], array['calendar', 'tasks']);
select extensions.is((select count(*)::int from public.advisor_nav_prefs), 1, 'saving again replaces the row');
select extensions.throws_ok($$select public.save_advisor_nav_prefs(array['home'], '{}')$$, '22023', 'nav_prefs_invalid', 'Heute cannot be hidden');
select extensions.throws_ok($$select public.save_advisor_nav_prefs(array['setup'], '{}')$$, '22023', 'nav_prefs_invalid', 'nor Einrichten');
select extensions.throws_ok($$select public.save_advisor_nav_prefs(array['quatsch'], '{}')$$, '22023', 'nav_prefs_invalid', 'unknown stations are refused');
select extensions.throws_ok($$select public.save_advisor_nav_prefs('{}', array['tasks', 'tasks'])$$, '22023', 'nav_prefs_invalid', 'a station only once');
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_nav_prefs), 0, 'nobody else reads it');

select * from extensions.finish();
rollback;
