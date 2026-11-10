\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

-- 1 Inhaberin der Tueren, 2 Suchende (aktives Profil), 3 Mitglied mit Entwurfsprofil, 4 Nicht-Mitglied.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f3100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'door' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.network_memberships(user_id, status) select ('f3100000-0000-4000-8000-00000000000' || n)::uuid, 'active' from generate_series(1, 3) n;
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at)
select ('f3100000-0000-4000-8000-00000000000' || n)::uuid, 'Person ' || n, 'Zeile ' || n, 'Ein Text mit genug Zeichen drin.', array['founder'], case when n = 3 then 'draft' else 'active' end, case when n = 3 then null else now() end from generate_series(1, 3) n;

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('d1', public.save_network_door(null, 'purchasing_midsize', null, 'health', 'Leipzig', 'introduce', 'Aus meiner Zeit bei einer Klinikgruppe.'));
select extensions.is((select count(*)::int from public.network_doors), 1, 'a door is saved (own rows are readable)');
select extensions.throws_ok($$select public.save_network_door(null, 'angel', null, null, null, 'bestfriend', null)$$, '22023', 'door_invalid', 'only known closeness levels');
select extensions.throws_ok($$select public.save_network_door(null, 'other', null, null, null, 'via', null)$$, '22023', 'door_invalid', 'the "other" type needs a label');
select extensions.throws_ok($$select public.save_network_door(null, 'purchasing_midsize', null, 'health', 'leipzig', 'via', null)$$, '22023', 'door_duplicate', 'the same door is not created twice');
select extensions.throws_ok($$select public.save_network_door(null, 'angel', null, null, null, 'via', repeat('x', 141))$$, '22023', 'door_invalid', 'the note stays short');
select public.save_network_door(null, 'angel', null, null, null, 'via', null);
select public.save_network_door(null, 'vc_early', null, null, null, 'via', null);
select public.save_network_door(null, 'lawyer', null, null, null, 'via', null);
select public.save_network_door(null, 'tax', null, null, null, 'via', null);
select extensions.throws_ok($$select public.save_network_door(null, 'privacy', null, null, null, 'via', null)$$, '23514', 'door_limit', 'at most five doors per person');

set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.search_network_doors(array['purchasing_midsize'], 'health', 'leip', 0)), 1, 'another member finds the door by type, sector and region');
select extensions.is((select count(*)::int from public.search_network_doors(array['angel'], 'health', '', 0)), 0, 'filters narrow the result');
select extensions.throws_ok($$select public.save_network_door((select id from ids where key = 'd1'), 'angel', null, null, null, 'via', null)$$, '42501', 'door_not_allowed', 'nobody edits the door of another person');

set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_network_doors_open(false);
set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select doors_open from public.search_network_doors(array['purchasing_midsize'], '', '', 0)), false, 'paused doors stay visible but say they are paused');

reset role;
insert into public.network_blocks(blocker_user_id, blocked_user_id) values ('f3100000-0000-4000-8000-000000000002', 'f3100000-0000-4000-8000-000000000001');
set local role authenticated;
set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.search_network_doors(null, '', '', 0)), 0, 'a block hides the doors in both directions');
reset role;
delete from public.network_blocks;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000004","role":"authenticated"}';

set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.search_network_doors(null, '', '', 0)), 0, 'a non-member sees nothing');

reset role;
update public.network_profiles set status = 'draft' where user_id = 'f3100000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"f3100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_network_doors_of('f3100000-0000-4000-8000-000000000001')), 0, 'doors disappear with the visible profile');

select * from extensions.finish();
rollback;
