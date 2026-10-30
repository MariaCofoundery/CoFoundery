\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000002','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000003','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e6000000-0000-4000-8000-0000000000a0', 'Programm Fuenf');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000001','owner','active');
insert into public.founder_teams(id, name, team_context) values ('e6000000-0000-4000-8000-0000000000b0', 'Team Bergblick', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e6000000-0000-4000-8000-0000000000b0','e6000000-0000-4000-8000-000000000002'),
('e6000000-0000-4000-8000-0000000000b0','e6000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-000000000002'),
('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-000000000003');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- Ohne jede Freigabe: Mitglied der Organisation zu sein, oeffnet nichts.
select extensions.is(
  (select team_review || '/' || founder_setup from public.get_program_access_for_me('e6000000-0000-4000-8000-0000000000a0') limit 1),
  'none/none', 'organisation membership alone opens nothing');

-- Eine aktive Team-Review der Organisation, an dieses Team gebunden, zeigt sich als "active".
reset role;
insert into public.advisor_team_reviews(id, org_id, requested_by_user_id, status, activated_at, team_id, team_bound_at)
values ('e6000000-0000-4000-8000-0000000000e0','e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000001','active', now(),
        'e6000000-0000-4000-8000-0000000000b0', now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select team_review from public.get_program_access_for_me('e6000000-0000-4000-8000-0000000000a0') limit 1),
  'active', 'an active review bound to the team shows as active');

-- Nach dem ersten Rosterwechsel endet ihr Zugriff - und die Uebersicht sagt es.
reset role;
update public.advisor_team_reviews set team_access_ended_at = now() where id = 'e6000000-0000-4000-8000-0000000000e0';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select team_review from public.get_program_access_for_me('e6000000-0000-4000-8000-0000000000a0') limit 1),
  'none', 'after a roster change it no longer counts');

-- Ohne Zustimmung aller ist das Programm nicht aktiv: dann gibt es keine Zeile.
reset role;
delete from public.team_program_consents where founder_user_id = 'e6000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_program_access_for_me('e6000000-0000-4000-8000-0000000000a0')$$,
  'an inactive programme shows nothing');

select * from extensions.finish();
rollback;
