\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_multi_pack(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'multi-pack assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.round_for_pack(p_team_id uuid, p_pack_key text)
returns uuid language sql stable as $$
  select id from public.collaboration_experience_rounds
  where founder_team_id = p_team_id and pack_key = p_pack_key
    and status in ('forming','active')
  order by created_at desc, id desc limit 1
$$;

create or replace function pg_temp.lock_all_own_answers(p_round_id uuid)
returns void language plpgsql as $$
declare v_user_id uuid := auth.uid(); v_slot record;
begin
  for v_slot in
    select assignment.id assignment_id, required_slot.response_type,
           array[contract.allowed_choice_keys[1]] choice_keys
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts round_prompt on round_prompt.id = assignment.round_prompt_id
    join public.collaboration_experience_prompt_versions prompt
      on prompt.experience_key = round_prompt.experience_key and prompt.pack_key = round_prompt.pack_key
     and prompt.pack_version = round_prompt.pack_version and prompt.prompt_key = round_prompt.prompt_key
     and prompt.prompt_version = round_prompt.prompt_version
    cross join lateral (
      select case when v_user_id = assignment.target_user_id then 'self' else 'guess' end::text response_type
      union all select 'need' where v_user_id <> assignment.target_user_id and prompt.need_mode = 'required'
    ) required_slot
    join public.collaboration_experience_prompt_response_contracts contract
      on contract.experience_key = round_prompt.experience_key and contract.pack_key = round_prompt.pack_key
     and contract.pack_version = round_prompt.pack_version and contract.prompt_key = round_prompt.prompt_key
     and contract.prompt_version = round_prompt.prompt_version and contract.response_type = required_slot.response_type
    where assignment.round_id = p_round_id
  loop
    perform public.lock_collaboration_response(v_slot.assignment_id, v_slot.response_type, v_slot.choice_keys);
  end loop;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','f1111111-1111-4111-8111-111111111111','authenticated','authenticated','multi-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','f2222222-2222-4222-8222-222222222222','authenticated','authenticated','multi-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','f3333333-3333-4333-8333-333333333333','authenticated','authenticated','multi-stranger@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams (id, name, team_context)
values ('ff111111-1111-4111-8111-111111111111','Multi Pack','existing_team');
insert into public.founder_team_members (team_id, user_id, created_at) values
  ('ff111111-1111-4111-8111-111111111111','f1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('ff111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222','2026-01-02');

select set_config('request.jwt.claims','{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('ff111111-1111-4111-8111-111111111111','easy_start',1);
select pg_temp.lock_all_own_answers(pg_temp.round_for_pack('ff111111-1111-4111-8111-111111111111','easy_start'));
select public.create_collaboration_experience_round('ff111111-1111-4111-8111-111111111111','how_we_work',1);
select pg_temp.lock_all_own_answers(pg_temp.round_for_pack('ff111111-1111-4111-8111-111111111111','how_we_work'));
select public.create_collaboration_experience_round('ff111111-1111-4111-8111-111111111111','when_things_get_tricky',1);

do $$ begin
  begin
    perform public.create_collaboration_experience_round('ff111111-1111-4111-8111-111111111111','easy_start',1);
    raise exception 'duplicate open Easy Start succeeded';
  exception when unique_violation then null; end;
end $$;

select pg_temp.assert_multi_pack(
  (select count(*) = 3 from public.collaboration_experience_rounds
   where founder_team_id = 'ff111111-1111-4111-8111-111111111111' and status = 'forming')
  and (select count(*) = 2 from public.collaboration_experience_rounds
       where founder_team_id = 'ff111111-1111-4111-8111-111111111111' and handoff_ready_at is not null),
  'three distinct open packs or their independent handoffs were not preserved'
);

create temporary table first_claim on commit drop as
select * from public.claim_collaboration_team_handoff_emails('ff111111-1111-4111-8111-111111111111');
select pg_temp.assert_multi_pack(
  (select count(*) = 2 from first_claim)
  and (select array_agg(pack_key order by pack_key) = array['easy_start','how_we_work']
       from first_claim)
  and (select count(*) = 0 from public.claim_collaboration_team_handoff_emails('ff111111-1111-4111-8111-111111111111')),
  'first batch claim was not exactly the two ready, unclaimed packs'
);

select pg_temp.lock_all_own_answers(pg_temp.round_for_pack('ff111111-1111-4111-8111-111111111111','when_things_get_tricky'));
create temporary table later_claim on commit drop as
select * from public.claim_collaboration_team_handoff_emails('ff111111-1111-4111-8111-111111111111');
select pg_temp.assert_multi_pack(
  (select count(*) = 1 and min(pack_key) = 'when_things_get_tricky' from later_claim),
  'later notification did not claim only the newly ready pack'
);
reset role;

-- Team membership or pending participation alone cannot claim creator notifications.
select set_config('request.jwt.claims','{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_multi_pack(
  (select count(*) = 0 from public.claim_collaboration_team_handoff_emails('ff111111-1111-4111-8111-111111111111')),
  'recipient claimed creator notifications'
);
reset role;

select set_config('request.jwt.claims','{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.claim_collaboration_team_handoff_emails('ff111111-1111-4111-8111-111111111111');
    raise exception 'stranger claimed notifications';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select pg_temp.assert_multi_pack(
  has_function_privilege('authenticated','public.claim_collaboration_team_handoff_emails(uuid)','EXECUTE')
  and not has_function_privilege('authenticated','public.claim_collaboration_round_handoff_email(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.claim_collaboration_team_handoff_emails(uuid)','EXECUTE')
  and not has_table_privilege('authenticated','public.collaboration_experience_rounds','UPDATE'),
  'batch claim grants are broader than the authenticated RPC contract'
);

select extensions.pass('Read My Mind permits one independent open round per pack and securely batch-claims handoff notifications');
select * from extensions.finish();
rollback;
