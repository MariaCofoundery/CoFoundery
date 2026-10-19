\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(78);

-- ---------------------------------------------------------------------------
-- Werte & Zielkonflikte: Freigabe und gemeinsamer Teamvergleich (Phase E)
-- ---------------------------------------------------------------------------
--
-- Privacy-kritisch. Gepruft wird: Freigabe bindet an EINEN Durchlauf, Bereitschaft
-- entscheidet nur die Datenbank, vorher sieht niemand etwas ueber andere, ein
-- Widerruf wirkt sofort, der Roster zaehlt, Advisor und Fremde bleiben draussen -
-- und die bestehenden Vertraege (team_shares, alignment_shares, venture-alignment-v1)
-- bleiben, wie sie sind.
--
-- Personen: A, B  Mitglieder von T1.   C  Founder ohne Team.   E  Advisor.
--           F  tritt T1 spaeter bei.  T2 hat nur B.


insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-000000000000','e1000001-0001-4001-8001-00000000000a','authenticated','authenticated','share-a@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','e1000002-0002-4002-8002-00000000000b','authenticated','authenticated','share-b@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','e1000003-0003-4003-8003-00000000000c','authenticated','authenticated','share-c@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','e1000004-0004-4004-8004-00000000000d','authenticated','authenticated','share-e@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','e1000005-0005-4005-8005-00000000000f','authenticated','authenticated','share-f@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles (user_id, roles, display_name) values
 ('e1000001-0001-4001-8001-00000000000a', array['founder'], 'Anna'), ('e1000002-0002-4002-8002-00000000000b', array['founder'], 'Ben'), ('e1000003-0003-4003-8003-00000000000c', array['founder'], 'Cem'),
 ('e1000004-0004-4004-8004-00000000000d', array['advisor'], 'Eva'), ('e1000005-0005-4005-8005-00000000000f', array['founder'], 'Finn')
on conflict (user_id) do update set roles = excluded.roles, display_name = excluded.display_name;
insert into public.founder_teams (id, name, team_context) values ('e2000001-0001-4001-8001-0000000000a1','T1','pre_founder'), ('e2000002-0002-4002-8002-0000000000a2','T2','pre_founder');
insert into public.founder_team_members (team_id, user_id) values ('e2000001-0001-4001-8001-0000000000a1','e1000001-0001-4001-8001-00000000000a'), ('e2000001-0001-4001-8001-0000000000a1','e1000002-0002-4002-8002-00000000000b'), ('e2000002-0002-4002-8002-0000000000a2','e1000002-0002-4002-8002-00000000000b');

create function pg_temp.mk_run(p_id uuid, p_user uuid, p_team uuid, p_ts timestamptz, p_path text) returns void
language plpgsql as $f$
begin
 insert into public.assessments (id, user_id, module, instrument_id, venture_id)
  values (p_id, p_user, 'venture_alignment', 'venture-tradeoffs-v1', p_team);
 insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  (p_id,'W03','value_case', jsonb_build_object('importanceA',5,'importanceB',2,'path',p_path)),
  (p_id,'W04','value_case', jsonb_build_object('importanceA',3,'importanceB',3,'path',p_path)),
  (p_id,'W05','value_case', jsonb_build_object('importanceA',2,'importanceB',4,'path',p_path)),
  (p_id,'W06','value_case', jsonb_build_object('importanceA',4,'importanceB',4,'path',p_path));
 update public.assessments set submitted_at = p_ts where id = p_id;
end $f$;

-- Bestand vorher: ein abgegebenes venture-alignment-v1 von A, Teamfreigaben, gerichtete Freigaben.
insert into public.assessments (id, user_id, module, instrument_id, venture_id, submitted_at) values
 ('e3000090-0000-4000-8000-000000000000','e1000001-0001-4001-8001-00000000000a','venture_alignment','venture-alignment-v1','e2000001-0001-4001-8001-0000000000a1', now());
create temp table before_state as select
 (select count(*)::int from public.team_shares) as team_shares,
 (select count(*)::int from public.alignment_shares) as alignment_shares,
 public.venture_visible_in_team('e3000090-0000-4000-8000-000000000000','e1000002-0002-4002-8002-00000000000b') as va_visible_to_b;
grant select on before_state to authenticated;

