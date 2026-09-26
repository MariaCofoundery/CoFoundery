\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

-- ---------------------------------------------------------------------------
-- Eine gemeinsame Auswertung - und wer ihr zustimmt
-- ---------------------------------------------------------------------------
--
-- Bisher hat immer EINE Person ueber IHRE EIGENEN Daten entschieden. Eine
-- gemeinsame Auswertung ist eine Aussage ueber das Verhaeltnis ZWISCHEN
-- Menschen und gehoert allen Beteiligten. Diese Suite prueft genau das:
-- niemand wird ohne sein Ja verglichen, und ein einziges Nein beendet das
-- Ganze.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000002','authenticated','authenticated','bert@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000003','authenticated','authenticated','advisorin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000004','authenticated','authenticated','fremde@example.com','',now(),'{}','{}',now(),now());

update public.person_core set display_name = 'Anna' where user_id = 'c1000000-0000-4000-8000-000000000001';
update public.person_core set display_name = 'Bert' where user_id = 'c1000000-0000-4000-8000-000000000002';
update public.person_core set display_name = 'Pia'  where user_id = 'c1000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- Nur unter Menschen, die man schon begleitet
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';

-- Ohne Einzelfreigabe geht gar nichts. Sonst waere eine "Anfrage" ein Weg,
-- Fremden mitzuteilen, wen man sonst noch begleitet - denn die Anfrage nennt
-- allen Beteiligten die anderen Namen.
select extensions.throws_ok(
  $$select public.request_advisor_team_review(array[
      'c1000000-0000-4000-8000-000000000001'::uuid,
      'c1000000-0000-4000-8000-000000000002'::uuid])$$,
  '42501', null, 'no joint review among people you do not accompany');

reset role;
insert into public.advisor_person_grants(
  subject_user_id, advisor_user_id, scope, status, requested_by_user_id, approved_at)
values
 ('c1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003','base','active','c1000000-0000-4000-8000-000000000003', now()),
 ('c1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000003','base','active','c1000000-0000-4000-8000-000000000003', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';

-- Eine Person allein ist keine Aufstellung.
select extensions.throws_ok(
  $$select public.request_advisor_team_review(array['c1000000-0000-4000-8000-000000000001'::uuid])$$,
  '22023', null, 'one person is not a line-up');

create temporary table review on commit drop as
select public.request_advisor_team_review(
  array['c1000000-0000-4000-8000-000000000001'::uuid,'c1000000-0000-4000-8000-000000000002'::uuid],
  null,
  'Wir wuerden gern ueber eure Rollenverteilung sprechen.') as id;

-- ---------------------------------------------------------------------------
-- Vor der Zustimmung gibt es nichts zu sehen
-- ---------------------------------------------------------------------------
select extensions.is(
  (select public.has_advisor_team_review_access((select id from review))),
  false,
  'a requested review is not yet readable');

-- ---------------------------------------------------------------------------
-- Wer gefragt wird, erfaehrt mit wem
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temporary table annas_view on commit drop as
select * from public.get_my_team_review_requests();

select extensions.is((select count(*)::int from annas_view), 1, 'Anna sees the request');
select extensions.is((select my_decision from annas_view), 'pending', 'and it is hers to answer');
-- DIE WICHTIGSTE ZEILE: Man kann einem Vergleich nicht zustimmen, ohne zu
-- wissen, mit wem verglichen wird.
select extensions.is((select other_names from annas_view), array['Bert'],
  'and she learns with whom she would be compared');
select extensions.is((select asked_by_name from annas_view), 'Pia', 'and who is asking');

-- Fremde sehen nichts davon.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_my_team_review_requests()$$,
  'someone who was not asked sees nothing');
select extensions.throws_ok(
  $$select public.decide_advisor_team_review((select id from review), true)$$,
  '42501', null, 'and cannot answer for anybody');

-- ---------------------------------------------------------------------------
-- Ein Ja allein reicht nicht
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.decide_advisor_team_review((select id from review), true);

set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select public.has_advisor_team_review_access((select id from review))),
  false,
  'one yes is not enough');

set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.decide_advisor_team_review((select id from review), true);

set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select public.has_advisor_team_review_access((select id from review))),
  true,
  'with everybody it exists');

-- Und ein Unbeteiligter sieht sie auch dann nicht.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is(
  (select public.has_advisor_team_review_access((select id from review))),
  false,
  'and only for its holder');

-- ---------------------------------------------------------------------------
-- Wer aussteigt, nimmt sie mit
-- ---------------------------------------------------------------------------
-- Nicht nur den eigenen Anteil: Die Auswertung IST die Zusammenstellung.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.revoke_advisor_team_review((select id from review));

set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select public.has_advisor_team_review_access((select id from review))),
  false,
  'one withdrawal ends the whole thing');

reset role;
select extensions.is(
  (select status from public.advisor_team_reviews where id = (select id from review)),
  'revoked',
  'and it is recorded as withdrawn, not declined');

-- ---------------------------------------------------------------------------
-- Die Tabellen selbst bleiben zu
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select count(*) from public.advisor_team_reviews$$,
  '42501', null, 'the tables are read through the functions only');

select * from extensions.finish();
rollback;
