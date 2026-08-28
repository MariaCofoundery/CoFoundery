\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_rmm_marker(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'read my mind marker assertion failed: %', message;
  end if;
end;
$$;

create or replace function pg_temp.rmm_marker_round(p_team_id uuid)
returns uuid language sql stable as $$
  select id from public.collaboration_experience_rounds
  where founder_team_id = p_team_id
  order by created_at desc, id desc limit 1
$$;

create or replace function pg_temp.rmm_marker_prompt(p_round_id uuid, p_position integer)
returns uuid language sql stable as $$
  select id from public.collaboration_experience_round_prompts
  where round_id = p_round_id and position = p_position
$$;

create or replace function pg_temp.fill_rmm_marker_answers(p_round_id uuid)
returns void language sql as $$
  insert into public.collaboration_experience_responses (
    round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys
  )
  select assignment.round_id, assignment.id, participant.founder_user_id,
         required_slot.response_type, array[contract.allowed_choice_keys[1]]
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts round_prompt
    on round_prompt.id = assignment.round_prompt_id
   and round_prompt.round_id = assignment.round_id
  join public.collaboration_experience_prompt_versions prompt
    on prompt.experience_key = round_prompt.experience_key
   and prompt.pack_key = round_prompt.pack_key
   and prompt.pack_version = round_prompt.pack_version
   and prompt.prompt_key = round_prompt.prompt_key
   and prompt.prompt_version = round_prompt.prompt_version
  join public.collaboration_experience_round_participants participant
    on participant.round_id = assignment.round_id
   and participant.state = 'joined'
  cross join lateral (
    select case when participant.founder_user_id = assignment.target_user_id
      then 'self' else 'guess' end::text response_type
    union all
    select 'need' where participant.founder_user_id <> assignment.target_user_id
      and prompt.need_mode = 'required'
  ) required_slot
  join public.collaboration_experience_prompt_response_contracts contract
    on contract.experience_key = round_prompt.experience_key
   and contract.pack_key = round_prompt.pack_key
   and contract.pack_version = round_prompt.pack_version
   and contract.prompt_key = round_prompt.prompt_key
   and contract.prompt_version = round_prompt.prompt_version
   and contract.response_type = required_slot.response_type
  where assignment.round_id = p_round_id
  on conflict (prompt_assignment_id, respondent_user_id, response_type) do nothing;
$$;

create or replace function pg_temp.open_rmm_marker_reveal(p_round_id uuid, p_position integer)
returns void language plpgsql as $$
begin
  perform public.get_collaboration_prompt_reveal(
    pg_temp.rmm_marker_prompt(p_round_id, p_position)
  );
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-4111-8111-111111111111','authenticated','authenticated','marker-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','c2222222-2222-4222-8222-222222222222','authenticated','authenticated','marker-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-4333-8333-333333333333','authenticated','authenticated','marker-c@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','c4444444-4444-4444-8444-444444444444','authenticated','authenticated','marker-advisor@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','c5555555-5555-4555-8555-555555555555','authenticated','authenticated','marker-delete-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','c6666666-6666-4666-8666-666666666666','authenticated','authenticated','marker-delete-b@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams (id, name, team_context) values
  ('cc111111-1111-4111-8111-111111111111','Marker Completed History','existing_team'),
  ('cc222222-2222-4222-8222-222222222222','Marker Abandoned','existing_team'),
  ('cc333333-3333-4333-8333-333333333333','Marker Account Delete','existing_team');

insert into public.founder_team_members (team_id, user_id, created_at) values
  ('cc111111-1111-4111-8111-111111111111','c1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('cc111111-1111-4111-8111-111111111111','c2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('cc222222-2222-4222-8222-222222222222','c1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('cc222222-2222-4222-8222-222222222222','c2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('cc333333-3333-4333-8333-333333333333','c5555555-5555-4555-8555-555555555555','2026-01-01'),
  ('cc333333-3333-4333-8333-333333333333','c6666666-6666-4666-8666-666666666666','2026-01-02');

insert into public.relationships (id, user_a_id, user_b_id, founder_team_id)
values (
  'cd111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  'c2222222-2222-4222-8222-222222222222',
  'cc111111-1111-4111-8111-111111111111'
);
insert into public.relationship_advisors (
  relationship_id, advisor_user_id, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'cd111111-1111-4111-8111-111111111111',
  'c4444444-4444-4444-8444-444444444444',
  'marker-advisor@example.com', 'linked', true, true, now(), now()
);

-- A+B create and activate a normal two-founder round.
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('cc111111-1111-4111-8111-111111111111','easy_start',1);
reset role;
select pg_temp.fill_rmm_marker_answers(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'));
select set_config('request.jwt.claims','{"sub":"c2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'));
reset role;
select pg_temp.fill_rmm_marker_answers(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'));

-- Unseen prompts cannot be marked, even after the round-wide answer barrier opens.
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.mark_collaboration_prompt_for_conversation(
      pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'), 1)
    );
    raise exception 'unseen prompt was marked';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0);
select public.mark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0)
);
select public.mark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0)
);
reset role;
select pg_temp.assert_rmm_marker(
  (select count(*) = 1 from public.collaboration_experience_conversation_markers
   where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111')),
  'idempotent mark created duplicate rows'
);

-- B cannot see the shared marker until B has opened this reveal. Afterwards B
-- sees A's marker, marks independently, and A can remove only A's row.
select set_config('request.jwt.claims','{"sub":"c2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm_marker(
  (select count(*) = 0 from public.collaboration_experience_conversation_markers
   where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111')),
  'marker leaked before the partner opened the reveal'
);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0);
select pg_temp.assert_rmm_marker(
  (select count(*) = 1 from public.collaboration_experience_conversation_markers
   where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111')),
  'partner could not see shared marker after opening the reveal'
);
select public.mark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0)
);
reset role;
select pg_temp.assert_rmm_marker(
  (select count(*) = 2 from public.collaboration_experience_conversation_markers
   where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111')),
  'two founders could not mark the same prompt independently'
);
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.unmark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0)
);
select public.unmark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0)
);
reset role;
select pg_temp.assert_rmm_marker(
  (select count(*) = 1 and bool_and(participant_user_id = 'c2222222-2222-4222-8222-222222222222')
   from public.collaboration_experience_conversation_markers
   where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111')),
  'unmark removed the partner marker or was not idempotent'
);

-- The cleanup-only cascade exception does not weaken locked response
-- immutability for direct mutations.
do $$ begin
  begin
    delete from public.collaboration_experience_responses
    where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111');
    raise exception 'locked responses were directly deletable';
  exception when insufficient_privilege then null; end;
  begin
    update public.collaboration_experience_responses
    set choice_keys = choice_keys
    where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111');
    raise exception 'locked responses were directly updateable';
  exception when insufficient_privilege then null; end;
end $$;

-- Linked advisor and unrelated founder cannot read or mutate the marker.
select set_config('request.jwt.claims','{"sub":"c4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm_marker(
  (select count(*) = 0 from public.collaboration_experience_conversation_markers),
  'advisor could read conversation markers'
);
do $$ begin
  begin
    perform public.mark_collaboration_prompt_for_conversation(
      pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),0)
    );
    raise exception 'advisor marked prompt';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Open all reveals, preserve markers through completion, then add founder C.
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),1);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),2);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),3);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),4);
select public.mark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),2)
);
reset role;
select set_config('request.jwt.claims','{"sub":"c2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),1);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),2);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),3);
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),4);
select public.complete_collaboration_experience_round(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'));
reset role;
insert into public.founder_team_members (team_id, user_id, created_at)
values ('cc111111-1111-4111-8111-111111111111','c3333333-3333-4333-8333-333333333333','2026-01-03');

select set_config('request.jwt.claims','{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm_marker(
  (select count(*) = 0 from public.collaboration_experience_conversation_markers),
  'new team member could read historical markers'
);
do $$ begin
  begin
    perform public.mark_collaboration_prompt_for_conversation(
      pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111'),2)
    );
    raise exception 'new team member marked historical prompt';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Removing B revokes B while A retains the completed history and B's marker.
delete from public.founder_team_members
where team_id = 'cc111111-1111-4111-8111-111111111111'
  and user_id = 'c2222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claims','{"sub":"c2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm_marker(
  (select count(*) = 0 from public.collaboration_experience_conversation_markers),
  'former founder retained marker access'
);
reset role;
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm_marker(
  (select count(*) = 2 from public.collaboration_experience_conversation_markers
   where round_id = pg_temp.rmm_marker_round('cc111111-1111-4111-8111-111111111111')),
  'remaining founder lost completed marker history'
);
reset role;

