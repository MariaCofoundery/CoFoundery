\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f1000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 6) n;
insert into public.advisor_orgs(id, name) values ('f1000000-0000-4000-8000-0000000000a0', 'Programm Siebzehn');
update public.advisor_orgs set program_success_enabled = true where id = 'f1000000-0000-4000-8000-0000000000a0';
insert into public.advisor_org_members(org_id, user_id, role, status) values
('f1000000-0000-4000-8000-0000000000a0','f1000000-0000-4000-8000-000000000001','owner','active'),
('f1000000-0000-4000-8000-0000000000a0','f1000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('f1000000-0000-4000-8000-0000000000b0', 'Belohnt', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('f1000000-0000-4000-8000-0000000000b0','f1000000-0000-4000-8000-000000000002'),
('f1000000-0000-4000-8000-0000000000b0','f1000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('f1000000-0000-4000-8000-0000000000c0','f1000000-0000-4000-8000-0000000000a0','f1000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('f1000000-0000-4000-8000-0000000000c0','f1000000-0000-4000-8000-000000000002'),
('f1000000-0000-4000-8000-0000000000c0','f1000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('f1000000-0000-4000-8000-0000000000c0','f1000000-0000-4000-8000-000000000004');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_reward('f1000000-0000-4000-8000-0000000000a0', null, 3, 'Coaching-Stunde', 'Eine Stunde mit einer Mentorin', true);
select extensions.is((select count(*)::int from public.get_org_rewards('f1000000-0000-4000-8000-0000000000a0')), 1, 'the owner sets a reward');
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.save_reward('f1000000-0000-4000-8000-0000000000a0', null, 1, 'Nein', null, true)$$, '42501', null, 'a contact cannot set rewards');

-- Zwei Sterne: noch nichts freigeschaltet. Dann drei: freigeschaltet und Hinweis.
create temp table cat as select catalog_id, default_key from public.get_outcome_catalog('f1000000-0000-4000-8000-0000000000a0');
grant select on cat to authenticated;
select public.report_program_outcome('f1000000-0000-4000-8000-0000000000c0', (select catalog_id from cat where default_key = 'mvp_live'), current_date, null);
select extensions.is((select unlocked_at is null from public.get_program_rewards('f1000000-0000-4000-8000-0000000000c0')), true, 'two stars: not yet unlocked');
select extensions.is((select stars_total from public.get_program_rewards('f1000000-0000-4000-8000-0000000000c0')), 2, 'the team has two stars');
select public.report_program_outcome('f1000000-0000-4000-8000-0000000000c0', (select catalog_id from cat where default_key = 'prototype'), current_date, null);
select extensions.is((select unlocked_at is not null from public.get_program_rewards('f1000000-0000-4000-8000-0000000000c0')), true, 'three stars: unlocked');
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'program_reward_unlocked'), 2, 'every person in the team is told');
set local role authenticated;

-- Nur die Organisation loest ein.
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.set_reward_redeemed('f1000000-0000-4000-8000-0000000000c0', (select reward_id from public.get_program_rewards('f1000000-0000-4000-8000-0000000000c0')), true)$$, '42501', null, 'the team cannot mark it redeemed');
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.set_reward_redeemed('f1000000-0000-4000-8000-0000000000c0', (select reward_id from public.get_program_rewards('f1000000-0000-4000-8000-0000000000c0')), true);
select extensions.is((select redeemed_at is not null from public.get_program_rewards('f1000000-0000-4000-8000-0000000000c0')), true, 'the organisation does');

-- Kommentare: jede Seite nur ihren eigenen.
select public.save_outcome_comment((select outcome_id from public.get_program_outcomes('f1000000-0000-4000-8000-0000000000c0') where default_key = 'mvp_live'), 'Gut gelaufen');
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.save_outcome_comment((select outcome_id from public.get_program_outcomes('f1000000-0000-4000-8000-0000000000c0') where default_key = 'mvp_live'), 'Wir sind stolz');
select extensions.is((select count(*)::int from public.get_outcome_comments('f1000000-0000-4000-8000-0000000000c0')), 2, 'both sides comment and both read');

-- Gespraech festhalten.
select public.save_check_in('f1000000-0000-4000-8000-0000000000c0', current_date, 'Naechste Schritte besprochen', current_date + 30);
select extensions.is((select count(*)::int from public.get_check_ins('f1000000-0000-4000-8000-0000000000c0')), 1, 'a talk is recorded');
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_check_ins('f1000000-0000-4000-8000-0000000000c0')), 0, 'a stranger sees nothing');

-- Ende des Programms.
reset role;
update public.team_programs set status = 'ended', ended_at = now() where id = 'f1000000-0000-4000-8000-0000000000c0';
select extensions.is((select (select count(*) from public.program_check_ins) + (select count(*) from public.program_reward_unlocks) + (select count(*) from public.program_outcome_comments))::int, 0, 'ending the program deletes talks, unlocks and comments');

select * from extensions.finish();
rollback;
