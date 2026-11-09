\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(45);

-- Rollen der Organisation (20270410120000):
-- 1 Admin, 2 zweite Admin, 3 Koordination, 4 Advisor (Ansprechperson), 5 Advisor ohne Startup, 6 Gast,
-- 7 Gruenderin, 8 Fremde, 9 wird eingeladen.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ee100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'rolle' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 9) n;
insert into public.profiles(user_id, roles) values ('ee100000-0000-4000-8000-000000000007', array['founder']) on conflict (user_id) do nothing;
insert into public.advisor_orgs(id, name) values ('ee100000-0000-4000-8000-0000000000a0', 'Rollen Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-000000000001','owner','active'),
('ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-000000000002','owner','active'),
('ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-000000000003','coordinator','active'),
('ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-000000000004','advisor','active'),
('ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-000000000005','advisor','active'),
('ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-000000000006','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('ee100000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('ee100000-0000-4000-8000-0000000000b0','ee100000-0000-4000-8000-000000000007');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('ee100000-0000-4000-8000-0000000000c0','ee100000-0000-4000-8000-0000000000a0','ee100000-0000-4000-8000-0000000000b0','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values ('ee100000-0000-4000-8000-0000000000c0','ee100000-0000-4000-8000-000000000007');
insert into public.team_program_contacts(program_id, advisor_user_id) values ('ee100000-0000-4000-8000-0000000000c0','ee100000-0000-4000-8000-000000000004');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

-- ---------------------------------------------------------------- Voreinstellungen
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.ok(public.org_has_right('ee100000-0000-4000-8000-0000000000a0', 'plan') and public.org_has_right('ee100000-0000-4000-8000-0000000000a0', 'invite'), 'coordination may plan and invite by default');
insert into ids values ('event', public.save_program_event('ee100000-0000-4000-8000-0000000000a0', null, 'Pitch-Tag', 'education', now() + interval '10 days', null, null, null));
select extensions.ok(exists (select 1 from ids where key = 'event'), 'coordination saves an event');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.ok(not public.org_has_right('ee100000-0000-4000-8000-0000000000a0', 'plan') and not public.org_has_right('ee100000-0000-4000-8000-0000000000a0', 'invite') and public.org_has_right('ee100000-0000-4000-8000-0000000000a0', 'room'), 'an advisor may not plan or invite by default, but works in the team room');
select extensions.throws_ok($$select public.save_program_event('ee100000-0000-4000-8000-0000000000a0', null, 'Eigenmächtig', 'education', now() + interval '12 days', null, null, null)$$, '42501', null, 'so an advisor cannot save an event');
select extensions.throws_ok($$select public.create_advisor_org_invite('ee100000-0000-4000-8000-0000000000a0', 'neu@example.com', repeat('c', 64), 'advisor')$$, '42501', 'advisor_org_not_yours', 'nor invite directly');
select extensions.throws_ok($$select public.update_advisor_org_profile('ee100000-0000-4000-8000-0000000000a0', 'Neu', null, null, null, null)$$, '42501', null, 'nor change the profile');
select extensions.is((select count(*)::int from public.get_org_team_programs('ee100000-0000-4000-8000-0000000000a0')), 0, 'an advisor who is nobody''s contact sees no startup');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_org_team_programs('ee100000-0000-4000-8000-0000000000a0')), 1, 'the contact sees their startup');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_org_team_programs('ee100000-0000-4000-8000-0000000000a0')), 1, 'coordination sees all startups');
select public.update_advisor_org_profile('ee100000-0000-4000-8000-0000000000a0', 'Rollen Accelerator', repeat('Wir begleiten Teams. ', 4), null, null, null);
select extensions.ok(true, 'coordination changes the profile');
select extensions.throws_ok($$select public.set_org_features('ee100000-0000-4000-8000-0000000000a0', array['plan'])$$, '42501', null, 'but features stay with the admin');
select extensions.throws_ok($$select public.set_advisor_org_member_role('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000005', 'coordinator')$$, '42501', 'advisor_org_not_yours', 'and appointing roles too');
select extensions.throws_ok($$select public.set_org_member_rights('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000005', '{"plan": true}')$$, '42501', 'advisor_org_not_yours', 'and setting rights');

