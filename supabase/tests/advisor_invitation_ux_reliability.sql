\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_advisor_invite_reliability(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'advisor invite reliability assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'ux-founder-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'ux-founder-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'ux-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

select set_config('request.jwt.claims', '{"sub":"d3333333-3333-4333-8333-333333333333","email":"ux-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.create_advisor_team_invite(
  'UX Advisor', 'UX Pair', 'ux-founder-a@example.com', 'ux-founder-b@example.com',
  repeat('a', 64), repeat('b', 64)
);
select public.record_advisor_team_invite_delivery(
  (select id from public.advisor_team_invites where team_name = 'UX Pair'),
  'founder_a', 'sent', null
);
select public.record_advisor_team_invite_delivery(
  (select id from public.advisor_team_invites where team_name = 'UX Pair'),
  'founder_b', 'failed', 'delivery_failed'
);
reset role;

select pg_temp.assert_advisor_invite_reliability(
  (select founder_a_send_status = 'sent'
      and founder_a_last_sent_at is not null
      and founder_a_send_error_code is null
      and founder_b_send_status = 'failed'
      and founder_b_last_sent_at is null
      and founder_b_send_error_code = 'delivery_failed'
   from public.advisor_team_invites where team_name = 'UX Pair'),
  'per-recipient sent/failed state was not persisted independently'
);

create temporary table expiry_before(value timestamptz);
insert into expiry_before select expires_at from public.advisor_team_invites where team_name = 'UX Pair';

select set_config('request.jwt.claims', '{"sub":"d3333333-3333-4333-8333-333333333333","email":"ux-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.rotate_advisor_team_invite_founder_token(
  (select id from public.advisor_team_invites where team_name = 'UX Pair'),
  'founder_b', repeat('c', 64)
);
reset role;

select pg_temp.assert_advisor_invite_reliability(
  (select founder_b_token_hash = repeat('c', 64)
      and founder_b_token_hash <> repeat('b', 64)
      and founder_b_send_status = 'not_sent'
      and expires_at = (select value from expiry_before)
   from public.advisor_team_invites where team_name = 'UX Pair'),
  'slot resend did not rotate only the token while preserving the original expiry'
);

select set_config('request.jwt.claims', '{"sub":"d2222222-2222-4222-8222-222222222222","email":"ux-founder-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select public.claim_advisor_team_invite_founder(repeat('c', 64));
reset role;

select pg_temp.assert_advisor_invite_reliability(
  (select founder_b_user_id = 'd2222222-2222-4222-8222-222222222222'
      and founder_b_token_hash is null
   from public.advisor_team_invites where team_name = 'UX Pair'),
  'rotated token could not be claimed or was not invalidated'
);

select set_config('request.jwt.claims', '{"sub":"d3333333-3333-4333-8333-333333333333","email":"ux-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.rotate_advisor_team_invite_founder_token(
      (select id from public.advisor_team_invites where team_name = 'UX Pair'),
      'founder_b', repeat('d', 64)
    );
    raise exception 'claimed slot was resendable';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- The database rejects a new invite for an already linked advisor and the same unordered pair.
update public.advisor_team_invites set status = 'revoked' where team_name = 'UX Pair';
insert into public.relationships (id, user_a_id, user_b_id)
values ('d4444444-4444-4444-8444-444444444444', 'd1111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222222');
insert into public.relationship_advisors (
  relationship_id, advisor_user_id, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'd4444444-4444-4444-8444-444444444444', 'd3333333-3333-4333-8333-333333333333',
  'ux-advisor@example.com', 'linked', true, true, now(), now()
);

select set_config('request.jwt.claims', '{"sub":"d3333333-3333-4333-8333-333333333333","email":"ux-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    perform public.create_advisor_team_invite_reliable(
      'UX Advisor', 'Duplicate', 'ux-founder-b@example.com', 'ux-founder-a@example.com',
      repeat('e', 64), repeat('f', 64)
    );
    raise exception 'linked duplicate was created';
  exception when unique_violation then null;
  end;
end;
$$;
reset role;

-- Model delivery metadata as it existed immediately before migration 20260828120000:
-- historical claims exist, while per-recipient delivery fields still carry defaults.
insert into public.advisor_team_invites (
  id, advisor_user_id, founder_a_email, founder_b_email,
  founder_a_user_id, founder_b_user_id,
  founder_a_claimed_at, founder_b_claimed_at,
  founder_a_token_hash, founder_b_token_hash, expires_at, status
) values
  ('d7111111-1111-4111-8111-111111111111', 'd3333333-3333-4333-8333-333333333333',
   'history-expired-a@example.com', 'history-expired-b@example.com',
   'd1111111-1111-4111-8111-111111111111', null, now() - interval '20 days', null,
   null, null, now() - interval '6 days', 'expired'),
  ('d7222222-2222-4222-8222-222222222222', 'd3333333-3333-4333-8333-333333333333',
   'history-revoked-a@example.com', 'history-revoked-b@example.com',
   null, 'd2222222-2222-4222-8222-222222222222', null, now() - interval '20 days',
   null, null, now() - interval '6 days', 'revoked'),
  ('d7333333-3333-4333-8333-333333333333', 'd3333333-3333-4333-8333-333333333333',
   'history-activated-a@example.com', 'history-activated-b@example.com',
   'd1111111-1111-4111-8111-111111111111', null, now() - interval '20 days', null,
   null, null, now() - interval '6 days', 'activated'),
  ('d7444444-4444-4444-8444-444444444444', 'd3333333-3333-4333-8333-333333333333',
   'history-open-a@example.com', 'history-open-b@example.com',
   'd1111111-1111-4111-8111-111111111111', null, now() - interval '1 hour', null,
   null, repeat('7', 64), now() + interval '7 days', 'activating'),
  ('d7555555-5555-4555-8555-555555555555', 'd3333333-3333-4333-8333-333333333333',
   'history-open-c@example.com', 'history-open-d@example.com',
   null, 'd2222222-2222-4222-8222-222222222222', null, now() - interval '2 hours',
   repeat('8', 64), null, now() + interval '7 days', 'activating');

create temporary table history_terminal_before on commit drop as
select id, status, expires_at, founder_a_user_id, founder_b_user_id,
       founder_a_claimed_at, founder_b_claimed_at,
       founder_a_token_hash, founder_b_token_hash,
       invitation_id, relationship_id, founder_a_send_status,
       founder_b_send_status, founder_a_last_sent_at, founder_b_last_sent_at
from public.advisor_team_invites
where id in (
  'd7111111-1111-4111-8111-111111111111',
  'd7222222-2222-4222-8222-222222222222',
  'd7333333-3333-4333-8333-333333333333'
);

update public.advisor_team_invites
set founder_a_send_status = 'sent',
    founder_a_last_sent_at = coalesce(founder_a_last_sent_at, founder_a_claimed_at)
where founder_a_claimed_at is not null
  and status in ('pending', 'activating')
  and expires_at > pg_catalog.now()
  and (founder_a_send_status is distinct from 'sent' or founder_a_last_sent_at is null);

update public.advisor_team_invites
set founder_b_send_status = 'sent',
    founder_b_last_sent_at = coalesce(founder_b_last_sent_at, founder_b_claimed_at)
where founder_b_claimed_at is not null
  and status in ('pending', 'activating')
  and expires_at > pg_catalog.now()
  and (founder_b_send_status is distinct from 'sent' or founder_b_last_sent_at is null);

select pg_temp.assert_advisor_invite_reliability(
  not exists (
    select 1
    from public.advisor_team_invites invite
    join history_terminal_before before_row using (id)
    where (invite.status, invite.expires_at, invite.founder_a_user_id,
           invite.founder_b_user_id, invite.founder_a_claimed_at,
           invite.founder_b_claimed_at, invite.founder_a_token_hash,
           invite.founder_b_token_hash, invite.invitation_id,
           invite.relationship_id, invite.founder_a_send_status,
           invite.founder_b_send_status, invite.founder_a_last_sent_at,
           invite.founder_b_last_sent_at)
      is distinct from
          (before_row.status, before_row.expires_at, before_row.founder_a_user_id,
           before_row.founder_b_user_id, before_row.founder_a_claimed_at,
           before_row.founder_b_claimed_at, before_row.founder_a_token_hash,
           before_row.founder_b_token_hash, before_row.invitation_id,
           before_row.relationship_id, before_row.founder_a_send_status,
           before_row.founder_b_send_status, before_row.founder_a_last_sent_at,
           before_row.founder_b_last_sent_at)
  ),
  'expired, revoked, or activated history changed during delivery backfill'
);

select pg_temp.assert_advisor_invite_reliability(
  (select founder_a_send_status = 'sent'
      and founder_a_last_sent_at = founder_a_claimed_at
      and status = 'activating'
      and expires_at > pg_catalog.now()
      and founder_a_token_hash is null
      and founder_b_token_hash = repeat('7', 64)
      and invitation_id is null and relationship_id is null
   from public.advisor_team_invites where id = 'd7444444-4444-4444-8444-444444444444')
  and
  (select founder_b_send_status = 'sent'
      and founder_b_last_sent_at = founder_b_claimed_at
      and status = 'activating'
      and expires_at > pg_catalog.now()
      and founder_a_token_hash = repeat('8', 64)
      and founder_b_token_hash is null
      and invitation_id is null and relationship_id is null
   from public.advisor_team_invites where id = 'd7555555-5555-4555-8555-555555555555'),
  'open historical claims did not receive delivery metadata without lifecycle changes'
);

create temporary table history_open_after_first_backfill on commit drop as
select id, founder_a_send_status, founder_b_send_status,
       founder_a_last_sent_at, founder_b_last_sent_at, expires_at,
       founder_a_token_hash, founder_b_token_hash, status
from public.advisor_team_invites
where id in (
  'd7444444-4444-4444-8444-444444444444',
  'd7555555-5555-4555-8555-555555555555'
);

-- A logically equivalent rerun must be a no-op.
update public.advisor_team_invites
set founder_a_send_status = 'sent',
    founder_a_last_sent_at = coalesce(founder_a_last_sent_at, founder_a_claimed_at)
where founder_a_claimed_at is not null
  and status in ('pending', 'activating')
  and expires_at > pg_catalog.now()
  and (founder_a_send_status is distinct from 'sent' or founder_a_last_sent_at is null);

update public.advisor_team_invites
set founder_b_send_status = 'sent',
    founder_b_last_sent_at = coalesce(founder_b_last_sent_at, founder_b_claimed_at)
where founder_b_claimed_at is not null
  and status in ('pending', 'activating')
  and expires_at > pg_catalog.now()
  and (founder_b_send_status is distinct from 'sent' or founder_b_last_sent_at is null);

select pg_temp.assert_advisor_invite_reliability(
  not exists (
    select 1
    from public.advisor_team_invites invite
    join history_open_after_first_backfill before_row using (id)
    where (invite.founder_a_send_status, invite.founder_b_send_status,
           invite.founder_a_last_sent_at, invite.founder_b_last_sent_at,
           invite.expires_at, invite.founder_a_token_hash,
           invite.founder_b_token_hash, invite.status)
      is distinct from
          (before_row.founder_a_send_status, before_row.founder_b_send_status,
           before_row.founder_a_last_sent_at, before_row.founder_b_last_sent_at,
           before_row.expires_at, before_row.founder_a_token_hash,
           before_row.founder_b_token_hash, before_row.status)
  ),
  'delivery backfill rerun changed already backfilled invite state'
);

select extensions.pass('per-recipient delivery, bounded resend, token rotation, and linked duplicate prevention are database-enforced');
select * from extensions.finish();
rollback;
