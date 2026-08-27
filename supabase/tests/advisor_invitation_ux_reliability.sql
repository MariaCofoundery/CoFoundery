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

select extensions.pass('per-recipient delivery, bounded resend, token rotation, and linked duplicate prevention are database-enforced');
select * from extensions.finish();
rollback;
