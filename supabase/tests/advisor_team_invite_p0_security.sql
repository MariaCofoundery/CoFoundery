\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_advisor_team_invite_p0(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'advisor team invite P0 assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'p0-founder-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'p0-founder-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'p0-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'p0-stranger@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- The normal create path issues two distinct secrets with one 14-day invite expiry.
select set_config('request.jwt.claims', '{"sub":"c3333333-3333-4333-8333-333333333333","email":"p0-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.create_advisor_team_invite(
  'P0 Advisor', 'P0 Team',
  'p0-founder-a@example.com', 'p0-founder-b@example.com',
  repeat('a', 64), repeat('b', 64)
);
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select expires_at > now() + interval '13 days'
      and expires_at <= now() + interval '15 days'
      and founder_a_token_hash = repeat('a', 64)
      and founder_b_token_hash = repeat('b', 64)
   from public.advisor_team_invites
   where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'),
  'new invite did not receive the shared 14-day TTL and separate founder secrets'
);

-- Founder A can claim only the A link; its consumed hash is destroyed.
select set_config('request.jwt.claims', '{"sub":"c1111111-1111-4111-8111-111111111111","email":"p0-founder-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('a', 64));
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select founder_a_user_id = 'c1111111-1111-4111-8111-111111111111'
      and founder_a_claimed_at is not null
      and founder_a_token_hash is null
      and founder_b_user_id is null
      and founder_b_token_hash = repeat('b', 64)
   from public.advisor_team_invites
   where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'),
  'Founder A claim was not isolated or its token was not invalidated'
);

-- A wrong authenticated identity cannot take Founder B's email-bound link.
select set_config('request.jwt.claims', '{"sub":"c4444444-4444-4444-8444-444444444444","email":"p0-stranger@example.com","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.claim_advisor_team_invite_founder(repeat('b', 64));
    raise exception 'wrong account claimed Founder B token';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select founder_b_user_id is null and founder_b_token_hash = repeat('b', 64)
   from public.advisor_team_invites
   where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'),
  'wrong account changed Founder B claim state'
);

select set_config('request.jwt.claims', '{"sub":"c2222222-2222-4222-8222-222222222222","email":"p0-founder-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('b', 64));
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select founder_b_user_id = 'c2222222-2222-4222-8222-222222222222'
      and founder_b_claimed_at is not null
      and founder_a_token_hash is null
      and founder_b_token_hash is null
   from public.advisor_team_invites
   where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'),
  'Founder B normal claim failed or terminal claim secrets survived'
);

update public.advisor_team_invites
set status = 'activated'
where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'
  and founder_a_email = 'p0-founder-a@example.com';

-- Expired tokens fail closed before any identity or relationship state is created.
insert into public.advisor_team_invites (
  id, advisor_user_id, founder_a_email, founder_b_email,
  founder_a_token_hash, founder_b_token_hash, expires_at, status
) values (
  'c5555555-5555-4555-8555-555555555555',
  'c3333333-3333-4333-8333-333333333333',
  'expired-a@example.com', 'expired-b@example.com',
  repeat('c', 64), repeat('d', 64), now() - interval '1 second', 'pending'
);

select set_config('request.jwt.claims', '{"sub":"c1111111-1111-4111-8111-111111111111","email":"expired-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('c', 64));
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select status = 'expired'
      and founder_a_user_id is null and founder_b_user_id is null
      and founder_a_claimed_at is null and founder_b_claimed_at is null
      and founder_a_token_hash is null and founder_b_token_hash is null
      and invitation_id is null and relationship_id is null
   from public.advisor_team_invites where id = 'c5555555-5555-4555-8555-555555555555'),
  'expired Founder A link changed identity/finalization state or retained secrets'
);

select set_config('request.jwt.claims', '{"sub":"c2222222-2222-4222-8222-222222222222","email":"expired-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('d', 64));
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select founder_b_user_id is null and invitation_id is null and relationship_id is null
   from public.advisor_team_invites where id = 'c5555555-5555-4555-8555-555555555555'),
  'expired Founder B link created security-relevant state'
);

-- Revoked and activated invite lifecycles destroy every remaining founder secret.
insert into public.advisor_team_invites (
  id, advisor_user_id, founder_a_email, founder_b_email,
  founder_a_token_hash, founder_b_token_hash, expires_at, status
) values
  ('c6666666-6666-4666-8666-666666666661', 'c3333333-3333-4333-8333-333333333333', 'revoked-a@example.com', 'revoked-b@example.com', repeat('e', 64), repeat('f', 64), now() + interval '1 day', 'pending'),
  ('c6666666-6666-4666-8666-666666666662', 'c3333333-3333-4333-8333-333333333333', 'active-a@example.com', 'active-b@example.com', repeat('1', 64), repeat('2', 64), now() + interval '1 day', 'pending');

