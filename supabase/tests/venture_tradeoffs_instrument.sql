\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(29);

-- ---------------------------------------------------------------------------
-- Werte & Zielkonflikte (venture-tradeoffs-v1)
-- ---------------------------------------------------------------------------
--
-- Das erste echte Vertiefungsmodul. Gepruft wird, dass es seinen eigenen
-- Lebenszyklus hat - und dass es nirgends in Venture Alignment hineinlaeuft.
-- Siehe docs/architecture/phase-d-storage-decision.md.
--
-- Personen:
--   A  Mitglied von T1, mit abgegebenem venture-alignment-v1 (W03-W06 beantwortet)
--   B  Mitglied von T1 (die andere Person im Team)
--   C  Founder, KEIN Mitglied von T1
-- Vorhaben: T1 (A und B), T2 (nur B)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1000001-0001-4001-8001-00000000000a', 'authenticated', 'authenticated', 'tradeoffs-a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd1000002-0002-4002-8002-00000000000b', 'authenticated', 'authenticated', 'tradeoffs-b@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd1000003-0003-4003-8003-00000000000c', 'authenticated', 'authenticated', 'tradeoffs-c@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('d1000001-0001-4001-8001-00000000000a', array['founder']),
  ('d1000002-0002-4002-8002-00000000000b', array['founder']),
  ('d1000003-0003-4003-8003-00000000000c', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.founder_teams (id, name, team_context) values
  ('d2000001-0001-4001-8001-0000000000a1', 'T1', 'pre_founder'),
  ('d2000002-0002-4002-8002-0000000000a2', 'T2', 'pre_founder');
insert into public.founder_team_members (team_id, user_id) values
  ('d2000001-0001-4001-8001-0000000000a1', 'd1000001-0001-4001-8001-00000000000a'),
  ('d2000001-0001-4001-8001-0000000000a1', 'd1000002-0002-4002-8002-00000000000b'),
  ('d2000002-0002-4002-8002-0000000000a2', 'd1000002-0002-4002-8002-00000000000b');

-- A hat venture-alignment-v1 fuer T1 abgegeben - mit eigenen W03-W06-Antworten.
insert into public.assessments (id, user_id, module, instrument_id, venture_id) values
  ('d3000001-0001-4001-8001-0000000000e1', 'd1000001-0001-4001-8001-00000000000a',
   'venture_alignment', 'venture-alignment-v1', 'd2000001-0001-4001-8001-0000000000a1');
insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('d3000001-0001-4001-8001-0000000000e1', 'W03', 'value_case', '{"importanceA":5,"importanceB":2,"path":"A"}'),
  ('d3000001-0001-4001-8001-0000000000e1', 'W04', 'value_case', '{"importanceA":3,"importanceB":4,"path":"B"}'),
  ('d3000001-0001-4001-8001-0000000000e1', 'W05', 'value_case', '{"importanceA":4,"importanceB":4,"path":"unknown"}'),
  ('d3000001-0001-4001-8001-0000000000e1', 'W06', 'value_case', '{"importanceA":2,"importanceB":5,"path":"B"}');
update public.assessments set submitted_at = now() where id = 'd3000001-0001-4001-8001-0000000000e1';

create temp table before_state as
select
  (select count(*)::int from public.assessments where instrument_id = 'venture-alignment-v1') as va_assessments,
  (select submitted_at from public.assessments where id = 'd3000001-0001-4001-8001-0000000000e1') as va_submitted_at,
  (select jsonb_object_agg(block_id, value) from public.alignment_answers where assessment_id = 'd3000001-0001-4001-8001-0000000000e1') as va_answers,
  public.venture_visible_in_team('d3000001-0001-4001-8001-0000000000e1', 'd1000002-0002-4002-8002-00000000000b') as va_visible_to_b;
grant select on before_state to authenticated;

-- ---------------------------------------------------------------------------
-- Das Instrument
-- ---------------------------------------------------------------------------
select extensions.is(
  (select status from public.instruments where id = 'venture-tradeoffs-v1'),
  'draft',
  'the instrument exists'
);

-- ---------------------------------------------------------------------------
-- Ein Entwurf - nur die richtige Person im richtigen Vorhaben
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000001-0001-4001-8001-00000000000a","role":"authenticated"}';

select extensions.lives_ok(
  $$insert into public.assessments (id, user_id, module, instrument_id, venture_id)
    values ('d3000002-0002-4002-8002-0000000000f1', 'd1000001-0001-4001-8001-00000000000a',
            'venture_alignment', 'venture-tradeoffs-v1', 'd2000001-0001-4001-8001-0000000000a1')$$,
  'a member can start a draft for her own venture'
);

select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('d1000001-0001-4001-8001-00000000000a', 'venture_alignment', 'venture-tradeoffs-v1',
            'd2000002-0002-4002-8002-0000000000a2')$$,
  '42501', null,
  'not for a venture she is not part of'
);

