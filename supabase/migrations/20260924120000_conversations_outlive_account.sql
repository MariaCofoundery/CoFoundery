begin;

-- ---------------------------------------------------------------------------
-- Eine Unterhaltung gehoert zwei Menschen
-- ---------------------------------------------------------------------------
--
-- Bisher hing die ganze Unterhaltung an `on delete cascade` - an beiden
-- Teilnehmenden, an der Kontaktanfrage und am Interesse. Wer sein Konto
-- loeschte, loeschte damit auch die Nachrichten der ANDEREN Person: Worte, die
-- ihr gehoeren, von jemandem geschrieben, der nicht gefragt wurde und nichts
-- davon erfaehrt.
--
-- Das ist das Gegenstueck zum Problembrett, nur in die andere Richtung - und
-- es ist ungewoehnlich streng. Kein groesserer Dienst macht das so: Facebook
-- sagt ausdruecklich, dass gesendete Nachrichten im Postfach der anderen
-- Person verbleiben; Discord und Reddit anonymisieren; Signal kann zugestellte
-- Nachrichten gar nicht mehr erreichen.
--
-- Rechtlich traegt das: Das Recht auf Loeschung ist nicht absolut (Art. 17
-- Abs. 3 DSGVO), und die andere Person hat an ihrer Haelfte eigene Rechte.
-- Geloescht wird, was auf die ausgetretene Person zeigt - nicht, was ihr
-- gegenueber geschrieben wurde.
--
-- WAS DANACH GILT:
--   Die verbliebene Person behaelt ihren Verlauf und kann ihn lesen. Die
--   ausgetretene Seite erscheint namenlos. Geschrieben wird nicht mehr - es
--   gaebe niemanden, der antwortet.
--
-- WARUM DAS MEHR IST ALS ZWEI FREMDSCHLUESSEL:
--   Eine Unterhaltung hing bisher an ihrem Ursprung - an der Kontaktanfrage
--   oder am Interesse. Beide zeigen auf die Person und faelen mit ihr. Der
--   Ursprung darf also ebenfalls wegfallen duerfen, ohne die Unterhaltung
--   mitzunehmen. Und die Gegenseite wurde aus dem Ursprung abgeleitet statt
--   aus den Teilnehmenden - eine Umleitung, die genau dann bricht, wenn der
--   Ursprung geht. Das wird hier geradegezogen.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Die Verknuepfungen duerfen sich loesen
-- ---------------------------------------------------------------------------
alter table public.network_conversations
  alter column participant_a_user_id drop not null,
  alter column participant_b_user_id drop not null,
  drop constraint network_conversations_participant_a_user_id_fkey,
  drop constraint network_conversations_participant_b_user_id_fkey,
  add constraint network_conversations_participant_a_user_id_fkey
    foreign key (participant_a_user_id) references auth.users(id) on delete set null,
  add constraint network_conversations_participant_b_user_id_fkey
    foreign key (participant_b_user_id) references auth.users(id) on delete set null;

alter table public.network_messages
  alter column sender_user_id drop not null,
  drop constraint network_messages_sender_user_id_fkey,
  add constraint network_messages_sender_user_id_fkey
    foreign key (sender_user_id) references auth.users(id) on delete set null;

comment on column public.network_conversations.participant_a_user_id is
  'Null heisst: Diese Person hat ihr Konto geloescht. Der Verlauf bleibt der anderen Seite erhalten, geschrieben wird nicht mehr.';
comment on column public.network_messages.sender_user_id is
  'Null heisst: Die absendende Person hat ihr Konto geloescht. Der Text bleibt, die Verknuepfung ist getrennt.';

-- Der Ursprung darf gehen, ohne die Unterhaltung mitzunehmen.
alter table public.network_conversations
  drop constraint network_conversations_contact_request_id_fkey,
  add constraint network_conversations_contact_request_id_fkey
    foreign key (contact_request_id) references public.network_contact_requests(id) on delete set null,
  drop constraint network_conversations_problem_interest_id_fkey,
  add constraint network_conversations_problem_interest_id_fkey
    foreign key (problem_interest_id) references public.network_problem_interests(id) on delete set null;

