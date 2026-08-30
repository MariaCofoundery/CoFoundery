\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_fitw_handoff(condition boolean, message text)
returns void language plpgsql as $$ begin if condition is not true then raise exception 'FITW handoff assertion failed: %', message; end if; end $$;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e1111111-1111-4111-8111-111111111111','authenticated','authenticated','handoff-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e2222222-2222-4222-8222-222222222222','authenticated','authenticated','handoff-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e3333333-3333-4333-8333-333333333333','authenticated','authenticated','handoff-stranger@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4444444-4444-4444-8444-444444444444','authenticated','authenticated','handoff-advisor@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('e1111111-1111-4111-8111-111111111111','Founder A',array['founder']),
('e2222222-2222-4222-8222-222222222222','Founder B',array['founder']),
('e3333333-3333-4333-8333-333333333333','Stranger',array['founder']),
('e4444444-4444-4444-8444-444444444444','Advisor',array['advisor']);
insert into public.founder_teams(id,name,team_context) values
('ea111111-1111-4111-8111-111111111111','A first','existing_team'),
('ea222222-2222-4222-8222-222222222222','B first','existing_team'),
('ea333333-3333-4333-8333-333333333333','Both complete','existing_team'),
('ea444444-4444-4444-8444-444444444444','Abandoned','existing_team');
insert into public.founder_team_members(team_id,user_id)
select team.id, founder.user_id
from (values
  ('ea111111-1111-4111-8111-111111111111'::uuid),
  ('ea222222-2222-4222-8222-222222222222'::uuid),
  ('ea333333-3333-4333-8333-333333333333'::uuid),
  ('ea444444-4444-4444-8444-444444444444'::uuid)
) team(id)
cross join (values
  ('e1111111-1111-4111-8111-111111111111'::uuid),
  ('e2222222-2222-4222-8222-222222222222'::uuid)
) founder(user_id);

select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select public.create_founder_in_the_wild_round('ea111111-1111-4111-8111-111111111111');
select public.create_founder_in_the_wild_round('ea222222-2222-4222-8222-222222222222');
select public.create_founder_in_the_wild_round('ea333333-3333-4333-8333-333333333333');
select public.create_founder_in_the_wild_round('ea444444-4444-4444-8444-444444444444');
reset role;

-- A completes first. The response trigger makes the handoff ready without a page-view side effect.
insert into public.collaboration_experience_responses(round_id,prompt_assignment_id,respondent_user_id,response_type,choice_keys)
select assignment.round_id,assignment.id,assignment.target_user_id,contract.response_type,array[contract.allowed_choice_keys[1]]
from public.collaboration_experience_prompt_assignments assignment
join public.collaboration_experience_rounds round_row on round_row.id=assignment.round_id
join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id
join public.collaboration_experience_prompt_response_contracts contract on contract.experience_key=prompt.experience_key and contract.pack_key=prompt.pack_key and contract.pack_version=prompt.pack_version and contract.prompt_key=prompt.prompt_key and contract.prompt_version=prompt.prompt_version
where round_row.founder_team_id='ea111111-1111-4111-8111-111111111111'
  and assignment.target_user_id='e1111111-1111-4111-8111-111111111111';
select pg_temp.assert_fitw_handoff(
  (select handoff_ready_at is not null and handoff_email_claimed_at is null from public.collaboration_experience_rounds where founder_team_id='ea111111-1111-4111-8111-111111111111'),
  'completion did not set an unclaimed handoff'
);

select set_config('request.jwt.claims','{"sub":"e3333333-3333-4333-8333-333333333333","role":"authenticated"}',true); set local role authenticated;
do $$ begin begin perform public.claim_founder_in_the_wild_handoff_email((select id from public.collaboration_experience_rounds where founder_team_id='ea111111-1111-4111-8111-111111111111')); raise exception 'stranger claimed handoff'; exception when insufficient_privilege then null; end; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"e4444444-4444-4444-8444-444444444444","role":"authenticated"}',true); set local role authenticated;
do $$ begin begin perform public.get_founder_in_the_wild_handoff_state((select id from public.collaboration_experience_rounds where founder_team_id='ea111111-1111-4111-8111-111111111111')); raise exception 'advisor read handoff state'; exception when insufficient_privilege then null; end; end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw_handoff(
  (select not own_started and not own_complete and partner_started and partner_complete
   from public.get_founder_in_the_wild_handoff_state((select id from public.collaboration_experience_rounds where founder_team_id='ea111111-1111-4111-8111-111111111111'))),
  'recipient state does not show the completed partner'
);
reset role;
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw_handoff(
  (select recipient_user_id='e2222222-2222-4222-8222-222222222222' from public.claim_founder_in_the_wild_handoff_email((select id from public.collaboration_experience_rounds where founder_team_id='ea111111-1111-4111-8111-111111111111')))
  and (select count(*)=0 from public.claim_founder_in_the_wild_handoff_email((select id from public.collaboration_experience_rounds where founder_team_id='ea111111-1111-4111-8111-111111111111'))),
  'claim was not recipient-correct and at-most-once'
);
reset role;

