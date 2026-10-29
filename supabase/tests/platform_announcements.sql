\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'ab000001-0001-4001-8001-000000000001', 'authenticated', 'authenticated', 'ann-admin@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ab000002-0002-4002-8002-000000000002', 'authenticated', 'authenticated', 'ann-user@example.com', '', now(), '{}', '{}', now(), now());
insert into public.platform_admins (user_id) values ('ab000001-0001-4001-8001-000000000001');

-- Admin legt zwei Mitteilungen an: einmalig und wiederkehrend.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ab000001-0001-4001-8001-000000000001","role":"authenticated"}';

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
insert into ids select 'once', public.admin_save_announcement(null, 'Neu hier', 'Text eins', 'New here', 'Text one', 'Ansehen', 'View', '/connect', true, null, null);
insert into ids select 'repeat', public.admin_save_announcement(null, 'Wichtig', 'Text zwei', null, null, null, null, null, false, null, null);
select public.admin_set_announcement_status((select v from ids where k = 'once'), 'active');
select public.admin_set_announcement_status((select v from ids where k = 'repeat'), 'active');

select extensions.is((select count(*)::int from public.admin_list_announcements() where status = 'active'), 2, 'der Admin sieht seine zwei aktiven Mitteilungen');
select extensions.throws_ok(
  $$ select public.admin_save_announcement(null, 'x', 'y', null, null, null, null, 'javascript:alert(1)', true, null, null) $$,
  '23514', null, 'eine Knopfadresse mit javascript: wird abgewiesen');
select extensions.throws_ok(
  $$ select public.admin_save_announcement(null, 'x', 'y', null, null, null, null, '//fremd.example', true, null, null) $$,
  '23514', null, 'eine Adresse mit // wird abgewiesen');

-- Eine normale Person: darf nichts verwalten, sieht aber die naechste Mitteilung.
set local request.jwt.claims = '{"sub":"ab000002-0002-4002-8002-000000000002","role":"authenticated"}';
select extensions.throws_ok($$ select * from public.admin_list_announcements() $$, '42501', null, 'ein Admin-Aufruf ohne Admin-Recht scheitert');
select extensions.throws_ok($$ select * from public.platform_announcements $$, '42501', null, 'die Tabelle selbst bleibt zu');

select extensions.is((select title from public.get_pending_announcement('de')), 'Neu hier', 'die aelteste aktive Mitteilung kommt zuerst');
select extensions.is((select title from public.get_pending_announcement('de')), 'Wichtig', 'einmalig: die erste kommt nicht wieder, die naechste folgt');
select extensions.is((select title from public.get_pending_announcement('de')), 'Wichtig', 'wiederkehrend: sie kommt wieder, solange sie nicht weggeklickt ist');

select public.dismiss_announcement((select v from ids where k = 'repeat'));
select extensions.is((select count(*)::int from public.get_pending_announcement('de')), 0, 'weggeklickt: nichts mehr zu zeigen');

select extensions.is((select count(*)::int from public.list_my_announcements('de')), 2, 'beide liegen im Postfach');
select extensions.is(
  (select dismissed_at is not null from public.list_my_announcements('de') where title = 'Wichtig'),
  true, 'die weggeklickte ist als erledigt vermerkt');
select extensions.is(
  (select dismissed_at is null from public.list_my_announcements('de') where title = 'Neu hier'),
  true, 'die einmalige liegt als gesehen, nicht weggeklickt, im Postfach');

-- Sprache: englisch, wenn beides da ist; sonst deutsch.
select extensions.is((select title from public.list_my_announcements('en') where id = (select v from ids where k = 'once')), 'New here', 'englischer Text, wenn vorhanden');
select extensions.is((select title from public.list_my_announcements('en') where id = (select v from ids where k = 'repeat')), 'Wichtig', 'sonst der deutsche');

-- Die eigenen Vermerke sind lesbar (fuer den Datenexport), die fremden nicht.
select extensions.is((select count(*)::int from public.announcement_receipts), 2, 'die Person liest ihre eigenen zwei Vermerke');
set local request.jwt.claims = '{"sub":"ab000001-0001-4001-8001-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.announcement_receipts), 0, 'und keine fremden');

-- Ein Entwurf wird niemandem gezeigt.
insert into ids select 'draft', public.admin_save_announcement(null, 'Entwurf', 'noch nicht', null, null, null, null, null, true, null, null);
set local request.jwt.claims = '{"sub":"ab000002-0002-4002-8002-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_pending_announcement('de')), 0, 'ein Entwurf wird nicht gezeigt');

select * from extensions.finish();
rollback;
