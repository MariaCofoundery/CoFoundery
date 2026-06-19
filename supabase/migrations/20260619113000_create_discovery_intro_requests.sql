begin;

create table if not exists public.discovery_intro_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  message text,
  response_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  canceled_at timestamptz,
  constraint discovery_intro_requests_status_check
    check (status in ('pending', 'accepted', 'declined', 'canceled')),
  constraint discovery_intro_requests_distinct_users_check
    check (requester_user_id <> recipient_user_id),
  constraint discovery_intro_requests_message_length_check
    check (message is null or char_length(message) <= 600),
  constraint discovery_intro_requests_response_message_length_check
    check (response_message is null or char_length(response_message) <= 600),
  constraint discovery_intro_requests_canceled_at_check
    check (
      (status = 'canceled' and canceled_at is not null)
      or (status <> 'canceled' and canceled_at is null)
    ),
  constraint discovery_intro_requests_responded_at_check
    check (
      (status in ('accepted', 'declined') and responded_at is not null)
      or (status not in ('accepted', 'declined') and responded_at is null)
    )
);

create unique index if not exists discovery_intro_requests_pending_pair_idx
  on public.discovery_intro_requests (requester_user_id, recipient_user_id)
  where status = 'pending';

create index if not exists discovery_intro_requests_recipient_status_created_idx
  on public.discovery_intro_requests (recipient_user_id, status, created_at desc);

create index if not exists discovery_intro_requests_requester_status_created_idx
  on public.discovery_intro_requests (requester_user_id, status, created_at desc);

create or replace function public.enforce_discovery_intro_request_update()
returns trigger
language plpgsql
as $$
begin
  if new.requester_user_id <> old.requester_user_id
    or new.recipient_user_id <> old.recipient_user_id
    or new.created_at <> old.created_at then
    raise exception 'discovery_intro_request_participants_immutable';
  end if;

  if old.status <> 'pending' and new.status <> old.status then
    raise exception 'discovery_intro_request_terminal_status';
  end if;

  if old.status = 'pending'
    and new.status not in ('pending', 'accepted', 'declined', 'canceled') then
    raise exception 'discovery_intro_request_invalid_status_transition';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_discovery_intro_requests_set_updated_at
  on public.discovery_intro_requests;

create trigger trg_discovery_intro_requests_set_updated_at
before update on public.discovery_intro_requests
for each row
execute function public.set_founder_discovery_updated_at();

drop trigger if exists trg_discovery_intro_requests_enforce_update
  on public.discovery_intro_requests;

create trigger trg_discovery_intro_requests_enforce_update
before update on public.discovery_intro_requests
for each row
execute function public.enforce_discovery_intro_request_update();

alter table public.discovery_intro_requests enable row level security;

drop policy if exists discovery_intro_requests_select_participants on public.discovery_intro_requests;
create policy discovery_intro_requests_select_participants
on public.discovery_intro_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or recipient_user_id = auth.uid()
);

drop policy if exists discovery_intro_requests_insert_requester_active_profiles on public.discovery_intro_requests;
create policy discovery_intro_requests_insert_requester_active_profiles
on public.discovery_intro_requests
for insert
to authenticated
with check (
  requester_user_id = auth.uid()
  and status = 'pending'
  and requester_user_id <> recipient_user_id
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

drop policy if exists discovery_intro_requests_update_requester_or_recipient_pending on public.discovery_intro_requests;
create policy discovery_intro_requests_update_requester_or_recipient_pending
on public.discovery_intro_requests
for update
to authenticated
using (
  status = 'pending'
  and (
    requester_user_id = auth.uid()
    or recipient_user_id = auth.uid()
  )
)
with check (
  (
    requester_user_id = auth.uid()
    and status = 'canceled'
  )
  or (
    recipient_user_id = auth.uid()
    and status in ('accepted', 'declined')
  )
);

comment on table public.discovery_intro_requests is
  'Discovery-specific intro interest layer. Does not create relationships, invitations, reports, workbooks, chats, or expose private profile data.';

commit;