-- ---------------------------------------------------------------- Rechte pro Person
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.set_org_member_rights('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000005', '{"fly": true}')$$, '22023', 'org_rights_invalid', 'an unknown right is refused');
select extensions.throws_ok($$select public.set_org_member_rights('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000002', '{"plan": false}')$$, '22023', 'org_rights_admin_fixed', 'an admin always has everything');
select public.set_org_member_rights('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000005', '{"plan": true, "room": true, "invite": false}');
select extensions.is((select m.rights from public.advisor_org_members m where m.user_id = 'ee100000-0000-4000-8000-000000000005'), '{"plan": true}'::jsonb, 'only what differs from the preset is stored');
select extensions.is((select m.rights_updated_by from public.advisor_org_members m where m.user_id = 'ee100000-0000-4000-8000-000000000005'), 'ee100000-0000-4000-8000-000000000001'::uuid, 'and who changed it');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000005","role":"authenticated"}';
select public.save_program_event('ee100000-0000-4000-8000-0000000000a0', null, 'Mit Recht', 'education', now() + interval '13 days', null, null, null);
select extensions.ok(true, 'with the right granted, the advisor plans');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_org_member_rights('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000005', '{"room": false, "people": false}');
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.ok(not public.org_has_right('ee100000-0000-4000-8000-0000000000a0', 'room'), 'switching the team room off closes it');
select extensions.throws_ok($$select public.create_org_chat_group('ee100000-0000-4000-8000-0000000000a0', 'Chat', array[]::uuid[])$$, '42501', null, 'and with it the chat');
select extensions.throws_ok($$select public.save_org_member_card('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000005', 'Kopf', 'Text', null, true)$$, '42501', null, 'the own card needs the people right');

-- ---------------------------------------------------------------- Gast
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_advisor_org_member_role('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000006', 'guest');
select extensions.ok((select l.role = 'guest' and l.status = 'active' from public.get_advisor_org_member_list('ee100000-0000-4000-8000-0000000000a0') l where l.user_id = 'ee100000-0000-4000-8000-000000000006')
  and exists (select 1 from public.advisor_org_members m where m.user_id = 'ee100000-0000-4000-8000-000000000006' and m.status = 'revoked'), 'a guest lives in its own table and is no member any more');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.ok(not public.is_advisor_org_member('ee100000-0000-4000-8000-0000000000a0') and public.is_advisor_org_guest('ee100000-0000-4000-8000-0000000000a0'), 'the guest is not a member for any member-only rule');
select extensions.ok((select count(*) from public.list_program_events('ee100000-0000-4000-8000-0000000000a0')) >= 1, 'but sees the calendar');
select extensions.ok((select count(*) from public.list_program_events('ee100000-0000-4000-8000-0000000000a0') where notes is not null or todos is not null or internal_note is not null) = 0, 'without internal notes');
select extensions.is((select teams_active from public.get_org_numbers('ee100000-0000-4000-8000-0000000000a0')), 1, 'sees the numbers without names');
select extensions.is((select count(*)::int from public.get_org_team_programs('ee100000-0000-4000-8000-0000000000a0')), 0, 'but no single startup');
select extensions.is((select count(*)::int from public.get_org_report_attendance('ee100000-0000-4000-8000-0000000000a0', null, null)), 0, 'nor the per-team report');
select extensions.is((select count(*)::int from public.get_advisor_org_member_list('ee100000-0000-4000-8000-0000000000a0')), 0, 'nor the member list');
select extensions.is((select count(*)::int from public.advisor_org_tasks), 0, 'nor the tasks of the team room');
select extensions.throws_ok($$select public.save_program_event('ee100000-0000-4000-8000-0000000000a0', null, 'Gast', 'education', now() + interval '14 days', null, null, null)$$, '42501', null, 'and changes nothing');
select extensions.is((select name from public.advisor_orgs where id = 'ee100000-0000-4000-8000-0000000000a0'), 'Rollen Accelerator', 'the guest knows the organisation''s name');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_org_member_rights('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000006', '{"plan": true, "results": false}');
select extensions.is((select l.rights from public.get_advisor_org_member_list('ee100000-0000-4000-8000-0000000000a0') l where l.user_id = 'ee100000-0000-4000-8000-000000000006'), '{"results": false}'::jsonb, 'a guest can only get the results right, nothing else');
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_org_numbers('ee100000-0000-4000-8000-0000000000a0')), 0, 'with results switched off the guest sees no numbers');