-- Abandoned rounds cannot gain or remove markers.
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('cc222222-2222-4222-8222-222222222222','how_we_work',1);
reset role;
select pg_temp.fill_rmm_marker_answers(pg_temp.rmm_marker_round('cc222222-2222-4222-8222-222222222222'));
select set_config('request.jwt.claims','{"sub":"c2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_marker_round('cc222222-2222-4222-8222-222222222222'));
reset role;
select pg_temp.fill_rmm_marker_answers(pg_temp.rmm_marker_round('cc222222-2222-4222-8222-222222222222'));
select set_config('request.jwt.claims','{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc222222-2222-4222-8222-222222222222'),0);
select public.abandon_collaboration_experience_round(pg_temp.rmm_marker_round('cc222222-2222-4222-8222-222222222222'));
do $$ begin
  begin
    perform public.mark_collaboration_prompt_for_conversation(
      pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc222222-2222-4222-8222-222222222222'),0)
    );
    raise exception 'abandoned round gained marker';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Team deletion cascades through rounds/prompts and leaves no marker rows.
delete from public.relationship_advisors
where relationship_id = 'cd111111-1111-4111-8111-111111111111';
delete from public.relationships
where id = 'cd111111-1111-4111-8111-111111111111';
delete from public.founder_teams where id = 'cc111111-1111-4111-8111-111111111111';
select pg_temp.assert_rmm_marker(
  (select count(*) = 0 from public.collaboration_experience_conversation_markers),
  'team delete left marker rows'
);

