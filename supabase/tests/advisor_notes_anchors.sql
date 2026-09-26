\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Die Handakte - an drei Ankern, mit denselben Zusagen
-- ---------------------------------------------------------------------------
--
-- Notizen gehoeren dem, der sie geschrieben hat. Sie ueberleben einen
-- Widerruf, aber keine Kontoloeschung. Diese Suite prueft beide Haelften -
-- und vor allem die Stelle, an der die zweite fast verlorengegangen waere.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','bert@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','pia@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000004','authenticated','authenticated','zoe@example.com','',now(),'{}','{}',now(),now());

insert into public.advisor_team_reviews(id, advisor_user_id, requested_by_user_id, status, activated_at)
values ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003',
        'd1000000-0000-4000-8000-000000000003','active', now());
insert into public.advisor_team_review_members(review_id, subject_user_id, decision, decided_at) values
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','approved', now()),
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','approved', now());

-- ---------------------------------------------------------------------------
-- Genau ein Anker
-- ---------------------------------------------------------------------------
-- Eine Notiz an zwei Dingen waere beim Loeschen nicht eindeutig - und beim
-- Anzeigen auch nicht.
select extensions.throws_ok(
  $$insert into public.advisor_private_notes(advisor_user_id, body)
    values ('d1000000-0000-4000-8000-000000000003', 'ohne Anker')$$,
  '23514', null, 'a note without an anchor is refused');

select extensions.throws_ok(
  $$insert into public.advisor_private_notes(
      advisor_user_id, subject_user_id, review_id, body)
    values ('d1000000-0000-4000-8000-000000000003',
            'd1000000-0000-4000-8000-000000000001',
            'd2000000-0000-4000-8000-000000000001', 'zwei Anker')$$,
  '23514', null, 'two anchors at once are refused');

-- ---------------------------------------------------------------------------
-- Es gehoert dem, der es geschrieben hat
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';

insert into public.advisor_private_notes(advisor_user_id, subject_user_id, body)
values ('d1000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000001',
        'Beim naechsten Mal nach der Rollenverteilung fragen.');
insert into public.advisor_private_notes(advisor_user_id, review_id, body)
values ('d1000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000001',
        'Die beiden reden aneinander vorbei, wenn es um Tempo geht.');

select extensions.is((select count(*)::int from public.advisor_private_notes), 2,
  'the advisor sees her own notes');

-- Auch die begleitete Person sieht sie nicht. Das ist der ganze Punkt: Sie
-- waren nie fuer sie bestimmt.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select body from public.advisor_private_notes$$,
  'the person they are about sees nothing');

-- Und ein anderer Advisor auch nicht - auch nicht in derselben Organisation.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is_empty(
  $$select body from public.advisor_private_notes$$,
  'and no other advisor either');

-- ---------------------------------------------------------------------------
-- Sie ueberleben einen Widerruf
-- ---------------------------------------------------------------------------
-- Eine Beraterin behaelt ihre Handakte, wenn das Mandat endet.
reset role;
update public.advisor_team_reviews set status = 'revoked', closed_at = now()
where id = 'd2000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_private_notes), 2,
  'a withdrawal does not take the notes');

-- ---------------------------------------------------------------------------
-- Aber keine Kontoloeschung
-- ---------------------------------------------------------------------------
-- DIE STELLE, DIE FAST DURCHGERUTSCHT WAERE. Bei der Notiz an einer PERSON
-- traegt das der Fremdschluessel. Bei der Notiz an einer GEMEINSAMEN
-- AUSWERTUNG nicht: Verschwindet eine beteiligte Person, bliebe die
-- Auswertung stehen - und mit ihr die Aufzeichnung ueber einen Menschen, den
-- es nicht mehr gibt.
reset role;
delete from auth.users where id = 'd1000000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::int from public.advisor_private_notes
   where subject_user_id = 'd1000000-0000-4000-8000-000000000001'),
  0,
  'deleting the account takes the note about that person');

select extensions.is(
  (select count(*)::int from public.advisor_team_reviews
   where id = 'd2000000-0000-4000-8000-000000000001'),
  0,
  'and the joint evaluation goes with the person who left it');

select extensions.is(
  (select count(*)::int from public.advisor_private_notes),
  0,
  'so no note about a deleted person survives');

select * from extensions.finish();
rollback;
