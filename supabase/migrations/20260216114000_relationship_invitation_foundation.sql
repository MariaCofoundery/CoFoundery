-- Additive relationship/invitation model for dual-write transition.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('sent', 'opened', 'accepted', 'expired', 'revoked');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'relationship_status') then
    create type public.relationship_status as enum ('active', 'paused', 'ended');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assessment_instrument') then
    create type public.assessment_instrument as enum (
      'base',
      'values',
      'stress',
      'roles',
      'decision_architecture'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_run_status') then
    create type public.report_run_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
  end if;
end $$;

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  pair_user_low uuid generated always as (least(user_a_id, user_b_id)) stored,
  pair_user_high uuid generated always as (greatest(user_a_id, user_b_id)) stored,
  status public.relationship_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (pair_user_low, pair_user_high)
);

create index if not exists relationships_user_a_idx on public.relationships(user_a_id);
create index if not exists relationships_user_b_idx on public.relationships(user_b_id);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  token_hash text not null unique,
  status public.invitation_status not null default 'sent',
  relationship_id uuid references public.relationships(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (invitee_email = lower(btrim(invitee_email))),
  check (char_length(token_hash) = 64)
);

create index if not exists invitations_inviter_status_idx
  on public.invitations(inviter_user_id, status);

create index if not exists invitations_invitee_open_idx
  on public.invitations(lower(invitee_email), status);

create index if not exists invitations_expires_idx
  on public.invitations(expires_at)
  where status in ('sent', 'opened');

create index if not exists invitations_relationship_id_idx
  on public.invitations(relationship_id);

create table if not exists public.invitation_modules (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  module_key public.assessment_instrument not null,
  created_at timestamptz not null default now(),
  primary key (invitation_id, module_key)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument public.assessment_instrument not null,
  source_invitation_id uuid references public.invitations(id) on delete set null,
  source_session_id uuid references public.sessions(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_user_instrument_idx
  on public.assessments(user_id, instrument);

create unique index if not exists assessments_user_instrument_active_uidx
  on public.assessments(user_id, instrument)
  where submitted_at is null;

create table if not exists public.assessment_answers (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id text not null references public.questions(id) on delete restrict,
  choice_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (assessment_id, question_id)
);

create index if not exists assessment_answers_question_id_idx
  on public.assessment_answers(question_id);

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  status public.report_run_status not null default 'completed',
  version int not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (relationship_id, version)
);

create index if not exists report_runs_relationship_status_idx
  on public.report_runs(relationship_id, status);

create table if not exists public.report_run_modules (
  report_run_id uuid not null references public.report_runs(id) on delete cascade,
  module_key public.assessment_instrument not null,
  created_at timestamptz not null default now(),
  primary key (report_run_id, module_key)
);

alter table public.relationships enable row level security;
alter table public.invitations enable row level security;
alter table public.invitation_modules enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.report_runs enable row level security;
alter table public.report_run_modules enable row level security;

drop policy if exists "relationships_select_member" on public.relationships;
create policy "relationships_select_member"
  on public.relationships
  for select
  to authenticated
  using (auth.uid() in (user_a_id, user_b_id));

drop policy if exists "report_runs_select_member" on public.report_runs;
create policy "report_runs_select_member"
  on public.report_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.relationships r
      where r.id = report_runs.relationship_id
        and auth.uid() in (r.user_a_id, r.user_b_id)
    )
  );

drop policy if exists "report_runs_insert_member" on public.report_runs;
create policy "report_runs_insert_member"
  on public.report_runs
  for insert
  to authenticated
  with check (
    created_by_user_id = auth.uid()
    and exists (
      select 1
      from public.relationships r
      where r.id = report_runs.relationship_id
        and auth.uid() in (r.user_a_id, r.user_b_id)
    )
  );

drop policy if exists "report_run_modules_select_member" on public.report_run_modules;
create policy "report_run_modules_select_member"
  on public.report_run_modules
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.report_runs rr
      join public.relationships r on r.id = rr.relationship_id
      where rr.id = report_run_modules.report_run_id
        and auth.uid() in (r.user_a_id, r.user_b_id)
    )
  );

