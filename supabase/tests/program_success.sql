\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f0000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 6) n;
insert into public.advisor_orgs(id, name) values ('f0000000-0000-4000-8000-0000000000a0', 'Programm Sechzehn');
update public.advisor_orgs set program_success_enabled = true where id = 'f0000000-0000-4000-8000-0000000000a0';
insert into public.advisor_org_members(org_id, user_id, role, status) values
('f0000000-0000-4000-8000-0000000000a0','f0000000-0000-4000-8000-000000000001','owner','active'),
('f0000000-0000-4000-8000-0000000000a0','f0000000-0000-4000-8000-000000000004','advisor','active'),
('f0000000-0000-4000-8000-0000000000a0','f0000000-0000-4000-8000-000000000005','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('f0000000-0000-4000-8000-0000000000b0', 'Sterne', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('f0000000-0000-4000-8000-0000000000b0','f0000000-0000-4000-8000-000000000002'),
('f0000000-0000-4000-8000-0000000000b0','f0000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('f0000000-0000-4000-8000-0000000000c0','f0000000-0000-4000-8000-0000000000a0','f0000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('f0000000-0000-4000-8000-0000000000c0','f0000000-0000-4000-8000-000000000002'),
('f0000000-0000-4000-8000-0000000000c0','f0000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('f0000000-0000-4000-8000-0000000000c0','f0000000-0000-4000-8000-000000000004');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_outcome_catalog('f0000000-0000-4000-8000-0000000000a0')), 18, 'the owner gets the default catalog');
create temp table cat as select catalog_id from public.get_outcome_catalog('f0000000-0000-4000-8000-0000000000a0') where default_key = 'founded';
grant select on cat to authenticated;
select extensions.isnt(public.save_outcome_catalog_item('f0000000-0000-4000-8000-0000000000a0', null, 'Erste Demo vor 100 Personen', 2, true), null, 'the owner adds an own item');
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.save_outcome_catalog_item('f0000000-0000-4000-8000-0000000000a0', null, 'Nein', 1, true)$$, '42501', null, 'a contact cannot change the catalog');

-- Team meldet: gemeldet, nicht bestaetigt.
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.report_program_outcome('f0000000-0000-4000-8000-0000000000c0', (select catalog_id from cat), current_date, 'Notar war da');
select extensions.ok(not (select confirmed from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'), 'a team report is not confirmed yet');

-- Fremde Person darf weder melden noch lesen.
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.throws_ok($$select public.report_program_outcome('f0000000-0000-4000-8000-0000000000c0', (select catalog_id from cat), current_date, null)$$, '42501', null, 'a stranger cannot report');
select extensions.is((select count(*)::int from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0')), 0, 'and does not read');

-- Bezugsperson bestaetigt.
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.confirm_program_outcome((select outcome_id from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'));
select extensions.ok((select confirmed from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'), 'the contact confirms');

-- Aendert das Team einen bestaetigten Eintrag, ist er wieder unbestaetigt; bestaetigtes nimmt das Team nicht zurueck.
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.report_program_outcome('f0000000-0000-4000-8000-0000000000c0', (select catalog_id from cat), current_date - 1, 'Datum korrigiert');
select extensions.ok(not (select confirmed from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'), 'a change by the team needs confirmation again');
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.confirm_program_outcome((select outcome_id from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'));
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.remove_program_outcome((select outcome_id from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'))$$, '42501', null, 'the team cannot remove a confirmed result');
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.remove_program_outcome((select outcome_id from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where default_key = 'founded'));
select extensions.is((select count(*)::int from public.get_program_outcomes('f0000000-0000-4000-8000-0000000000c0') where outcome_id is not null), 0, 'the organisation can');

-- Ende des Programms: Ergebnisse weg.
set local request.jwt.claims = '{"sub":"f0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.report_program_outcome('f0000000-0000-4000-8000-0000000000c0', (select catalog_id from cat), current_date, null);
reset role;
select extensions.is((select count(*)::int from public.program_outcomes), 1, 'one result exists');
update public.team_programs set status = 'ended', ended_at = now() where id = 'f0000000-0000-4000-8000-0000000000c0';
select extensions.is((select count(*)::int from public.program_outcomes), 0, 'ending the program deletes the results');
select extensions.throws_ok($$select public.report_program_outcome('f0000000-0000-4000-8000-0000000000c0', (select catalog_id from cat), current_date, null)$$, '55000', null, 'nothing can be reported for an ended program');

select * from extensions.finish();
rollback;
