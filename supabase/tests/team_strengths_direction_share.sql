\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

-- ---------------------------------------------------------------------------
-- Staerken und Antrieb im Team: eigene Freigabe
-- ---------------------------------------------------------------------------
-- Personen: A, B  Mitglieder von T1.   C  Founder ohne Team.   D  tritt T1 spaeter bei.
-- A teilt, B nicht. Gepruft: wer sieht was, sofortiger Widerruf, Austritt beendet die
-- Freigabe, Fremde bleiben draussen, und die anderen Vertraege bleiben, wie sie sind.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-000000000000','f1000001-0001-4001-8001-00000000000a','authenticated','authenticated','tps-a@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','f1000002-0002-4002-8002-00000000000b','authenticated','authenticated','tps-b@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','f1000003-0003-4003-8003-00000000000c','authenticated','authenticated','tps-c@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles (user_id, roles, display_name) values
 ('f1000001-0001-4001-8001-00000000000a', array['founder'], 'Anna'),
 ('f1000002-0002-4002-8002-00000000000b', array['founder'], 'Ben'),
 ('f1000003-0003-4003-8003-00000000000c', array['founder'], 'Cem')
on conflict (user_id) do update set roles = excluded.roles, display_name = excluded.display_name;
insert into public.founder_teams (id, name, team_context) values ('f2000001-0001-4001-8001-0000000000a1','T1','pre_founder');
insert into public.founder_team_members (team_id, user_id) values
 ('f2000001-0001-4001-8001-0000000000a1','f1000001-0001-4001-8001-00000000000a'),
 ('f2000001-0001-4001-8001-0000000000a1','f1000002-0002-4002-8002-00000000000b');
insert into public.person_strengths (user_id, statement, origin, label) values
 ('f1000001-0001-4001-8001-00000000000a', 'Ich bringe Menschen an einen Tisch, die sonst aneinander vorbeireden.', 'own_words', 'Verbinden'),
 ('f1000002-0002-4002-8002-00000000000b', 'Ich bleibe ruhig, wenn es eng wird.', 'own_words', 'Ruhe');
insert into public.direction_statements (user_id, facet, statement, confidence, origin) values
 ('f1000001-0001-4001-8001-00000000000a', 'meaningful_outcome', 'Mir ist wichtig, dass es im Alltag ankommt.', 'stated', 'own_words'),
 ('f1000002-0002-4002-8002-00000000000b', 'problem_cared_about', 'Mich beschaeftigt, wie Teams Konflikte ansprechen.', 'stated', 'own_words');

create temp table before_state as select (select count(*)::int from public.team_shares) as team_shares,
  (select count(*)::int from public.assessment_team_shares) as assessment_team_shares;
grant select on before_state to authenticated;

-- Niemand teilt: Der Anfangszustand ist leer.
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is((public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->>'own_shared')::boolean, false, 'nothing is shared at first');
select extensions.is(jsonb_array_length(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'), 0, 'nobody appears before sharing');

-- Fremde: ein Nicht-Mitglied liest nichts und schreibt nichts.
set local request.jwt.claims = '{"sub":"f1000003-0003-4003-8003-00000000000c","role":"authenticated"}';
select extensions.is(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1'), null, 'a non-member reads nothing');
select extensions.throws_ok($$select public.set_team_strengths_share('f2000001-0001-4001-8001-0000000000a1', true)$$, '42501', null, 'a non-member cannot share into the team');

-- Clients schreiben nie direkt.
set local request.jwt.claims = '{"sub":"f1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.throws_ok($$insert into public.team_profile_shares (team_id, owner_user_id) values ('f2000001-0001-4001-8001-0000000000a1','f1000001-0001-4001-8001-00000000000a')$$, '42501', null, 'no direct insert');
select extensions.throws_ok($$select public.set_team_strengths_share('f2000001-0001-4001-8001-0000000000a1', null)$$, '42501', null, 'a share needs an explicit choice');

-- A teilt.
select extensions.is((public.set_team_strengths_share('f2000001-0001-4001-8001-0000000000a1', true)->>'enabled')::boolean, true, 'A shares');
select extensions.is((public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->>'own_shared')::boolean, true, 'A sees the own share as on');

-- B sieht As Saetze, ohne selbst zu teilen.
set local request.jwt.claims = '{"sub":"f1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is(jsonb_array_length(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'), 1, 'B sees exactly the one person who shared');
select extensions.is(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'->0->>'name', 'Anna', 'it is Anna');
select extensions.is(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'->0->'strengths'->0->>'label', 'Verbinden', 'her strength is shown');
select extensions.is(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'->0->'direction'->0->>'facet', 'meaningful_outcome', 'her drive is shown');
select extensions.is((public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->>'own_shared')::boolean, false, 'B has not shared');
-- B kann die Zeile von A nicht lesen.
select extensions.is((select count(*)::int from public.team_profile_shares), 0, 'B cannot read the share rows of others');

-- Zuruecknehmen wirkt sofort.
set local request.jwt.claims = '{"sub":"f1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.set_team_strengths_share('f2000001-0001-4001-8001-0000000000a1', false)->>'enabled')::boolean, false, 'A withdraws');
set local request.jwt.claims = '{"sub":"f1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is(jsonb_array_length(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'), 0, 'after withdrawing B sees nothing');

-- B teilt, verlaesst das Team, kommt zurueck: nichts ist mehr geteilt.
select public.set_team_strengths_share('f2000001-0001-4001-8001-0000000000a1', true);
reset role;
delete from public.founder_team_members where team_id = 'f2000001-0001-4001-8001-0000000000a1' and user_id = 'f1000002-0002-4002-8002-00000000000b';
select extensions.is((select count(*)::int from public.team_profile_shares where owner_user_id = 'f1000002-0002-4002-8002-00000000000b' and revoked_at is null), 0, 'leaving the team ends the share');
insert into public.founder_team_members (team_id, user_id) values ('f2000001-0001-4001-8001-0000000000a1','f1000002-0002-4002-8002-00000000000b');
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is(jsonb_array_length(public.get_team_strengths_overview('f2000001-0001-4001-8001-0000000000a1')->'people'), 0, 'rejoining shares nothing');

-- Die anderen Vertraege sind unberuehrt.
reset role;
select extensions.is((select team_shares from before_state), (select count(*)::int from public.team_shares), 'team_shares is untouched');
select extensions.is((select assessment_team_shares from before_state), (select count(*)::int from public.assessment_team_shares), 'assessment_team_shares is untouched');

select * from extensions.finish();
rollback;
