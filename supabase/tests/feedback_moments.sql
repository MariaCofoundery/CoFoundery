begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('fe5b0000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fm-admin@example.invalid',now(),now(),now()),
 ('fe5b0000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fm-a@example.invalid',now(),now(),now()),
 ('fe5b0000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fm-b@example.invalid',now(),now(),now());
insert into public.platform_admins(user_id) values('fe5b0000-0000-4000-8000-000000000001');

reset role; select set_config('request.jwt.claim.sub','fe5b0000-0000-4000-8000-000000000002',true); set local role authenticated;
select lives_ok($$select public.answer_feedback_moment('setup_done','yes')$$,'a person answers a moment');
select lives_ok($$select public.answer_feedback_moment('setup_done','dismissed')$$,'asking again does not fail');
select is((select answer from public.feedback_moments where moment='setup_done'),'yes','the first reaction counts');
select throws_ok($$select public.answer_feedback_moment('geheim','yes')$$,'22023',null,'an unknown moment is refused');
select throws_ok($$select public.answer_feedback_moment('setup_done','maybe')$$,'22023',null,'an unknown answer is refused');

reset role; select set_config('request.jwt.claim.sub','fe5b0000-0000-4000-8000-000000000003',true); set local role authenticated;
select public.answer_feedback_moment('setup_done','no');
select public.answer_feedback_moment('workstyle_report','dismissed');
select is((select count(*) from public.feedback_moments),2::bigint,'nobody reads another person''s reactions');
select throws_ok($$select public.admin_feedback_moments()$$,'42501',null,'only an admin reads the counts');

reset role; select set_config('request.jwt.claim.sub','fe5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((public.admin_feedback_moments()->'setup_done'->>'yes')::int,1,'the admin sees one yes');
select is((public.admin_feedback_moments()->'setup_done'->>'no')::int,1,'and one no');
select is((public.admin_feedback_moments()->'workstyle_report'->>'dismissed')::int,1,'and one dismissed');

select is((public.admin_feedback_moments()::text ~ 'fe5b0000'),false,'the counts carry no ids');

select * from finish();
rollback;
