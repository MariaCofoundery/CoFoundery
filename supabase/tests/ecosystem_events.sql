\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- ---------------------------------------------------------------------------
-- Event-Kalender (20270323120000)
-- 1 Advisor (Mitglied einer aktiven Organisation), 2 Founder (keine Organisation), 3 Plattform-Admin.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e8000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'events' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('e8000000-0000-4000-8000-0000000000a0', 'Event Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000001','owner','active');
insert into public.platform_admins(user_id) values ('e8000000-0000-4000-8000-000000000003');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;

-- Vorschlagen: nur mit Bestaetigung, nur fuer die eigene Organisation, nur https.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select extensions.throws_ok(
  $$select public.submit_ecosystem_event('e8000000-0000-4000-8000-0000000000a0', 'Stammtisch', now() + interval '3 days', null, false, 'Leipzig', 'SN', false, 'Hub', 'https://example.org/e', false)$$,
  '22023', 'ecosystem_event_not_confirmed', 'without confirming nothing is submitted');
select extensions.throws_ok(
  $$select public.submit_ecosystem_event('e8000000-0000-4000-8000-0000000000a0', 'Stammtisch', now() + interval '3 days', null, false, 'Leipzig', 'SN', false, 'Hub', 'http://example.org/e', true)$$,
  '23514', null, 'only https links');
select extensions.throws_ok(
  $$select public.submit_ecosystem_event('e8000000-0000-4000-8000-0000000000a0', 'Alt', now() - interval '5 days', null, false, null, null, false, null, 'https://example.org/e', true)$$,
  '22023', 'ecosystem_event_invalid', 'nothing in the past');
insert into ids values ('sub', public.submit_ecosystem_event('e8000000-0000-4000-8000-0000000000a0', 'Gründungsstammtisch', now() + interval '3 days', null, false, 'Basislager, Leipzig', 'SN', false, 'Gründerzentrum', 'https://example.org/stammtisch', true));
select extensions.is((select status from public.ecosystem_events where id = (select id from ids where key = 'sub')), 'pending', 'a suggestion waits for review');
select extensions.is((select submitted_org_name from public.ecosystem_events where id = (select id from ids where key = 'sub')), 'Event Accelerator', 'the organisation name is kept with it');
select extensions.is((select count(*)::int from public.ecosystem_events), 1, 'the submitter sees their own suggestion');

-- Founder: kein Vorschlag ohne Organisation, sieht Wartendes nicht.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.submit_ecosystem_event('e8000000-0000-4000-8000-0000000000a0', 'X', now() + interval '3 days', null, false, null, null, false, null, 'https://example.org/x', true)$$,
  '42501', 'ecosystem_event_not_allowed', 'only members of the organisation can submit for it');
select extensions.is((select count(*)::int from public.ecosystem_events), 0, 'a pending suggestion is invisible to others');
select extensions.throws_ok($$select public.review_ecosystem_event((select id from ids where key = 'sub'), true)$$, '42501', null, 'only admins review');
select extensions.throws_ok($$insert into public.ecosystem_events (title, starts_at, url, status) values ('x', now(), 'https://x.org', 'published')$$, '42501', null, 'nobody writes events directly');

-- Admin gibt frei: alle sehen es; Founder kann es merken.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.review_ecosystem_event((select id from ids where key = 'sub'), true);
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.ecosystem_events where status = 'published'), 1, 'after approval everyone sees it');
select extensions.is(public.toggle_ecosystem_event_save((select id from ids where key = 'sub')), true, 'saving switches on');
select extensions.is((select count(*)::int from public.ecosystem_event_saves), 1, 'the own save is visible');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.ecosystem_event_saves), 0, 'nobody sees what others saved');

-- Quellen: nur Admins, aus bis eingeschaltet, Import nur fuer den Server.
select extensions.throws_ok(
  $$select public.save_ecosystem_event_source('hub', 'Hub', 'https://hub.example.org', 'ics', 'https://hub.example.org/cal.ics', 'NW', 'CC BY 4.0', null, 'Hub e.V.', 'Lizenzseite https://hub.example.org/lizenz')$$,
  '42501', null, 'only admins add sources');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into ids values ('src', public.save_ecosystem_event_source('hub', 'Hub', 'https://hub.example.org', 'ics', 'https://hub.example.org/cal.ics', 'NW', 'CC BY 4.0', null, 'Hub e.V.', 'Lizenzseite https://hub.example.org/lizenz'));
select extensions.is((select enabled from public.ecosystem_event_sources where id = (select id from ids where key = 'src')), false, 'a new source is off');
select extensions.throws_ok($$select public.import_ecosystem_events((select id from ids where key = 'src'), '[]'::jsonb)$$, '42501', null, 'importing is for the server only');
reset role;

-- Der Server-Lauf: eine ausgeschaltete Quelle liefert nichts; eingeschaltet ersetzt der Lauf ihren Stand.
select extensions.is(public.import_ecosystem_events((select id from ids where key = 'src'),
  jsonb_build_array(jsonb_build_object('external_id', 'a', 'title', 'Pitch-Abend', 'starts_at', now() + interval '5 days', 'url', 'https://hub.example.org/a'))), 0, 'a source that is off imports nothing');
update public.ecosystem_event_sources set enabled = true where id = (select id from ids where key = 'src');
select public.import_ecosystem_events((select id from ids where key = 'src'), jsonb_build_array(
  jsonb_build_object('external_id', 'a', 'title', 'Pitch-Abend', 'starts_at', now() + interval '5 days', 'url', 'https://hub.example.org/a'),
  jsonb_build_object('external_id', 'b', 'title', 'Webinar', 'starts_at', now() + interval '6 days', 'url', 'https://hub.example.org/b', 'online', true),
  jsonb_build_object('external_id', 'c', 'title', 'Ohne sicheren Link', 'starts_at', now() + interval '6 days', 'url', 'http://hub.example.org/c')));
select extensions.is((select count(*)::int from public.ecosystem_events where source_id = (select id from ids where key = 'src')), 2, 'facts with an https link come in, published, with the source region');
select public.import_ecosystem_events((select id from ids where key = 'src'), jsonb_build_array(
  jsonb_build_object('external_id', 'b', 'title', 'Webinar (verschoben)', 'starts_at', now() + interval '7 days', 'url', 'https://hub.example.org/b')));
select extensions.is(
  (select array_agg(title) from public.ecosystem_events where source_id = (select id from ids where key = 'src')),
  array['Webinar (verschoben)'], 'what the source no longer lists disappears, changes are taken over');

-- Ausschalten nimmt die Events sofort heraus; Aufbewahrung loescht Altes.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
set local role authenticated;
select public.set_ecosystem_event_source_enabled((select id from ids where key = 'src'), false);
reset role;
select extensions.is((select count(*)::int from public.ecosystem_events where source_id = (select id from ids where key = 'src')), 0, 'switching a source off removes its events');
update public.ecosystem_events set starts_at = now() - interval '70 days' where id = (select id from ids where key = 'sub');
select public.purge_old_ecosystem_events();
select extensions.is((select count(*)::int from public.ecosystem_events where id = (select id from ids where key = 'sub')), 0, 'events long past are deleted');

select * from extensions.finish();
rollback;