insert into public.assessments (id,user_id,module,instrument_id,venture_id) values ('e3000001-0000-4000-8000-000000000000','e1000001-0001-4001-8001-00000000000a','venture_alignment','venture-tradeoffs-v1','e2000001-0001-4001-8001-0000000000a1');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3000001-0000-4000-8000-000000000000', true)$$, '23514', null, 'a draft cannot be shared');
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3000001-0000-4000-8000-000000000000', null)$$, '22023', null, 'a share needs an explicit choice');
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3999999-0000-4000-8000-000000000000', true)$$, '42501', null, 'an unknown run cannot be shared (same answer as a foreign one)');
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3000090-0000-4000-8000-000000000000', true)$$, '23514', null, 'a venture-alignment run cannot be shared this way');
reset role;
update public.assessments set submitted_at = null where false;
insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
 ('e3000001-0000-4000-8000-000000000000','W03','value_case','{"importanceA":5,"importanceB":2,"path":"A"}'),
 ('e3000001-0000-4000-8000-000000000000','W04','value_case','{"importanceA":3,"importanceB":3,"path":"A"}'),
 ('e3000001-0000-4000-8000-000000000000','W05','value_case','{"importanceA":2,"importanceB":4,"path":"A"}'),
 ('e3000001-0000-4000-8000-000000000000','W06','value_case','{"importanceA":4,"importanceB":4,"path":"A"}');
