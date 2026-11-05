\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

-- ---------------------------------------------------------------------------
-- Formate, Post-Vorlagen, Event-Vorschlaege von Gruendenden (20270324120000)
-- 1 Inhaberin, 2 Advisor (Mitglied), 3 Inhaberin einer anderen Organisation, 4 Founder ohne Organisation,
-- 5 Advisor ohne Founder-Rolle und ohne Organisation.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e9000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'formats' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.profiles(user_id, roles) values
('e9000000-0000-4000-8000-000000000004', array['founder']),
('e9000000-0000-4000-8000-000000000005', array['advisor'])
on conflict (user_id) do update set roles = excluded.roles;
insert into public.advisor_orgs(id, name) values
('e9000000-0000-4000-8000-0000000000a0', 'Format Accelerator'),
('e9000000-0000-4000-8000-0000000000b0', 'Andere Organisation');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000001','owner','active'),
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000002','advisor','active'),
('e9000000-0000-4000-8000-0000000000b0','e9000000-0000-4000-8000-000000000003','owner','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;

-- Formate: die Inhaberin legt an; derselbe Name (andere Schreibweise) gibt dasselbe Format.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into ids values ('mc', public.save_program_event_format('e9000000-0000-4000-8000-0000000000a0', 'Masterclass'));
select extensions.is(public.save_program_event_format('e9000000-0000-4000-8000-0000000000a0', ' masterclass '), (select id from ids where key = 'mc'), 'the same name gives the same format');
insert into ids values ('ev', public.save_program_event('e9000000-0000-4000-8000-0000000000a0', null, 'Pricing', 'education', now() + interval '7 days', 'Basislager', null, null, (select id from ids where key = 'mc')));
select extensions.is((select format_label from public.list_program_events('e9000000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'ev')), 'Masterclass', 'the plan shows the format');
-- Ohne Format (alter Aufruf mit acht Angaben) geht weiter.
select extensions.lives_ok($$select public.save_program_event('e9000000-0000-4000-8000-0000000000a0', null, 'Kick-off', 'internal', now() + interval '9 days', null, null, null)$$, 'a call without a format still works');

-- Ein Advisor (kein Inhaber) legt keine Formate an; eine fremde Organisation auch nicht.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.save_program_event_format('e9000000-0000-4000-8000-0000000000a0', 'Fireside Chat')$$, '42501', null, 'only the owner adds formats');
select extensions.is((select count(*)::int from public.program_event_formats), 1, 'members read the formats');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.program_event_formats), 0, 'another organisation sees none');
insert into ids values ('other', public.save_program_event_format('e9000000-0000-4000-8000-0000000000b0', 'Workshop'));
select extensions.throws_ok(
  $$select public.save_program_event('e9000000-0000-4000-8000-0000000000b0', null, 'X', 'education', now() + interval '3 days', null, null, null, (select id from ids where key = 'mc'))$$,
  '22023', 'program_event_format_invalid', 'a format of another organisation cannot be used');

-- Vorlagen: jedes Mitglied; die Datenbank raeumt die Schritte auf.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('tpl', public.save_org_post_template(null, 'e9000000-0000-4000-8000-0000000000a0', 'Masterclass – Standard',
  '[{"days":-7,"channel":"linkedin","label":"Ankündigung","time":"09:00"},{"days":-7,"channel":"instagram"},{"days":1,"channel":"linkedin","label":"Rückblick","time":"25:00"},{"days":-90,"channel":"linkedin"},{"days":-3,"channel":"myspace"}]'::jsonb));
select extensions.is((select jsonb_array_length(steps) from public.advisor_org_post_templates where id = (select id from ids where key = 'tpl')), 3, 'invalid steps are dropped');
select extensions.is((select steps->2->>'time' from public.advisor_org_post_templates where id = (select id from ids where key = 'tpl')), null, 'an impossible time is dropped');
select extensions.throws_ok($$select public.save_org_post_template(null, 'e9000000-0000-4000-8000-0000000000a0', 'Leer', '[{"days":-3,"channel":"myspace"}]'::jsonb)$$, '22023', 'org_post_template_invalid', 'a template needs at least one valid step');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.delete_org_post_template((select id from ids where key = 'tpl'))$$, '42501', null, 'another organisation cannot delete it');
select extensions.is((select count(*)::int from public.advisor_org_post_templates), 0, 'nor read it');

-- Event-Kalender: Gruendende schlagen ohne Organisation vor; wer weder gruendet noch Mitglied ist, nicht.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into ids values ('found', public.submit_ecosystem_event(null, 'Gründerinnen-Frühstück', now() + interval '4 days', null, false, 'Köln', 'NW', false, null, 'https://example.org/fruehstueck', true));
select extensions.is((select status from public.ecosystem_events where id = (select id from ids where key = 'found')), 'pending', 'a founder suggestion waits for review');
select extensions.is((select submitted_org_name from public.ecosystem_events where id = (select id from ids where key = 'found')), null, 'and carries no organisation');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.submit_ecosystem_event(null, 'X', now() + interval '4 days', null, false, null, null, false, null, 'https://example.org/x', true)$$,
  '42501', 'ecosystem_event_not_allowed', 'without founder role or organisation nothing is submitted');

select * from extensions.finish();
rollback;
