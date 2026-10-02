begin;

-- Keep legacy contact reports, including those without an accepted conversation.
alter table public.network_reports
  alter column contact_request_id drop not null,
  add column conversation_id uuid references public.network_conversations(id) on delete cascade,
  add constraint network_reports_context_required
    check (contact_request_id is not null or conversation_id is not null),
  add constraint network_reports_one_per_conversation
    unique (reporter_user_id, conversation_id);

update public.network_reports report
set conversation_id = conversation.id
from public.network_conversations conversation
where conversation.contact_request_id = report.contact_request_id;

comment on column public.network_reports.conversation_id is
  'Shared context for contact, problem-interest and FIND-intro reports. The RPC derives the reported person from the participants.';

-- The existing RPC signature remains available to old clients and contact cards.
create or replace function public.report_network_interaction(
  p_contact_request_id uuid, p_category text, p_comment text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_request public.network_contact_requests%rowtype;
  v_other uuid;
  v_conversation uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_category is null or p_category not in ('spam', 'harassment', 'misleading', 'other')
    or char_length(v_comment) > 1000 then
    raise exception 'network_report_invalid' using errcode = '23514';
  end if;
  select * into v_request from public.network_contact_requests where id = p_contact_request_id;
  if not found or (v_user is distinct from v_request.sender_user_id and v_user is distinct from v_request.recipient_user_id) then
    raise exception 'network_report_context_denied' using errcode = '42501';
  end if;
  v_other := case when v_user = v_request.sender_user_id then v_request.recipient_user_id else v_request.sender_user_id end;
  select id into v_conversation from public.network_conversations where contact_request_id = p_contact_request_id;
  insert into public.network_reports(reporter_user_id, reported_user_id, contact_request_id, conversation_id, category, comment)
  values (v_user, v_other, p_contact_request_id, v_conversation, p_category, v_comment)
  on conflict (reporter_user_id, contact_request_id) do update
    set category = excluded.category, comment = excluded.comment, conversation_id = excluded.conversation_id
  returning id into v_id;
  return v_id;
end;
$$;

create function public.report_network_conversation(
  p_conversation_id uuid, p_category text, p_comment text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_conversation public.network_conversations%rowtype;
  v_other uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_conversation from public.network_conversations where id = p_conversation_id;
  -- IS DISTINCT FROM matters for conversations anonymized after account deletion.
  if not found or (v_user is distinct from v_conversation.participant_a_user_id and v_user is distinct from v_conversation.participant_b_user_id) then
    raise exception 'network_report_context_denied' using errcode = '42501';
  end if;
  v_other := case when v_user = v_conversation.participant_a_user_id
    then v_conversation.participant_b_user_id else v_conversation.participant_a_user_id end;
  if v_other is null or v_other = v_user then
    raise exception 'network_report_context_denied' using errcode = '42501';
  end if;
  if p_category is null or p_category not in ('spam', 'harassment', 'misleading', 'other')
    or char_length(v_comment) > 1000 then
    raise exception 'network_report_invalid' using errcode = '23514';
  end if;
  if v_conversation.contact_request_id is not null then
    return public.report_network_interaction(v_conversation.contact_request_id, p_category, p_comment);
  end if;
  insert into public.network_reports(reporter_user_id, reported_user_id, conversation_id, category, comment)
  values (v_user, v_other, p_conversation_id, p_category, v_comment)
  on conflict (reporter_user_id, conversation_id) do update
    set category = excluded.category, comment = excluded.comment
  returning id into v_id;
  return v_id;
end;
$$;

-- The original pairwise block table and symmetric predicate remain the source
-- of truth. A proven conversation also establishes a relationship, regardless
-- of origin or current CONNECT membership. No arbitrary client identity trusted.
create or replace function public.block_network_user(p_blocked_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_blocked_user_id is null or p_blocked_user_id = v_user then
    raise exception 'network_block_target_invalid' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.network_contact_requests
    where (sender_user_id = v_user and recipient_user_id = p_blocked_user_id)
       or (recipient_user_id = v_user and sender_user_id = p_blocked_user_id)
  ) and not exists (
    select 1 from public.network_conversations
    where (participant_a_user_id = v_user and participant_b_user_id = p_blocked_user_id)
       or (participant_b_user_id = v_user and participant_a_user_id = p_blocked_user_id)
  ) then
    raise exception 'network_block_relationship_required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(v_user::text, p_blocked_user_id::text) || greatest(v_user::text, p_blocked_user_id::text), 0));
  insert into public.network_blocks(blocker_user_id, blocked_user_id)
  values (v_user, p_blocked_user_id) on conflict do nothing;
  update public.network_contact_requests set status = 'canceled', responded_at = null, updated_at = now()
  where status = 'pending' and (
    (sender_user_id = v_user and recipient_user_id = p_blocked_user_id)
    or (recipient_user_id = v_user and sender_user_id = p_blocked_user_id));
  update public.network_messages message set read_at = coalesce(message.read_at, now())
  from public.network_conversations conversation
  where message.conversation_id = conversation.id and message.read_at is null and (
    (conversation.participant_a_user_id = v_user and conversation.participant_b_user_id = p_blocked_user_id)
    or (conversation.participant_b_user_id = v_user and conversation.participant_a_user_id = p_blocked_user_id));
end;
$$;

create or replace function public.get_network_block_state(p_other_user_id uuid)
returns table(interaction_blocked boolean, blocked_by_current_user boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query select public.is_network_interaction_blocked(v_user, p_other_user_id),
    exists(select 1 from public.network_blocks where blocker_user_id = v_user and blocked_user_id = p_other_user_id);
end;
$$;

create or replace function public.unblock_network_user(p_blocked_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from public.network_blocks where blocker_user_id = auth.uid() and blocked_user_id = p_blocked_user_id;
end;
$$;

-- Existing RLS still checks membership, ownership and target availability.
-- These narrow triggers add the symmetric block check without exposing the
-- internal block predicate or table to authenticated users.
create function public.enforce_problem_interest_block()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_other uuid;
begin
  if new.approach_id is null then
    select author_user_id into v_other from public.network_problems where id = new.problem_id;
  else
    select author_user_id into v_other from public.network_problem_approaches where id = new.approach_id and problem_id = new.problem_id;
  end if;
  if v_other is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(least(new.user_id::text, v_other::text) || greatest(new.user_id::text, v_other::text), 0));
    if public.is_network_interaction_blocked(new.user_id, v_other) then
      raise exception 'network_contact_interaction_blocked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger network_problem_interest_block before insert or update of problem_id, approach_id, user_id
on public.network_problem_interests for each row execute function public.enforce_problem_interest_block();

create function public.enforce_discovery_intro_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Declining/canceling stays possible after a block. Old accepted histories
  -- remain readable; only new requests and acceptance are stopped here.
  if new.status in ('pending', 'accepted') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(least(new.requester_user_id::text, new.recipient_user_id::text) || greatest(new.requester_user_id::text, new.recipient_user_id::text), 0));
    if public.is_network_interaction_blocked(new.requester_user_id, new.recipient_user_id) then
      raise exception 'network_contact_interaction_blocked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger discovery_intro_block before insert or update of status, requester_user_id, recipient_user_id
on public.discovery_intro_requests for each row execute function public.enforce_discovery_intro_block();

-- Also covers an intro accepted before the block but not yet opened, and a
-- concurrent acceptance of a problem interest. Existing conversations survive.
create function public.enforce_network_conversation_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.participant_a_user_id is not null and new.participant_b_user_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(least(new.participant_a_user_id::text, new.participant_b_user_id::text) || greatest(new.participant_a_user_id::text, new.participant_b_user_id::text), 0));
    if public.is_network_interaction_blocked(new.participant_a_user_id, new.participant_b_user_id) then
      raise exception 'network_contact_interaction_blocked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger network_conversation_block before insert on public.network_conversations
for each row execute function public.enforce_network_conversation_block();

-- No direct client reads/writes of confidential reports or pairwise blocks.
revoke all on public.network_reports, public.network_blocks from public, anon, authenticated;
revoke all on function public.report_network_conversation(uuid,text,text) from public, anon, authenticated;
grant execute on function public.report_network_conversation(uuid,text,text) to authenticated, service_role;
revoke all on function public.enforce_problem_interest_block(), public.enforce_discovery_intro_block(), public.enforce_network_conversation_block() from public, anon, authenticated;
-- CREATE OR REPLACE retains the explicit authenticated/service_role grants of
-- the existing RPCs. The internal block predicate remains service-only.

commit;
