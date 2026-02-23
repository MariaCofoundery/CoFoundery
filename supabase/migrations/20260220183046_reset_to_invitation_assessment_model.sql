-- RESET & CLEAN: invitation-first + assessments + pairwise reports
-- WARNING: Drops session-based MVP tables. User confirmed test data can be deleted.

begin;
-- Drop new-model tables from previous migrations so this reset migration can recreate them cleanly
drop table if exists public.report_run_modules cascade;
drop table if exists public.report_runs cascade;
drop table if exists public.assessment_answers cascade;
drop table if exists public.assessments cascade;
drop table if exists public.invitation_modules cascade;
drop table if exists public.invitations cascade;
drop table if exists public.relationships cascade;

-- Drop enums/types if they exist (so we can recreate with the exact names we want)
drop type if exists public.assessment_instrument cascade;
drop type if exists public.invitation_status cascade;
drop type if exists public.relationship_status cascade;
drop type if exists public.assessment_module cascade;
-- 0) Extensions (gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Drop legacy policies (if exist) then tables
do $$
begin
  -- Drop policies safely (ignore if not exist)
  if exists (select 1 from pg_policies where schemaname='public' and tablename='sessions') then
    execute 'drop policy if exists "Enable update for sessions" on public.sessions';
    execute 'drop policy if exists sessions_insert_authenticated on public.sessions';
    execute 'drop policy if exists sessions_select_member on public.sessions';
    execute 'drop policy if exists sessions_update_member on public.sessions';
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='participants') then
    execute 'drop policy if exists participants_insert_owned_or_invite on public.participants';
    execute 'drop policy if exists participants_select_member_session on public.participants';
    execute 'drop policy if exists participants_update_self on public.participants';
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='responses') then
    execute 'drop policy if exists responses_insert_owner_participant on public.responses';
    execute 'drop policy if exists responses_select_member_session on public.responses';
    execute 'drop policy if exists responses_update_owner_participant on public.responses';
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='free_text') then
    execute 'drop policy if exists free_text_insert_owner_participant on public.free_text';
    execute 'drop policy if exists free_text_select_member_session on public.free_text';
    execute 'drop policy if exists free_text_update_owner_participant on public.free_text';
  end if;
exception when others then
  -- ignore
end $$;

-- Drop legacy tables (CASCADE clears constraints)
drop table if exists public.free_text cascade;
drop table if exists public.responses cascade;
drop table if exists public.participants_backup_dupes cascade;
drop table if exists public.participants cascade;
drop table if exists public.sessions cascade;

-- Also remove legacy helper indexes/constraints implicitly dropped.

-- 2) Drop legacy enums/types if you had any old ones (none in current schema)
-- noop

-- 3) Create enums for new model
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('sent','opened','accepted','expired','revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'assessment_module') then
    create type public.assessment_module as enum ('base','values');
  end if;
end $$;

-- 4) Invitations (explicit workflow object)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  invitee_user_id uuid references auth.users(id) on delete set null,

  label text, -- inviter-only label like "Harry"

  status public.invitation_status not null default 'sent',

  token_hash text not null unique,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  accepted_at timestamptz,

  expires_at timestamptz not null,
  revoked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (invitee_email = lower(btrim(invitee_email)))
);

create index if not exists invitations_inviter_status_idx on public.invitations(inviter_user_id, status);
create index if not exists invitations_invitee_email_status_idx on public.invitations(lower(invitee_email), status);
create index if not exists invitations_expires_idx on public.invitations(expires_at) where status in ('sent','opened');

-- 5) Invitation modules (add-ons)
create table if not exists public.invitation_modules (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  module public.assessment_module not null,
  primary key (invitation_id, module)
);

-- 6) Relationships (pairwise)
create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,

  user_low uuid generated always as (least(user_a_id, user_b_id)) stored,
  user_high uuid generated always as (greatest(user_a_id, user_b_id)) stored,

  created_at timestamptz not null default now(),

  unique (user_low, user_high),
  check (user_a_id <> user_b_id)
);

-- 7) Assessments (latest per user+module)
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module public.assessment_module not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Exactly one submitted assessment per user+module (latest). If you later want archive: add another table or allow multiple.
create unique index assessments_user_module_submitted_uidx
  on public.assessments(user_id, module)
  where submitted_at is not null;

create table if not exists public.assessment_answers (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id text not null references public.questions(id) on delete restrict,
  choice_value text not null,
  primary key (assessment_id, question_id)
);

-- 8) Report runs (immutable snapshot per invitation)
create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,

  modules public.assessment_module[] not null,
  input_assessment_ids uuid[] not null,

  payload jsonb not null,

  created_at timestamptz not null default now(),

  unique (invitation_id)
);

-- 9) Immutability triggers (block update/delete on report_runs)
create or replace function public.block_modifications()
returns trigger language plpgsql as $$
begin
  raise exception 'immutable';