update public.assessments set submitted_at = '2026-10-01 10:00:00+00' where id = 'e3000001-0000-4000-8000-000000000000';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3000001-0000-4000-8000-000000000000', true)$$, '42501', null, 'somebody else cannot share my run');
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3000001-0000-4000-8000-000000000000', false)$$, '42501', null, 'somebody else cannot withdraw my share');
reset role;
set local role authenticated;
set local request.jwt.claims = '';
select extensions.throws_ok($$select public.set_tradeoffs_team_share('e3000001-0000-4000-8000-000000000000', true)$$, '42501', null, 'an anonymous caller cannot share');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'state'), 'completed', 'A is completed after submitting');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'shared'), 'false', 'submitting does not share');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'not ready: nobody else is done');
select extensions.lives_ok($$select public.set_tradeoffs_team_share('e3000001-0000-4000-8000-000000000000', true)$$, 'the owner shares her submitted run on purpose');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'shared'), 'true', 'now shared');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'still not ready: one person shared, the other is not done');
select extensions.ok((select count(*)=1 from public.assessment_team_shares where owner_user_id='e1000001-0001-4001-8001-00000000000a'), 'A sees her own share row');
select extensions.throws_ok($$insert into public.assessment_team_shares (assessment_id,team_id,owner_user_id,instrument_id) values ('e3000001-0000-4000-8000-000000000000','e2000001-0001-4001-8001-0000000000a1','e1000001-0001-4001-8001-00000000000a','venture-tradeoffs-v1')$$, '42501', null, 'no direct writes to the share table');
select extensions.throws_ok($$update public.assessment_team_shares set revoked_at = null$$, '42501', null, 'no direct updates either');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'state'), 'not_started', 'B has not started - her own state');
select extensions.ok(not (public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')::text like '%e1000001-0001-4001-8001-00000000000a%' or public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')::text like '%Anna%'), 'readiness tells B nothing about A (no id, no name)');
select extensions.is(((select jsonb_object_keys(public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')) order by 1 limit 1)), 'own', 'readiness has only status and own');
select extensions.is((public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'not_ready', 'no comparison before ready');
select extensions.ok(not (public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')::text like '%e1000001-0001-4001-8001-00000000000a%' or public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')::text like '%Anna%' or public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')::text like '%importance%'), 'no partial report: no name, no answer');
select extensions.is(((select count(*)::int from public.assessment_team_shares)), 0, 'B sees no share rows of others');
select extensions.is(((select count(*)::int from public.assessments where instrument_id='venture-tradeoffs-v1')), 0, 'B cannot read the other run');
select extensions.is(((select count(*)::int from public.alignment_answers where assessment_id='e3000001-0000-4000-8000-000000000000')), 0, 'B cannot read the other answers');
reset role;
select pg_temp.mk_run('e3000002-0000-4000-8000-000000000000','e1000002-0002-4002-8002-00000000000b','e2000001-0001-4001-8001-0000000000a1','2026-10-02 10:00:00+00','B');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'B completed but has not shared: still not ready');
select extensions.lives_ok($$select public.set_tradeoffs_team_share('e3000002-0000-4000-8000-000000000000', true)$$, 'B shares her run');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'everybody done and shared: ready');
select extensions.is((public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'B reads the comparison');
select extensions.ok(jsonb_array_length(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') = 2 and (select bool_and(jsonb_array_length(p->'answers') = 4) from jsonb_array_elements(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') p), 'two people, four situations each');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'A reads the comparison');
select extensions.ok((select jsonb_agg(p - 'is_viewer' order by p->>'person_id') from jsonb_array_elements(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') p)
 = (select jsonb_agg(p - 'is_viewer' order by p->>'person_id') from jsonb_array_elements((select public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1'))->'people') p), 'the report content is the same for A');
reset role;
create temp table report_a(r jsonb); grant all on report_a to authenticated;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
insert into report_a select (select jsonb_agg(p - 'is_viewer' order by p->>'person_id') from jsonb_array_elements(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') p);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.ok((select jsonb_agg(p - 'is_viewer' order by p->>'person_id') from jsonb_array_elements(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') p) = (select r from report_a), 'A and B see the same report (nobody sees more)');
select extensions.ok(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')::text like '%Anna%' and public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')::text like '%Ben%', 'names appear only now, after readiness');
select extensions.is(((select count(*)::int from public.assessments where instrument_id='venture-tradeoffs-v1' and user_id<>'e1000002-0002-4002-8002-00000000000b')), 0, 'even when ready, the answers stay behind the comparison function');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000003-0003-4003-8003-00000000000c","role":"authenticated"}';
select extensions.ok(public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1') is null, 'a non-member gets no readiness');
select extensions.ok(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1') is null, 'a non-member gets no comparison');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000004-0004-4004-8004-00000000000d","role":"authenticated"}';
select extensions.ok(public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1') is null and public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1') is null, 'an advisor gets neither');
select extensions.is(((select count(*)::int from public.assessments where instrument_id='venture-tradeoffs-v1')), 0, 'an advisor reads no tradeoffs run');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.throws_ok($$insert into public.alignment_shares (assessment_id, recipient_user_id) values ('e3000001-0000-4000-8000-000000000000','e1000004-0004-4004-8004-00000000000d')$$, '42501', null, 'no directed share of this instrument (also not to an advisor)');
reset role;
select extensions.throws_ok($$insert into public.assessment_team_shares (assessment_id,team_id,owner_user_id,instrument_id) values ('e3000090-0000-4000-8000-000000000000','e2000001-0001-4001-8001-0000000000a1','e1000001-0001-4001-8001-00000000000a','venture-alignment-v1')$$, '23503', null, 'only an instrument on the share allowlist can be shared (no other version is compatible)');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.lives_ok($$insert into public.assessments (id,user_id,module,instrument_id,venture_id) values ('e3000003-0000-4000-8000-000000000000','e1000001-0001-4001-8001-00000000000a','venture_alignment','venture-tradeoffs-v1','e2000001-0001-4001-8001-0000000000a1')$$, 'A begins a new run');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'a new draft does not destroy a valid shared run');
reset role;
insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
 select 'e3000003-0000-4000-8000-000000000000', b, 'value_case', '{"importanceA":2,"importanceB":5,"path":"B"}'::jsonb from unnest(array['W03','W04','W05','W06']) b;
update public.assessments set submitted_at = '2026-10-03 10:00:00+00' where id = 'e3000003-0000-4000-8000-000000000000';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'shared_assessment_id'), 'e3000001-0000-4000-8000-000000000000', 'the active share is still the first run');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'assessment_id'), 'e3000003-0000-4000-8000-000000000000', 'the newest submitted run is the second - and private');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'a new private run changes nothing: still ready with the first run');
select extensions.is(((select p->'answers'->0->'value'->>'path' from jsonb_array_elements(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') p where p->>'person_id'='e1000001-0001-4001-8001-00000000000a')), 'A', 'the comparison still shows the first run (path A), not the private second (path B)');
select extensions.is(((select count(*)::int from public.assessment_team_shares where assessment_id='e3000003-0000-4000-8000-000000000000')), 0, 'no share row exists for the new run');
select extensions.lives_ok($$select public.set_tradeoffs_team_share('e3000003-0000-4000-8000-000000000000', true)$$, 'A shares the new run on purpose');
select extensions.is(((select p->'answers'->0->'value'->>'path' from jsonb_array_elements(public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->'people') p where p->>'person_id'='e1000001-0001-4001-8001-00000000000a')), 'B', 'after the explicit share the comparison uses the second run');
select extensions.is(((select count(*)::int from public.assessment_team_shares where owner_user_id='e1000001-0001-4001-8001-00000000000a' and team_id='e2000001-0001-4001-8001-0000000000a1' and revoked_at is null)), 1, 'only one active share per person and team');
select extensions.ok((select revoked_at is not null from public.assessment_team_shares where assessment_id='e3000001-0000-4000-8000-000000000000'), 'the older share ended');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'ready again');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'shared_assessment_id'), 'e3000003-0000-4000-8000-000000000000', 'the first run is no longer the active share');
select extensions.lives_ok($$select public.set_tradeoffs_team_share('e3000003-0000-4000-8000-000000000000', false)$$, 'A withdraws');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'withdrawn: not ready for A');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'withdrawn: not ready for B');
select extensions.is((public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'not_ready', 'withdrawn: B cannot fetch the report any more');
select extensions.ok(not (public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')::text like '%Anna%' or public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')::text like '%Anna%' or public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')::text like '%revoked%'), 'B learns neither who withdrew nor anything about the report');
select extensions.is(((select count(*)::int from public.assessment_team_shares)), 1, 'B sees only her own share row');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.lives_ok($$select public.set_tradeoffs_team_share('e3000003-0000-4000-8000-000000000000', true)$$, 'A can share again later');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'ready after sharing again');
reset role;
insert into public.founder_team_members (team_id,user_id) values ('e2000001-0001-4001-8001-0000000000a1','e1000005-0005-4005-8005-00000000000f');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'a new member joins: not ready until she has done and shared it');
select extensions.is((public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'not_ready', 'the comparison is unavailable while she has not');
reset role;
delete from public.founder_team_members where team_id='e2000001-0001-4001-8001-0000000000a1' and user_id='e1000005-0005-4005-8005-00000000000f';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'she leaves: judged against the current roster again');
reset role;
delete from public.founder_team_members where team_id='e2000001-0001-4001-8001-0000000000a1' and user_id='e1000002-0002-4002-8002-00000000000b';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.ok(public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1') is null and public.get_tradeoffs_team_comparison('e2000001-0001-4001-8001-0000000000a1') is null, 'a former member reads nothing');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'one member alone is no team comparison');
reset role;
select extensions.is(((select count(*)::int from public.assessment_team_shares where owner_user_id='e1000002-0002-4002-8002-00000000000b' and team_id='e2000001-0001-4001-8001-0000000000a1' and revoked_at is null)), 0, 'leaving ended her share');
insert into public.founder_team_members (team_id,user_id) values ('e2000001-0001-4001-8001-0000000000a1','e1000002-0002-4002-8002-00000000000b');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'missing', 'rejoining shares nothing');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->'own'->>'shared'), 'false', 'her old share does not come back');
select extensions.lives_ok($$select public.set_tradeoffs_team_share('e3000002-0000-4000-8000-000000000000', true)$$, 'she can share her run again');
select extensions.is((public.get_tradeoffs_team_readiness('e2000001-0001-4001-8001-0000000000a1')->>'status'), 'ready', 'ready again after she chose it');
reset role;
select extensions.is(((select count(*)::int from public.team_shares)), (select team_shares from before_state), 'team_shares untouched');
select extensions.is(((select count(*)::int from public.alignment_shares)), (select alignment_shares from before_state), 'alignment_shares untouched');
select extensions.ok(public.venture_visible_in_team('e3000090-0000-4000-8000-000000000000','e1000002-0002-4002-8002-00000000000b') = (select va_visible_to_b from before_state), 'venture-alignment-v1 stays visible to the team exactly as before');
select extensions.ok(not public.venture_visible_in_team('e3000003-0000-4000-8000-000000000000','e1000002-0002-4002-8002-00000000000b'), 'the tradeoffs run is never visible through the venture-alignment rule');
-- Team loeschen (Regression aus der Phase-E-Pruefung: venture_id verweist mit ON DELETE SET NULL auf das Team)
reset role;
select pg_temp.mk_run('e3000077-0000-4000-8000-000000000000', 'e1000002-0002-4002-8002-00000000000b', 'e2000002-0002-4002-8002-0000000000a2', '2026-10-20 10:00:00+00', 'A');
select extensions.lives_ok($$delete from public.founder_teams where id = 'e2000002-0002-4002-8002-0000000000a2'$$, 'a team with a tradeoffs run can be deleted');
select extensions.ok((select venture_id is null and submitted_at is not null from public.assessments where id = 'e3000077-0000-4000-8000-000000000000'), 'the run stays, without a venture, still submitted');
select extensions.ok(not exists (select 1 from public.assessment_team_shares where team_id = 'e2000002-0002-4002-8002-0000000000a2'), 'shares of the deleted team are gone');

select * from extensions.finish();
rollback;