\set ON_ERROR_STOP on
-- Workstyle v4 seit Fassung 5 (20270420120000): v4 wird nur noch fortgesetzt, nie neu begonnen, zaehlt nicht mehr
-- als aktuelles Arbeitsprofil und bleibt fuer die Person selbst als fruehere Fassung lesbar.
-- Die Mechanik von v4 (29 Fragen, Reihenfolge, Formate) steht gleich in workstyle_pretest_v5.sql.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.ok(c boolean,label text) returns void language plpgsql as $$ begin if c is not true then raise exception 'v4: %',label; end if; end $$;
create temp table v4_people(n integer primary key,person uuid);
grant all on v4_people to authenticated;
-- 1: fertiges v4-Profil (aeltere Fassung); 2: fertiges v4 UND v5; 3: nichts; 4: Aussenstehende.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8a40000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','v4old-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,4)n;
insert into v4_people select n,('e8a40000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,4)n;
insert into public.profiles(user_id,display_name,roles) select person,'V4 '||n,array['founder'] from v4_people
on conflict(user_id) do update set roles=excluded.roles,display_name=excluded.display_name;
create function pg_temp.person(n integer) returns uuid language sql as $$ select person from v4_people p where p.n=person.n $$;
create function pg_temp.act(n integer) returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(n),'role','authenticated')::text,true)
$$;
-- Ein fertiges v4-Profil als Datenzeilen (so entstand es, als v4 noch begonnen werden konnte).
create function pg_temp.seed_v4(p uuid) returns uuid language plpgsql as $$
declare aid uuid; i public.workstyle_item_versions;
begin
 insert into public.assessments(user_id,module,instrument_id) values(p,'founder_profile','founder-workstyle-pretest-8-5a-v4') returning assessments.id into aid;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position)
  values(aid,'8.5a-v4',null,null,null,'{}','4.0.0',28);
 for i in select * from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v4' order by position loop
  insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,workstyle_rendered_order)
  values(aid,i.item_key,i.item_version,case when i.definition->>'response_format'='comparative' then 'single_choice' else 'ordinal_choice' end,
   case when i.definition->>'response_format'='comparative' then '{"optionId":"lean_a"}'::jsonb else '{"scale":3}'::jsonb end,
   nullif(i.definition->'rendered_order','null'::jsonb));
 end loop;
 update public.assessments set submitted_at=now() where assessments.id=aid;
 return aid;
end $$;
create function pg_temp.try_start_v4(n integer,p_new boolean) returns text language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(n); execute 'set local role authenticated';
 r:=public.start_workstyle_v4(p_new); execute 'reset role'; return coalesce(r->>'assessment_version','none');
exception when others then execute 'reset role'; return sqlerrm;
end $$;
create function pg_temp.profile(viewer integer,subject integer) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_product_profile(pg_temp.person(subject));
 execute 'reset role'; return r;
end $$;

select pg_temp.seed_v4(pg_temp.person(1)),pg_temp.seed_v4(pg_temp.person(2));

-- A) Neu beginnen geht nicht mehr, auch nicht mit einem fertigen v4.
select pg_temp.ok(pg_temp.try_start_v4(3,false)='workstyle_version_closed','A: v4 cannot be started by a new person');
select pg_temp.ok(pg_temp.try_start_v4(1,true)='workstyle_version_closed','A: v4 cannot be retaken');
select pg_temp.ok(pg_temp.try_start_v4(1,false)='8.5a-v4','A: an existing v4 session can still be opened');

-- B) v4 ist nicht mehr aktuell: kein aktuelles Profil, nur der eigene Blick als fruehere Fassung.
select pg_temp.ok(public.workstyle_current_core_assessment(pg_temp.person(1)) is null,'B: v4 is not a current profile');
select pg_temp.ok(pg_temp.profile(1,1)->>'assessment_version'='8.5a-v4' and pg_temp.profile(1,1)->>'item_version'='v4.0','B: the owner reads the earlier v4 profile');
select pg_temp.ok(pg_temp.profile(2,1) is null,'B: nobody else reads it');
select pg_temp.ok(pg_temp.profile(3,1) is null,'B: an outsider reads nothing');

-- C) Mit v5 ersetzt das neue Profil das alte: nur v5 ist aktuell.
create temp table v5_done(id uuid);
grant all on v5_done to authenticated;
do $$
declare aid uuid; i public.workstyle_item_versions;
begin
 insert into public.assessments(user_id,module,instrument_id) values(pg_temp.person(2),'founder_profile','founder-workstyle-pretest-8-5a-v5') returning assessments.id into aid;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position)
  values(aid,'8.5a-v5',null,null,null,'{}','5.0.0',28);
 for i in select * from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5' order by position loop
  insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,workstyle_rendered_order)
  values(aid,i.item_key,i.item_version,case when i.definition->>'response_format'='comparative' then 'single_choice' else 'ordinal_choice' end,
   case when i.definition->>'response_format'='comparative' then '{"optionId":"lean_a"}'::jsonb else '{"scale":3}'::jsonb end,
   nullif(i.definition->'rendered_order','null'::jsonb));
 end loop;
 update public.assessments set submitted_at=now()+interval '1 second' where assessments.id=aid;
 insert into v5_done values(aid);
end $$;
select pg_temp.ok(public.workstyle_current_core_assessment(pg_temp.person(2))=(select id from v5_done),'C: v5 is the current profile');
select pg_temp.ok(pg_temp.profile(2,2)->>'assessment_version'='8.5a-v5' and jsonb_array_length(pg_temp.profile(2,2)->'answers')=29,'C: the owner reads v5, not the older v4');

select extensions.pass('workstyle v4 after v5: resume only, earlier version for the owner, v5 current');
select * from extensions.finish();
rollback;
