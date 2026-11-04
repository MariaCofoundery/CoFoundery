\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Testprojekt: Aufgaben je Person und "Das bringe ich ein" (20270309120000)
-- ---------------------------------------------------------------------------
--
-- Aufgaben gehoeren zum Plan: "wer" ist eine der beiden Personen oder "both".
-- Den Beitrag schreibt jede Person nur fuer sich; lesen tun beide. Jede
-- Aenderung setzt beide Zustimmungen zurueck, nach dem Start ist alles fest.
-- ---------------------------------------------------------------------------

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;
create function pg_temp.project() returns uuid language sql stable as $$
  select id from public.relationship_test_projects where relationship_id = 'dc111111-1111-4111-8111-111111111111' and status in ('draft', 'active')
$$;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'dd111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'tpt-a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'dd222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'tpt-b@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'dd333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'tpt-x@example.com', '', now(), '{}', '{}', now(), now());
insert into public.founder_teams(id, team_context) values ('de111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('de111111-1111-4111-8111-111111111111', 'dd111111-1111-4111-8111-111111111111'),
  ('de111111-1111-4111-8111-111111111111', 'dd222222-2222-4222-8222-222222222222');
insert into public.relationships(id, user_a_id, user_b_id, founder_team_id) values
  ('dc111111-1111-4111-8111-111111111111', 'dd111111-1111-4111-8111-111111111111', 'dd222222-2222-4222-8222-222222222222', 'de111111-1111-4111-8111-111111111111');

set local role authenticated;
select pg_temp.as_user('dd111111-1111-4111-8111-111111111111');

-- Entwurf mit Aufgaben fuer A, B und beide.
select public.save_test_project_draft(
  'dc111111-1111-4111-8111-111111111111', null, null, 'Landingpage', 'Eine Seite bauen', 2::smallint, '', '',
  '[{"t":"Seite ist online","on":true}]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[{"t":"Text schreiben","who":"dd111111-1111-4111-8111-111111111111","f":"Marketing"},
    {"t":"Seite bauen","who":"dd222222-2222-4222-8222-222222222222","f":null},
    {"t":"Gegenlesen","who":"both"}]'::jsonb
);
select extensions.is(
  (select jsonb_array_length(task_items) from public.relationship_test_projects where id = pg_temp.project()),
  3, 'tasks are saved with the draft');

-- Ein Aufruf ohne Aufgaben (aeltere Fassung, elf Werte) laesst sie stehen.
select public.save_test_project_draft(
  'dc111111-1111-4111-8111-111111111111', pg_temp.project(), null, 'Landingpage', 'Eine Seite bauen, schnell', 2::smallint, '', '',
  '[{"t":"Seite ist online","on":true}]'::jsonb, '[]'::jsonb, '[]'::jsonb
);
select extensions.is(
  (select jsonb_array_length(task_items) from public.relationship_test_projects where id = pg_temp.project()),
  3, 'a save without tasks keeps them');

select extensions.throws_ok(
  $$select public.save_test_project_draft('dc111111-1111-4111-8111-111111111111', pg_temp.project(), null, 'L', 'T', 2::smallint, '', '',
    '[{"t":"x","on":true}]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[{"t":"Fremde Aufgabe","who":"dd333333-3333-4333-8333-333333333333"}]'::jsonb)$$,
  '22023', null, 'a task can only go to one of the pair or to both');
select extensions.throws_ok(
  $$select public.save_test_project_draft('dc111111-1111-4111-8111-111111111111', pg_temp.project(), null, 'L', 'T', 2::smallint, '', '',
    '[{"t":"x","on":true}]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[{"t":"  ","who":"both"}]'::jsonb)$$,
  '22023', null, 'an empty task is refused');

-- ---------------------------------------------------------------------------
-- Das bringe ich ein
-- ---------------------------------------------------------------------------
select public.agree_test_project(pg_temp.project(), (select draft_version from public.relationship_test_projects where id = pg_temp.project()));
select public.save_test_project_contribution(pg_temp.project(), 'Ich schreibe Texte fuer Kliniken.', array['marketing_brand']);
select extensions.is(
  (select count(*)::int from public.relationship_test_project_agreements where project_id = pg_temp.project()),
  0, 'a changed contribution resets the agreements');

select pg_temp.as_user('dd222222-2222-4222-8222-222222222222');
select public.save_test_project_contribution(pg_temp.project(), 'Ich baue die Seite.', '{}');
select extensions.is(
  (select count(*)::int from public.relationship_test_project_contributions where project_id = pg_temp.project()),
  2, 'both partners read both contributions');
select extensions.is(
  (select text from public.relationship_test_project_contributions
   where project_id = pg_temp.project() and user_id = 'dd111111-1111-4111-8111-111111111111'),
  'Ich schreibe Texte fuer Kliniken.', 'saving your own never touches the other contribution');
select extensions.throws_ok(
  $$select public.save_test_project_contribution(pg_temp.project(), 'x', array['gibt_es_nicht'])$$,
  '22023', null, 'areas come from the vocabulary');
select extensions.throws_ok(
  $$insert into public.relationship_test_project_contributions(project_id, user_id, text) values (pg_temp.project(), 'dd111111-1111-4111-8111-111111111111', 'untergeschoben')$$,
  '42501', null, 'nobody writes the table directly');

-- Wer nicht im Paar ist, sieht und schreibt nichts.
select pg_temp.as_user('dd333333-3333-4333-8333-333333333333');
select extensions.is(
  (select count(*)::int from public.relationship_test_project_contributions), 0, 'outsiders see no contributions');

-- Nach dem Start ist der Beitrag fest.
reset role;
update public.relationship_test_projects set status = 'active', started_at = now(), ends_at = now() + interval '14 days' where id = pg_temp.project();
set local role authenticated;
select pg_temp.as_user('dd111111-1111-4111-8111-111111111111');
select extensions.throws_ok(
  $$select public.save_test_project_contribution(pg_temp.project(), 'spaeter', '{}')$$,
  '22023', null, 'after the start the contribution is frozen');

-- Leerer Beitrag im Entwurf nimmt ihn zurueck.
reset role;
update public.relationship_test_projects set status = 'draft' where id = pg_temp.project();
set local role authenticated;
select pg_temp.as_user('dd222222-2222-4222-8222-222222222222');
select public.save_test_project_contribution(pg_temp.project(), '  ', '{}');
select extensions.is(
  (select count(*)::int from public.relationship_test_project_contributions where user_id = 'dd222222-2222-4222-8222-222222222222'),
  0, 'an empty contribution removes it');

select * from extensions.finish();
rollback;
