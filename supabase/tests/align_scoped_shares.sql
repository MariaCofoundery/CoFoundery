\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- ---------------------------------------------------------------------------
-- Zwei Boegen heisst zwei Entscheidungen
-- ---------------------------------------------------------------------------
--
-- Das Arbeitsprofil jemandem zu zeigen ist etwas anderes, als ihm die eigenen
-- Zusagen zu einem Vorhaben zu zeigen. Wer sagt "so arbeite ich", hat damit
-- nicht gesagt, wie viel Geld er hoechstens einsetzen wuerde.
--
-- Eine Freigabe, die beides auf einmal oeffnet, waere bequem und falsch: Sie
-- wuerde eine Entscheidung unterstellen, die niemand getroffen hat.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a5000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'scope-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'scope-partner@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('a5000001-0001-4001-8001-000000000001', array['founder']),
  ('a5000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.founder_teams (id, name, team_context)
values ('a5000100-0100-4100-8100-000000000100', 'Projekt Q', 'pre_founder');

-- Zwei Fragebogen derselben Person: Profil und Vorhaben.
insert into public.assessments (id, user_id, module, instrument_id, venture_id, submitted_at) values
  ('a5000200-0200-4200-8200-000000000200', 'a5000001-0001-4001-8001-000000000001',
   'founder_profile', 'founder-profile-v1', null, now()),
  ('a5000201-0201-4201-8201-000000000201', 'a5000001-0001-4001-8001-000000000001',
   'venture_alignment', 'venture-alignment-v1',
   'a5000100-0100-4100-8100-000000000100', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('a5000200-0200-4200-8200-000000000200', 'A01', 'ordinal_choice', '{"optionId":"A01_o4"}'),
  ('a5000201-0201-4201-8201-000000000201', 'B01', 'money_range',
   '{"amount": 5000, "currency": "EUR"}');

-- NUR das Arbeitsprofil wird freigegeben.
insert into public.alignment_shares (assessment_id, recipient_user_id)
values ('a5000200-0200-4200-8200-000000000200', 'a5000002-0002-4002-8002-000000000002');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a5000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'A01'),
  1,
  'das freigegebene Arbeitsprofil ist sichtbar');

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'B01'),
  0,
  'die Zusagen zum Vorhaben sind es NICHT - eine Freigabe oeffnet nur ihren eigenen Bogen');

-- Jetzt auch das Vorhaben freigeben - aber eine Frage ausblenden.
reset role;
insert into public.alignment_shares (id, assessment_id, recipient_user_id)
values ('a5000300-0300-4300-8300-000000000300',
        'a5000201-0201-4201-8201-000000000201',
        'a5000002-0002-4002-8002-000000000002');
insert into public.alignment_share_hidden_blocks (share_id, block_id)
values ('a5000300-0300-4300-8300-000000000300', 'B01');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a5000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'B01'),
  0,
  'auch mit Freigabe bleibt die ausgeblendete Frage aussen vor');

-- ---------------------------------------------------------------------------
-- Zurueckziehen wirkt nur auf den einen Bogen
-- ---------------------------------------------------------------------------

reset role;
update public.alignment_shares set revoked_at = now()
 where assessment_id = 'a5000200-0200-4200-8200-000000000200';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a5000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'A01'),
  0,
  'das zurueckgezogene Profil ist weg');

-- AUS SICHT DER EIGENEN PERSON GEFRAGT, nicht der freigegebenen: Wer eine
-- Freigabe bekommt, darf die Freigabetabelle nicht durchsehen - sonst
-- koennte er aufzaehlen, wem sonst noch etwas freigegeben wurde.
set local request.jwt.claims =
  '{"sub":"a5000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_shares where revoked_at is null),
  1,
  'die Freigabe zum Vorhaben besteht weiter - sie war eine eigene Entscheidung');

-- ---------------------------------------------------------------------------
-- Die eigene Person behaelt alles
-- ---------------------------------------------------------------------------


select extensions.is(
  (select count(*)::int from public.alignment_answers),
  2,
  'die eigene Person sieht beide Boegen');

rollback;