drop policy if exists "report_run_modules_insert_member" on public.report_run_modules;
create policy "report_run_modules_insert_member"
  on public.report_run_modules
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.report_runs rr
      join public.relationships r on r.id = rr.relationship_id
      where rr.id = report_run_modules.report_run_id
        and auth.uid() in (r.user_a_id, r.user_b_id)
    )
  );

drop policy if exists "invitations_select_inviter" on public.invitations;
create policy "invitations_select_inviter"
  on public.invitations
  for select
  to authenticated
  using (inviter_user_id = auth.uid());

drop policy if exists "invitations_insert_inviter" on public.invitations;
create policy "invitations_insert_inviter"
  on public.invitations
  for insert
  to authenticated
  with check (inviter_user_id = auth.uid());

drop policy if exists "invitations_update_inviter" on public.invitations;
create policy "invitations_update_inviter"
  on public.invitations
  for update
  to authenticated
  using (inviter_user_id = auth.uid())
  with check (inviter_user_id = auth.uid());

drop policy if exists "invitation_modules_select_inviter" on public.invitation_modules;
create policy "invitation_modules_select_inviter"
  on public.invitation_modules
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.invitations i
      where i.id = invitation_modules.invitation_id
        and i.inviter_user_id = auth.uid()
    )
  );

drop policy if exists "invitation_modules_insert_inviter" on public.invitation_modules;
create policy "invitation_modules_insert_inviter"
  on public.invitation_modules
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.invitations i
      where i.id = invitation_modules.invitation_id
        and i.inviter_user_id = auth.uid()
    )
  );

drop policy if exists "assessments_select_owner" on public.assessments;
create policy "assessments_select_owner"
  on public.assessments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "assessments_insert_owner" on public.assessments;
create policy "assessments_insert_owner"
  on public.assessments
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "assessments_update_owner" on public.assessments;
create policy "assessments_update_owner"
  on public.assessments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "assessment_answers_select_owner" on public.assessment_answers;
create policy "assessment_answers_select_owner"
  on public.assessment_answers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "assessment_answers_insert_owner" on public.assessment_answers;
create policy "assessment_answers_insert_owner"
  on public.assessment_answers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "assessment_answers_update_owner" on public.assessment_answers;
create policy "assessment_answers_update_owner"
  on public.assessment_answers
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = auth.uid()
    )
  );

create or replace function public.accept_invitation(p_token text)
returns table (invitation_id uuid, relationship_id uuid, session_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text := lower(nullif(btrim(coalesce(auth.jwt()->>'email', '')), ''));
  v_token_hash text;
  v_inv public.invitations%rowtype;
  v_relationship_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if v_user_email is null then
    raise exception 'email_required';
  end if;

  if p_token is null or btrim(p_token) = '' then
    raise exception 'invalid_token';
  end if;

  v_token_hash := encode(digest(btrim(p_token), 'sha256'), 'hex');

  select *
  into v_inv
  from public.invitations
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  if v_inv.invitee_email <> v_user_email then
    raise exception 'wrong_email';
  end if;

  if v_inv.status = 'accepted' then
    if v_inv.relationship_id is null then
      insert into public.relationships (user_a_id, user_b_id, status)
      values (v_inv.inviter_user_id, v_uid, 'active')
      on conflict (pair_user_low, pair_user_high)
      do update set updated_at = now()
      returning id into v_relationship_id;

      update public.invitations
      set relationship_id = v_relationship_id, updated_at = now()
      where id = v_inv.id;
    else
      v_relationship_id := v_inv.relationship_id;
    end if;

    return query select v_inv.id, v_relationship_id, v_inv.session_id;
    return;
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'revoked';
  end if;

  if v_inv.status = 'expired' then
    raise exception 'expired';
  end if;

  if v_inv.expires_at < now() then
    update public.invitations
    set status = 'expired', updated_at = now()
    where id = v_inv.id;
    raise exception 'expired';
  end if;

  insert into public.relationships (user_a_id, user_b_id, status)
  values (v_inv.inviter_user_id, v_uid, 'active')
  on conflict (pair_user_low, pair_user_high)
  do update set updated_at = now()
  returning id into v_relationship_id;

  update public.invitations
  set
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now()),
    relationship_id = v_relationship_id,
    updated_at = now()
  where id = v_inv.id;

  return query select v_inv.id, v_relationship_id, v_inv.session_id;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;