-- ---------------------------------------------------------------- Einladen mit Rolle und Vorschlaege
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.ok(public.create_advisor_org_invite('ee100000-0000-4000-8000-0000000000a0', 'rolle9@example.com', repeat('d', 64), 'guest') is not null, 'coordination invites a guest');
select extensions.throws_ok($$select public.create_advisor_org_invite('ee100000-0000-4000-8000-0000000000a0', 'x@example.com', repeat('e', 64), 'owner')$$, '42501', 'advisor_org_not_yours', 'but only an admin appoints admins');
select extensions.throws_ok($$select public.set_advisor_org_membership('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000002', 'revoked')$$, '42501', 'advisor_org_not_yours', 'nor removes one');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000009","role":"authenticated"}';
select public.claim_advisor_org_invite(repeat('d', 64));
select extensions.ok(exists (select 1 from public.advisor_org_guests g where g.user_id = 'ee100000-0000-4000-8000-000000000009' and g.status = 'active')
  and not exists (select 1 from public.advisor_org_members m where m.user_id = 'ee100000-0000-4000-8000-000000000009'), 'accepting a guest invitation makes a guest, not a member');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into ids values ('suggestion', public.suggest_advisor_org_invite('ee100000-0000-4000-8000-0000000000a0', 'Jonas@Beispiel.de', 'advisor', 'kennt sich aus'));
select extensions.throws_ok($$select public.suggest_advisor_org_invite('ee100000-0000-4000-8000-0000000000a0', 'jonas@beispiel.de', 'advisor', null)$$, '23505', null, 'the same address is not suggested twice at once');
select extensions.is((select count(*)::int from public.list_advisor_org_invite_suggestions('ee100000-0000-4000-8000-0000000000a0')), 1, 'the suggesting advisor sees their own suggestion');
select extensions.throws_ok($$select public.decide_advisor_org_invite_suggestion((select id from ids where key = 'suggestion'), true, null)$$, '42501', 'advisor_org_not_yours', 'and cannot decide it');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.throws_ok($$select public.suggest_advisor_org_invite('ee100000-0000-4000-8000-0000000000a0', 'g@example.com', 'advisor', null)$$, '42501', 'advisor_org_not_yours', 'a guest cannot suggest');

set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_advisor_org_invite_suggestions('ee100000-0000-4000-8000-0000000000a0') where status = 'open'), 1, 'coordination sees the open suggestion');
select public.decide_advisor_org_invite_suggestion((select id from ids where key = 'suggestion'), false, 'Passt gerade nicht');
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select decision_note from public.list_advisor_org_invite_suggestions('ee100000-0000-4000-8000-0000000000a0') where status = 'declined'), 'Passt gerade nicht', 'the suggester learns it was declined, with the note');

-- ---------------------------------------------------------------- Der letzte Admin bleibt
set local request.jwt.claims = '{"sub":"ee100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_advisor_org_member_role('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000002', 'coordinator');
select extensions.throws_ok($$select public.set_advisor_org_member_role('ee100000-0000-4000-8000-0000000000a0', 'ee100000-0000-4000-8000-000000000001', 'advisor')$$, '42501', 'advisor_org_needs_an_owner', 'the last admin cannot step down');

select * from extensions.finish();
rollback;
