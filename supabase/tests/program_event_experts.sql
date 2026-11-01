\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000002','authenticated','authenticated','mitglied@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000006','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values
('ea000000-0000-4000-8000-0000000000a0', 'Programm Elf'),
('ea000000-0000-4000-8000-0000000000a1', 'Programm Zwoelf');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000001','owner','active'),
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000002','advisor','active'),
('ea000000-0000-4000-8000-0000000000a1','ea000000-0000-4000-8000-000000000006','owner','active');
insert into public.team_program_events(id, org_id, title, starts_at) values
('ea000000-0000-4000-8000-0000000000e0','ea000000-0000-4000-8000-0000000000a0','Workshop Pitch', now() + interval '7 days');
insert into public.team_program_experts(id, org_id, name) values
('ea000000-0000-4000-8000-0000000000f0','ea000000-0000-4000-8000-0000000000a0','Dr. Lena Muster'),
('ea000000-0000-4000-8000-0000000000f1','ea000000-0000-4000-8000-0000000000a0','Ben Beispiel'),
('ea000000-0000-4000-8000-0000000000f9','ea000000-0000-4000-8000-0000000000a1','Fremde Person');

set local role authenticated;

set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_event_experts('ea000000-0000-4000-8000-0000000000e0', array['ea000000-0000-4000-8000-0000000000f0','ea000000-0000-4000-8000-0000000000f1','ea000000-0000-4000-8000-0000000000f0']::uuid[]);
select extensions.is(
  (select count(*)::int from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')), 2, 'the owner assigns two speakers, a repeated one counts once');
select public.set_event_experts('ea000000-0000-4000-8000-0000000000e0', array['ea000000-0000-4000-8000-0000000000f1']::uuid[]);
select extensions.is(
  (select name from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')), 'Ben Beispiel', 'setting again replaces the assignment');
select extensions.throws_ok(
  $$select public.set_event_experts('ea000000-0000-4000-8000-0000000000e0', array['ea000000-0000-4000-8000-0000000000f9']::uuid[])$$,
  'P0002', null, 'a person of another organization cannot be assigned');
select extensions.is(
  (select count(*)::int from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')), 1, 'the refused call changed nothing');

set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')), 1, 'a member reads the assignment');
select extensions.throws_ok(
  $$select public.set_event_experts('ea000000-0000-4000-8000-0000000000e0', '{}'::uuid[])$$, '42501', null, 'a member cannot change it');

set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')$$, 'someone outside the organization sees nothing');

set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')$$, 'another organization sees nothing');

-- Loescht der Inhaber die Person, faellt die Zuordnung mit.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.delete_program_expert('ea000000-0000-4000-8000-0000000000f1');
select extensions.is(
  (select count(*)::int from public.list_event_experts('ea000000-0000-4000-8000-0000000000a0')), 0, 'deleting the person removes the assignment');

select * from extensions.finish();
rollback;
