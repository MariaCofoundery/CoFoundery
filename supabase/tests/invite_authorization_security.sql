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
    raise exception 'security integration assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'inviter@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'invitee@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'stranger@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'other-founder@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.invitations (
  id,
  inviter_user_id,
  invitee_email,
  status,
  token_hash,
  expires_at,
  team_context
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'invitee@example.com',
    'sent',
    encode(extensions.digest('valid-founder-token', 'sha256'), 'hex'),
    now() + interval '1 day',
    'pre_founder'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'invitee@example.com',
    'sent',
    encode(extensions.digest('expired-founder-token', 'sha256'), 'hex'),
    now() - interval '1 day',
    'existing_team'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'invitee@example.com',
    'revoked',
    encode(extensions.digest('revoked-founder-token', 'sha256'), 'hex'),
    now() + interval '1 day',
    'pre_founder'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '11111111-1111-4111-8111-111111111111',
    'invitee@example.com',
    'sent',
    encode(extensions.digest('rls-founder-token', 'sha256'), 'hex'),
    now() + interval '1 day',
    null
  );

update public.invitations
set revoked_at = now()
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

-- A wrong account cannot accept an open invitation.
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","email":"stranger@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_invitation('valid-founder-token');
    raise exception 'wrong account unexpectedly accepted invitation';
  exception
    when sqlstate '42501' then
      if sqlerrm <> 'invitation_email_mismatch' then
        raise;
      end if;
  end;
end;
$$;
reset role;

-- The invited account succeeds with a case-normalized email and same-user replay is idempotent.
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"Invitee@Example.COM","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
declare
  first_relationship_id uuid;
  replay_relationship_id uuid;
begin
  select relationship_id into first_relationship_id
  from public.accept_invitation('valid-founder-token');

  select relationship_id into replay_relationship_id
  from public.accept_invitation('valid-founder-token');

  if first_relationship_id is null or replay_relationship_id is distinct from first_relationship_id then
    raise exception 'same-user replay did not return the same relationship';
  end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select status = 'accepted'
      and invitee_user_id = '22222222-2222-4222-8222-222222222222'
      and accepted_at is not null
    from public.invitations
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  'accepted invitation ownership was not persisted'
);
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.relationships
    where user_low = least(
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid
    )
      and user_high = greatest(
        '11111111-1111-4111-8111-111111111111'::uuid,
        '22222222-2222-4222-8222-222222222222'::uuid
      )
  ),
  'same-user replay created a duplicate relationship'
);

-- Even with a forged matching email claim, another user cannot take over an accepted invite.
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","email":"invitee@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_invitation('valid-founder-token');
    raise exception 'other-user replay unexpectedly succeeded';
  exception
    when sqlstate '42501' then
      if sqlerrm <> 'invitation_already_accepted' then
        raise;
      end if;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select invitee_user_id = '22222222-2222-4222-8222-222222222222'
    from public.invitations
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  'other-user replay changed invitation ownership'
);

-- Expired and revoked invitations remain unusable.
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"invitee@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    perform public.accept_invitation('expired-founder-token');
    raise exception 'expired invitation unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'expired' then
      raise;
    end if;
  end;

  begin
    perform public.accept_invitation('revoked-founder-token');
    raise exception 'revoked invitation unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'revoked' then
      raise;
    end if;
  end;
end;
$$;
reset role;

-- Inviter RLS plus the field-level trigger blocks direct identity/acceptance mutation.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"inviter@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    update public.invitations
    set invitee_user_id = '33333333-3333-4333-8333-333333333333'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    raise exception 'inviter changed invitee_user_id directly';
  exception when sqlstate '42501' then null;
  end;

  begin
    update public.invitations
    set invitee_email = 'stranger@example.com'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    raise exception 'inviter changed invitee_email directly';
  exception when sqlstate '42501' then null;
  end;

  begin
    update public.invitations
    set accepted_at = now()
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    raise exception 'inviter changed accepted_at directly';
  exception when sqlstate '42501' then null;
  end;

  begin
    update public.invitations
    set status = 'accepted'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    raise exception 'inviter changed acceptance status directly';
  exception when sqlstate '42501' then null;
  end;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invitations'
      and column_name = 'relationship_id'
  ) then
    begin
      execute $update$
        update public.invitations
        set relationship_id = '99999999-9999-4999-8999-999999999999'
        where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
      $update$;
      raise exception 'inviter changed legacy relationship_id directly';
    exception when sqlstate '42501' then null;
    end;
  end if;

  update public.invitations
  set token_hash = encode(extensions.digest('rotated-founder-token', 'sha256'), 'hex')
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

  update public.invitations
  set status = 'revoked', revoked_at = now()
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select status = 'revoked'
      and revoked_at is not null
      and token_hash = encode(extensions.digest('rotated-founder-token', 'sha256'), 'hex')
    from public.invitations
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
  ),
  'legitimate token rotation or revocation was blocked'
);

