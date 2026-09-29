\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'b7000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'sv-allein@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b7000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'sv-zweit@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b7000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'sv-ohne-rolle@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('b7000001-0001-4001-8001-000000000001', array['founder']),
  ('b7000002-0002-4002-8002-000000000002', array['founder']),
  -- Ohne Founder-Rolle. Diese Person darf auch keine Antworten speichern -
  -- ein Vorhaben fuer sie waere eine leere Zeile mit Folgekosten.
  ('b7000003-0003-4003-8003-000000000003', array['advisor'])
on conflict (user_id) do update set roles = excluded.roles;

-- Damit die Advisorin nicht ueber den zweiten Zweig von
-- has_founder_assessment_access() doch noch durchkommt.
insert into public.network_memberships (user_id)
values ('b7000003-0003-4003-8003-000000000003')
on conflict do nothing;

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"b7000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Wer allein ist, bekommt ein Vorhaben
-- ---------------------------------------------------------------------------
select extensions.isnt(
  public.create_solo_venture(), null,
  'wer allein ist, bekommt ein Vorhaben'
);

select extensions.is(
  (select count(*)::int from public.founder_team_members
    where user_id = 'b7000001-0001-4001-8001-000000000001'),
  1,
  'und steht selbst darin - ein Vorhaben ohne Mitglied faende niemand wieder'
);

-- ---------------------------------------------------------------------------
-- 2. Ein zweiter Aufruf legt kein zweites an
-- ---------------------------------------------------------------------------
--
-- Sonst entstuende bei jedem Seitenaufruf eins mehr, und die Antworten
-- verteilten sich auf lauter Vorhaben, die niemand gemeint hat.
select extensions.is(
  public.create_solo_venture(),
  (select team_id from public.founder_team_members
    where user_id = 'b7000001-0001-4001-8001-000000000001'),
  'ein zweiter Aufruf gibt dasselbe Vorhaben zurueck'
);

select extensions.is(
  (select count(*)::int from public.founder_team_members
    where user_id = 'b7000001-0001-4001-8001-000000000001'),
  1,
  'und legt kein zweites an'
);

-- ---------------------------------------------------------------------------
-- 3. Ist jemand dazugekommen, ist es kein Solo-Vorhaben mehr
-- ---------------------------------------------------------------------------
--
-- Dann bekommt die Person ein NEUES fuer sich - das gemeinsame gehoert beiden,
-- und ein "leg mir eins an" darf es nicht stillschweigend meinen.
reset role;
insert into public.founder_team_members (team_id, user_id)
select team_id, 'b7000002-0002-4002-8002-000000000002'
  from public.founder_team_members
 where user_id = 'b7000001-0001-4001-8001-000000000001';

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"b7000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(distinct team_id)::int
     from public.founder_team_members
    where user_id = 'b7000001-0001-4001-8001-000000000001'
      and team_id = public.create_solo_venture()),
  0,
  'ist jemand dazugekommen, entsteht ein neues statt des gemeinsamen'
);

-- ---------------------------------------------------------------------------
-- 4. Wer kein Founder ist, bekommt keins
-- ---------------------------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"b7000003-0003-4003-8003-000000000003","role":"authenticated"}';

select extensions.throws_ok(
  'select public.create_solo_venture()',
  '42501',
  'not_a_founder',
  'wer keine Antworten speichern darf, bekommt auch kein Vorhaben'
);

select extensions.finish();

rollback;
