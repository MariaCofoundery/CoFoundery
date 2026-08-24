\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_advisor_security(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'relationship advisor security assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'b1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'security-founder-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'security-founder-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'security-stranger@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'security-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.relationships (id, user_a_id, user_b_id)
values (
  'b5111111-1111-4111-8111-111111111111',
  'b1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222'
);

insert into public.invitations (
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash,
  expires_at, accepted_at, team_context
) values (
  'b6111111-1111-4111-8111-111111111111',
  'b1111111-1111-4111-8111-111111111111',
  'security-founder-b@example.com',
  'b2222222-2222-4222-8222-222222222222',
  'accepted',
  repeat('a', 64),
  now() + interval '1 day',
  now(),
  'pre_founder'
);

-- Founder A can propose and thereby approve only Founder A's consent slot.
select set_config('request.jwt.claims', '{"sub":"b1111111-1111-4111-8111-111111111111","email":"security-founder-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.propose_relationship_advisor(
  'b5111111-1111-4111-8111-111111111111',
  'b6111111-1111-4111-8111-111111111111',
  'Security Advisor',
  'security-advisor@example.com'
);
select pg_temp.assert_advisor_security(
  (select founder_a_approved and not founder_b_approved and status = 'pending'
   from public.relationship_advisors
   where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  'Founder A proposal did not remain a one-founder consent'
);

do $$
begin
  begin
    update public.relationship_advisors
    set founder_b_approved = true,
        status = 'linked',
        advisor_email = 'attacker@example.com',
        invite_token_hash = repeat('f', 64)
    where relationship_id = 'b5111111-1111-4111-8111-111111111111';
    raise exception 'Founder A directly changed protected advisor fields';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select pg_temp.assert_advisor_security(
  (select founder_a_approved and not founder_b_approved
      and status = 'pending'
      and advisor_email = 'security-advisor@example.com'
      and invite_token_hash is null
   from public.relationship_advisors
   where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  'direct Founder A mutation changed protected fields'
);

-- Founder B can approve only through the narrow RPC; both approvals finalize the proposal.
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","email":"security-founder-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.approve_relationship_advisor(
  (select id from public.relationship_advisors where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  'b5111111-1111-4111-8111-111111111111'
);
select pg_temp.assert_advisor_security(
  (select founder_a_approved and founder_b_approved and status = 'approved' and approved_at is not null
   from public.relationship_advisors
   where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  'Founder B approval did not complete the two-founder consent'
);
reset role;

-- Advisor and unrelated users cannot approve, mutate, issue links, or revoke.
select set_config('request.jwt.claims', '{"sub":"b4444444-4444-4444-8444-444444444444","email":"security-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.approve_relationship_advisor(
      (select id from public.relationship_advisors where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
      'b5111111-1111-4111-8111-111111111111'
    );
    raise exception 'advisor approved founder consent';
  exception when insufficient_privilege then null; end;
  begin
    update public.relationship_advisors set status = 'linked'
    where relationship_id = 'b5111111-1111-4111-8111-111111111111';
    raise exception 'advisor directly changed status';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"b3333333-3333-4333-8333-333333333333","email":"security-stranger@example.com","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.revoke_relationship_advisor(
      (select id from public.relationship_advisors where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
      'b5111111-1111-4111-8111-111111111111'
    );
    raise exception 'stranger revoked advisor access';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Invite lifecycle data is set through a narrow founder RPC, then a service-role claim remains compatible.
select set_config('request.jwt.claims', '{"sub":"b1111111-1111-4111-8111-111111111111","email":"security-founder-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.issue_relationship_advisor_invite(
  (select id from public.relationship_advisors where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  repeat('c', 64)
);
reset role;

set local role service_role;
update public.relationship_advisors
set advisor_user_id = 'b4444444-4444-4444-8444-444444444444',
    status = 'linked',
    linked_at = now()
where relationship_id = 'b5111111-1111-4111-8111-111111111111';
reset role;

-- Either current founder can revoke; the operation is fail-closed and destroys live invite secrets.
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","email":"security-founder-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.revoke_relationship_advisor(
  (select id from public.relationship_advisors where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  'b5111111-1111-4111-8111-111111111111'
);
reset role;

select pg_temp.assert_advisor_security(
  (select status = 'revoked' and revoked_at is not null
      and invite_token_hash is null and invite_expires_at is null
   from public.relationship_advisors
   where relationship_id = 'b5111111-1111-4111-8111-111111111111'),
  'Founder B revoke did not fail closed'
);

select set_config('request.jwt.claims', '{"sub":"b4444444-4444-4444-8444-444444444444","email":"security-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    update public.relationship_advisors
    set status = 'linked', revoked_at = null
    where relationship_id = 'b5111111-1111-4111-8111-111111111111';
    raise exception 'advisor reactivated revoked access';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Advisor-owned two-founder invites expose only create/revoke contracts, never generic writes.
select set_config('request.jwt.claims', '{"sub":"b4444444-4444-4444-8444-444444444444","email":"security-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.create_advisor_team_invite(
  'Security Advisor', 'Security Team',
  'new-founder-a@example.com', 'new-founder-b@example.com',
  repeat('d', 64), repeat('e', 64)
);
select pg_temp.assert_advisor_security(
  (select status = 'pending'
      and founder_a_user_id is null and founder_b_user_id is null
      and founder_a_claimed_at is null and founder_b_claimed_at is null
      and relationship_id is null and invitation_id is null
      and advisor_user_id = 'b4444444-4444-4444-8444-444444444444'
   from public.advisor_team_invites
   where founder_a_email = 'new-founder-a@example.com'),
  'advisor team invite RPC accepted server-managed state'
);
do $$ begin
  begin
    update public.advisor_team_invites
    set founder_a_user_id = 'b1111111-1111-4111-8111-111111111111',
        founder_a_claimed_at = now(),
        relationship_id = 'b5111111-1111-4111-8111-111111111111',
        status = 'activated'
    where founder_a_email = 'new-founder-a@example.com';
    raise exception 'advisor directly finalized team invite';
  exception when insufficient_privilege then null; end;
end $$;
select public.revoke_pending_advisor_team_invite(
  (select id from public.advisor_team_invites where founder_a_email = 'new-founder-a@example.com')
);
select pg_temp.assert_advisor_security(
  (select status = 'revoked' and founder_a_user_id is null and relationship_id is null
   from public.advisor_team_invites where founder_a_email = 'new-founder-a@example.com'),
  'narrow pending team invite revoke changed server-managed fields'
);
reset role;

select pg_temp.assert_advisor_security(
  not has_table_privilege('authenticated', 'public.relationship_advisors', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.advisor_team_invites', 'INSERT,UPDATE,DELETE'),
  'authenticated retained generic advisor table write privileges'
);

select extensions.pass('relationship advisor consent, revoke, and advisor-team invites are database-enforced');
select * from extensions.finish();

rollback;
