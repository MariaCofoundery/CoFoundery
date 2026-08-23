\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'founder team assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '81111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'team-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '82222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'team-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '83333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'team-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '84444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'team-d@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '85555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'invite-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '86666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'invite-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '87777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'discovery-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'discovery-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.relationships (id, user_a_id, user_b_id)
values
  ('8a111111-1111-4111-8111-111111111111', '81111111-1111-4111-8111-111111111111', '82222222-2222-4222-8222-222222222222'),
  ('8a222222-2222-4222-8222-222222222222', '81111111-1111-4111-8111-111111111111', '83333333-3333-4333-8333-333333333333'),
  ('8a333333-3333-4333-8333-333333333333', '81111111-1111-4111-8111-111111111111', '84444444-4444-4444-8444-444444444444');

set local role service_role;
do $$
declare
  v_team_id uuid;
  v_replayed_team_id uuid;
begin
  v_team_id := public.ensure_founder_team_for_relationship(
    '8a111111-1111-4111-8111-111111111111',
    'existing_team',
    null
  );
  v_replayed_team_id := public.ensure_founder_team_for_relationship(
    '8a111111-1111-4111-8111-111111111111',
    'existing_team',
    null
  );

  if v_replayed_team_id is distinct from v_team_id then
    raise exception 'relationship ensure replay created another team';
  end if;

  perform public.ensure_founder_team_for_relationship(
    '8a222222-2222-4222-8222-222222222222',
    'existing_team',
    v_team_id
  );

  begin
    perform public.ensure_founder_team_for_relationship(
      '8a333333-3333-4333-8333-333333333333',
      'existing_team',
      v_team_id
    );
    raise exception 'fourth founder unexpectedly joined team';
  exception when check_violation then
    if sqlerrm <> 'founder_team_member_limit_reached' then raise; end if;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select count(*) = 3
    from public.founder_team_members member
    where member.team_id = (
      select founder_team_id from public.relationships
      where id = '8a111111-1111-4111-8111-111111111111'
    )
  ),
  'two-to-three-founder team membership was not persisted exactly once'
);

select pg_temp.assert_true(
  (
    select founder_team_id is not null
      and founder_team_id = (
        select founder_team_id from public.relationships
        where id = '8a111111-1111-4111-8111-111111111111'
      )
    from public.relationships
    where id = '8a222222-2222-4222-8222-222222222222'
  ) and (
    select founder_team_id is null
    from public.relationships
    where id = '8a333333-3333-4333-8333-333333333333'
  ),
  'relationship team assignment or member-limit rollback is inconsistent'
);