select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id)
    values ('d1000001-0001-4001-8001-00000000000a', 'venture_alignment', 'venture-tradeoffs-v1')$$,
  '23514', null,
  'a venture is required'
);

select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('d1000001-0001-4001-8001-00000000000a', 'founder_profile', 'venture-tradeoffs-v1',
            'd2000001-0001-4001-8001-0000000000a1')$$,
  '23514', null,
  'only in the venture storage family'
);

-- Ein offener Entwurf je Person und Vorhaben; neben venture-alignment-v1 ist Platz.
select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('d1000001-0001-4001-8001-00000000000a', 'venture_alignment', 'venture-tradeoffs-v1',
            'd2000001-0001-4001-8001-0000000000a1')$$,
  '23505', null,
  'one open draft per person and venture'
);

select extensions.lives_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('d1000001-0001-4001-8001-00000000000a', 'venture_alignment', 'venture-alignment-v1',
            'd2000001-0001-4001-8001-0000000000a1')$$,
  'a venture-alignment draft next to the tradeoffs draft is fine (different instrument)'
);

-- Eine andere Person kann nichts auf meinen Namen anlegen.
set local request.jwt.claims = '{"sub":"d1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('d1000001-0001-4001-8001-00000000000a', 'venture_alignment', 'venture-tradeoffs-v1',
            'd2000001-0001-4001-8001-0000000000a1')$$,
  '42501', null,
  'nobody starts a draft in another person''s name'
);

set local request.jwt.claims = '{"sub":"d1000003-0003-4003-8003-00000000000c","role":"authenticated"}';
select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('d1000003-0003-4003-8003-00000000000c', 'venture_alignment', 'venture-tradeoffs-v1',
            'd2000001-0001-4001-8001-0000000000a1')$$,
  '42501', null,
  'a person outside the venture cannot start one for it'
);

-- ---------------------------------------------------------------------------
-- Vier Situationen, sonst nichts
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"d1000001-0001-4001-8001-00000000000a","role":"authenticated"}';

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
      ('d3000002-0002-4002-8002-0000000000f1', 'W03', 'value_case', '{"importanceA":4,"importanceB":3,"path":"A"}'),
      ('d3000002-0002-4002-8002-0000000000f1', 'W04', 'value_case', '{"importanceA":2,"importanceB":5,"path":"B"}'),
      ('d3000002-0002-4002-8002-0000000000f1', 'W05', 'value_case', '{"importanceA":3,"importanceB":3,"path":"unknown"}')$$,
  'the situations can be saved one by one'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('d3000002-0002-4002-8002-0000000000f1', 'W01', 'value_case', '{"importanceA":4,"importanceB":3,"path":"A"}')$$,
  '23514', null,
  'only W03 to W06 belong to this instrument'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('d3000002-0002-4002-8002-0000000000f1', 'W06', 'single_choice', '{"optionId":"W06_o1"}')$$,
  '23514', null,
  'and only in the value_case format'
);

-- ---------------------------------------------------------------------------
-- Abgabe nur vollstaendig
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$update public.assessments set submitted_at = now() where id = 'd3000002-0002-4002-8002-0000000000f1'$$,
  '23514', null,
  'submitting with three of four situations is refused'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
    values ('d3000002-0002-4002-8002-0000000000f1', 'W06', 'value_case', 'not_decided')$$,
  'a reason for leaving a situation open counts as answered'
);

