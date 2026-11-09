begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('fb5b0000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fb-admin@example.invalid',now(),now(),now()),
 ('fb5b0000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fb-yes@example.invalid',now(),now(),now()),
 ('fb5b0000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fb-no@example.invalid',now(),now(),now());
insert into public.platform_admins(user_id) values('fb5b0000-0000-4000-8000-000000000001');
insert into public.person_core(user_id,display_name) values
 ('fb5b0000-0000-4000-8000-000000000002','Mit Erlaubnis'),('fb5b0000-0000-4000-8000-000000000003','Ohne Erlaubnis')
 on conflict(user_id) do update set display_name=excluded.display_name;

-- Mitglieder schreiben ihr eigenes Feedback in der neuen Form.
reset role; select set_config('request.jwt.claim.sub','fb5b0000-0000-4000-8000-000000000002',true); set local role authenticated;
select lives_ok($$insert into public.product_feedback(user_id,source,kind,message,importance,area,page_path,device,may_contact)
  values ('fb5b0000-0000-4000-8000-000000000002','nav','bug','Der Haken springt zurueck','very','teamraum.tasks','/advisor/teamraum/aufgaben','phone',true)$$,
  'new-shaped feedback is accepted');
reset role; select set_config('request.jwt.claim.sub','fb5b0000-0000-4000-8000-000000000003',true); set local role authenticated;
select lives_ok($$insert into public.product_feedback(user_id,source,kind,message,area,device)
  values ('fb5b0000-0000-4000-8000-000000000003','nav','unclear','Ich wusste nicht, was gemeint ist','connect.people','desktop')$$,
  'may_contact defaults to no');
select throws_ok($$insert into public.product_feedback(user_id,source,kind,area) values ('fb5b0000-0000-4000-8000-000000000003','nav','help','connect')$$,
  '23514',null,'a kind without text is refused');
select throws_ok($$insert into public.product_feedback(user_id,source,kind,message) values ('fb5b0000-0000-4000-8000-000000000003','nav','praise','x')$$,
  '23514',null,'an unknown kind is refused');
select throws_ok($$insert into public.product_feedback(user_id,source,kind,message,area) values ('fb5b0000-0000-4000-8000-000000000003','nav','help','x','Connect/People')$$,
  '23514',null,'an area is a short word, not free text');
select throws_ok($$insert into public.product_feedback(user_id,source,q1_value) values ('fb5b0000-0000-4000-8000-000000000003','nav','nur eine')$$,
  '23514',null,'the old shape still needs all three answers');
select lives_ok($$insert into public.product_feedback(user_id,source,q1_value,q2_value,q3_value) values ('fb5b0000-0000-4000-8000-000000000003','nav','a','b','c')$$,
  'the old shape still works');

-- Der Admin liest; die Adresse nur mit Erlaubnis.
reset role; select set_config('request.jwt.claim.sub','fb5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((select j->>'contact_email' from public.admin_list_feedback('all',0) j where j->>'sender_name'='Mit Erlaubnis'),'fb-yes@example.invalid','the address is given when contact is allowed');
select is((select j->>'contact_email' from public.admin_list_feedback('all',0) j where j->>'sender_name'='Ohne Erlaubnis' and j->>'kind'='unclear'),null,'and withheld when it is not');
select is((select count(*) from public.admin_list_feedback('all',0,'bug')),1::bigint,'filter by kind');
select is((select count(*) from public.admin_list_feedback('all',0,null,'teamraum')),1::bigint,'filter by area, including its sub-areas');
select is((select count(*) from public.admin_list_feedback('all',0,null,'connect')),1::bigint,'another area finds its own');
select is((select j->>'importance' from public.admin_list_feedback('all',0,'bug') j),'very','the importance comes with it');

select * from finish();
rollback;
