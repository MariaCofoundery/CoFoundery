\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('eb000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('eb000000-0000-4000-8000-0000000000a0', 'Programm Zwoelf');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000001','owner','active'),
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000004','advisor','active'),
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000005','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('eb000000-0000-4000-8000-0000000000b0', 'Setup Team', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('eb000000-0000-4000-8000-0000000000b0','eb000000-0000-4000-8000-000000000002'),
('eb000000-0000-4000-8000-0000000000b0','eb000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-000000000002'),
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-000000000004');

-- Zwei bestaetigte Punkte: einer von beiden bestaetigt, einer nur von einer Person.
insert into public.founder_team_setup_items(id, team_id, item_key, work_status, working_note, updated_by_user_id) values
('eb000000-0000-4000-8000-0000000000d1','eb000000-0000-4000-8000-0000000000b0','roles_responsibilities','discussing','x','eb000000-0000-4000-8000-000000000002'),
('eb000000-0000-4000-8000-0000000000d2','eb000000-0000-4000-8000-0000000000b0','decision_rights','discussing','x','eb000000-0000-4000-8000-000000000002');
insert into public.founder_team_setup_revisions(id, setup_item_id, resolution_status, note, proposed_by_user_id, confirmed_at) values
('eb000000-0000-4000-8000-0000000000e1','eb000000-0000-4000-8000-0000000000d1','clarified','Beide','eb000000-0000-4000-8000-000000000002', now()),
('eb000000-0000-4000-8000-0000000000e2','eb000000-0000-4000-8000-0000000000d2','clarified','Nur eine','eb000000-0000-4000-8000-000000000002', now());
update public.founder_team_setup_items set current_confirmed_revision_id = case id
  when 'eb000000-0000-4000-8000-0000000000d1' then 'eb000000-0000-4000-8000-0000000000e1'::uuid
  else 'eb000000-0000-4000-8000-0000000000e2'::uuid end
where team_id = 'eb000000-0000-4000-8000-0000000000b0';
insert into public.founder_team_setup_confirmations(revision_id, user_id) values
('eb000000-0000-4000-8000-0000000000e1','eb000000-0000-4000-8000-000000000002'),
('eb000000-0000-4000-8000-0000000000e1','eb000000-0000-4000-8000-000000000003'),
('eb000000-0000-4000-8000-0000000000e2','eb000000-0000-4000-8000-000000000002');

select extensions.ok((select includes_setup from public.team_programs where id = 'eb000000-0000-4000-8000-0000000000c0'), 'a new program includes the setup (the consent text says so)');

set local role authenticated;
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_confirmed_setup('eb000000-0000-4000-8000-0000000000c0')), 1, 'the owner sees only what every member confirmed');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select item_key from public.get_program_confirmed_setup('eb000000-0000-4000-8000-0000000000c0')), 'roles_responsibilities', 'the contact sees the same');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_confirmed_setup('eb000000-0000-4000-8000-0000000000c0')), 0, 'an org member who is neither owner nor contact sees nothing');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_confirmed_setup('eb000000-0000-4000-8000-0000000000c0')), 0, 'the founders themselves are not served by this function');

set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select founder_setup from public.get_program_access_for_me('eb000000-0000-4000-8000-0000000000a0')), 'active', 'the access overview shows the setup as active');

-- Ein Programm, das vor diesem Text begann, bekommt das Setup nicht.
reset role;
update public.team_programs set includes_setup = false where id = 'eb000000-0000-4000-8000-0000000000c0';
set local role authenticated;
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_confirmed_setup('eb000000-0000-4000-8000-0000000000c0')), 0, 'an older program without the setup stays closed');

-- Und ohne volle Zustimmung ist nichts offen.
reset role;
update public.team_programs set includes_setup = true where id = 'eb000000-0000-4000-8000-0000000000c0';
delete from public.team_program_consents where founder_user_id = 'eb000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_confirmed_setup('eb000000-0000-4000-8000-0000000000c0')), 0, 'without everyone consenting nothing is open');

select * from extensions.finish();
rollback;