end;
$$;

drop trigger if exists trg_report_runs_immutable_u on public.report_runs;
drop trigger if exists trg_report_runs_immutable_d on public.report_runs;

create trigger trg_report_runs_immutable_u
before update on public.report_runs
for each row execute function public.block_modifications();

create trigger trg_report_runs_immutable_d
before delete on public.report_runs
for each row execute function public.block_modifications();

-- 10) RLS
alter table public.invitations enable row level security;
alter table public.invitation_modules enable row level security;
alter table public.relationships enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.report_runs enable row level security;

-- Invitations: inviter can see/manage their invitations
create policy invitations_select_inviter
on public.invitations
for select to authenticated
using (inviter_user_id = auth.uid());

-- Invitee can select invitations addressed to their email OR where invitee_user_id is them (after accept)
create policy invitations_select_invitee
on public.invitations
for select to authenticated
using (
  lower(invitee_email) = lower((auth.jwt() ->> 'email'))
  or invitee_user_id = auth.uid()
);

-- Insert invitation only by authenticated (server actions). Keep strict: only inviter_user_id = auth.uid()
create policy invitations_insert_self
on public.invitations
for insert to authenticated
with check (inviter_user_id = auth.uid());

-- Inviter can revoke own invitation (update limited by policy + app logic)
create policy invitations_update_inviter
on public.invitations
for update to authenticated
using (inviter_user_id = auth.uid())
with check (inviter_user_id = auth.uid());

-- Invitation modules: only inviter can read them (invitee doesn't need to see internal selection unless you want UX later)
create policy invitation_modules_select_inviter
on public.invitation_modules
for select to authenticated
using (
  exists (
    select 1 from public.invitations i
    where i.id = invitation_modules.invitation_id
      and i.inviter_user_id = auth.uid()
  )
);

create policy invitation_modules_insert_inviter
on public.invitation_modules
for insert to authenticated
with check (
  exists (
    select 1 from public.invitations i
    where i.id = invitation_modules.invitation_id
      and i.inviter_user_id = auth.uid()
  )
);

-- Relationships: only members can see
create policy relationships_select_members
on public.relationships
for select to authenticated
using (auth.uid() in (user_a_id, user_b_id));

-- Assessments: only owner
create policy assessments_select_owner
on public.assessments
for select to authenticated
using (user_id = auth.uid());

create policy assessments_insert_owner
on public.assessments
for insert to authenticated
with check (user_id = auth.uid());

create policy assessments_update_owner
on public.assessments
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Assessment answers: only owner via join to assessments
create policy assessment_answers_select_owner
on public.assessment_answers
for select to authenticated
using (
  exists (
    select 1 from public.assessments a
    where a.id = assessment_answers.assessment_id
      and a.user_id = auth.uid()
  )
);

create policy assessment_answers_insert_owner
on public.assessment_answers
for insert to authenticated
with check (
  exists (
    select 1 from public.assessments a
    where a.id = assessment_answers.assessment_id
      and a.user_id = auth.uid()
  )
);

create policy assessment_answers_update_owner
on public.assessment_answers
for update to authenticated
using (
  exists (
    select 1 from public.assessments a
    where a.id = assessment_answers.assessment_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.assessments a
    where a.id = assessment_answers.assessment_id
      and a.user_id = auth.uid()
  )
);

-- Report runs: only relationship members can read
create policy report_runs_select_members
on public.report_runs
for select to authenticated
using (
  exists (
    select 1 from public.relationships r
    where r.id = report_runs.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
);

-- No update/delete policies for report_runs (and triggers block it anyway).

-- 11) RPC: accept invitation (token-first, idempotent-ish)
-- Note: token is hashed with sha256, stored as hex.

drop function if exists public.accept_invitation(text);

create function public.accept_invitation(p_token text)
returns table (invitation_id uuid, relationship_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
  v_rel_id uuid;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_inv
  from public.invitations
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  -- Expiry check
  if v_inv.expires_at < now() then
    update public.invitations
      set status='expired', updated_at=now()
    where id=v_inv.id;
    raise exception 'expired';
  end if;

  if v_inv.status in ('revoked') then
    raise exception 'revoked';
  end if;

  -- Create / upsert relationship
  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_uid)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_rel_id;

  if v_rel_id is null then
    select id into v_rel_id
    from public.relationships
    where user_low = least(v_inv.inviter_user_id, v_uid)
      and user_high = greatest(v_inv.inviter_user_id, v_uid);
  end if;

  -- Mark invitation accepted (idempotent)
  update public.invitations
    set status='accepted',
        invitee_user_id=v_uid,
        accepted_at=coalesce(accepted_at, now()),
        updated_at=now()
  where id=v_inv.id;

  return query select v_inv.id, v_rel_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

commit;