-- Production databases originating from older schema states may still expose this legacy field.
-- Add it only inside this rolled-back test transaction to verify the schema-tolerant trigger guard.
alter table public.invitations
add column relationship_id uuid references public.relationships(id) on delete set null;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"inviter@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    update public.invitations
    set relationship_id = (
      select r.id
      from public.relationships r
      where r.user_low = least(
        '11111111-1111-4111-8111-111111111111'::uuid,
        '22222222-2222-4222-8222-222222222222'::uuid
      )
        and r.user_high = greatest(
          '11111111-1111-4111-8111-111111111111'::uuid,
          '22222222-2222-4222-8222-222222222222'::uuid
        )
    )
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    raise exception 'inviter changed legacy relationship_id directly';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

-- The old advisor table has no email binding: new claims are blocked, while metadata remains editable.
insert into public.founder_alignment_workbook_advisors (
  invitation_id,
  advisor_name,
  token_hash,
  founder_a_approved,
  founder_b_approved,
  requested_by,
  approved_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'Legacy Advisor',
  encode(extensions.digest('legacy-advisor-token', 'sha256'), 'hex'),
  true,
  true,
  '11111111-1111-4111-8111-111111111111',
  now()
);

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
do $$
begin
  begin
    update public.founder_alignment_workbook_advisors
    set advisor_user_id = '33333333-3333-4333-8333-333333333333',
        claimed_at = now()
    where invitation_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    raise exception 'old-app legacy advisor claim remained writable';
  exception
    when sqlstate '42501' then
      if sqlerrm <> 'legacy_advisor_invitation_requires_reinvite' then
        raise;
      end if;
  end;
end;
$$;
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"inviter@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
update public.founder_alignment_workbook_advisors
set advisor_name = 'Legacy Advisor Updated'
where invitation_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

do $$
begin
  begin
    update public.founder_alignment_workbook_advisors
    set advisor_user_id = '11111111-1111-4111-8111-111111111111'
    where invitation_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    raise exception 'founder directly claimed legacy advisor row';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(
  (
    select advisor_user_id is null and advisor_name = 'Legacy Advisor Updated'
    from public.founder_alignment_workbook_advisors
    where invitation_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  'legacy advisor claim lock changed historical metadata behavior'
);

-- Prepare a second relationship and a pending advisor assignment.
insert into public.relationships (id, user_a_id, user_b_id)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '11111111-1111-4111-8111-111111111111',
  '55555555-5555-4555-8555-555555555555'
);

insert into public.relationship_advisors (
  id,
  relationship_id,
  advisor_email,
  advisor_name,
  requested_by_user_id,
  status,
  founder_a_approved,
  founder_b_approved,
  invite_token_hash,
  invited_at,
  invite_expires_at
)
select
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  r.id,
  'advisor@example.com',
  'Advisor',
  '11111111-1111-4111-8111-111111111111',
  'invited',
  true,
  true,
  encode(extensions.digest('advisor-token', 'sha256'), 'hex'),
  now(),
  now() + interval '14 days'
from public.relationships r
where r.user_low = least(
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid
)
  and r.user_high = greatest(
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid
  );

-- The DB independently rejects an old-app service-role claim for the wrong account.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
do $$
begin
  begin
    update public.relationship_advisors
    set advisor_user_id = '33333333-3333-4333-8333-333333333333',
        status = 'linked',
        linked_at = now()
    where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
    raise exception 'service-role claim ignored advisor email binding';
  exception
    when sqlstate '42501' then
      if sqlerrm <> 'advisor_invitation_email_mismatch' then
        raise;
      end if;
  end;
