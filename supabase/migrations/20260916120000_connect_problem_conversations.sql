begin;

-- ---------------------------------------------------------------------------
-- Vom Interesse zum Gespraech
-- ---------------------------------------------------------------------------
--
-- Das Problembrett hatte bisher keinen Ausgang: Man konnte "ich wuerde daran
-- arbeiten" sagen, und dann war Schluss. Eine Unterhaltung haengt naemlich
-- zwingend an einer Kontaktanfrage (contact_request_id not null), und die
-- wiederum an einer Anzeige. Ein Problem hat keine Anzeige.
--
-- Der Weg, der NICHT genommen wurde: die Kontaktanfrage um einen zweiten
-- Ursprung erweitern. Das waere die naheliegende Loesung gewesen, haette aber
-- eine Frage doppelt gestellt. Wer Interesse bekundet, hat schon gesagt, dass
-- er reden will - ihn danach noch eine Anfrage schicken zu lassen, die die
-- einstellende Person annimmt, waere dieselbe Zustimmung zweimal.
--
-- Stattdessen bekommt die UNTERHALTUNG den zweiten Ursprung. Das Interesse ist
-- die Anfrage; die einstellende Person nimmt sie an, und daraus entsteht
-- unmittelbar ein Gespraech. Annehmen, Ablehnen, Blockieren, Melden, Chat,
-- ungelesene Nachrichten - alles Bestehende gilt weiter.

-- ---------------------------------------------------------------------------
-- 1. Wer ein Problem veroeffentlicht, muss erreichbar sein
-- ---------------------------------------------------------------------------
-- Dieselbe Regel wie bei Anzeigen (enforce_network_publication). Ohne sie
-- koennte jemand ein Problem einstellen, das niemand beantworten kann - der
-- Fall, in dem eine Voraussetzung erst am Ende auffaellt.
create or replace function public.enforce_network_problem_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    if not public.is_network_member(new.author_user_id) then
      raise exception 'network_membership_required' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.network_profiles profile
      where profile.user_id = new.author_user_id and profile.status = 'active'
    ) then
      raise exception 'active_network_profile_required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_network_problem_publication() from public, anon, authenticated;

create trigger network_problem_publication
  before insert or update on public.network_problems
  for each row execute function public.enforce_network_problem_publication();

-- ---------------------------------------------------------------------------
-- 2. Die Unterhaltung bekommt einen zweiten Ursprung
-- ---------------------------------------------------------------------------
alter table public.network_conversations
  alter column contact_request_id drop not null,
  add column problem_interest_id uuid unique
    references public.network_problem_interests(id) on delete cascade,
  add constraint network_conversations_single_origin_check
    check (
      (contact_request_id is not null and problem_interest_id is null)
      or (contact_request_id is null and problem_interest_id is not null)
    );

comment on column public.network_conversations.problem_interest_id is
  'Ursprung, wenn das Gespraech aus einem Problem entstanden ist. Genau einer von beiden Urspruengen ist gesetzt.';

-- Der Vertrag gilt jetzt fuer beide Urspruenge.
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
begin
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

  -- Die Teilnehmenden ergeben sich aus dem Problem, nicht aus der Eingabe:
  -- a ist die interessierte Person, b die einstellende.
  if new.participant_a_user_id <> v_interest.user_id
    or new.participant_b_user_id <> v_problem.author_user_id then
    raise exception 'network_conversation_participants_invalid' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists network_conversations_contract on public.network_conversations;
create trigger network_conversations_contract
  before insert or update of contact_request_id, problem_interest_id,
    participant_a_user_id, participant_b_user_id
  on public.network_conversations
  for each row execute function public.enforce_network_conversation_contract();

-- Der Nachrichtenvertrag prueft ebenfalls gegen die Anfrage. Ohne diese
-- Aenderung liesse sich in einem Gespraech aus einem Problem keine einzige
-- Nachricht schreiben - der Trigger haette jede abgelehnt. Gefunden, weil ein
-- Test genau das versucht hat.
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

  -- Aus einem Problem: Das Interesse ist die Zustimmung. Faellt es weg, faellt
  -- das Gespraech per Fremdschluessel ohnehin mit.
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
-- 3. Die Zugriffsregel an einer Stelle
-- ---------------------------------------------------------------------------
-- Sie stand bisher fuenfmal wortgleich in fuenf Funktionen. Mit einem zweiten
-- Ursprung waere sie fuenfmal zu aendern gewesen - und beim sechsten Mal haette
-- jemand eine vergessen.
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
      -- Aus einer Anfrage: nur solange sie angenommen ist. Aus einem Problem:
      -- solange das Interesse besteht - wird es zurueckgezogen, faellt die
      -- Zeile per Fremdschluessel weg und damit das Gespraech.
      and (
        (conversation.contact_request_id is not null and request.status = 'accepted')
        or conversation.problem_interest_id is not null
      )
  );
$$;

comment on function public.can_use_network_conversation(uuid, uuid) is
  'Darf diese Person diese Unterhaltung benutzen? Eine Stelle fuer beide Urspruenge.';

