begin;

create table public.network_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_request_id uuid not null unique references public.network_contact_requests(id) on delete cascade,
  participant_a_user_id uuid not null references auth.users(id) on delete cascade,
  participant_b_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint network_conversations_distinct_participants_check
    check (participant_a_user_id <> participant_b_user_id)
);

create table public.network_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.network_conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint network_messages_body_check
    check (char_length(btrim(body)) between 1 and 2000)
);

create index network_conversations_participant_a_idx
  on public.network_conversations(participant_a_user_id, last_message_at desc nulls last);
create index network_conversations_participant_b_idx
  on public.network_conversations(participant_b_user_id, last_message_at desc nulls last);
create index network_messages_conversation_created_idx
  on public.network_messages(conversation_id, created_at, id);
create index network_messages_unread_idx
  on public.network_messages(conversation_id, sender_user_id)
  where read_at is null;

create or replace function public.enforce_network_conversation_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
begin
  select * into v_request
  from public.network_contact_requests request
  where request.id = new.contact_request_id;

  if not found or v_request.status <> 'accepted' then
    raise exception 'network_conversation_requires_accepted_request' using errcode = '23514';
  end if;
  if new.participant_a_user_id <> v_request.sender_user_id
    or new.participant_b_user_id <> v_request.recipient_user_id then
    raise exception 'network_conversation_participants_invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger network_conversations_contract
before insert or update of contact_request_id, participant_a_user_id, participant_b_user_id
on public.network_conversations
for each row execute function public.enforce_network_conversation_contract();

create or replace function public.enforce_network_message_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.network_conversations%rowtype;
  v_request_status text;
begin
  select * into v_conversation
  from public.network_conversations conversation
  where conversation.id = new.conversation_id;

  if not found or new.sender_user_id not in (
    v_conversation.participant_a_user_id,
    v_conversation.participant_b_user_id
  ) then
    raise exception 'network_message_sender_invalid' using errcode = '23514';
  end if;

  select request.status into v_request_status
  from public.network_contact_requests request
  where request.id = v_conversation.contact_request_id;
  if v_request_status is distinct from 'accepted' then
    raise exception 'network_message_request_not_accepted' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger network_messages_contract
before insert or update of conversation_id, sender_user_id
on public.network_messages
for each row execute function public.enforce_network_message_contract();

alter table public.network_conversations enable row level security;
alter table public.network_messages enable row level security;

revoke all on public.network_conversations, public.network_messages from anon, authenticated;

insert into public.network_conversations(
  contact_request_id,
  participant_a_user_id,
  participant_b_user_id,
  created_at
)
select request.id, request.sender_user_id, request.recipient_user_id,
  coalesce(request.responded_at, request.updated_at, request.created_at)
from public.network_contact_requests request
where request.status = 'accepted'
on conflict (contact_request_id) do nothing;

