\set ON_ERROR_STOP on
-- Phase 11.5: Der gemeinsame Teambericht ist fuer alle aktuellen Mitglieder
-- gleich sichtbar - oder fuer niemanden. Freigaben bleiben gerichtet.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_mutual(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'mutual: %',label; end if; end $$;
create temp table mutual_people(n integer,person uuid,assessment uuid);
grant all on mutual_people to authenticated;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8550000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','mutual-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,5)n;
insert into mutual_people select n,('e8550000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,5)n;
insert into public.profiles(user_id,display_name,roles) select person,'Mutual '||n,array['founder'] from mutual_people on conflict(user_id) do update set roles=excluded.roles,display_name=excluded.display_name;
insert into public.founder_teams(id,name,team_context) values('e8551000-0000-4000-8000-000000000001','Mutual team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8551000-0000-4000-8000-000000000001',person from mutual_people where n<=2;
-- Aktuelle v0.4-Profile fuer 1-3 ueber die echte Schreibgrenze; 4 hat keines.
do $$ declare p record;i record;id uuid;begin
 for p in select * from mutual_people where n<=3 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p.person,'role','authenticated')::text,true);
  id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
  update mutual_people set assessment=id where person=p.person;
  for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop
   perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
  end loop;
 end loop;
end $$;

create function pg_temp.status_for(n integer) returns text language plpgsql as $$
declare result text;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where mutual_people.n=status_for.n),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.get_workstyle_product_team('e8551000-0000-4000-8000-000000000001')->>'status';
 execute 'reset role';
 return result;
end $$;
create function pg_temp.workstyle_for(n integer) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where mutual_people.n=workstyle_for.n),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select jsonb_agg(p->'workstyle' order by p->>'person_id') into result
 from jsonb_array_elements(public.get_workstyle_product_team('e8551000-0000-4000-8000-000000000001')->'people') p;
 execute 'reset role';
 return result;
end $$;
create function pg_temp.readiness_for(n integer) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where mutual_people.n=readiness_for.n),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 result:=public.get_workstyle_team_share_readiness('e8551000-0000-4000-8000-000000000001');
 execute 'reset role';
 return result;
end $$;
create function pg_temp.share(owner integer,recipient integer) returns void language sql as $$
 insert into public.alignment_shares(assessment_id,recipient_user_id)
 select o.assessment,r.person from mutual_people o, mutual_people r where o.n=owner and r.n=recipient
 on conflict do nothing;
$$;
create function pg_temp.member_flag(result jsonb,n integer,flag text) returns boolean language sql as $$
 select (m->>flag)::boolean from jsonb_array_elements(result->'members') m where m->>'person_id'=(select person::text from mutual_people where mutual_people.n=member_flag.n)
$$;

-- A) A teilt, B nicht -> kein Teambericht fuer A oder B
select pg_temp.share(1,2);
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready','A: one-sided share hides report from sharer');
select pg_temp.check_mutual(pg_temp.status_for(2)='not_ready','A: one-sided share hides report from recipient');
select pg_temp.check_mutual(pg_temp.readiness_for(2)->>'status'='missing','A: readiness missing');
select pg_temp.check_mutual(pg_temp.member_flag(pg_temp.readiness_for(2),1,'shared_with_all_members') and not pg_temp.member_flag(pg_temp.readiness_for(2),2,'shared_with_all_members'),'A: readiness names who is missing');

-- B) B teilt, A nicht -> kein Teambericht
update public.alignment_shares set revoked_at=now() where assessment_id=(select assessment from mutual_people where n=1);
delete from public.alignment_shares where assessment_id=(select assessment from mutual_people where n=1);
select pg_temp.share(2,1);
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(2)='not_ready','B: other direction is equally hidden');

-- C) beide teilen -> gleicher Bericht fuer beide
select pg_temp.share(1,2);
select pg_temp.check_mutual(pg_temp.status_for(1)='ready' and pg_temp.status_for(2)='ready','C: mutual shares show report to both');
select pg_temp.check_mutual(pg_temp.workstyle_for(1)=pg_temp.workstyle_for(2),'C: identical workstyle input for both');
select pg_temp.check_mutual(pg_temp.readiness_for(1)->>'status'='ready','C: readiness ready');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where n=1),'role','authenticated')::text,true);
set local role authenticated;
select set_config('mutual.pair_snapshot',public.create_workstyle_product_snapshot('e8551000-0000-4000-8000-000000000001')::text,true);
reset role;