end;
$$;

-- The privileged advisor claim path can assign the invited advisor with a matching email.
update public.relationship_advisors
set advisor_user_id = '44444444-4444-4444-8444-444444444444',
    status = 'linked',
    linked_at = now()
where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
reset role;

select pg_temp.assert_true(
  (
    select advisor_user_id = '44444444-4444-4444-8444-444444444444'
    from public.relationship_advisors
    where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
  ),
  'service-role advisor claim was blocked'
);

-- Advisors are read-only and cannot move or reassign their row.
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","email":"advisor@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
declare
  changed_rows integer;
begin
  update public.relationship_advisors
  set relationship_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
  where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'advisor changed relationship_id';
  end if;

  update public.relationship_advisors
  set advisor_user_id = '33333333-3333-4333-8333-333333333333'
  where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'advisor changed advisor_user_id';
  end if;
end;
$$;
reset role;

-- Founders retain legitimate metadata updates but cannot change advisor identity fields.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"inviter@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
update public.relationship_advisors
set advisor_name = 'Updated Advisor'
where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';

do $$
begin
  begin
    update public.relationship_advisors
    set relationship_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
    where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
    raise exception 'founder changed advisor relationship identity';
  exception when sqlstate '42501' then null;
  end;

  begin
    update public.relationship_advisors
    set advisor_user_id = '33333333-3333-4333-8333-333333333333'
    where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
    raise exception 'founder changed advisor user identity';
  exception when sqlstate '42501' then null;
  end;
end;
$$;
reset role;

select pg_temp.assert_true(
  (select advisor_name = 'Updated Advisor' from public.relationship_advisors where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'),
  'legitimate founder advisor metadata update was blocked'
);

-- Seed the minimum accepted-invitation inputs needed for the existing finalize success path.
insert into public.assessments (user_id, module, submitted_at)
values
  ('11111111-1111-4111-8111-111111111111', 'base', now()),
  ('22222222-2222-4222-8222-222222222222', 'base', now());

-- Unauthenticated callers have neither a grant nor an authenticated execution path.
select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.finalize_invitation_if_ready(uuid,jsonb)', 'EXECUTE'),
  'anon retains execute privilege on finalize wrapper'
);
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform public.finalize_invitation_if_ready('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', null);
    raise exception 'unauthenticated finalize unexpectedly succeeded';
  exception when sqlstate '42501' then null;
  end;
end;
$$;

-- Authenticated strangers are rejected.
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","email":"stranger@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    perform public.finalize_invitation_if_ready('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', null);
    raise exception 'stranger finalize unexpectedly succeeded';
  exception
    when sqlstate '42501' then
      if sqlerrm <> 'forbidden' then
        raise;
      end if;
  end;
end;
$$;
reset role;

-- An invitation participant reaches the existing finalize success behavior.
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"invitee@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
declare
  finalized record;
begin
  select * into finalized
  from public.finalize_invitation_if_ready('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', null);
  if finalized.ready is distinct from true or finalized.relationship_id is null then
    raise exception 'participant did not reach finalize success path: %', finalized.reason;
  end if;
end;
$$;
reset role;

-- Existing service-role callers keep using the stable public RPC during rolling deploys.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
do $$
declare
  finalized record;
begin
  select * into finalized
  from public.finalize_invitation_if_ready('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', null);
  if finalized.ready is distinct from true or finalized.relationship_id is null then
    raise exception 'service-role finalize did not reach existing success path: %', finalized.reason;
  end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.finalize_invitation_if_ready_unchecked_20260823(uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated users can execute the unchecked finalize implementation'
);
select pg_temp.assert_true(
  not has_function_privilege(
    'service_role',
    'public.finalize_invitation_if_ready_unchecked_20260823(uuid,jsonb)',
    'EXECUTE'
  ),
  'service role bypasses the stable guarded finalize entry point'
);

select extensions.pass('invite authorization security integration contracts passed');
select * from extensions.finish();

rollback;
