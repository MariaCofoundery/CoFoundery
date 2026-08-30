\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_fitw(condition boolean, message text)
returns void language plpgsql as $$ begin if condition is not true then raise exception 'founder in the wild assertion failed: %', message; end if; end $$;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f1111111-1111-4111-8111-111111111111','authenticated','authenticated','fitw-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f2222222-2222-4222-8222-222222222222','authenticated','authenticated','fitw-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f3333333-3333-4333-8333-333333333333','authenticated','authenticated','fitw-stranger@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f4444444-4444-4444-8444-444444444444','authenticated','authenticated','fitw-advisor@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('f1111111-1111-4111-8111-111111111111','Founder A',array['founder']),
('f2222222-2222-4222-8222-222222222222','Founder B',array['founder']),
('f3333333-3333-4333-8333-333333333333','Stranger',array['founder']),
('f4444444-4444-4444-8444-444444444444','Advisor',array['advisor']);
insert into public.founder_teams(id,name,team_context) values
('fa111111-1111-4111-8111-111111111111','Wild Pair','existing_team'),
('fa222222-2222-4222-8222-222222222222','Wild Lifecycle Pair','existing_team');
insert into public.founder_team_members(team_id,user_id,created_at) values
('fa111111-1111-4111-8111-111111111111','f1111111-1111-4111-8111-111111111111','2026-01-01'),
('fa111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222','2026-01-02'),
('fa222222-2222-4222-8222-222222222222','f1111111-1111-4111-8111-111111111111','2026-01-01'),
('fa222222-2222-4222-8222-222222222222','f2222222-2222-4222-8222-222222222222','2026-01-02');

select pg_temp.assert_fitw(
  (select count(*)=1 from public.collaboration_experience_pack_versions where experience_key='founder_in_the_wild')
  and (select count(*)=5 from public.collaboration_experience_prompt_versions where experience_key='founder_in_the_wild')
  and (select count(*)=15 from public.collaboration_experience_prompt_response_contracts where experience_key='founder_in_the_wild')
  and not exists (select 1 from public.collaboration_experience_prompt_response_contracts where experience_key='founder_in_the_wild' and response_type not in ('move','matters','need')),
  'frozen pack contract is incomplete'
);
select pg_temp.assert_fitw(to_regclass('public.collaboration_experience_one_open_round_per_team_pack_idx') is not null,'race-safe open-round unique index is missing');

select set_config('request.jwt.claims','{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}',true); set local role authenticated;
do $$ begin begin perform public.create_founder_in_the_wild_round('fa111111-1111-4111-8111-111111111111'); raise exception 'stranger created round'; exception when insufficient_privilege then null; end; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"f4444444-4444-4444-8444-444444444444","role":"authenticated"}',true); set local role authenticated;
do $$ begin begin perform public.create_founder_in_the_wild_round('fa111111-1111-4111-8111-111111111111'); raise exception 'advisor created round'; exception when insufficient_privilege then null; end; end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select public.create_founder_in_the_wild_round('fa111111-1111-4111-8111-111111111111');
select pg_temp.assert_fitw(
  public.create_founder_in_the_wild_round('fa111111-1111-4111-8111-111111111111') =
    (select id from public.collaboration_experience_rounds where founder_team_id='fa111111-1111-4111-8111-111111111111' and status='active'),
  'an idempotent second start did not return the existing round'
);
select pg_temp.assert_fitw(
  (select count(*)=1 from public.collaboration_experience_rounds where experience_key='founder_in_the_wild' and status='active')
  and (select count(*)=2 from public.collaboration_experience_round_participants where state='joined')
  and (select count(*)=5 from public.collaboration_experience_round_prompts where experience_key='founder_in_the_wild')
  and (select count(*)=10 from public.collaboration_experience_prompt_assignments),
  'round does not contain two joined snapshots and five shared scenarios'
);
do $$ declare v_assignment uuid; v_prompt uuid; begin
  select assignment.id, assignment.round_prompt_id into v_assignment,v_prompt from public.collaboration_experience_prompt_assignments assignment join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id where assignment.target_user_id=auth.uid() and prompt.position=0;
  perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['clarify_shared_position']);
  perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['clarify_shared_position']);
  begin perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['continue_then_private']); raise exception 'immutable answer changed'; exception when insufficient_privilege then null; end;
  begin perform public.lock_founder_in_the_wild_response(v_assignment,'matters',array['honesty','speed','openness']); raise exception 'three matters accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.get_founder_in_the_wild_prompt_reveal(v_prompt); raise exception 'early reveal succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw(not exists(select 1 from public.collaboration_experience_responses where respondent_user_id='f1111111-1111-4111-8111-111111111111'),'partner raw response visible before reveal');