-- Aus "genau einer" wird "hoechstens einer": Faellt die Person weg, faellt ihr
-- Ursprung mit - und ohne diese Lockerung schluege die Bedingung bei genau dem
-- Update fehl, das der Fremdschluessel ausloest.
alter table public.network_conversations
  drop constraint network_conversations_single_origin_check,
  add constraint network_conversations_single_origin_check
    check (contact_request_id is null or problem_interest_id is null);

-- Der Vertrag darf das Loesen nicht abbrechen. Er prueft den Ursprung; ist
-- keiner mehr da, gibt es nichts zu pruefen.
create or replace function public.enforce_network_conversation_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
  v_interest public.network_problem_interests%rowtype;
  v_problem public.network_problems%rowtype;
  v_recipient uuid;
begin
  -- Eine Unterhaltung ohne Ursprung oder ohne beide Teilnehmenden entsteht
  -- ausschliesslich durch eine Kontoloeschung. Es gibt dann nichts mehr
  -- abzugleichen.
  if new.contact_request_id is null and new.problem_interest_id is null then
    return new;
  end if;
  if new.participant_a_user_id is null or new.participant_b_user_id is null then
    return new;
  end if;

  if new.contact_request_id is not null then
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
  end if;

  select * into v_interest
  from public.network_problem_interests interest
  where interest.id = new.problem_interest_id;
  if not found then
    raise exception 'network_conversation_requires_interest' using errcode = '23514';
  end if;

  select * into v_problem
  from public.network_problems problem
  where problem.id = v_interest.problem_id;
  if not found then
    raise exception 'network_conversation_requires_interest' using errcode = '23514';
  end if;

  if v_interest.approach_id is null then
    v_recipient := v_problem.author_user_id;
  else
    select approach.author_user_id into v_recipient
    from public.network_problem_approaches approach
    where approach.id = v_interest.approach_id;
    if v_recipient is null then
      raise exception 'network_conversation_requires_interest' using errcode = '23514';
    end if;
  end if;

  if new.participant_a_user_id <> v_interest.user_id
    or new.participant_b_user_id <> v_recipient then
    raise exception 'network_conversation_participants_invalid' using errcode = '23514';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Lesen ja, schreiben nein
-- ---------------------------------------------------------------------------
-- Bisher hing der Zugriff am Ursprung. Ist der weg, kaeme die verbliebene
-- Person nicht mehr an ihren eigenen Verlauf - das waere das Gegenteil des
-- Gewollten.
create or replace function public.can_use_network_conversation(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.network_conversations conversation
    left join public.network_contact_requests request
      on request.id = conversation.contact_request_id
    where conversation.id = p_conversation_id
      and p_user_id in (
        conversation.participant_a_user_id,
        conversation.participant_b_user_id
      )
      and (
        (conversation.contact_request_id is not null and request.status = 'accepted')
        or conversation.problem_interest_id is not null
        -- Verwaist: Die Gegenseite ist gegangen, der Ursprung mit ihr. Der
        -- Verlauf bleibt lesbar - das Schreiben verhindert der
        -- Nachrichtenvertrag, nicht diese Regel.
        or conversation.participant_a_user_id is null
        or conversation.participant_b_user_id is null
      )
  );
$$;

