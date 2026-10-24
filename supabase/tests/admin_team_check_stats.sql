begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('dc5b0000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tc-admin@example.invalid',now(),now(),now()),
 ('dc5b0000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tc-member@example.invalid',now(),now(),now());
insert into public.platform_admins(user_id) values('dc5b0000-0000-4000-8000-000000000001');

reset role; select set_config('request.jwt.claim.sub','dc5b0000-0000-4000-8000-000000000002',true); set local role authenticated;
select throws_ok($$select public.admin_team_check_stats()$$,'42501',null,'a member cannot read the team check numbers');
select throws_ok($$select public.admin_team_check_counts('read_my_mind', now())$$,'42501',null,'the helper is not callable by clients');

reset role; select set_config('request.jwt.claim.sub','dc5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is(jsonb_typeof(public.admin_team_check_stats()->'read_my_mind'),'object','an admin gets numbers for Read My Mind');
select is(jsonb_typeof(public.admin_team_check_stats()->'founder_in_the_wild'),'object','and for Founder in the Wild');
select is((public.admin_team_check_stats()->'read_my_mind'->>'started_total')::int,0,'nothing started yet');
select ok(public.admin_team_check_stats()->'commitment_lab' ? 'started_30d','and the commitment lab count');
select ok(not (public.admin_team_check_stats()::text ~ 'user_id|email'),'the numbers carry no personal data');
select * from finish();
rollback;
