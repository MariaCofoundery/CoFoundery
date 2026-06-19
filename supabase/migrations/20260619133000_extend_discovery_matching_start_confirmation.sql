begin;

alter table public.discovery_matching_starts
  add column if not exists requested_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists requested_at timestamptz,
  add column if not exists confirmed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists confirmed_at timestamptz;

alter table public.discovery_matching_starts
  drop constraint if exists discovery_matching_starts_status_check;

alter table public.discovery_matching_starts
  add constraint discovery_matching_starts_status_check
  check (status in ('preparing', 'awaiting_other_confirmation', 'ready_for_matching', 'canceled'));

alter table public.discovery_matching_starts
  drop constraint if exists discovery_matching_starts_requested_participant_check;

alter table public.discovery_matching_starts
  add constraint discovery_matching_starts_requested_participant_check
  check (
    requested_by_user_id is null
    or requested_by_user_id in (requester_user_id, recipient_user_id)
  );

alter table public.discovery_matching_starts
  drop constraint if exists discovery_matching_starts_confirmed_participant_check;

alter table public.discovery_matching_starts
  add constraint discovery_matching_starts_confirmed_participant_check
  check (
    confirmed_by_user_id is null
    or confirmed_by_user_id in (requester_user_id, recipient_user_id)
  );

alter table public.discovery_matching_starts
  drop constraint if exists discovery_matching_starts_distinct_confirmation_users_check;

alter table public.discovery_matching_starts
  add constraint discovery_matching_starts_distinct_confirmation_users_check
  check (
    requested_by_user_id is null
    or confirmed_by_user_id is null
    or requested_by_user_id <> confirmed_by_user_id
  );

alter table public.discovery_matching_starts
  drop constraint if exists discovery_matching_starts_confirmation_state_check;

alter table public.discovery_matching_starts
  add constraint discovery_matching_starts_confirmation_state_check
  check (
    (
      status = 'preparing'
      and requested_by_user_id is null
      and requested_at is null
      and confirmed_by_user_id is null
      and confirmed_at is null
    )
    or (
      status = 'awaiting_other_confirmation'
      and requested_by_user_id is not null
      and requested_at is not null
      and confirmed_by_user_id is null
      and confirmed_at is null
    )
    or (
      status = 'ready_for_matching'
      and requested_by_user_id is not null
      and requested_at is not null
      and confirmed_by_user_id is not null
      and confirmed_at is not null
      and requested_by_user_id <> confirmed_by_user_id
    )
    or (
      status = 'canceled'
    )
  );

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

  if old.status = 'canceled' and new.status <> old.status then
    raise exception 'discovery_matching_start_terminal_status';
  end if;

  if old.status = 'ready_for_matching' and new.status <> old.status then
    raise exception 'discovery_matching_start_terminal_status';
  end if;

  if old.status = 'preparing'
    and new.status not in ('preparing', 'awaiting_other_confirmation', 'canceled') then
    raise exception 'discovery_matching_start_invalid_status_transition';
  end if;

  if old.status = 'awaiting_other_confirmation'
    and new.status not in ('awaiting_other_confirmation', 'ready_for_matching', 'canceled') then
    raise exception 'discovery_matching_start_invalid_status_transition';
  end if;

  return new;
end;
$$;

drop policy if exists discovery_matching_starts_cancel_participants
  on public.discovery_matching_starts;

drop policy if exists discovery_matching_starts_update_participants
  on public.discovery_matching_starts;

create policy discovery_matching_starts_update_participants
on public.discovery_matching_starts
for update
to authenticated
using (
  status in ('preparing', 'awaiting_other_confirmation')
  and (
    requester_user_id = auth.uid()
    or recipient_user_id = auth.uid()
  )
)
with check (
  (
    requester_user_id = auth.uid()
    or recipient_user_id = auth.uid()
  )
  and (
    (
      status = 'awaiting_other_confirmation'
      and requested_by_user_id = auth.uid()
      and requested_at is not null
      and confirmed_by_user_id is null
      and confirmed_at is null
    )
    or (
      status = 'ready_for_matching'
      and requested_by_user_id is not null
      and requested_by_user_id <> auth.uid()
      and requested_at is not null
      and confirmed_by_user_id = auth.uid()
      and confirmed_at is not null
    )
    or (
      status = 'canceled'
    )
  )
);

comment on column public.discovery_matching_starts.requested_by_user_id is
  'Participant who explicitly requested the full Cofoundery matching start.';

comment on column public.discovery_matching_starts.confirmed_by_user_id is
  'Other participant who confirmed the full Cofoundery matching start. Does not create invitations, relationships, reports, workbooks, or assessment bindings.';

commit;
