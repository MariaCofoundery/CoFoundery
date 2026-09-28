\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

-- ---------------------------------------------------------------------------
-- Was ein Advisor von v2.1 sieht - und wann er aufhoert, es zu sehen
-- ---------------------------------------------------------------------------
--
-- ZWEI SCHLUESSEL, NICHT EINER. Die Advisor-Freigabe sagt "diese Person
-- arbeitet mit mir". Die Antwort-Freigabe sagt "und sie darf diesen Fragebogen
-- sehen". Beides ist noetig, keines ersetzt das andere.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a2100101-0101-4101-8101-000000000101',
   'authenticated', 'authenticated', 'adv21-subject@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2100102-0102-4102-8102-000000000102',
   'authenticated', 'authenticated', 'adv21-advisor@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('a2100101-0101-4101-8101-000000000101', array['founder']),
       ('a2100102-0102-4102-8102-000000000102', array['advisor'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('a2100110-0110-4110-8110-000000000110',
        'a2100101-0101-4101-8101-000000000101', 'base', 'founder-alignment-v2-1', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('a2100110-0110-4110-8110-000000000110', 'A01', 'ordinal_choice',
        '{"optionId": "A01_o4"}'::jsonb),
       ('a2100110-0110-4110-8110-000000000110', 'B01', 'money_range',
        '{"amount": 5000, "currency": "EUR"}'::jsonb);

-- ---------------------------------------------------------------------------
-- 1. Eine Advisor-Beziehung allein oeffnet NICHTS
-- ---------------------------------------------------------------------------

insert into public.advisor_person_grants
  (subject_user_id, advisor_user_id, scope, status, requested_by_user_id, approved_at)
values ('a2100101-0101-4101-8101-000000000101', 'a2100102-0102-4102-8102-000000000102',
        'alignment_report', 'active', 'a2100101-0101-4101-8101-000000000101', now());

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a2100102-0102-4102-8102-000000000102","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  0,
  'eine aktive Begleitung allein zeigt keine Antworten - wer eine Beratung zulaesst, '
  'hat damit nicht seine Finanzlage offengelegt');

-- ---------------------------------------------------------------------------
-- 2. Mit Antwort-Freigabe schon - und ausgeblendetes bleibt aussen vor
-- ---------------------------------------------------------------------------

reset role;
insert into public.alignment_shares (id, assessment_id, recipient_user_id)
values ('a2100120-0120-4120-8120-000000000120',
        'a2100110-0110-4110-8110-000000000110',
        'a2100102-0102-4102-8102-000000000102');

-- Der Betrag bleibt bei der eigenen Person.
insert into public.alignment_share_hidden_blocks (share_id, block_id)
values ('a2100120-0120-4120-8120-000000000120', 'B01');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a2100102-0102-4102-8102-000000000102","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'A01'),
  1,
  'mit Freigabe sieht der Advisor die freigegebene Antwort');

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'B01'),
  0,
  'der ausgeblendete Betrag bleibt aussen vor');

select extensions.is(
  (select count(*)::int from public.alignment_item_views),
  0,
  'und wie lange jemand gebraucht hat, sieht auch der Advisor nicht');

-- ---------------------------------------------------------------------------
-- 3. DAS LOCH: Endet die Begleitung, endet der Einblick
-- ---------------------------------------------------------------------------
--
-- Die Antwort-Freigabe gilt, bis man sie einzeln zurueckzieht. Wer die
-- BEZIEHUNG beendet, haette sonst weiterhin eine gueltige Freigabe an genau
-- diese Person - und der ehemalige Advisor laese weiter mit. Niemand wuerde
-- daran denken, beides zu widerrufen: Man beendet eine Zusammenarbeit und geht
-- davon aus, dass sie beendet ist.

reset role;
update public.advisor_person_grants
   set status = 'revoked', revoked_at = now(), approved_at = null
 where subject_user_id = 'a2100101-0101-4101-8101-000000000101';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a2100102-0102-4102-8102-000000000102","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  0,
  'nach dem Ende der Begleitung sieht der ehemalige Advisor nichts mehr - '
  'auch ohne dass jemand die Antwort-Freigabe einzeln widerrufen hat');

-- ---------------------------------------------------------------------------
-- 4. Die eigene Person behaelt alles
-- ---------------------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"a2100101-0101-4101-8101-000000000101","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  2,
  'die eigene Person sieht weiterhin beide Antworten');

-- ---------------------------------------------------------------------------
-- 5. Ein fremder Advisor ohne Beziehung sieht nichts
-- ---------------------------------------------------------------------------

reset role;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a2100103-0103-4103-8103-000000000103',
   'authenticated', 'authenticated', 'adv21-fremd@example.com', '', now(), '{}', '{}', now(), now());
insert into public.profiles (user_id, roles)
values ('a2100103-0103-4103-8103-000000000103', array['advisor'])
on conflict (user_id) do update set roles = array['advisor'];

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a2100103-0103-4103-8103-000000000103","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  0,
  'ein Advisor ohne Beziehung und ohne Freigabe sieht nichts');

rollback;