update public.advisor_team_invites set status = 'revoked'
where id = 'c6666666-6666-4666-8666-666666666661';
update public.advisor_team_invites set status = 'activated'
where id = 'c6666666-6666-4666-8666-666666666662';

select pg_temp.assert_advisor_team_invite_p0(
  not exists (
    select 1 from public.advisor_team_invites
    where id in ('c6666666-6666-4666-8666-666666666661', 'c6666666-6666-4666-8666-666666666662')
      and (founder_a_token_hash is not null or founder_b_token_hash is not null)
  ),
  'revoked or activated invite retained a claimable founder secret'
);

-- Reproduce the audit bug: A claims, the relationship advisor is revoked, then B uses the old link.
select set_config('request.jwt.claims', '{"sub":"c3333333-3333-4333-8333-333333333333","email":"p0-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.create_advisor_team_invite(
  'P0 Advisor', 'P0 Retry Team',
  'p0-founder-a@example.com', 'p0-founder-b@example.com',
  repeat('4', 64), repeat('5', 64)
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c1111111-1111-4111-8111-111111111111","email":"p0-founder-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('4', 64));
reset role;

insert into public.relationships (id, user_a_id, user_b_id)
values (
  'c7777777-7777-4777-8777-777777777777',
  'c1111111-1111-4111-8111-111111111111',
  'c2222222-2222-4222-8222-222222222222'
);

insert into public.invitations (
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash,
  expires_at, accepted_at, team_context
) values (
  'c8888888-8888-4888-8888-888888888888',
  'c1111111-1111-4111-8111-111111111111',
  'p0-founder-b@example.com',
  'c2222222-2222-4222-8222-222222222222',
  'accepted', repeat('3', 64), now() + interval '1 day', now(), 'pre_founder'
);

insert into public.relationship_advisors (
  relationship_id, advisor_user_id, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at, revoked_at,
  source_invitation_id
) values (
  'c7777777-7777-4777-8777-777777777777',
  'c3333333-3333-4333-8333-333333333333',
  'p0-advisor@example.com', 'revoked', true, true, now(), now(), now(),
  'c8888888-8888-4888-8888-888888888888'
);

update public.advisor_team_invites
set invitation_id = 'c8888888-8888-4888-8888-888888888888',
    relationship_id = 'c7777777-7777-4777-8777-777777777777'
where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'
  and founder_a_email = 'p0-founder-a@example.com'
  and status = 'pending';

select set_config('request.jwt.claims', '{"sub":"c2222222-2222-4222-8222-222222222222","email":"p0-founder-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('5', 64));
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select status = 'revoked'
      and founder_a_user_id = 'c1111111-1111-4111-8111-111111111111'
      and founder_b_user_id is null
      and founder_a_token_hash is null and founder_b_token_hash is null
   from public.advisor_team_invites
   where advisor_user_id = 'c3333333-3333-4333-8333-333333333333'
     and team_name = 'P0 Retry Team'),
  'Founder B old link remained claimable after the Relationship Advisor revoke'
);

set local role service_role;
do $$
begin
  begin
    update public.relationship_advisors
    set status = 'linked', revoked_at = null, linked_at = now()
    where relationship_id = 'c7777777-7777-4777-8777-777777777777'
      and advisor_user_id = 'c3333333-3333-4333-8333-333333333333';
    raise exception 'retry reactivated a revoked relationship advisor';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.relationship_advisors (
      relationship_id, advisor_user_id, advisor_email, status,
      founder_a_approved, founder_b_approved, approved_at, linked_at,
      source_invitation_id
    ) values (
      'c7777777-7777-4777-8777-777777777777',
      'c3333333-3333-4333-8333-333333333333',
      'p0-advisor@example.com', 'linked', true, true, now(), now(),
      'c8888888-8888-4888-8888-888888888888'
    );
    raise exception 'retry inserted a replacement linked advisor after revoke';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select pg_temp.assert_advisor_team_invite_p0(
  (select status = 'revoked' and revoked_at is not null
   from public.relationship_advisors
   where relationship_id = 'c7777777-7777-4777-8777-777777777777'
     and advisor_user_id = 'c3333333-3333-4333-8333-333333333333'),
  'team-invite retry/repair erased the explicit Founder revoke'
);

select extensions.pass('advisor-team invite TTL, token invalidation, and terminal revoke are database-enforced');
select * from extensions.finish();

rollback;
