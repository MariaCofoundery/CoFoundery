\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000002','authenticated','authenticated','mitglied@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000005','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000006','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values
('e8000000-0000-4000-8000-0000000000a0', 'Programm Sieben'),
('e8000000-0000-4000-8000-0000000000a1', 'Programm Acht');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000001','owner','active'),
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000002','advisor','active'),
('e8000000-0000-4000-8000-0000000000a1','e8000000-0000-4000-8000-000000000006','owner','active');
insert into public.founder_teams(id, name, team_context) values ('e8000000-0000-4000-8000-0000000000b0', 'Team Anker', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e8000000-0000-4000-8000-0000000000b0','e8000000-0000-4000-8000-000000000003'),
('e8000000-0000-4000-8000-0000000000b0','e8000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e8000000-0000-4000-8000-0000000000c0','e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e8000000-0000-4000-8000-0000000000c0','e8000000-0000-4000-8000-000000000003'),
('e8000000-0000-4000-8000-0000000000c0','e8000000-0000-4000-8000-000000000005');

set local role authenticated;

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_program_expert('e8000000-0000-4000-8000-0000000000a0', null, ' Dr. Lena Muster ', 'Finanzierung', 'Muster Beratung', 'Lena@Muster.example', '030 1', 'https://muster.example', 'https://example.org/ablage/muster', '1:1-Coaching moeglich');
select extensions.is(
  (select name from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')), 'Dr. Lena Muster', 'the owner adds an expert, the name is trimmed');
select extensions.is(
  (select email from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')), 'lena@muster.example', 'the email is normalised');
select extensions.throws_ok(
  $$select public.save_program_expert('e8000000-0000-4000-8000-0000000000a0', null, 'Eve', null, null, null, null, 'javascript:alert(1)', null, null)$$,
  '23514', null, 'a website that is not https is refused');
select extensions.throws_ok(
  $$select public.save_program_expert('e8000000-0000-4000-8000-0000000000a0', null, 'Eve', null, null, null, null, null, 'http://example.org/x', null)$$,
  '23514', null, 'a storage link that is not https is refused');

select public.set_program_expert_archived((select expert_id from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')), true);
select extensions.ok(
  (select archived from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')), 'the owner archives an expert');

-- Ein Mitglied liest, schreibt nicht.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')), 1, 'a member reads the list');
select extensions.throws_ok(
  $$select public.save_program_expert('e8000000-0000-4000-8000-0000000000a0', null, 'Eve', null, null, null, null, null, null, null)$$,
  '42501', null, 'a member cannot add');

-- Das Team im Programm sieht nichts.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')$$, 'a team in the program sees nothing');

-- Eine andere Organisation sieht nichts.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')$$, 'another organization sees nothing');

-- Der Inhaber loescht.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.delete_program_expert((select expert_id from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')));
select extensions.is(
  (select count(*)::int from public.list_program_experts('e8000000-0000-4000-8000-0000000000a0')), 0, 'the owner deletes an expert');

select * from extensions.finish();
rollback;
