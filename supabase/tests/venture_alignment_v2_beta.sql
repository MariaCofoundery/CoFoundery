\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(95);

-- ---------------------------------------------------------------------------
-- Venture Alignment v2 (Beta 1): echtes Assessment mit assessment-gebundenem Teilen
-- ---------------------------------------------------------------------------
-- Personen: A, B Mitglieder von T1.  C Founder ohne Team.  X Advisor.
-- D, F, G, H: ein 4er-Team T4 (Roster-Faelle fuer 3-4 Founder).  T2 hat nur B.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('00000000-0000-0000-0000-000000000000','f1000001-0000-4000-8000-000000000000','authenticated','authenticated','beta-0@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000002-0000-4000-8000-000000000000','authenticated','authenticated','beta-1@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000003-0000-4000-8000-000000000000','authenticated','authenticated','beta-2@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000004-0000-4000-8000-000000000000','authenticated','authenticated','beta-3@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000005-0000-4000-8000-000000000000','authenticated','authenticated','beta-4@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000006-0000-4000-8000-000000000000','authenticated','authenticated','beta-5@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000007-0000-4000-8000-000000000000','authenticated','authenticated','beta-6@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000008-0000-4000-8000-000000000000','authenticated','authenticated','beta-7@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles (user_id, roles, display_name) values
 ('f1000001-0000-4000-8000-000000000000',array['founder'],'Anna'),('f1000002-0000-4000-8000-000000000000',array['founder'],'Ben'),('f1000003-0000-4000-8000-000000000000',array['founder'],'Cem'),('f1000004-0000-4000-8000-000000000000',array['advisor'],'Eva'),
 ('f1000005-0000-4000-8000-000000000000',array['founder'],'Dora'),('f1000006-0000-4000-8000-000000000000',array['founder'],'Finn'),('f1000007-0000-4000-8000-000000000000',array['founder'],'Gina'),('f1000008-0000-4000-8000-000000000000',array['founder'],'Hugo')
on conflict (user_id) do update set roles=excluded.roles, display_name=excluded.display_name;
insert into public.founder_teams(id,name,team_context) values ('f2000001-0000-4000-8000-000000000001','T1','pre_founder'),('f2000002-0000-4000-8000-000000000002','T2','pre_founder'),('f2000004-0000-4000-8000-000000000004','T4','existing_team');
insert into public.founder_team_members(team_id,user_id) values ('f2000001-0000-4000-8000-000000000001','f1000001-0000-4000-8000-000000000000'),('f2000001-0000-4000-8000-000000000001','f1000002-0000-4000-8000-000000000000'),('f2000002-0000-4000-8000-000000000002','f1000002-0000-4000-8000-000000000000'),('f2000004-0000-4000-8000-000000000004','f1000005-0000-4000-8000-000000000000'),('f2000004-0000-4000-8000-000000000004','f1000006-0000-4000-8000-000000000000'),('f2000004-0000-4000-8000-000000000004','f1000007-0000-4000-8000-000000000000');

create function pg_temp.mk_beta_run(p_id uuid, p_user uuid, p_team uuid, p_ts timestamptz, p_z01 text, p_c01 int, p_m01p int, p_m02p int) returns void
language plpgsql as $f$
begin
 insert into public.assessments (id, user_id, module, instrument_id, venture_id)
  values (p_id, p_user, 'venture_alignment', 'venture-alignment-v2-beta1', p_team);
 insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  (p_id,'Z01','single_choice', jsonb_build_object('optionId', p_z01)),
  (p_id,'Z02','multi_choice','{"optionIds":["Z02_o1","Z02_o4"]}'),
  (p_id,'Z03','single_choice','{"optionId":"Z03_o1"}'),
  (p_id,'F01','single_choice','{"optionId":"F01_o1"}'),
  (p_id,'F02','single_choice','{"optionId":"F02_o1"}'),
  (p_id,'O01','multi_choice','{"optionIds":["O01_o2"]}'),
  (p_id,'C01','number_range', jsonb_build_object('number', p_c01, 'unit', 'Stunden pro Woche')),
  (p_id,'C02','number_range','{"number":20,"unit":"Stunden pro Woche"}'),
  (p_id,'C03','multi_choice','{"optionIds":["C03_o2","C03_o3"]}'),
  (p_id,'C04','single_choice','{"optionId":"C04_o1"}'),
  (p_id,'M01','single_choice','{"optionId":"M01_o1"}'),
  (p_id,'M02','single_choice','{"optionId":"M02_o2"}'),
  (p_id,'M03','number_range','{"number":6,"unit":"Monate"}'),
  (p_id,'T01','single_choice','{"optionId":"T01_o2"}'),
  (p_id,'T02','single_choice','{"optionId":"T02_o2"}'),
  (p_id,'E01','single_choice','{"optionId":"E01_o3"}'),
  (p_id,'E02','single_choice','{"optionId":"E02_o1"}'),
  (p_id,'E03','multi_choice','{"optionIds":["E03_o2"]}'),
  (p_id,'N01','single_choice','{"optionId":"N01_o2"}');
 if p_m01p is not null then
  insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
   values (p_id,'M01p','money_range', jsonb_build_object('amount', p_m01p, 'currency', 'EUR')); end if;
 if p_m02p is not null then
  insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
   values (p_id,'M02p','money_range', jsonb_build_object('amount', p_m02p, 'currency', 'EUR')); end if;
 update public.assessments set submitted_at = p_ts where id = p_id;
end $f$;

insert into public.assessments (id,user_id,module,instrument_id,venture_id,submitted_at) values ('f3000090-0000-4000-8000-000000000000','f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v1','f2000001-0000-4000-8000-000000000001', now());
create temp table before_state as select
 (select count(*)::int from public.team_shares) as team_shares,
 (select count(*)::int from public.alignment_shares) as alignment_shares,
 public.venture_visible_in_team('f3000090-0000-4000-8000-000000000000','f1000002-0000-4000-8000-000000000000') as va_visible_to_b;
grant select on before_state to authenticated;
select extensions.is((select status from public.instruments where id = 'venture-alignment-v2-beta1'), 'draft', 'the beta instrument exists');
select extensions.ok(((select count(*) from public.assessment_share_instruments where instrument_id in ('venture-alignment-v2-beta1','venture-tradeoffs-v1')) = 2), 'both instruments are on the share allowlist (superuser view)');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$insert into public.assessments(id,user_id,module,instrument_id,venture_id) values ('f3000001-0000-4000-8000-000000000000','f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1','f2000001-0000-4000-8000-000000000001')$$, 'a member starts a beta draft');
select extensions.throws_ok($$insert into public.assessments(user_id,module,instrument_id,venture_id) values ('f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1','f2000002-0000-4000-8000-000000000002')$$, '42501', null, 'not for a venture she is not part of');
select extensions.throws_ok($$insert into public.assessments(user_id,module,instrument_id) values ('f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1')$$, '23514', null, 'a venture is required');
select extensions.throws_ok($$insert into public.assessments(user_id,module,instrument_id,venture_id) values ('f1000001-0000-4000-8000-000000000000','founder_profile','venture-alignment-v2-beta1','f2000001-0000-4000-8000-000000000001')$$, '23514', null, 'only in the venture family');
select extensions.throws_ok($$insert into public.assessments(user_id,module,instrument_id,venture_id) values ('f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1','f2000001-0000-4000-8000-000000000001')$$, '23505', null, 'one open draft per person and venture');
select extensions.lives_ok($$insert into public.assessments(user_id,module,instrument_id,venture_id) values ('f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v1','f2000001-0000-4000-8000-000000000001')$$, 'a v1 draft can exist next to the beta draft');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.throws_ok($$insert into public.assessments(user_id,module,instrument_id,venture_id) values ('f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1','f2000001-0000-4000-8000-000000000001')$$, '42501', null, 'nobody starts a draft in another name');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000003-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.throws_ok($$insert into public.assessments(user_id,module,instrument_id,venture_id) values ('f1000003-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1','f2000001-0000-4000-8000-000000000001')$$, '42501', null, 'an outsider cannot start one');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('f3000001-0000-4000-8000-000000000000','Z01','single_choice','{"optionId":"Z01_o2"}')$$, 'autosave: a first answer is stored');
select extensions.lives_ok($$update public.alignment_answers set value='{"optionId":"Z01_o3"}' where assessment_id='f3000001-0000-4000-8000-000000000000' and block_id='Z01'$$, 'autosave: a draft answer can be changed');
select extensions.throws_ok($$insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('f3000001-0000-4000-8000-000000000000','Z09','single_choice','{"optionId":"Z09_o1"}')$$, '23514', null, 'an unknown block is rejected');
select extensions.throws_ok($$insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('f3000001-0000-4000-8000-000000000000','W03','value_case','{"importanceA":3,"importanceB":3,"path":"A"}')$$, '23514', null, 'a v1 block is rejected');
select extensions.lives_ok($$insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('f3000001-0000-4000-8000-000000000000','M01p','money_range','{"amount":4711,"currency":"EUR"}'),('f3000001-0000-4000-8000-000000000000','M02p','money_range','{"amount":98765,"currency":"EUR"}')$$, 'the private amount blocks are storable');
select extensions.throws_ok($$update public.assessments set submitted_at = now() where id='f3000001-0000-4000-8000-000000000000'$$, '23514', null, 'an incomplete run cannot be submitted');
reset role;
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) select 'f3000001-0000-4000-8000-000000000000', b, 'single_choice', jsonb_build_object('optionId', b||'_o1')
 from unnest(array['Z03','F01','F02','C04','M01','M02','T01','T02','E01','E02','N01']) b;
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values
 ('f3000001-0000-4000-8000-000000000000','Z02','multi_choice','{"optionIds":["Z02_o1","Z02_o4"]}'),('f3000001-0000-4000-8000-000000000000','O01','multi_choice','{"optionIds":["O01_o2"]}'),
 ('f3000001-0000-4000-8000-000000000000','C03','multi_choice','{"optionIds":["C03_o2","C03_o3"]}'),('f3000001-0000-4000-8000-000000000000','E03','multi_choice','{"optionIds":["E03_o2"]}'),
 ('f3000001-0000-4000-8000-000000000000','C01','number_range','{"number":20,"unit":"Stunden pro Woche"}'),('f3000001-0000-4000-8000-000000000000','C02','number_range','{"number":20,"unit":"Stunden pro Woche"}');
