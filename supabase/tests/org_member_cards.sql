\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Wer ist wer (20270327120000): 1 Inhaberin, 2 Advisor, 3 Advisor, 4 Gruenderin im Programm, 5 Gruenderin ohne Programm.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e9000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'cards' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.profiles(user_id, roles) select ('e9000000-0000-4000-8000-00000000000' || n)::uuid, array['founder'] from generate_series(4, 5) n on conflict (user_id) do nothing;
insert into public.advisor_orgs(id, name) values ('e9000000-0000-4000-8000-0000000000a0', 'Karten Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000001','owner','active'),
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000002','advisor','active'),
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000003','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('e9000000-0000-4000-8000-0000000000b0', 'Im Programm', 'existing_team'),
('e9000000-0000-4000-8000-0000000000b1', 'Ohne Programm', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e9000000-0000-4000-8000-0000000000b0','e9000000-0000-4000-8000-000000000004'),
('e9000000-0000-4000-8000-0000000000b1','e9000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-0000000000b0','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-000000000004');

set local role authenticated;

-- Die Inhaberin beschreibt Ben und zeigt ihn - Carla bleibt unsichtbar (Standard).
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_org_member_card('e9000000-0000-4000-8000-0000000000a0', 'e9000000-0000-4000-8000-000000000002', 'Betreut Teams im Gruendungsprozess', 'Ben begleitet seit zehn Jahren.', 'ben@example.com', true);
select public.save_org_member_card('e9000000-0000-4000-8000-0000000000a0', 'e9000000-0000-4000-8000-000000000003', 'Finanzierung', null, null, false);
select extensions.is((select contact from public.advisor_org_member_cards where user_id = 'e9000000-0000-4000-8000-000000000002'), null, 'the owner cannot enter someone else''s contact');
select extensions.is((select count(*)::int from public.advisor_org_member_cards), 2, 'the organisation sees all cards');

-- Ben: ein Kontakt nur von ihm selbst; Mitglieder duerfen fremde Karten nicht aendern.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.save_org_member_card('e9000000-0000-4000-8000-0000000000a0', 'e9000000-0000-4000-8000-000000000002', 'Betreut Teams im Gruendungsprozess', 'Ben begleitet seit zehn Jahren.', 'ben@example.com', true);
select extensions.is((select contact from public.advisor_org_member_cards where user_id = 'e9000000-0000-4000-8000-000000000002'), 'ben@example.com', 'a person enters their own contact');
select extensions.throws_ok($$select public.save_org_member_card('e9000000-0000-4000-8000-0000000000a0', 'e9000000-0000-4000-8000-000000000003', 'x', null, null, true)$$, '42501', 'org_card_not_yours', 'an advisor cannot describe or show someone else');

-- Die Startups: sehen nur sichtbare Karten ihrer Organisation.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select array_agg(user_id) from public.get_my_program_people()), array['e9000000-0000-4000-8000-000000000002']::uuid[], 'a startup in the program sees only the shown card');
select extensions.is((select contact from public.get_my_program_people()), 'ben@example.com', 'with the contact the person gave');
select extensions.is((select count(*)::int from public.advisor_org_member_cards), 0, 'but cannot read the table');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_people()), 0, 'a team without that program sees nobody');

-- Zuruecknehmen: danach kann die Inhaberin ihn nicht wieder zeigen.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.save_org_member_card('e9000000-0000-4000-8000-0000000000a0', 'e9000000-0000-4000-8000-000000000002', 'Betreut Teams im Gruendungsprozess', 'Ben begleitet seit zehn Jahren.', 'ben@example.com', false);
select extensions.is((select self_hidden from public.advisor_org_member_cards where user_id = 'e9000000-0000-4000-8000-000000000002'), true, 'withdrawing is remembered');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.save_org_member_card('e9000000-0000-4000-8000-0000000000a0', 'e9000000-0000-4000-8000-000000000002', 'x', null, null, true)$$, '42501', 'org_card_self_hidden', 'the owner cannot show someone again who withdrew');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_people()), 0, 'and the startup no longer sees the card');

-- Wer die Organisation verlaesst: Karte nicht mehr fuer die Startups.
reset role;
update public.advisor_org_member_cards set shown = true, self_hidden = false where user_id = 'e9000000-0000-4000-8000-000000000002';
update public.advisor_org_members set status = 'revoked', revoked_at = now() where user_id = 'e9000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_people()), 0, 'a member who left is not shown');

select * from extensions.finish();
rollback;