comment on function public.can_use_network_conversation(uuid, uuid) is
  'Darf diese Person diese Unterhaltung benutzen? Eine Stelle fuer alle Urspruenge - auch fuer die, deren Ursprung mit einer Kontoloeschung weggefallen ist.';

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
  -- Das Trennen der Verknuepfung ist selbst ein Update auf sender_user_id und
  -- laeuft damit durch diesen Vertrag. Es gibt dann nichts zu pruefen: Die
  -- Nachricht ist geschrieben, sie wird nur anonym. Ohne diese Zeile haette
  -- der Trigger JEDE Kontoloeschung abgebrochen, an der eine Nachricht haengt.
  if new.sender_user_id is null then
    return new;
  end if;

  select * into v_conversation
  from public.network_conversations conversation
  where conversation.id = new.conversation_id;

  if not found or new.sender_user_id not in (
    v_conversation.participant_a_user_id,
    v_conversation.participant_b_user_id
  ) then
    raise exception 'network_message_sender_invalid' using errcode = '23514';
  end if;

  -- In eine verwaiste Unterhaltung schreibt niemand mehr. Es gaebe keinen
  -- Empfaenger - die Nachricht laege nur da.
  if v_conversation.participant_a_user_id is null
    or v_conversation.participant_b_user_id is null then
    raise exception 'network_conversation_counterpart_gone' using errcode = '42501';
  end if;

  -- Aus einem Problem: Das Interesse ist die Zustimmung.
  if v_conversation.problem_interest_id is not null then
    return new;
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

-- ---------------------------------------------------------------------------
-- 3. Die Gegenseite kommt aus den Teilnehmenden, nicht aus dem Ursprung
-- ---------------------------------------------------------------------------
-- Die Umleitung ueber Anfrage und Interesse brach genau dann, wenn der
-- Ursprung wegfiel. Die Unterhaltung kennt ihre Teilnehmenden selbst; der
-- Ursprung liefert nur noch den Titel und den Namen, solange es ihn gibt.
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
    conversation.contact_request_id,
    request.listing_id,
    counterpart.user_id,
    -- Das aktuelle Profil zuerst, danach die Momentaufnahme aus der Anfrage.
    -- Ist die Person gegangen, bleibt null: Die Oberflaeche setzt dort
    -- "Ehemaliges Mitglied" ein statt eines geratenen Namens.
    coalesce(
      counterpart_profile.display_name,
      case when counterpart.user_id is null then null
        when request.sender_user_id = counterpart.user_id
          then request.sender_display_name_snapshot
        else request.recipient_display_name_snapshot end
    ),
    coalesce(request.listing_title_snapshot, problem.title),
    conversation.created_at,
    conversation.last_message_at,
    (
      select count(*)
      from public.network_messages message
      where message.conversation_id = conversation.id
        and message.sender_user_id is distinct from v_user_id
        and message.read_at is null
    )
  from public.network_conversations conversation
  cross join lateral (
    select case
      when conversation.participant_a_user_id is not distinct from v_user_id
        then conversation.participant_b_user_id
      else conversation.participant_a_user_id
    end as user_id
  ) counterpart
  left join public.network_profiles counterpart_profile
    on counterpart_profile.user_id = counterpart.user_id
  left join public.network_contact_requests request
    on request.id = conversation.contact_request_id
  left join public.network_problem_interests interest
    on interest.id = conversation.problem_interest_id
  left join public.network_problems problem
    on problem.id = interest.problem_id
  where public.can_use_network_conversation(conversation.id, v_user_id)
  order by conversation.last_message_at desc nulls last, conversation.created_at desc;
end;
$$;

-- Beide zaehlten `sender_user_id <> v_user_id`. Gegen null ergibt das NULL:
-- Nachrichten einer ausgetretenen Person waeren still aus der Zahl gefallen
-- und liessen sich nie als gelesen markieren - sie stuenden fuer immer
-- ungelesen da. `is distinct from` behandelt null als "nicht ich".
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
  if not public.can_use_network_conversation(p_conversation_id, v_user_id) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;

  update public.network_messages message
  set read_at = now()
  where message.conversation_id = p_conversation_id
    and message.sender_user_id is distinct from v_user_id
    and message.read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
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
  where message.sender_user_id is distinct from v_user_id
    and message.read_at is null
    -- Unveraendert aus der Vorfassung, nur gegen null abgesichert: Fehlt eine
    -- Seite, kann es keine Blockierung geben.
    and not coalesce(
      public.is_network_interaction_blocked(
        conversation.participant_a_user_id, conversation.participant_b_user_id),
      false)
    and public.can_use_network_conversation(conversation.id, v_user_id);

  return coalesce(v_count, 0);
end;
$$;

commit;
