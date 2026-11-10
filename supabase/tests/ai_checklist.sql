\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- 1, 2 Gruenderinnen im Team (im Programm), 3 Fremde, 4 Admin der Organisation.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f0100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'ki' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.profiles(user_id, roles) select ('f0100000-0000-4000-8000-00000000000' || n)::uuid, array['founder'] from generate_series(1, 3) n on conflict (user_id) do nothing;
insert into public.founder_teams(id, name, team_context) values ('f0100000-0000-4000-8000-0000000000b0', 'KI Team', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('f0100000-0000-4000-8000-0000000000b0','f0100000-0000-4000-8000-000000000001'),('f0100000-0000-4000-8000-0000000000b0','f0100000-0000-4000-8000-000000000002');
insert into public.advisor_orgs(id, name) values ('f0100000-0000-4000-8000-0000000000a0', 'KI Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values ('f0100000-0000-4000-8000-0000000000a0','f0100000-0000-4000-8000-000000000004','owner','active');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('f0100000-0000-4000-8000-0000000000c0','f0100000-0000-4000-8000-0000000000a0','f0100000-0000-4000-8000-0000000000b0','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values ('f0100000-0000-4000-8000-0000000000c0','f0100000-0000-4000-8000-000000000001'),('f0100000-0000-4000-8000-0000000000c0','f0100000-0000-4000-8000-000000000002');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"f0100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_team_ai_item('f0100000-0000-4000-8000-0000000000b0', 'repeat', 'done', 'Angebote und Termine');
select extensions.is((select note from public.team_ai_checklist_items where item_key = 'repeat'), 'Angebote und Termine', 'a team member ticks off a question with a note');
select extensions.throws_ok($$select public.save_team_ai_item('f0100000-0000-4000-8000-0000000000b0', 'bogus', 'done', null)$$, '22023', 'team_ai_invalid', 'only known questions');
insert into ids values ('tool', public.save_team_ai_tool('f0100000-0000-4000-8000-0000000000b0', null, 'CRM', 'Anfragen', array['f0100000-0000-4000-8000-000000000001','f0100000-0000-4000-8000-000000000003']::uuid[], 'part', 'Formular'));
select extensions.is((select cardinality(access_user_ids) from public.team_ai_tools where id = (select id from ids where key = 'tool')), 1, 'access lists only people of the team');
insert into ids values ('flow', public.save_team_ai_flow('f0100000-0000-4000-8000-0000000000b0', null, 'Angebot', '[{"text":"Anfrage kommt","who":"system","mode":"auto"},{"text":"Angebot schreiben","who":"f0100000-0000-4000-8000-000000000001","mode":"hand"},{"text":"Fremde","who":"f0100000-0000-4000-8000-000000000003","mode":"hand"},{"text":"","who":"system","mode":"auto"}]'::jsonb));
select extensions.is((select jsonb_array_length(steps) from public.team_ai_flows where id = (select id from ids where key = 'flow')), 3, 'empty steps are dropped');
select extensions.is((select steps -> 2 ->> 'who' from public.team_ai_flows where id = (select id from ids where key = 'flow')), null, 'a person outside the team is not named');

set local request.jwt.claims = '{"sub":"f0100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_ai_tools), 1, 'the other member sees the tools');

set local request.jwt.claims = '{"sub":"f0100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_ai_checklist_items) + (select count(*)::int from public.team_ai_tools) + (select count(*)::int from public.team_ai_flows), 0, 'a stranger sees nothing');
select extensions.throws_ok($$select public.save_team_ai_item('f0100000-0000-4000-8000-0000000000b0', 'data', 'done', null)$$, '42501', 'team_ai_not_yours', 'and writes nothing');

set local request.jwt.claims = '{"sub":"f0100000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_ai_checklist_items) + (select count(*)::int from public.team_ai_tools) + (select count(*)::int from public.team_ai_flows), 0, 'the organization does not see what the team ticked or listed');
select public.save_org_ai_tip('f0100000-0000-4000-8000-0000000000a0', true, 'Im ersten Monat einen Ablauf waehlen.', '[{"label":"Workshop","url":"https://beispiel.de/w"},{"label":"Unsicher","url":"http://beispiel.de"},{"label":"","url":"https://x.de"}]'::jsonb);
select extensions.is((select jsonb_array_length(links) from public.advisor_org_ai_tip), 1, 'only https links with a label are kept');

set local request.jwt.claims = '{"sub":"f0100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_ai_tips()), 1, 'a team in the program sees the tip');
select extensions.is((select org_name from public.get_my_program_ai_tips()), 'KI Accelerator', 'with the organization''s name');

set local request.jwt.claims = '{"sub":"f0100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_ai_tips()), 0, 'a stranger sees no tip');
select extensions.throws_ok($$select public.save_org_ai_tip('f0100000-0000-4000-8000-0000000000a0', true, null, '[]'::jsonb)$$, '42501', 'org_tip_not_yours', 'and cannot set one');

select * from extensions.finish();
rollback;