select extensions.lives_ok(
  $$update public.assessments set submitted_at = now() where id = 'd3000002-0002-4002-8002-0000000000f1'$$,
  'submitting with all four situations works'
);

-- ---------------------------------------------------------------------------
-- Nach der Abgabe unveraenderlich - und ein neuer Durchlauf bleibt moeglich
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$update public.alignment_answers set value = '{"importanceA":1,"importanceB":1,"path":"B"}'
    where assessment_id = 'd3000002-0002-4002-8002-0000000000f1' and block_id = 'W03'$$,
  '42501', null,
  'a submitted answer is frozen'
);

select extensions.throws_ok(
  $$update public.assessments set submitted_at = null where id = 'd3000002-0002-4002-8002-0000000000f1'$$,
  '23514', null,
  'a submission cannot be taken back'
);

select extensions.lives_ok(
  $$insert into public.assessments (id, user_id, module, instrument_id, venture_id)
    values ('d3000003-0003-4003-8003-0000000000f2', 'd1000001-0001-4001-8001-00000000000a',
            'venture_alignment', 'venture-tradeoffs-v1', 'd2000001-0001-4001-8001-0000000000a1')$$,
  'a new run is possible after submitting (revisable)'
);

-- ---------------------------------------------------------------------------
-- Privat: das Team sieht nichts, ein Fremder auch nicht
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"d1000002-0002-4002-8002-00000000000b","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.assessments where instrument_id = 'venture-tradeoffs-v1'),
  0,
  'the other team member sees no tradeoffs assessment'
);
select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id in ('d3000002-0002-4002-8002-0000000000f1', 'd3000003-0003-4003-8003-0000000000f2')),
  0,
  'and none of its answers'
);
select extensions.is(
  public.venture_visible_in_team('d3000002-0002-4002-8002-0000000000f1', 'd1000002-0002-4002-8002-00000000000b'),
  false,
  'the team visibility rule does not apply to the new instrument'
);

-- Die bestehende Teamsicht auf venture-alignment-v1 bleibt, wie sie war.
select extensions.is(
  (select count(*)::int from public.assessments where id = 'd3000001-0001-4001-8001-0000000000e1'),
  1,
  'venture-alignment-v1 stays visible to the team'
);

set local request.jwt.claims = '{"sub":"d1000003-0003-4003-8003-00000000000c","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.assessments where instrument_id = 'venture-tradeoffs-v1'),
  0,
  'a stranger sees nothing'
);

-- ---------------------------------------------------------------------------
-- Venture Alignment bleibt unberuehrt
-- ---------------------------------------------------------------------------
set local role postgres;

select extensions.is(
  (select submitted_at from public.assessments where id = 'd3000001-0001-4001-8001-0000000000e1'),
  (select va_submitted_at from before_state),
  'the venture-alignment submission is unchanged (venture core completion is not affected)'
);
select extensions.is(
  (select jsonb_object_agg(block_id, value) from public.alignment_answers where assessment_id = 'd3000001-0001-4001-8001-0000000000e1'),
  (select va_answers from before_state),
  'the old W03 to W06 answers in venture-alignment-v1 are unchanged'
);
select extensions.is(
  (select count(*)::int from public.assessments
   where instrument_id = 'venture-alignment-v1' and submitted_at is not null and user_id = 'd1000001-0001-4001-8001-00000000000a'),
  1,
  'no tradeoffs assessment counts as a venture-alignment submission'
);
select extensions.is(
  public.venture_visible_in_team('d3000001-0001-4001-8001-0000000000e1', 'd1000002-0002-4002-8002-00000000000b'),
  (select va_visible_to_b from before_state),
  'the team visibility of venture-alignment-v1 is unchanged'
);

-- Der neue Bogen hat seine eigenen vier Antworten; die alten werden nicht mitgelesen.
select extensions.is(
  (select count(*)::int from public.alignment_answers where assessment_id = 'd3000002-0002-4002-8002-0000000000f1'),
  4,
  'the new run holds its own four answers'
);
select extensions.is(
  (select value ->> 'path' from public.alignment_answers
   where assessment_id = 'd3000001-0001-4001-8001-0000000000e1' and block_id = 'W04'),
  'B',
  'and the historical W04 answer was not overwritten'
);

select * from extensions.finish();
rollback;