do $$ declare v_foreign uuid; begin select id into v_foreign from public.collaboration_experience_prompt_assignments where target_user_id='f1111111-1111-4111-8111-111111111111' limit 1; begin perform public.lock_founder_in_the_wild_response(v_foreign,'move',array['clarify_shared_position']); raise exception 'foreign assignment accepted'; exception when insufficient_privilege then null; end; end $$;
reset role;

-- Lifecycle exit contract on a separate pair: creator discard, partner decline,
-- clean replay, and no unilateral exit after both founders started.
select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select public.create_founder_in_the_wild_round('fa222222-2222-4222-8222-222222222222');
do $$ declare v_round uuid; v_assignment uuid; begin
  select id into v_round from public.collaboration_experience_rounds where founder_team_id='fa222222-2222-4222-8222-222222222222' and status='active';
  select assignment.id into v_assignment from public.collaboration_experience_prompt_assignments assignment join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id where assignment.round_id=v_round and assignment.target_user_id=auth.uid() and prompt.position=0;
  perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['clarify_shared_position']);
  perform public.end_founder_in_the_wild_round(v_round,'discard');
end $$;
reset role;
select pg_temp.assert_fitw(
  not exists(select 1 from public.collaboration_experience_responses response join public.collaboration_experience_rounds round_row on round_row.id=response.round_id where round_row.founder_team_id='fa222222-2222-4222-8222-222222222222')
  and not exists(select 1 from public.collaboration_experience_reveal_receipts receipt join public.collaboration_experience_rounds round_row on round_row.id=receipt.round_id where round_row.founder_team_id='fa222222-2222-4222-8222-222222222222')
  and not exists(select 1 from public.collaboration_experience_conversation_markers marker join public.collaboration_experience_rounds round_row on round_row.id=marker.round_id where round_row.founder_team_id='fa222222-2222-4222-8222-222222222222'),
  'creator discard did not purge all content'
);

select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select public.create_founder_in_the_wild_round('fa222222-2222-4222-8222-222222222222');
do $$ declare v_round uuid; v_assignment uuid; begin
  select id into v_round from public.collaboration_experience_rounds where founder_team_id='fa222222-2222-4222-8222-222222222222' and status='active';
  select assignment.id into v_assignment from public.collaboration_experience_prompt_assignments assignment join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id where assignment.round_id=v_round and assignment.target_user_id=auth.uid() and prompt.position=0;
  perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['clarify_shared_position']);
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
select public.end_founder_in_the_wild_round((select id from public.collaboration_experience_rounds where founder_team_id='fa222222-2222-4222-8222-222222222222' and status='active'),'decline');
reset role;
select pg_temp.assert_fitw(not exists(select 1 from public.collaboration_experience_responses response join public.collaboration_experience_rounds round_row on round_row.id=response.round_id where round_row.founder_team_id='fa222222-2222-4222-8222-222222222222'),'partner decline did not purge creator content');