-- B can be the first founder to complete; creator identity is irrelevant.
insert into public.collaboration_experience_responses(round_id,prompt_assignment_id,respondent_user_id,response_type,choice_keys)
select assignment.round_id,assignment.id,assignment.target_user_id,contract.response_type,array[contract.allowed_choice_keys[1]]
from public.collaboration_experience_prompt_assignments assignment
join public.collaboration_experience_rounds round_row on round_row.id=assignment.round_id
join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id
join public.collaboration_experience_prompt_response_contracts contract on contract.experience_key=prompt.experience_key and contract.pack_key=prompt.pack_key and contract.pack_version=prompt.pack_version and contract.prompt_key=prompt.prompt_key and contract.prompt_version=prompt.prompt_version
where round_row.founder_team_id='ea222222-2222-4222-8222-222222222222'
  and assignment.target_user_id='e2222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw_handoff(
  (select recipient_user_id='e1111111-1111-4111-8111-111111111111' from public.claim_founder_in_the_wild_handoff_email((select id from public.collaboration_experience_rounds where founder_team_id='ea222222-2222-4222-8222-222222222222'))),
  'symmetric B-first handoff failed'
);
reset role;

-- A and B are already complete before a claim: no handoff mail may be claimed.
insert into public.collaboration_experience_responses(round_id,prompt_assignment_id,respondent_user_id,response_type,choice_keys)
select assignment.round_id,assignment.id,assignment.target_user_id,contract.response_type,array[contract.allowed_choice_keys[1]]
from public.collaboration_experience_prompt_assignments assignment
join public.collaboration_experience_rounds round_row on round_row.id=assignment.round_id
join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id
join public.collaboration_experience_prompt_response_contracts contract on contract.experience_key=prompt.experience_key and contract.pack_key=prompt.pack_key and contract.pack_version=prompt.pack_version and contract.prompt_key=prompt.prompt_key and contract.prompt_version=prompt.prompt_version
where round_row.founder_team_id='ea333333-3333-4333-8333-333333333333';
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw_handoff(
  (select count(*)=0 from public.claim_founder_in_the_wild_handoff_email((select id from public.collaboration_experience_rounds where founder_team_id='ea333333-3333-4333-8333-333333333333'))),
  'both-complete round produced a handoff claim'
);
reset role;

-- An abandoned round cannot produce a late claim and keeps no response payload.
insert into public.collaboration_experience_responses(round_id,prompt_assignment_id,respondent_user_id,response_type,choice_keys)
select assignment.round_id,assignment.id,assignment.target_user_id,contract.response_type,array[contract.allowed_choice_keys[1]]
from public.collaboration_experience_prompt_assignments assignment
join public.collaboration_experience_rounds round_row on round_row.id=assignment.round_id
join public.collaboration_experience_round_prompts prompt on prompt.id=assignment.round_prompt_id
join public.collaboration_experience_prompt_response_contracts contract on contract.experience_key=prompt.experience_key and contract.pack_key=prompt.pack_key and contract.pack_version=prompt.pack_version and contract.prompt_key=prompt.prompt_key and contract.prompt_version=prompt.prompt_version
where round_row.founder_team_id='ea444444-4444-4444-8444-444444444444'
  and assignment.target_user_id='e1111111-1111-4111-8111-111111111111';
select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true); set local role authenticated;
select public.end_founder_in_the_wild_round((select id from public.collaboration_experience_rounds where founder_team_id='ea444444-4444-4444-8444-444444444444'),'decline');
reset role;
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true); set local role authenticated;
select pg_temp.assert_fitw_handoff(
  (select count(*)=0 from public.claim_founder_in_the_wild_handoff_email((select id from public.collaboration_experience_rounds where founder_team_id='ea444444-4444-4444-8444-444444444444')))
  and not exists(select 1 from public.collaboration_experience_responses response join public.collaboration_experience_rounds round_row on round_row.id=response.round_id where round_row.founder_team_id='ea444444-4444-4444-8444-444444444444'),
  'abandoned round retained content or allowed a late claim'
);
reset role;

select extensions.pass('FITW handoff readiness, symmetric recipient state, at-most-once claim, both-complete suppression and abandonment are enforced');
select * from extensions.finish();
rollback;