insert into public.alignment_answers(assessment_id,block_id,answer_format,missing_code) values ('f3000001-0000-4000-8000-000000000000','M03','number_range','not_decided');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$update public.assessments set submitted_at = '2026-10-01 10:00:00+00' where id='f3000001-0000-4000-8000-000000000000'$$, 'a complete run submits (an explicit reason counts as an answer)');
select extensions.throws_ok($$update public.alignment_answers set value='{"optionId":"Z01_o2"}' where assessment_id='f3000001-0000-4000-8000-000000000000' and block_id='Z01'$$, '42501', null, 'a submitted answer is frozen');
select extensions.throws_ok($$update public.assessments set submitted_at = null where id='f3000001-0000-4000-8000-000000000000'$$, '23514', null, 'a submission cannot be taken back');
select extensions.is(((select count(*)::int from public.assessment_team_shares)), 0, 'submitting shares nothing');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'own'->>'shared'), 'false', 'after submission: only for me');
select extensions.lives_ok($$insert into public.assessments(id,user_id,module,instrument_id,venture_id) values ('f3000002-0000-4000-8000-000000000000','f1000001-0000-4000-8000-000000000000','venture_alignment','venture-alignment-v2-beta1','f2000001-0000-4000-8000-000000000001')$$, 'a new run (re-assessment) can begin');
select extensions.throws_ok($$select public.set_assessment_team_share('f3000002-0000-4000-8000-000000000000', true)$$, '23514', null, 'a draft cannot be shared');
select extensions.throws_ok($$select public.set_assessment_team_share('f3000090-0000-4000-8000-000000000000', true)$$, '23514', null, 'a v1 run cannot be shared through the beta contract');
select extensions.throws_ok($$select public.set_assessment_team_share('f3999999-0000-4000-8000-000000000000', true)$$, '42501', null, 'an unknown run cannot be shared');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.throws_ok($$select public.set_assessment_team_share('f3000001-0000-4000-8000-000000000000', true)$$, '42501', null, 'somebody else cannot share my run');
select extensions.throws_ok($$select public.set_assessment_team_share('f3000001-0000-4000-8000-000000000000', false)$$, '42501', null, 'somebody else cannot withdraw my share');
select extensions.is(((select count(*)::int from public.assessments where instrument_id='venture-alignment-v2-beta1')), 0, 'B cannot read the beta assessment of A');
select extensions.is(((select count(*)::int from public.alignment_answers where assessment_id='f3000001-0000-4000-8000-000000000000')), 0, 'B cannot read the beta answers of A');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000001-0000-4000-8000-000000000000', true)$$, 'A shares her submitted run on purpose');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'missing', 'not ready: B has not done it');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.ok((not (public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%f1000001-0000-4000-8000-000000000000%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%Anna%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%optionId%')), 'B learns nothing about A before readiness');
select extensions.is((public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'not_ready', 'no partial report');
reset role;
select pg_temp.mk_beta_run('f3000010-0000-4000-8000-000000000000','f1000002-0000-4000-8000-000000000000','f2000001-0000-4000-8000-000000000001','2026-10-02 10:00:00+00','Z01_o2',10,555,777);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000010-0000-4000-8000-000000000000', true)$$, 'B shares her run');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'ready', 'everybody done and shared: ready');
select extensions.ok((jsonb_array_length(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') = 2 and (select bool_and(jsonb_array_length(p->'answers') = 19) from jsonb_array_elements(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') p)), 'two people with 19 team-visible answers each');
reset role;
create temp table report_b(r jsonb); grant all on report_b to authenticated;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
insert into report_b select (select jsonb_agg(p - 'is_viewer' order by p->>'person_id') from jsonb_array_elements(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') p);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.ok(((select jsonb_agg(p - 'is_viewer' order by p->>'person_id') from jsonb_array_elements(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') p) = (select r from report_b)), 'A and B get the same report (nobody sees more)');
select extensions.ok((not (public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%M01p%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%M02p%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%4711%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%98765%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%555%' or public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%777%')), 'private amounts never reach the team read path');
select extensions.ok((not exists (select 1 from jsonb_array_elements(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') p, jsonb_array_elements(p->'answers') a where a->>'item_key' in ('M01p','M02p'))), 'no private block in the report');
select extensions.is(((select count(*)::int from public.alignment_answers where assessment_id='f3000001-0000-4000-8000-000000000000' and block_id in ('M01p','M02p'))), 2, 'the owner still has her private amounts');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is(((select count(*)::int from public.alignment_answers where assessment_id='f3000001-0000-4000-8000-000000000000')), 0, 'even when ready, answers stay behind the report function');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'ready', 'a new draft does not destroy the share');
reset role;
insert into public.alignment_answers(assessment_id,block_id,answer_format,value)
 select 'f3000002-0000-4000-8000-000000000000', a.block_id, a.answer_format, case when a.block_id='Z01' then '{"optionId":"Z01_o4"}'::jsonb else a.value end
 from public.alignment_answers a where a.assessment_id='f3000001-0000-4000-8000-000000000000' and a.block_id<>'M03';
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('f3000002-0000-4000-8000-000000000000','M03','number_range','{"number":3,"unit":"Monate"}');
update public.assessments set submitted_at='2026-10-05 10:00:00+00' where id='f3000002-0000-4000-8000-000000000000';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'own'->>'shared_assessment_id'), 'f3000001-0000-4000-8000-000000000000', 'the active share is still run 1');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'ready', 'a new private submitted run changes nothing');
select extensions.is(((select a->'value'->>'optionId' from jsonb_array_elements(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') p, jsonb_array_elements(p->'answers') a where p->>'person_id'='f1000001-0000-4000-8000-000000000000' and a->>'item_key'='Z01')), 'Z01_o3', 'the report still shows run 1, not the private run 2');
select extensions.is(((select count(*)::int from public.assessment_team_shares where assessment_id='f3000002-0000-4000-8000-000000000000')), 0, 'no share row for run 2');
select extensions.lives_ok($$select public.set_assessment_team_share('f3000002-0000-4000-8000-000000000000', true)$$, 'A shares run 2 explicitly');
select extensions.is(((select a->'value'->>'optionId' from jsonb_array_elements(public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->'people') p, jsonb_array_elements(p->'answers') a where p->>'person_id'='f1000001-0000-4000-8000-000000000000' and a->>'item_key'='Z01')), 'Z01_o4', 'now the report uses run 2');
select extensions.is(((select count(*)::int from public.assessment_team_shares where owner_user_id='f1000001-0000-4000-8000-000000000000' and team_id='f2000001-0000-4000-8000-000000000001' and instrument_id='venture-alignment-v2-beta1' and revoked_at is null)), 1, 'one active share per person, team and instrument');
select extensions.ok(((select revoked_at is not null from public.assessment_team_shares where assessment_id='f3000001-0000-4000-8000-000000000000')), 'run 1 is no longer the active share');
select extensions.lives_ok($$select public.set_assessment_team_share('f3000002-0000-4000-8000-000000000000', false)$$, 'A withdraws');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'missing', 'withdrawn: not ready');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'not_ready', 'B cannot fetch the report any more');
select extensions.ok((not (public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%Anna%' or public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')::text like '%revoked%')), 'B is not told who withdrew');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000002-0000-4000-8000-000000000000', true)$$, 'A can share again');
reset role;
insert into public.assessments(id,user_id,module,instrument_id,venture_id,submitted_at) values ('f3000070-0000-4000-8000-000000000000','f1000001-0000-4000-8000-000000000000','venture_alignment','venture-tradeoffs-v1','f2000001-0000-4000-8000-000000000001',null);
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) select 'f3000070-0000-4000-8000-000000000000', b, 'value_case', '{"importanceA":4,"importanceB":2,"path":"A"}'::jsonb from unnest(array['W03','W04','W05','W06']) b;
update public.assessments set submitted_at='2026-10-06 10:00:00+00' where id='f3000070-0000-4000-8000-000000000000';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000070-0000-4000-8000-000000000000', true)$$, 'a second instrument can be shared in parallel');
select extensions.is(((select count(*)::int from public.assessment_team_shares where owner_user_id='f1000001-0000-4000-8000-000000000000' and team_id='f2000001-0000-4000-8000-000000000001' and revoked_at is null)), 2, 'two active shares: one per instrument');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'ready', 'beta stays ready while the other instrument is shared');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-tradeoffs-v1')->>'status'), 'missing', 'the other instrument has its own readiness');
select extensions.is((public.get_tradeoffs_team_readiness('f2000001-0000-4000-8000-000000000001')->>'status'), 'missing', 'the Phase-E wrapper agrees');
reset role;
insert into public.founder_team_members(team_id,user_id) values ('f2000001-0000-4000-8000-000000000001','f1000006-0000-4000-8000-000000000000');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'missing', 'a new member joins: not ready');
select extensions.is((public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'not_ready', 'the report is unavailable until she has done and shared it');
reset role;
delete from public.founder_team_members where team_id='f2000001-0000-4000-8000-000000000001' and user_id='f1000006-0000-4000-8000-000000000000';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'ready', 'she leaves: ready again against the current roster');
reset role;
delete from public.founder_team_members where team_id='f2000001-0000-4000-8000-000000000001' and user_id='f1000002-0000-4000-8000-000000000000';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.ok((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1') is null and public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1') is null), 'a former member reads nothing');
reset role;
select extensions.is(((select count(*)::int from public.assessment_team_shares where owner_user_id='f1000002-0000-4000-8000-000000000000' and team_id='f2000001-0000-4000-8000-000000000001' and instrument_id='venture-alignment-v2-beta1' and revoked_at is null)), 0, 'leaving ended her share');
insert into public.founder_team_members(team_id,user_id) values ('f2000001-0000-4000-8000-000000000001','f1000002-0000-4000-8000-000000000000');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'missing', 'rejoining shares nothing');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000002-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000010-0000-4000-8000-000000000000', true)$$, 'she shares again on purpose');
select extensions.is((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1')->>'status'), 'ready', 'ready again');
reset role;
select pg_temp.mk_beta_run('f3000020-0000-4000-8000-000000000000','f1000005-0000-4000-8000-000000000000','f2000004-0000-4000-8000-000000000004','2026-10-03 10:00:00+00','Z01_o1',10,null,null);
select pg_temp.mk_beta_run('f3000021-0000-4000-8000-000000000000','f1000006-0000-4000-8000-000000000000','f2000004-0000-4000-8000-000000000004','2026-10-04 10:00:00+00','Z01_o2',15,null,null);
select pg_temp.mk_beta_run('f3000022-0000-4000-8000-000000000000','f1000007-0000-4000-8000-000000000000','f2000004-0000-4000-8000-000000000004','2026-10-05 10:00:00+00','Z01_o3',20,null,null);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000005-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000020-0000-4000-8000-000000000000', true)$$, 'D shares');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000006-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000021-0000-4000-8000-000000000000', true)$$, 'F shares');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000005-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->>'status'), 'missing', 'three members, one has not shared');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000007-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000022-0000-4000-8000-000000000000', true)$$, 'G shares');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000005-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->>'status'), 'ready', 'three founders: ready');
select extensions.ok((jsonb_array_length(public.get_assessment_team_comparison('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->'people') = 3), 'three people in the report');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000006-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.ok((jsonb_array_length(public.get_assessment_team_comparison('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->'people') = 3), 'the same for F');
reset role;
insert into public.founder_team_members(team_id,user_id) values ('f2000004-0000-4000-8000-000000000004','f1000008-0000-4000-8000-000000000000');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000005-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->>'status'), 'missing', 'a fourth joins: not ready');
reset role;
select pg_temp.mk_beta_run('f3000023-0000-4000-8000-000000000000','f1000008-0000-4000-8000-000000000000','f2000004-0000-4000-8000-000000000004','2026-10-07 10:00:00+00','Z01_o1',12,null,null);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000008-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000023-0000-4000-8000-000000000000', true)$$, 'H shares');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000005-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->>'status'), 'ready', 'four founders: ready');
select extensions.ok((jsonb_array_length(public.get_assessment_team_comparison('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->'people') = 4), 'four people in the report');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000007-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.lives_ok($$select public.set_assessment_team_share('f3000022-0000-4000-8000-000000000000', false)$$, 'G withdraws');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000005-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_assessment_team_readiness('f2000004-0000-4000-8000-000000000004','venture-alignment-v2-beta1')->>'status'), 'missing', 'one withdrawal: not ready for anybody');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000004-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.ok((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1') is null and public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1') is null), 'an advisor gets neither readiness nor report');
select extensions.is(((select count(*)::int from public.assessments where instrument_id='venture-alignment-v2-beta1')), 0, 'an advisor reads no beta run');
select extensions.is(((select count(*)::int from public.alignment_answers where block_id in ('Z01','M01p'))), 0, 'an advisor reads no beta answers');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.throws_ok($$insert into public.alignment_shares(assessment_id, recipient_user_id) values ('f3000002-0000-4000-8000-000000000000','f1000004-0000-4000-8000-000000000000')$$, '42501', null, 'no directed share of a beta run (not even to an advisor)');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000003-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.ok((public.get_assessment_team_readiness('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1') is null and public.get_assessment_team_comparison('f2000001-0000-4000-8000-000000000001','venture-alignment-v2-beta1') is null), 'a non-member gets nothing');
select extensions.throws_ok($$select count(*) from public.assessment_share_instruments$$, '42501', null, 'clients cannot read the allowlist table');
select extensions.throws_ok($$insert into public.assessment_team_shares(assessment_id,team_id,owner_user_id,instrument_id) values ('f3000002-0000-4000-8000-000000000000','f2000001-0000-4000-8000-000000000001','f1000003-0000-4000-8000-000000000000','venture-alignment-v2-beta1')$$, '42501', null, 'no direct writes to the share table');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000001-0000-4000-8000-000000000000","role":"authenticated"}';
select extensions.is((public.get_tradeoffs_team_readiness('f2000001-0000-4000-8000-000000000001')->'own'->>'state'), 'completed', 'the tradeoffs wrapper still works');
reset role;
select extensions.is(((select count(*)::int from public.team_shares)), (select team_shares from before_state), 'team_shares untouched');
select extensions.is(((select count(*)::int from public.alignment_shares)), (select alignment_shares from before_state), 'alignment_shares untouched');
select extensions.ok((public.venture_visible_in_team('f3000090-0000-4000-8000-000000000000','f1000002-0000-4000-8000-000000000000') = (select va_visible_to_b from before_state)), 'venture-alignment-v1 stays visible to the team exactly as before');
select extensions.ok((not public.venture_visible_in_team('f3000002-0000-4000-8000-000000000000','f1000002-0000-4000-8000-000000000000')), 'a beta run is never visible through the v1 rule');
reset role;
select pg_temp.mk_beta_run('f3000080-0000-4000-8000-000000000000','f1000002-0000-4000-8000-000000000000','f2000002-0000-4000-8000-000000000002','2026-10-20 10:00:00+00','Z01_o1',20,null,null);
select extensions.lives_ok($$delete from public.founder_teams where id = 'f2000002-0000-4000-8000-000000000002'$$, 'a team with a beta run can be deleted');
select extensions.ok(((select venture_id is null and submitted_at is not null from public.assessments where id = 'f3000080-0000-4000-8000-000000000000')), 'the run stays, without a venture, still submitted');
select * from extensions.finish();
rollback;