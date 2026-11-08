\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ee000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'fnav' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 2) n;

set local role authenticated;
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_founder_nav_prefs(array['find', 'events'], array['connect', 'align']);
select extensions.is((select hidden from public.founder_nav_prefs), array['find', 'events'], 'a person hides areas');
select extensions.is((select item_order from public.founder_nav_prefs), array['connect', 'align'], 'and sorts them');
select public.save_founder_nav_prefs(array['find'], array['align', 'connect']);
select extensions.is((select count(*)::int from public.founder_nav_prefs), 1, 'saving again replaces the row');
select extensions.throws_ok($$select public.save_founder_nav_prefs(array['home'], '{}')$$, '22023', 'nav_prefs_invalid', 'Start cannot be hidden');
select extensions.throws_ok($$select public.save_founder_nav_prefs(array['quatsch'], '{}')$$, '22023', 'nav_prefs_invalid', 'unknown areas are refused');
select extensions.throws_ok($$select public.save_founder_nav_prefs(array['tasks'], '{}')$$, '22023', 'nav_prefs_invalid', 'advisor stations are not founder areas');
select extensions.throws_ok($$select public.save_founder_nav_prefs('{}', array['align', 'align'])$$, '22023', 'nav_prefs_invalid', 'an area only once');
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.founder_nav_prefs), 0, 'nobody else reads it');
reset role;
select extensions.is((select count(*)::int from public.advisor_nav_prefs), 0, 'the advisor sidebar is a separate row');

select * from extensions.finish();
rollback;