-- Account deletion invokes the foundation round cleanup; prompt cascades remove markers.
select set_config('request.jwt.claims','{"sub":"c5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('cc333333-3333-4333-8333-333333333333','easy_start',1);
reset role;
select pg_temp.fill_rmm_marker_answers(pg_temp.rmm_marker_round('cc333333-3333-4333-8333-333333333333'));
select set_config('request.jwt.claims','{"sub":"c6666666-6666-4666-8666-666666666666","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_marker_round('cc333333-3333-4333-8333-333333333333'));
reset role;
select pg_temp.fill_rmm_marker_answers(pg_temp.rmm_marker_round('cc333333-3333-4333-8333-333333333333'));
select set_config('request.jwt.claims','{"sub":"c5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_marker_reveal(pg_temp.rmm_marker_round('cc333333-3333-4333-8333-333333333333'),0);
select public.mark_collaboration_prompt_for_conversation(
  pg_temp.rmm_marker_prompt(pg_temp.rmm_marker_round('cc333333-3333-4333-8333-333333333333'),0)
);
reset role;
delete from auth.users where id = 'c5555555-5555-4555-8555-555555555555';
select pg_temp.assert_rmm_marker(
  not exists (
    select 1 from public.collaboration_experience_rounds
    where founder_team_id = 'cc333333-3333-4333-8333-333333333333'
  ) and not exists (
    select 1 from public.collaboration_experience_conversation_markers
    where participant_user_id = 'c5555555-5555-4555-8555-555555555555'
  ),
  'account delete left a collaboration round or marker row'
);

select extensions.pass('Read My Mind conversation marker lifecycle, authorization, sharing, idempotency, and cleanup hold');
select * from extensions.finish();

rollback;
