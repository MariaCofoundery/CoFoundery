\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Wer fragt da eigentlich?
-- ---------------------------------------------------------------------------
--
-- Eine Zustimmung, bei der man nicht weiss, WEM man zustimmt, ist keine
-- Zustimmung. Diese Suite prueft die Gegenprobe: Die Auskunft darueber, wer
-- fragt, geht an die gefragte Person - und an niemanden sonst.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000001','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000002','authenticated','authenticated','advisorin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000003','authenticated','authenticated','fremde@example.com','',now(),'{}','{}',now(),now());

update public.person_core set display_name = 'Nora', headline = 'Baut Werkzeuge'
where user_id = 'a1000000-0000-4000-8000-000000000001';
update public.person_core set display_name = 'Pia Beraterin', headline = 'Begleitet Teams im Programm'
where user_id = 'a1000000-0000-4000-8000-000000000002';

insert into public.advisor_orgs(id, name, description, website_url, focus, location_region, created_by_user_id)
values ('a2000000-0000-4000-8000-000000000001', 'Beispiel-Accelerator',
  'Wir begleiten zwoelf Teams im Jahr durch die ersten achtzehn Monate.',
  'https://beispiel.example', array['Health','B2B'], 'Leipzig',
  'a1000000-0000-4000-8000-000000000002');

insert into public.advisor_org_members(org_id, user_id, role, status)
values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','owner','active');

-- ENTWEDER ODER, NIE BEIDES (`advisor_person_grants_one_holder`): Diesen
-- Zugang haelt die Organisation, nicht die Person, die gefragt hat.
insert into public.advisor_person_grants(
  subject_user_id, org_id, scope, status, requested_by_user_id, request_note)
values ('a1000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001','capability','requested',
  'a1000000-0000-4000-8000-000000000002','Wir wuerden gern ueber deine Rolle im Team sprechen.');

-- ---------------------------------------------------------------------------
-- Die gefragte Person erfaehrt, wer fragt
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temporary table seen on commit drop as
select * from public.get_person_access_requests();

select extensions.is((select count(*)::int from seen), 1, 'die offene Anfrage ist da');
select extensions.is((select asked_by_name from seen), 'Pia Beraterin',
  'und sie hat einen Namen - vorher stand hier eine Kennung');
select extensions.is((select asked_by_headline from seen), 'Begleitet Teams im Programm',
  'mit einem Satz dazu, wer das ist');

-- ZWEI VERSCHIEDENE FRAGEN. Pia hat gefragt, aber halten wird ihn der
-- Accelerator. Der Unterschied entscheidet, wem der Zugang beim Widerruf
-- entzogen wird - und wer ihn behaelt, wenn Pia die Organisation verlaesst.
select extensions.is((select holder from seen), 'org',
  'wer fragt und wer haelt, sind zwei verschiedene Angaben');
select extensions.is((select advisor_user_id from seen), null::uuid,
  'bei einem Zugang der Organisation haelt ihn keine Person');
select extensions.is((select org_name from seen), 'Beispiel-Accelerator',
  'in wessen Auftrag gefragt wird');
select extensions.is((select org_description from seen),
  'Wir begleiten zwoelf Teams im Jahr durch die ersten achtzehn Monate.',
  'und wofuer diese Organisation da ist');

-- ---------------------------------------------------------------------------
-- Und wirklich nur sie
-- ---------------------------------------------------------------------------
-- DIE WICHTIGSTE PRUEFUNG. Die Funktion laeuft als `security definer` und
-- liest damit `person_core` an der Zeilensicherheit vorbei. Waere ihre Regel
-- falsch, waere sie ein Leseweg auf die Namen aller Menschen.
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_person_access_requests()$$,
  'wen niemand gefragt hat, erfaehrt auch nichts');

-- Auch die fragende Person selbst sieht hier nichts: Die Funktion beantwortet
-- "wer will etwas von MIR", nicht "wen habe ich gefragt".
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_person_access_requests()$$,
  'die Funktion beantwortet nur die eine Richtung');

-- ---------------------------------------------------------------------------
-- Das Organisationsprofil aendert nur die Fuehrung
-- ---------------------------------------------------------------------------
reset role;
insert into public.advisor_org_members(org_id, user_id, role, status)
values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','advisor','active');

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}';
-- Ein Advisor arbeitet im Namen der Organisation - er bestimmt aber nicht,
-- was sie ueber sich sagt.
select extensions.throws_ok(
  $$select public.update_advisor_org_profile(
      'a2000000-0000-4000-8000-000000000001','Umbenannt',null,null,null,null)$$,
  '42501', null, 'ein Mitglied ohne Fuehrungsrolle aendert das Profil nicht');

set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.update_advisor_org_profile(
  'a2000000-0000-4000-8000-000000000001', null,
  'Eine neue Beschreibung, die lang genug ist, um etwas zu sagen.',
  null, null, null);

reset role;
select extensions.is(
  (select description from public.advisor_orgs where id='a2000000-0000-4000-8000-000000000001'),
  'Eine neue Beschreibung, die lang genug ist, um etwas zu sagen.',
  'die Fuehrung darf es');

-- ---------------------------------------------------------------------------
-- Kein Link, den man nicht anklicken duerfte
-- ---------------------------------------------------------------------------
-- Eine Founderin klickt diesen Link, weil sie wissen will, wer sie da fragt.
-- `javascript:` an dieser Stelle waere die teuerste Zeile des Bereichs.
select extensions.throws_ok(
  $$update public.advisor_orgs
    set website_url = 'javascript:alert(1)'
    where id = 'a2000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'nur http(s) als Adresse');

select * from extensions.finish();
rollback;