create or replace function public.respond_network_contact(
  p_request_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
begin
  if not public.is_network_member() then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if p_response not in ('accepted','declined') then
    raise exception 'network_contact_response_invalid' using errcode = '23514';
  end if;

  select * into v_request
  from public.network_contact_requests request
  where request.id = p_request_id
  for update;
  if not found or v_request.recipient_user_id <> auth.uid() then
    raise exception 'network_contact_response_forbidden' using errcode = '42501';
  end if;

  if v_request.status = 'accepted' and p_response = 'accepted' then
    insert into public.network_conversations(
      contact_request_id, participant_a_user_id, participant_b_user_id, created_at
    ) values (
      v_request.id, v_request.sender_user_id, v_request.recipient_user_id,
      coalesce(v_request.responded_at, v_request.updated_at, v_request.created_at)
    ) on conflict (contact_request_id) do nothing;
    return;
  end if;
  if v_request.status <> 'pending' then
    raise exception 'network_contact_not_pending' using errcode = '23514';
  end if;

  update public.network_contact_requests
  set status = p_response, responded_at = now()
  where id = p_request_id;

  if p_response = 'accepted' then
    insert into public.network_conversations(
      contact_request_id, participant_a_user_id, participant_b_user_id
    ) values (
      v_request.id, v_request.sender_user_id, v_request.recipient_user_id
    ) on conflict (contact_request_id) do nothing;
  end if;
end;
$$;

create or replace function public.list_network_conversations()
returns table (
  conversation_id uuid,
  contact_request_id uuid,
  listing_id uuid,
  counterpart_user_id uuid,
  counterpart_display_name text,
  listing_title text,
  created_at timestamptz,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  return query
  select conversation.id,
    request.id,
    request.listing_id,
    case when request.sender_user_id = v_user_id
      then request.recipient_user_id else request.sender_user_id end,
    case when request.sender_user_id = v_user_id
      then request.recipient_display_name_snapshot else request.sender_display_name_snapshot end,
    request.listing_title_snapshot,
    conversation.created_at,
    conversation.last_message_at,
    (
      select count(*)
      from public.network_messages message
      where message.conversation_id = conversation.id
        and message.sender_user_id <> v_user_id
        and message.read_at is null
    )
  from public.network_conversations conversation
  join public.network_contact_requests request
    on request.id = conversation.contact_request_id
  where request.status = 'accepted'
    and v_user_id in (
      conversation.participant_a_user_id,
      conversation.participant_b_user_id
    )
  order by conversation.last_message_at desc nulls last, conversation.created_at desc;
end;
$$;

create or replace function public.list_network_messages(p_conversation_id uuid)
returns table (
  id uuid,
  conversation_id uuid,
  sender_user_id uuid,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.network_conversations conversation
    join public.network_contact_requests request
      on request.id = conversation.contact_request_id
    where conversation.id = p_conversation_id
      and request.status = 'accepted'
      and v_user_id in (
        conversation.participant_a_user_id,
        conversation.participant_b_user_id
      )
  ) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;

  return query
  select message.id, message.conversation_id, message.sender_user_id,
    message.body, message.created_at
  from public.network_messages message
  where message.conversation_id = p_conversation_id
  order by message.created_at, message.id;
end;
$$;

create or replace function public.send_network_message(
  p_conversation_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_message_id uuid;
  v_created_at timestamptz := now();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'network_message_body_invalid' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.network_conversations conversation
    join public.network_contact_requests request
      on request.id = conversation.contact_request_id
    where conversation.id = p_conversation_id
      and request.status = 'accepted'
      and v_user_id in (
        conversation.participant_a_user_id,
        conversation.participant_b_user_id
      )
  ) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;

  insert into public.network_messages(conversation_id, sender_user_id, body, created_at)
  values (p_conversation_id, v_user_id, v_body, v_created_at)
  returning id into v_message_id;

  update public.network_conversations
  set last_message_at = v_created_at
  where id = p_conversation_id;
  return v_message_id;
end;
$$;

create or replace function public.mark_network_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.network_conversations conversation
    join public.network_contact_requests request
      on request.id = conversation.contact_request_id
    where conversation.id = p_conversation_id
      and request.status = 'accepted'
      and v_user_id in (
        conversation.participant_a_user_id,
        conversation.participant_b_user_id
      )
  ) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;

  update public.network_messages message
  set read_at = now()
  where message.conversation_id = p_conversation_id
    and message.sender_user_id <> v_user_id
    and message.read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_unread_network_message_count()
returns bigint
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.network_messages message
  join public.network_conversations conversation
    on conversation.id = message.conversation_id
  join public.network_contact_requests request
    on request.id = conversation.contact_request_id
  where request.status = 'accepted'
    and v_user_id in (
      conversation.participant_a_user_id,
      conversation.participant_b_user_id
    )
    and message.sender_user_id <> v_user_id
    and message.read_at is null;
  return v_count;
end;
$$;

revoke all on function public.enforce_network_conversation_contract() from public, anon, authenticated;
revoke all on function public.enforce_network_message_contract() from public, anon, authenticated;
revoke all on function public.list_network_conversations() from public, anon;
revoke all on function public.list_network_messages(uuid) from public, anon;
revoke all on function public.send_network_message(uuid,text) from public, anon;
revoke all on function public.mark_network_conversation_read(uuid) from public, anon;
revoke all on function public.get_unread_network_message_count() from public, anon;
grant execute on function public.list_network_conversations() to authenticated, service_role;
grant execute on function public.list_network_messages(uuid) to authenticated, service_role;
grant execute on function public.send_network_message(uuid,text) to authenticated, service_role;
grant execute on function public.mark_network_conversation_read(uuid) to authenticated, service_role;
grant execute on function public.get_unread_network_message_count() to authenticated, service_role;

comment on table public.network_conversations is
  'One private 1:1 messaging context per accepted Network contact request; not a global social connection.';
comment on table public.network_messages is
  'Participant-private plain-text Network messages. read_at supports receiver counts only and is not projected as a read receipt.';

commit;
