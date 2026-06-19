begin;

create table if not exists public.discovery_matching_starts (
  id uuid primary key default gen_random_uuid(),
  intro_request_id uuid not null references public.discovery_intro_requests(id) on delete cascade,
  initiator_user_id uuid not null references auth.users(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'preparing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovery_matching_starts_status_check
    check (status in ('preparing', 'canceled')),
  constraint discovery_matching_starts_distinct_users_check
    check (requester_user_id <> recipient_user_id),
  constraint discovery_matching_starts_initiator_participant_check
    check (initiator_user_id in (requester_user_id, recipient_user_id)),
  constraint discovery_matching_starts_intro_unique
    unique (intro_request_id)
);

create index if not exists discovery_matching_starts_requester_status_created_idx
  on public.discovery_matching_starts (requester_user_id, status, created_at desc);

create index if not exists discovery_matching_starts_recipient_status_created_idx
  on public.discovery_matching_starts (recipient_user_id, status, created_at desc);

create or replace function public.enforce_discovery_matching_start_update()
returns trigger
language plpgsql
as $$
begin
  if new.intro_request_id <> old.intro_request_id
    or new.initiator_user_id <> old.initiator_user_id
    or new.requester_user_id <> old.requester_user_id
    or new.recipient_user_id <> old.recipient_user_id
    or new.created_at <> old.created_at then
    raise exception 'discovery_matching_start_participants_immutable';
  end if;

  if old.status <> 'preparing' and new.status <> old.status then
    raise exception 'discovery_matching_start_terminal_status';
  end if;

  if old.status = 'preparing' and new.status not in ('preparing', 'canceled') then
    raise exception 'discovery_matching_start_invalid_status_transition';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_discovery_matching_starts_set_updated_at
  on public.discovery_matching_starts;

create trigger trg_discovery_matching_starts_set_updated_at
before update on public.discovery_matching_starts
for each row
execute function public.set_founder_discovery_updated_at();

drop trigger if exists trg_discovery_matching_starts_enforce_update
  on public.discovery_matching_starts;

create trigger trg_discovery_matching_starts_enforce_update
before update on public.discovery_matching_starts
for each row
execute function public.enforce_discovery_matching_start_update();

alter table public.discovery_matching_starts enable row level security;

drop policy if exists discovery_matching_starts_select_participants
  on public.discovery_matching_starts;
create policy discovery_matching_starts_select_participants
on public.discovery_matching_starts
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or recipient_user_id = auth.uid()
);

drop policy if exists discovery_matching_starts_insert_accepted_intro_participants
  on public.discovery_matching_starts;
create policy discovery_matching_starts_insert_accepted_intro_participants
on public.discovery_matching_starts
for insert
to authenticated
with check (
  status = 'preparing'
  and initiator_user_id = auth.uid()
  and initiator_user_id in (requester_user_id, recipient_user_id)
  and exists (
    select 1
    from public.discovery_intro_requests intro
    where intro.id = intro_request_id
      and intro.status = 'accepted'
      and intro.requester_user_id = requester_user_id
      and intro.recipient_user_id = recipient_user_id
      and (
        intro.requester_user_id = auth.uid()
        or intro.recipient_user_id = auth.uid()
      )
  )
  and exists (
    select 1
    from public.founder_discovery_profiles requester_profile
    where requester_profile.user_id = requester_user_id
      and requester_profile.status = 'active'
  )
  and exists (
    select 1
    from public.founder_discovery_profiles recipient_profile
    where recipient_profile.user_id = recipient_user_id
      and recipient_profile.status = 'active'
  )
);

drop policy if exists discovery_matching_starts_cancel_participants
  on public.discovery_matching_starts;
create policy discovery_matching_starts_cancel_participants
on public.discovery_matching_starts
for update
to authenticated
using (
  status = 'preparing'
  and (
    requester_user_id = auth.uid()
    or recipient_user_id = auth.uid()
  )
)
with check (
  status = 'canceled'
  and (
    requester_user_id = auth.uid()
    or recipient_user_id = auth.uid()
  )
);

comment on table public.discovery_matching_starts is
  'Discovery-specific preparation bridge for accepted intro requests. Does not create invitations, relationships, reports, workbooks, chats, email sharing, or copy assessment data.';

commit;
