\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

-- ---------------------------------------------------------------------------
-- Nach der Abgabe bleibt genau eine Sache aenderbar: die Gespraechsmarkierung
-- ---------------------------------------------------------------------------
--
-- Sie ist keine Antwort auf die Frage, sondern ein Wunsch an das Gespraech -
-- und der darf sich aendern, ohne dass jemand seine Auskunft aendert.
--
-- Geprueft wird das hier fuer die BEIDEN NEUEN BOEGEN. Der Ausloeser fragt
-- nicht nach der Fassung, aber genau das soll festgehalten sein: Am 29.09.2026
-- war die Markierung in den neuen Boegen lesbar und nicht setzbar, weil die
-- Oberflaeche und die Serveraktion nur v2.1 kannten. Die Datenbank war nie das
-- Hindernis - und soll es auch nicht werden.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd9000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'mark-a@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('d9000001-0001-4001-8001-000000000001', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('d9000100-0100-4100-8100-000000000100',
        'd9000001-0001-4001-8001-000000000001',
        'founder_profile', 'founder-profile-v1', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('d9000100-0100-4100-8100-000000000100', 'A01', 'ordinal_choice',
        '{"optionId":"A01_o3"}'::jsonb);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"d9000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$update public.alignment_answers set marked_for_discussion = true
     where assessment_id = 'd9000100-0100-4100-8100-000000000100' and block_id = 'A01'$$,
  'die Gespraechsmarkierung laesst sich nach der Abgabe setzen');

select extensions.is(
  (select marked_for_discussion from public.alignment_answers
    where assessment_id = 'd9000100-0100-4100-8100-000000000100' and block_id = 'A01'),
  true,
  'und sie steht auch wirklich da');

-- Die Antwort selbst bleibt ein Dokument.
select extensions.throws_ok(
  $$update public.alignment_answers set value = '{"optionId":"A01_o5"}'::jsonb
     where assessment_id = 'd9000100-0100-4100-8100-000000000100' and block_id = 'A01'$$,
  '42501',
  'alignment_answer_frozen_after_submit',
  'die Antwort selbst bleibt eingefroren');

select extensions.finish();

rollback;
