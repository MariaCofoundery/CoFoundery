\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Was ein Advisor wirklich sieht
-- ---------------------------------------------------------------------------
--
-- DER HEIKELSTE TEIL DES BEREICHS: Hier gehen zum ersten Mal Daten eines
-- Menschen an jemand anderen. Geprueft wird deshalb nicht, dass die Ansicht
-- etwas anzeigt, sondern dass sie SCHWEIGT, wo keine Zustimmung vorliegt -
-- und dass eine Zustimmung nicht die naechste mitbringt.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000001','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000002','authenticated','authenticated','advisor@example.com','',now(),'{}','{}',now(),now());

-- `person_core` legt der Trigger `ensure_person_core_after_user_insert` an -
-- deshalb hier ein UPDATE und kein INSERT.
update public.person_core
set display_name = 'Anna', headline = 'Baut Dinge', bio = 'Ein Satz ueber mich.'
where user_id = 'f1000000-0000-4000-8000-000000000001';

insert into public.person_capability_entries(id, user_id, area_id, application_level, ownership_wish)
values ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001',
        'customer_discovery', 4, 'own');
insert into public.person_capability_evidence(entry_id, narrative)
values ('f2000000-0000-4000-8000-000000000001','Eine Erzaehlung, die niemand ausser mir lesen soll.');

insert into public.person_strengths(user_id, statement, origin, self_frequency, reflected_frequency, reflected_who)
values ('f1000000-0000-4000-8000-000000000001','Bleibt dran','own_words','sometimes','often','former_colleagues');

insert into public.direction_statements(user_id, facet, statement, confidence, origin)
values ('f1000000-0000-4000-8000-000000000001','recurring_theme',
        'Systeme verstaendlicher machen','stated','own_words');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Ohne Zustimmung: nichts
-- ---------------------------------------------------------------------------
-- Nicht "eine leere Liste", sondern ein Fehler. Eine leere Liste waere eine
-- Aussage ueber die Person ("da ist nichts eingetragen"); der Fehler ist eine
-- Aussage ueber den Zugang.
select extensions.throws_ok(
  $$select * from public.get_advisor_person_base('f1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'without consent there is no base');
select extensions.throws_ok(
  $$select * from public.get_advisor_person_capability('f1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'without consent there are no capabilities');
select extensions.throws_ok(
  $$select * from public.get_advisor_person_strengths('f1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'without consent there are no strengths');
select extensions.throws_ok(
  $$select * from public.get_advisor_person_direction('f1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'without consent there is no direction');

-- ---------------------------------------------------------------------------
-- Mit Zustimmung: genau dieser eine Bereich
-- ---------------------------------------------------------------------------
reset role;
insert into public.advisor_person_grants(
  subject_user_id, advisor_user_id, scope, status, requested_by_user_id, approved_at)
values ('f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002',
  'capability','active','f1000000-0000-4000-8000-000000000002', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select area_id from public.get_advisor_person_capability('f1000000-0000-4000-8000-000000000001')),
  'customer_discovery',
  'with consent the area becomes visible');

-- DIE LEITER BLEIBT: Ohne `capability_depth` keine Stufe und kein
-- Verantwortungswunsch - genauso wie bei Netzwerk und Team.
select extensions.is(
  (select application_level from public.get_advisor_person_capability('f1000000-0000-4000-8000-000000000001')),
  null::smallint,
  'but the depth stays behind its own consent');

-- Und die anderen Bereiche bleiben zu.
select extensions.throws_ok(
  $$select * from public.get_advisor_person_strengths('f1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'one consent is not the next');

-- Mit der zweiten Zustimmung kommt die Tiefe dazu.
reset role;
insert into public.advisor_person_grants(
  subject_user_id, advisor_user_id, scope, status, requested_by_user_id, approved_at)
values ('f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002',
  'capability_depth','active','f1000000-0000-4000-8000-000000000002', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select application_level from public.get_advisor_person_capability('f1000000-0000-4000-8000-000000000001')),
  4::smallint,
  'with the second consent the depth appears');

-- ---------------------------------------------------------------------------
-- Die Erzaehlungen nie
-- ---------------------------------------------------------------------------
-- Es gibt keinen Umfang dafuer, und keine dieser Funktionen liest die
-- betreffenden Tabellen. Das ist keine Filterung, sondern eine Abwesenheit:
-- Was niemand lesen darf, wird am besten gar nicht erst gelesen. Dieser Test
-- haelt das fest, damit ein spaeteres `create or replace` es nicht beilaeufig
-- aufweicht.
reset role;
select extensions.is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname like 'get\_advisor\_person\_%'
     and (p.prosrc like '%person_capability_evidence%'
       or p.prosrc like '%capability_interview_turns%'
       or p.prosrc like '%direction_statement_proposals%')),
  0,
  'no advisor view ever reads a narrative or an undecided proposal');

select * from extensions.finish();
rollback;
