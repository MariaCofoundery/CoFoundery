\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- 1, 2 im Team, 3 Fremde, 4 Admin einer Organisation (sieht nie etwas).
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f1100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'werte' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.profiles(user_id, roles) select ('f1100000-0000-4000-8000-00000000000' || n)::uuid, array['founder'] from generate_series(1, 3) n on conflict (user_id) do nothing;
insert into public.founder_teams(id, name, team_context) values ('f1100000-0000-4000-8000-0000000000b0', 'Werte Team', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('f1100000-0000-4000-8000-0000000000b0','f1100000-0000-4000-8000-000000000001'),('f1100000-0000-4000-8000-0000000000b0','f1100000-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_person_values('[{"key":"sinnhaftigkeit","meaning":"Nur Dinge, die helfen."},{"key":"custom","label":"Freude am Tun","meaning":""},{"key":"ehrlichkeit"}]'::jsonb, 'Wenn hinter dem Ruecken entschieden wird.');
select extensions.is((select array_agg(value_key order by slot) from public.person_values), array['sinnhaftigkeit','custom','ehrlichkeit'], 'values are stored in the person''s own order');
select extensions.throws_ok($$select public.save_person_values('[{"key":"a"},{"key":"b"},{"key":"c"},{"key":"d"},{"key":"e"},{"key":"f"}]'::jsonb, null)$$, '22023', 'values_invalid', 'at most five');
select extensions.throws_ok($$select public.save_person_values('[{"key":"unbekannt"}]'::jsonb, null)$$, '22023', 'values_invalid', 'only known values or a custom one with a label');
select extensions.throws_ok($$select public.save_person_values('[{"key":"custom"}]'::jsonb, null)$$, '22023', 'values_invalid', 'a custom value needs a label');
select extensions.is((select count(*)::int from public.person_values), 3, 'a refused save leaves the list as it was');

select extensions.is((select count(*)::int from public.get_team_values('f1100000-0000-4000-8000-0000000000b0')), 0, 'nothing is shared by default');
select public.set_value_team_share('f1100000-0000-4000-8000-0000000000b0', true);

set local request.jwt.claims = '{"sub":"f1100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_team_values('f1100000-0000-4000-8000-0000000000b0')), 3, 'the teammate sees what was shared with the team');
select extensions.is((select count(*)::int from public.person_values), 0, 'but cannot read the table itself');
select extensions.is((select shared from public.get_team_values_sharing('f1100000-0000-4000-8000-0000000000b0') where not is_self), true, 'and sees who shared');

set local request.jwt.claims = '{"sub":"f1100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_team_values('f1100000-0000-4000-8000-0000000000b0')), 0, 'a stranger sees nothing');
select extensions.throws_ok($$select public.set_value_team_share('f1100000-0000-4000-8000-0000000000b0', true)$$, '42501', 'values_not_yours', 'and cannot share into a team they are not in');

reset role;
delete from public.founder_team_members where user_id = 'f1100000-0000-4000-8000-000000000001' and team_id = 'f1100000-0000-4000-8000-0000000000b0';
select extensions.is((select count(*)::int from public.person_value_team_shares), 0, 'leaving the team ends the sharing');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_connect_values('f1100000-0000-4000-8000-000000000001')), 0, 'Connect shows nothing unless switched on');
select public.set_value_connect_show(true);
select extensions.is((select count(*)::int from public.get_connect_values('f1100000-0000-4000-8000-000000000001')), 3, 'the person sees their own Connect values');

select * from extensions.finish();
rollback;