select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select public.create_founder_in_the_wild_round('fa222222-2222-4222-8222-222222222222');
do $$ declare v_round uuid; v_assignment uuid; begin
  select id into v_round from public.collaboration_experience_rounds where founder_team_id='fa222222-2222-4222-8222-222222222222' and status='active';
  select assignment.id into v_assignment from public.collaboration_experience_prompt_assignments assignment join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id where assignment.round_id=v_round and assignment.target_user_id=auth.uid() and prompt.position=0;
  perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['clarify_shared_position']);
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
do $$ declare v_round uuid; v_assignment uuid; begin
  select id into v_round from public.collaboration_experience_rounds where founder_team_id='fa222222-2222-4222-8222-222222222222' and status='active';
  select assignment.id into v_assignment from public.collaboration_experience_prompt_assignments assignment join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id where assignment.round_id=v_round and assignment.target_user_id=auth.uid() and prompt.position=0;
  perform public.lock_founder_in_the_wild_response(v_assignment,'move',array['clarify_shared_position']);
  begin perform public.end_founder_in_the_wild_round(v_round,'decline'); raise exception 'decline succeeded after both started'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
do $$ declare v_round uuid; begin select id into v_round from public.collaboration_experience_rounds where founder_team_id='fa222222-2222-4222-8222-222222222222' and status='active'; begin perform public.end_founder_in_the_wild_round(v_round,'discard'); raise exception 'discard succeeded after both started'; exception when insufficient_privilege then null; end; end $$;
reset role;

insert into public.collaboration_experience_responses(round_id,prompt_assignment_id,respondent_user_id,response_type,choice_keys)
select assignment.round_id,assignment.id,assignment.target_user_id,contract.response_type,array[contract.allowed_choice_keys[1]]
from public.collaboration_experience_prompt_assignments assignment
join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id
join public.collaboration_experience_prompt_response_contracts contract on contract.experience_key=prompt.experience_key and contract.pack_key=prompt.pack_key and contract.pack_version=prompt.pack_version and contract.prompt_key=prompt.prompt_key and contract.prompt_version=prompt.prompt_version
where assignment.round_id=(select id from public.collaboration_experience_rounds where founder_team_id='fa111111-1111-4111-8111-111111111111' and status='active')
on conflict(prompt_assignment_id,respondent_user_id,response_type) do nothing;

select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw(public.is_founder_in_the_wild_round_answer_complete((select id from public.collaboration_experience_rounds where founder_team_id='fa111111-1111-4111-8111-111111111111' and status='active')),'round barrier did not open');
select pg_temp.assert_fitw((select count(*)=6 from public.get_founder_in_the_wild_prompt_reveal((select prompt.id from public.collaboration_experience_round_prompts prompt join public.collaboration_experience_rounds round_row on round_row.id=prompt.round_id where round_row.founder_team_id='fa111111-1111-4111-8111-111111111111' and round_row.status='active' and prompt.position=0))),'reveal did not return two structured response sets');
do $$ declare prompt record; begin for prompt in select prompt_row.id from public.collaboration_experience_round_prompts prompt_row join public.collaboration_experience_rounds round_row on round_row.id=prompt_row.round_id where round_row.founder_team_id='fa111111-1111-4111-8111-111111111111' and round_row.status='active' loop perform public.get_founder_in_the_wild_prompt_reveal(prompt.id); end loop; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
do $$ declare prompt record; begin for prompt in select prompt_row.id from public.collaboration_experience_round_prompts prompt_row join public.collaboration_experience_rounds round_row on round_row.id=prompt_row.round_id where round_row.founder_team_id='fa111111-1111-4111-8111-111111111111' and round_row.status='active' loop perform public.get_founder_in_the_wild_prompt_reveal(prompt.id); end loop; end $$;
select public.complete_founder_in_the_wild_round((select id from public.collaboration_experience_rounds where founder_team_id='fa111111-1111-4111-8111-111111111111' and status='active'));
reset role;
select pg_temp.assert_fitw((select status='completed' from public.collaboration_experience_rounds where founder_team_id='fa111111-1111-4111-8111-111111111111'),'round did not complete after both founders revealed all prompts');

select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select public.create_founder_in_the_wild_round('fa111111-1111-4111-8111-111111111111');
select pg_temp.assert_fitw((select count(*)=1 from public.collaboration_experience_rounds where founder_team_id='fa111111-1111-4111-8111-111111111111' and status='active'),'completed round did not permit a clean replay');
reset role;

select extensions.pass('Founder in the Wild V1 enforces team access, response cardinality, immutability, pre-reveal privacy, the round barrier and completion');
select * from extensions.finish();
rollback;