-- D/F) dritte Person kommt hinzu, teilt nicht -> fuer niemanden; alter 2er-Stand nicht als aktueller 3er sichtbar
insert into public.founder_team_members(team_id,user_id) select 'e8551000-0000-4000-8000-000000000001',person from mutual_people where n=3;
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(2)='not_ready' and pg_temp.status_for(3)='not_ready','D: unshared third member hides report from all');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where n=1),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_mutual(public.get_workstyle_product_snapshot(current_setting('mutual.pair_snapshot')::uuid) is null,'F: pair snapshot not served as current three-person report');
reset role;
select pg_temp.check_mutual(pg_temp.member_flag(pg_temp.readiness_for(3),3,'has_current_workstyle') and not pg_temp.member_flag(pg_temp.readiness_for(3),3,'shared_with_all_members'),'D: third member listed as not yet shared');
-- C teilt nur mit A -> immer noch fuer niemanden (B->C und C->B fehlen)
select pg_temp.share(3,1); select pg_temp.share(1,3);
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(3)='not_ready','D: partial three-way shares hide report even from A and C');

-- E) alle teilen -> gleicher Bericht fuer alle drei
select pg_temp.share(2,3); select pg_temp.share(3,2);
select pg_temp.check_mutual(pg_temp.status_for(1)='ready' and pg_temp.status_for(2)='ready' and pg_temp.status_for(3)='ready','E: all shared, report for all three');
select pg_temp.check_mutual(pg_temp.workstyle_for(1)=pg_temp.workstyle_for(2) and pg_temp.workstyle_for(2)=pg_temp.workstyle_for(3),'E: identical input for all three');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where n=2),'role','authenticated')::text,true);
set local role authenticated;
select set_config('mutual.three_snapshot',public.create_workstyle_product_snapshot('e8551000-0000-4000-8000-000000000001')::text,true);
reset role;

-- G) Widerruf -> wieder fuer niemanden; Snapshot nur bei unveraendertem aktuellem Stand
update public.alignment_shares set revoked_at=now() where assessment_id=(select assessment from mutual_people where n=3) and recipient_user_id=(select person from mutual_people where n=1);
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(2)='not_ready' and pg_temp.status_for(3)='not_ready','G: revoke hides report from all');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where n=2),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_mutual(public.get_workstyle_product_snapshot(current_setting('mutual.three_snapshot')::uuid) is null,'G: snapshot not served after revoke');
reset role;
update public.alignment_shares set revoked_at=null where assessment_id=(select assessment from mutual_people where n=3) and recipient_user_id=(select person from mutual_people where n=1);
select pg_temp.check_mutual(pg_temp.status_for(1)='ready','G: restoring the share restores the report');

-- Ausgeblendeter Block = nicht vollstaendig freigegeben
insert into public.alignment_share_hidden_blocks(share_id,block_id)
select s.id,'EVI-01' from public.alignment_shares s where s.assessment_id=(select assessment from mutual_people where n=2) and s.recipient_user_id=(select person from mutual_people where n=3);
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(3)='not_ready','hidden block blocks shared report for all');
select pg_temp.check_mutual(not pg_temp.member_flag(pg_temp.readiness_for(1),2,'shared_with_all_members'),'hidden block shows as not fully shared');
delete from public.alignment_share_hidden_blocks where share_id in (select id from public.alignment_shares where assessment_id=(select assessment from mutual_people where n=2));

-- INSUFFICIENT_WORKSTYLE: Mitglied ohne aktuelles Arbeitsprofil
insert into public.founder_team_members(team_id,user_id) select 'e8551000-0000-4000-8000-000000000001',person from mutual_people where n=4;
select pg_temp.check_mutual(not pg_temp.member_flag(pg_temp.readiness_for(4),4,'has_current_workstyle'),'member without current workstyle is flagged');
select pg_temp.check_mutual(pg_temp.status_for(1)='not_ready','member without workstyle blocks report');
select pg_temp.check_mutual(pg_temp.readiness_for(4)->'members' @> jsonb_build_array(jsonb_build_object('is_viewer',true)),'viewer is marked');

-- Kein Leak: Nicht-Mitglieder bekommen keinen Bereitschaftsstatus; keine Antworten im Status.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from mutual_people where n=5),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_mutual(public.get_workstyle_team_share_readiness('e8551000-0000-4000-8000-000000000001') is null,'non-member gets no readiness');
reset role;
select pg_temp.check_mutual(pg_temp.readiness_for(1)::text not like '%answers%' and pg_temp.readiness_for(1)::text not like '%item_key%','readiness exposes no answers');
-- Hilfsfunktion ist nicht direkt aufrufbar.
select pg_temp.check_mutual(not has_function_privilege('authenticated','public.workstyle_core_visible_to(uuid,uuid)','execute'),'helper not callable by clients');

select extensions.pass('team report visibility is mutual');
select * from extensions.finish();
rollback;
