\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- ---------------------------------------------------------------------------
-- Termine: Fuer wen, oeffentlich, Foerderung nach Format, Einrichten (20270325120000)
-- 1 Inhaberin, 2 Founder Team Eins, 3 Founder Team Zwei.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ea000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'details' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('ea000000-0000-4000-8000-0000000000a0', 'Termin Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000001','owner','active');
insert into public.founder_teams(id, name, team_context) values
('ea000000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team'),
('ea000000-0000-4000-8000-0000000000b1', 'Zwei', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ea000000-0000-4000-8000-0000000000b0','ea000000-0000-4000-8000-000000000002'),
('ea000000-0000-4000-8000-0000000000b1','ea000000-0000-4000-8000-000000000003');
-- Ein-Personen-Teams zaehlen als aktiv, wenn das bestaetigt ist.
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('ea000000-0000-4000-8000-0000000000c0','ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-0000000000b0','active', now(), now()),
('ea000000-0000-4000-8000-0000000000c1','ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-0000000000b1','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ea000000-0000-4000-8000-0000000000c0','ea000000-0000-4000-8000-000000000002'),
('ea000000-0000-4000-8000-0000000000c1','ea000000-0000-4000-8000-000000000003');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('all', public.save_program_event('ea000000-0000-4000-8000-0000000000a0', null, 'Masterclass', 'education', now() + interval '3 days', 'Basislager', null, null, null,
  now() + interval '3 days 2 hours', 'hybrid', 'all', null, true, 'us', 'Honorar klären', null, null));
insert into ids values ('internal', public.save_program_event('ea000000-0000-4000-8000-0000000000a0', null, 'Jury-Sitzung', 'education', now() + interval '4 days', null, null, null, null,
  null, 'onsite', 'internal', null, false, 'us', null, null, null));
insert into ids values ('sel', public.save_program_event('ea000000-0000-4000-8000-0000000000a0', null, 'Office Hours', 'education', now() + interval '5 days', null, null, null, null,
  null, 'online', 'selected', array['ea000000-0000-4000-8000-0000000000c0']::uuid[], false, 'partner', null, null, null));
-- Alter Aufruf (Code beim Ausrollen): "internal" heisst nur unser Team.
insert into ids values ('old', public.save_program_event('ea000000-0000-4000-8000-0000000000a0', null, 'Altes Intern', 'internal', now() + interval '6 days', null, null, null));

select extensions.is((select audience from public.list_program_events('ea000000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'old')), 'internal', 'an old call with kind internal means only our team');
select extensions.is((select kind from public.list_program_events('ea000000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'sel')), 'external', 'kind follows: partner means external');
select extensions.is((select kind from public.list_program_events('ea000000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'internal')), 'internal', 'kind follows: only our team means internal');
select extensions.throws_ok(
  $$select public.save_program_event('ea000000-0000-4000-8000-0000000000a0', null, 'X', 'education', now() + interval '3 days', null, null, null, null, null, 'onsite', 'selected', '{}'::uuid[], false, 'us', null, null, null)$$,
  '22023', 'program_event_audience_invalid', 'selected teams need at least one team');
select extensions.is((select internal_note from public.list_program_events('ea000000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'all')), 'Honorar klären', 'the organisation sees the internal note');

-- Team Eins: alle + ausgewaehlt; nie intern, nie die interne Notiz.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select array_agg(title order by starts_at) from public.get_my_program_events()), array['Masterclass', 'Office Hours'], 'team one sees all-team and its selected events, never internal ones');
select extensions.throws_ok($$select public.set_program_event_rsvp((select id from ids where key = 'internal'), 'ea000000-0000-4000-8000-0000000000c0', 'yes')$$, '42501', null, 'and cannot answer an internal event');
-- Team Zwei: nur alle.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select array_agg(title) from public.get_my_program_events()), array['Masterclass'], 'team two sees only the all-team event');
select extensions.throws_ok($$select public.set_program_event_rsvp((select id from ids where key = 'sel'), 'ea000000-0000-4000-8000-0000000000c1', 'yes')$$, '42501', null, 'and cannot answer an event for other teams');

-- Organisation: Anwesenheit nur fuer erreichte Teams.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_event_attendance((select id from ids where key = 'internal'))), 0, 'an internal event has no teams to mark');
select extensions.is((select count(*)::int from public.get_event_attendance((select id from ids where key = 'sel'))), 1, 'a selected event only its teams');
select extensions.throws_ok($$select public.set_program_attendance((select id from ids where key = 'sel'), 'ea000000-0000-4000-8000-0000000000c1', 'present')$$, '42501', null, 'attendance cannot be set for a team the event does not reach');

-- Oeffentlich: nur mit https-Link, als wartender Vorschlag; abgewaehlt verschwindet er.
select extensions.throws_ok(
  $$select public.save_program_event('ea000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'all'), 'Masterclass', 'education', now() + interval '3 days', 'Basislager', null, null, null, null, 'hybrid', 'all', null, true, 'us', null, true, null)$$,
  '22023', 'program_event_public_url_required', 'public needs a link');
select public.save_program_event('ea000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'all'), 'Masterclass', 'education', now() + interval '3 days', 'Basislager', null, null, null, null, 'hybrid', 'all', null, true, 'us', null, true, 'https://example.org/masterclass');
select extensions.is((select public_status from public.list_program_events('ea000000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'all')), 'pending', 'public makes a pending suggestion in the event calendar');
select public.save_program_event('ea000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'all'), 'Masterclass', 'education', now() + interval '3 days', 'Basislager', null, null, null, null, 'hybrid', 'all', null, true, 'us', null, false, null);
select extensions.is((select count(*)::int from public.ecosystem_events where title = 'Masterclass'), 0, 'unticking takes the suggestion back');

-- Einrichten: uebersprungen bleibt gemerkt, nur fuer die Person.
select public.set_advisor_setup_state('ea000000-0000-4000-8000-0000000000a0', 'team', null);
select public.set_advisor_setup_state('ea000000-0000-4000-8000-0000000000a0', 'team', true);
select extensions.is((select skipped from public.advisor_setup_state), array['team'], 'a skipped step is remembered once');

select * from extensions.finish();
rollback;