revoke all on function public.can_use_network_conversation(uuid, uuid) from public, anon;
grant execute on function public.can_use_network_conversation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Die Funktionen, die bisher fest auf die Anfrage joinen
-- ---------------------------------------------------------------------------
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
  -- Die Spaltennamen bleiben, damit die Oberflaeche unveraendert weiterlaeuft:
  -- listing_title traegt bei einem Problem dessen Titel. Ein Umbenennen waere
  -- ehrlicher, aber es ist der Vertrag, auf dem die bestehenden Seiten stehen.
  select conversation.id,
    conversation.contact_request_id,
    request.listing_id,
    case
      when conversation.contact_request_id is not null then
        case when request.sender_user_id = v_user_id
          then request.recipient_user_id else request.sender_user_id end
      else
        case when interest.user_id = v_user_id
          then problem.author_user_id else interest.user_id end
    end,
    case
      when conversation.contact_request_id is not null then
        case when request.sender_user_id = v_user_id
          then request.recipient_display_name_snapshot
          else request.sender_display_name_snapshot end
      else
        case when interest.user_id = v_user_id
          then author_profile.display_name else interested_profile.display_name end
    end,
    coalesce(request.listing_title_snapshot, problem.title),
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
  left join public.network_contact_requests request
    on request.id = conversation.contact_request_id
  left join public.network_problem_interests interest
    on interest.id = conversation.problem_interest_id
  left join public.network_problems problem
    on problem.id = interest.problem_id
  left join public.network_profiles author_profile
    on author_profile.user_id = problem.author_user_id
  left join public.network_profiles interested_profile
    on interested_profile.user_id = interest.user_id
  where public.can_use_network_conversation(conversation.id, v_user_id)
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
  if not public.can_use_network_conversation(p_conversation_id, v_user_id) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;

  return query
  select message.id, message.conversation_id, message.sender_user_id,
    message.body, message.created_at
  from public.network_messages message
  where message.conversation_id = p_conversation_id
  order by message.created_at asc;
end;
$$;

create or replace function public.send_network_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
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
  if not public.can_use_network_conversation(p_conversation_id, v_user_id) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;

  select case when conversation.participant_a_user_id = v_user_id
    then conversation.participant_b_user_id else conversation.participant_a_user_id end
  into v_other_user_id
  from public.network_conversations conversation
  where conversation.id = p_conversation_id;

  -- Sperre und Fehlercode stammen unveraendert aus der Vorfassung: Der Lock
  -- verhindert einen Wettlauf, wenn beide Seiten gleichzeitig handeln, und der
  -- Code wird von den Bestandstests geprueft.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(v_user_id::text, v_other_user_id::text) || greatest(v_user_id::text, v_other_user_id::text), 0)
  );
  if public.is_network_interaction_blocked(v_user_id, v_other_user_id) then
    raise exception 'network_message_interaction_blocked' using errcode = '42501';
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

-- Gibt weiterhin die Zahl der als gelesen markierten Nachrichten zurueck; die
-- Signatur bleibt unveraendert, nur die Zugriffspruefung wandert in die
-- gemeinsame Funktion.
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
    and message.sender_user_id <> v_user_id
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
  -- Wirft wie bisher, statt still 0 zurueckzugeben: Ein ausgesetztes Konto
  -- soll den Unterschied merken, und ein Bestandstest prueft das.
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.network_messages message
  join public.network_conversations conversation
    on conversation.id = message.conversation_id
  where message.sender_user_id <> v_user_id
    and message.read_at is null
    -- Blockierte Unterhaltungen zaehlen nicht mit; auch das stammt
    -- unveraendert aus der Vorfassung.
    and not public.is_network_interaction_blocked(
      conversation.participant_a_user_id, conversation.participant_b_user_id)
    and public.can_use_network_conversation(conversation.id, v_user_id);

  return coalesce(v_count, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Annehmen
-- ---------------------------------------------------------------------------
create or replace function public.accept_network_problem_interest(p_interest_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_interest public.network_problem_interests%rowtype;
  v_problem public.network_problems%rowtype;
  v_conversation_id uuid;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  select * into v_interest
  from public.network_problem_interests interest
  where interest.id = p_interest_id;
  if not found then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  select * into v_problem
  from public.network_problems problem
  where problem.id = v_interest.problem_id;
  -- Nur die einstellende Person entscheidet, mit wem sie spricht.
  if not found or v_problem.author_user_id <> v_user_id then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;
  if v_problem.status <> 'active' then
    raise exception 'network_problem_unavailable' using errcode = '42501';
  end if;

  if public.is_network_interaction_blocked(v_user_id, v_interest.user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;

  -- Beide Seiten brauchen ein aktives Profil, sonst steht im Chat ein Name,
  -- den es nicht gibt.
  if not exists (
    select 1 from public.network_profiles profile
    where profile.user_id = v_interest.user_id and profile.status = 'active'
  ) or not exists (
    select 1 from public.network_profiles profile
    where profile.user_id = v_user_id and profile.status = 'active'
  ) then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;

  -- Zweimal annehmen ist kein Fehler; es gibt dasselbe Gespraech zurueck.
  select conversation.id into v_conversation_id
  from public.network_conversations conversation
  where conversation.problem_interest_id = p_interest_id;
  if found then
    return v_conversation_id;
  end if;

  insert into public.network_conversations(
    problem_interest_id, participant_a_user_id, participant_b_user_id
  ) values (
    p_interest_id, v_interest.user_id, v_problem.author_user_id
  )
  on conflict (problem_interest_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select conversation.id into v_conversation_id
    from public.network_conversations conversation
    where conversation.problem_interest_id = p_interest_id;
  end if;

  return v_conversation_id;
end;
$$;

comment on function public.accept_network_problem_interest(uuid) is
  'Die einstellende Person nimmt ein Interesse an; daraus entsteht unmittelbar ein Gespraech. Das Interesse war die Anfrage - eine zweite Zustimmung waere dieselbe Frage zweimal.';

revoke all on function public.accept_network_problem_interest(uuid) from public, anon;
grant execute on function public.accept_network_problem_interest(uuid) to authenticated;

commit;
