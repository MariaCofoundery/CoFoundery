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
    raise exception 'invite reliability assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '61111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'founder@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '62222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'invitee@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '63333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '64444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'other@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

select set_config(
  'request.jwt.claims',
  '{"sub":"61111111-1111-4111-8111-111111111111","email":"founder@example.com","role":"authenticated"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (
    select invitation_id is not null and reused is false
    from public.create_founder_invitation_reliable(
      'Invitee@Example.COM', 'Invitee', 'Founder', 'founder@example.com',
      'pre_founder', 'basis_plus_values', repeat('a', 64), now() + interval '14 days'
    )
  ),
  'atomic founder invitation creation failed'
);

do $$
begin
  begin
    perform public.create_founder_invitation_reliable(
      'invitee@example.com', 'Invitee', 'Founder', 'founder@example.com',
      'pre_founder', 'basis', repeat('b', 64), now() + interval '14 days'
    );
    raise exception 'duplicate founder invitation unexpectedly succeeded';
  exception when unique_violation then
    if sqlerrm <> 'duplicate_open_invitation' then raise; end if;
  end;

  begin
    perform public.create_founder_invitation_reliable(
      'founder@example.com', 'Self', 'Founder', 'founder@example.com',
      'existing_team', 'basis', repeat('c', 64), now() + interval '14 days'
    );
    raise exception 'self invitation unexpectedly succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'self_invitation_not_allowed' then raise; end if;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.invitations
    where inviter_user_id = '61111111-1111-4111-8111-111111111111'
      and invitee_email = 'invitee@example.com'
      and status in ('sent', 'opened')
  ),
  'duplicate request produced more than one open founder invitation'
);

select pg_temp.assert_true(
  (
    select array_agg(module::text order by module::text) = array['base', 'values']
    from public.invitation_modules
    where invitation_id = (
      select id from public.invitations
      where inviter_user_id = '61111111-1111-4111-8111-111111111111'
        and invitee_email = 'invitee@example.com'
      limit 1
    )
  ),
  'founder invitation modules were not committed atomically'
);

insert into public.relationships (id, user_a_id, user_b_id)
values (
  '65555555-5555-4555-8555-555555555555',
  '61111111-1111-4111-8111-111111111111',
  '62222222-2222-4222-8222-222222222222'
);

insert into public.relationship_advisors (
  id, relationship_id, advisor_email, status, founder_a_approved, founder_b_approved,
  invite_token_hash, invited_at, invite_expires_at
)
values
  (
    '66666666-6666-4666-8666-666666666661',
    '65555555-5555-4555-8555-555555555555',
    'advisor@example.com', 'invited', true, true, repeat('d', 64), now(), now() + interval '14 days'
  ),
  (
    '66666666-6666-4666-8666-666666666662',
    '65555555-5555-4555-8555-555555555555',
    'other@example.com', 'invited', true, true, repeat('e', 64), now() - interval '15 days', now() - interval '1 day'
  );

set local role service_role;
update public.relationship_advisors
set advisor_user_id = '63333333-3333-4333-8333-333333333333', status = 'linked', linked_at = now()
where id = '66666666-6666-4666-8666-666666666661';

do $$
begin
  begin
    update public.relationship_advisors
    set advisor_user_id = '64444444-4444-4444-8444-444444444444', status = 'linked', linked_at = now()
    where id = '66666666-6666-4666-8666-666666666662';
    raise exception 'expired advisor invitation unexpectedly claimed';
  exception when insufficient_privilege then
    if sqlerrm <> 'advisor_invitation_expired' then raise; end if;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select advisor_user_id = '63333333-3333-4333-8333-333333333333'
    from public.relationship_advisors
    where id = '66666666-6666-4666-8666-666666666661'
  ),
  'valid advisor invitation was not claimable'
);

-- A claimed advisor remains stable after the original link lifetime; re-inviting an unclaimed
-- row establishes a fresh expiry and makes that new link claimable.
update public.relationship_advisors
set invite_expires_at = now() - interval '1 day'
where id = '66666666-6666-4666-8666-666666666661';

set local role service_role;
update public.relationship_advisors
set advisor_name = 'Advisor Updated'
where id = '66666666-6666-4666-8666-666666666661'
  and advisor_user_id = '63333333-3333-4333-8333-333333333333';
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"61111111-1111-4111-8111-111111111111","email":"founder@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
select public.issue_relationship_advisor_invite(
  '66666666-6666-4666-8666-666666666662',
  repeat('6', 64)
);
reset role;

select pg_temp.assert_true(
  (
    select invite_expires_at > now()
    from public.relationship_advisors
    where id = '66666666-6666-4666-8666-666666666662'
  ),
  'pre-expiry app token rotation did not receive a database expiry'
);

set local role service_role;
update public.relationship_advisors
set advisor_user_id = '64444444-4444-4444-8444-444444444444', status = 'linked', linked_at = now()
where id = '66666666-6666-4666-8666-666666666662';
reset role;

select pg_temp.assert_true(
  (
    select advisor_name = 'Advisor Updated'
    from public.relationship_advisors
    where id = '66666666-6666-4666-8666-666666666661'
  ) and (
    select advisor_user_id = '64444444-4444-4444-8444-444444444444'
    from public.relationship_advisors
    where id = '66666666-6666-4666-8666-666666666662'
  ),
  'claimed advisor stability or re-invite expiry rotation failed'
);

insert into public.advisor_team_invites (
  id, advisor_user_id, founder_a_email, founder_b_email,
  founder_a_token_hash, founder_b_token_hash, status
)
values (
  '67777777-7777-4777-8777-777777777771',
  '63333333-3333-4333-8333-333333333333',
  'founder@example.com', 'invitee@example.com', repeat('f', 64), repeat('1', 64), 'pending'
);

do $$
begin
  begin
    insert into public.advisor_team_invites (
      advisor_user_id, founder_a_email, founder_b_email,
      founder_a_token_hash, founder_b_token_hash, status
    ) values (
      '63333333-3333-4333-8333-333333333333',
      'invitee@example.com', 'founder@example.com', repeat('2', 64), repeat('3', 64), 'pending'
    );
    raise exception 'reversed duplicate advisor-team invite unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

update public.advisor_team_invites
set status = 'revoked'
where id = '67777777-7777-4777-8777-777777777771';

insert into public.advisor_team_invites (
  advisor_user_id, founder_a_email, founder_b_email,
  founder_a_token_hash, founder_b_token_hash, status
)
values (
  '63333333-3333-4333-8333-333333333333',
  'invitee@example.com', 'founder@example.com', repeat('4', 64), repeat('5', 64), 'pending'
);

select extensions.pass('invite and email reliability database contracts hold');
select * from extensions.finish();

rollback;