-- Members can read their team and its memberships; an unrelated founder can read neither.
select set_config(
  'request.jwt.claims',
  '{"sub":"82222222-2222-4222-8222-222222222222","email":"team-b@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.founder_teams), 'team member cannot read team');
select pg_temp.assert_true((select count(*) = 3 from public.founder_team_members), 'team member cannot read memberships');
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"84444444-4444-4444-8444-444444444444","email":"team-d@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.founder_teams), 'nonmember can read team');
select pg_temp.assert_true((select count(*) = 0 from public.founder_team_members), 'nonmember can read memberships');
do $$
declare
  v_updated integer;
begin
  update public.relationships
  set founder_team_id = (
    select founder_team_id
    from public.relationships
    where id = '8a111111-1111-4111-8111-111111111111'
  )
  where id = '8a333333-3333-4333-8333-333333333333';
  get diagnostics v_updated = row_count;
  if v_updated <> 0 then
    raise exception 'nonmember changed relationship team assignment';
  end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.ensure_founder_team_for_relationship(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated client can execute privileged team ensure function'
);

-- Even a privileged accidental write cannot move an assigned pair or attach a pair whose users
-- are not team members. Authenticated clients additionally have no membership mutation policy.
insert into public.founder_teams (id, team_context)
values ('8a444444-4444-4444-8444-444444444444', 'existing_team');
insert into public.founder_team_members (team_id, user_id)
values
  ('8a444444-4444-4444-8444-444444444444', '81111111-1111-4111-8111-111111111111'),
  ('8a444444-4444-4444-8444-444444444444', '82222222-2222-4222-8222-222222222222');

set local role service_role;
do $$
begin
  begin
    update public.relationships
    set founder_team_id = '8a444444-4444-4444-8444-444444444444'
    where id = '8a111111-1111-4111-8111-111111111111';
    raise exception 'assigned relationship unexpectedly moved teams';
  exception when insufficient_privilege then
    if sqlerrm <> 'relationship_founder_team_is_immutable' then raise; end if;
  end;

  begin
    update public.relationships
    set founder_team_id = '8a444444-4444-4444-8444-444444444444'
    where id = '8a333333-3333-4333-8333-333333333333';
    raise exception 'relationship with a nonmember unexpectedly joined team';
  exception when check_violation then
    if sqlerrm <> 'relationship_founders_must_be_team_members' then raise; end if;
  end;
end;
$$;
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"84444444-4444-4444-8444-444444444444","email":"team-d@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    insert into public.founder_team_members (team_id, user_id)
    values ('8a444444-4444-4444-8444-444444444444', '84444444-4444-4444-8444-444444444444');
    raise exception 'authenticated founder unexpectedly added self to foreign team';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- A current founder invitation creates its team in the acceptance transaction. Replay remains
-- idempotent because the pair relationship already carries the immutable team assignment.
insert into public.invitations (
  id, inviter_user_id, invitee_email, status, token_hash, expires_at, team_context
)
values (
  '8b111111-1111-4111-8111-111111111111',
  '85555555-5555-4555-8555-555555555555',
  'invite-b@example.com',
  'sent',
  encode(extensions.digest('founder-team-invite-token', 'sha256'), 'hex'),
  now() + interval '1 day',
  'existing_team'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"86666666-6666-4666-8666-666666666666","email":"Invite-B@Example.COM","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
declare
  v_first_relationship_id uuid;
  v_replay_relationship_id uuid;
begin
  select relationship_id into v_first_relationship_id
  from public.accept_invitation('founder-team-invite-token');

  select relationship_id into v_replay_relationship_id
  from public.accept_invitation('founder-team-invite-token');

  if v_replay_relationship_id is distinct from v_first_relationship_id then
    raise exception 'invite acceptance replay returned another relationship';
  end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.relationships relationship
    join public.founder_teams team on team.id = relationship.founder_team_id
    where relationship.user_low = least(
      '85555555-5555-4555-8555-555555555555'::uuid,
      '86666666-6666-4666-8666-666666666666'::uuid
    )
      and relationship.user_high = greatest(
        '85555555-5555-4555-8555-555555555555'::uuid,
        '86666666-6666-4666-8666-666666666666'::uuid
      )
      and team.team_context = 'existing_team'
  ) and (
    select count(*) = 2
    from public.founder_team_members member
    where member.team_id = (
      select relationship.founder_team_id
      from public.relationships relationship
      where relationship.user_low = least(
        '85555555-5555-4555-8555-555555555555'::uuid,
        '86666666-6666-4666-8666-666666666666'::uuid
      )
        and relationship.user_high = greatest(
          '85555555-5555-4555-8555-555555555555'::uuid,
          '86666666-6666-4666-8666-666666666666'::uuid
        )
    )
  ),
  'founder invitation acceptance did not create exactly one two-member team'
);

-- The conscious Discovery workspace transition creates a pre-founder team. Calling the existing
-- RPC again returns the same workspace, relationship and team.
insert into public.matching_sessions (
  id, source_type, status, created_by_user_id, report_ready_at
)
values (
  '8c111111-1111-4111-8111-111111111111',
  'manual',
  'report_ready',
  '87777777-7777-4777-8777-777777777777',
  now()
);

insert into public.matching_session_participants (
  matching_session_id, user_id, role, status, confirmed_at
)
values
  ('8c111111-1111-4111-8111-111111111111', '87777777-7777-4777-8777-777777777777', 'founder', 'active', now()),
  ('8c111111-1111-4111-8111-111111111111', '88888888-8888-4888-8888-888888888888', 'founder', 'active', now());

insert into public.matching_report_runs (
  id, matching_session_id, modules, input_assessment_ids, payload, created_by_user_id
)
values (
  '8c222222-2222-4222-8222-222222222222',
  '8c111111-1111-4111-8111-111111111111',
  array['base']::public.assessment_module[],
  array['8c333333-3333-4333-8333-333333333333'::uuid],
  '{"reportType":"founder_alignment_v1"}'::jsonb,
  '87777777-7777-4777-8777-777777777777'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"87777777-7777-4777-8777-777777777777","email":"discovery-a@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
declare
  v_first_workspace_id uuid;
  v_first_relationship_id uuid;
  v_replay_workspace_id uuid;
  v_replay_relationship_id uuid;
begin
  select matching_workspace_id, relationship_id
    into v_first_workspace_id, v_first_relationship_id
  from public.start_workspace_from_matching_session('8c111111-1111-4111-8111-111111111111');

  select matching_workspace_id, relationship_id
    into v_replay_workspace_id, v_replay_relationship_id
  from public.start_workspace_from_matching_session('8c111111-1111-4111-8111-111111111111');

  if v_replay_workspace_id is distinct from v_first_workspace_id
     or v_replay_relationship_id is distinct from v_first_relationship_id then
    raise exception 'discovery workspace replay created another context';
  end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.matching_workspaces workspace
    join public.relationships relationship on relationship.id = workspace.relationship_id
    join public.founder_teams team on team.id = relationship.founder_team_id
    where workspace.matching_session_id = '8c111111-1111-4111-8111-111111111111'
      and team.team_context = 'pre_founder'
  ),
  'discovery workspace did not create exactly one pre-founder team'
);

select extensions.pass('founder team foundation database contracts hold');
select * from extensions.finish();

rollback;
