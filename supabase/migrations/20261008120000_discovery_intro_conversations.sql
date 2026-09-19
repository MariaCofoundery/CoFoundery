begin;

-- ---------------------------------------------------------------------------
-- Ein dritter Ursprung: das angenommene Intro aus Find
-- ---------------------------------------------------------------------------
--
-- DIE LUECKE: In Find kannte der Austausch genau ZWEI Nachrichten - die
-- Anfrage und die Antwort darauf. Danach war Schluss; der naechste Schritt war
-- unmittelbar das Matching. Zwei Menschen, die sich gerade fuer interessant
-- halten, koennen so nicht miteinander reden.
--
-- WARUM KEIN ZWEITES NACHRICHTENSYSTEM:
--   `network_conversations` kann das alles schon - Nachrichten, Ungelesenes,
--   Blockieren, Melden. Und sie hat den Weg dafuer bereits: Als das
--   Problembrett kam, bekam sie einen ZWEITEN Ursprung mit einer Pruefung, dass
--   immer genau einer gesetzt ist. Dieselbe Stelle, dritter Ursprung. Ein
--   eigenes System fuer Find waere ein zweiter Ort fuer Nachrichten, ein
--   zweiter Ungelesen-Zaehler und ein zweiter Ort fuer Missbrauchsmeldungen -
--   und der letzte Punkt allein ist ein Ausschlussgrund.
--
-- DER NAME BLEIBT `network_*`, obwohl das Gespraech aus Find kommt. Tabellen
-- umzubenennen, an denen RLS, Trigger und ein Dutzend Funktionen haengen, ist
-- ein eigener Umbau mit eigenem Risiko. Der Name ist eine Altlast, die
-- Bedeutung steht im Kommentar.
--
-- ZUSTIMMUNG: Ein angenommenes Intro IST die Zustimmung beider Seiten - eine
-- Person hat gefragt, die andere hat zugesagt. Genau wie bei der angenommenen
-- Kontaktanfrage. Wird die Zusage zurueckgezogen (Status nicht mehr
-- 'accepted'), endet der Zugriff, ohne dass etwas geloescht wird - dieselbe
-- Regel, die fuer Connect schon gilt.
-- ---------------------------------------------------------------------------

alter table public.network_conversations
  add column discovery_intro_request_id uuid unique
    references public.discovery_intro_requests(id) on delete cascade,
  drop constraint network_conversations_single_origin_check,
  add constraint network_conversations_single_origin_check
    check (
      (contact_request_id is not null)::int
      + (problem_interest_id is not null)::int
      + (discovery_intro_request_id is not null)::int
      = 1
    );

comment on column public.network_conversations.discovery_intro_request_id is
  'Ursprung, wenn das Gespraech aus einem angenommenen Intro in Find entstanden ist. Genau einer der drei Urspruenge ist gesetzt.';

-- ---------------------------------------------------------------------------
-- Der Vertrag gilt jetzt fuer drei Urspruenge
-- ---------------------------------------------------------------------------
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
  v_intro public.discovery_intro_requests%rowtype;
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

  if new.discovery_intro_request_id is not null then
    select * into v_intro
    from public.discovery_intro_requests intro
    where intro.id = new.discovery_intro_request_id;

    if not found or v_intro.status <> 'accepted' then
      raise exception 'network_conversation_requires_accepted_intro' using errcode = '23514';
    end if;
    -- Die Teilnehmenden ergeben sich aus dem Intro, nicht aus der Eingabe:
    -- a ist die anfragende Person, b die angefragte.
    if new.participant_a_user_id <> v_intro.requester_user_id
      or new.participant_b_user_id <> v_intro.recipient_user_id then
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
    discovery_intro_request_id, participant_a_user_id, participant_b_user_id
  on public.network_conversations
  for each row execute function public.enforce_network_conversation_contract();

-- ---------------------------------------------------------------------------
-- Der Nachrichtenvertrag
-- ---------------------------------------------------------------------------
-- Beim zweiten Ursprung war genau das die Falle: Der Trigger prueft gegen die
-- Kontaktanfrage, und ohne Erweiterung liess sich im neuen Gespraech keine
-- einzige Nachricht schreiben. Deshalb hier gleich mit.
create or replace function public.enforce_network_message_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.network_conversations%rowtype;
  v_request_status text;
  v_intro_status text;
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

  if v_conversation.discovery_intro_request_id is not null then
    select intro.status into v_intro_status
    from public.discovery_intro_requests intro
    where intro.id = v_conversation.discovery_intro_request_id;
    if v_intro_status is distinct from 'accepted' then
      raise exception 'network_message_intro_not_accepted' using errcode = '23514';
    end if;
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
-- Die Zugriffsregel - weiterhin an EINER Stelle
-- ---------------------------------------------------------------------------
-- Der Kommentar bei der Extraktion lautete: "Sie stand fuenfmal wortgleich in
-- fuenf Funktionen, und beim sechsten Mal haette jemand eine vergessen." Genau
-- deshalb muss der dritte Ursprung hier und nirgends sonst nachgetragen werden.
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
    left join public.discovery_intro_requests intro
      on intro.id = conversation.discovery_intro_request_id
    where conversation.id = p_conversation_id
      and p_user_id in (
        conversation.participant_a_user_id,
        conversation.participant_b_user_id
      )
      and (
        (conversation.contact_request_id is not null and request.status = 'accepted')
        or conversation.problem_interest_id is not null
        or (conversation.discovery_intro_request_id is not null and intro.status = 'accepted')
      )
  );
$$;

comment on function public.can_use_network_conversation(uuid, uuid) is
  'Darf diese Person diese Unterhaltung benutzen? Eine Stelle fuer alle drei Urspruenge: angenommene Kontaktanfrage, bestehendes Problem-Interesse, angenommenes Intro aus Find.';

-- ---------------------------------------------------------------------------
-- Das Gespraech zu einem angenommenen Intro anlegen
-- ---------------------------------------------------------------------------
-- Eine enge Funktion statt einer Policy zum Einfuegen: Die Teilnehmenden
-- ergeben sich aus dem Intro, nicht aus der Eingabe, und beide Seiten duerfen
-- es anlegen - wer zuerst schreibt, eroeffnet.
create or replace function public.ensure_discovery_intro_conversation(p_intro_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intro public.discovery_intro_requests%rowtype;
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into v_intro
  from public.discovery_intro_requests intro
  where intro.id = p_intro_request_id;

  if not found
    or v_intro.status <> 'accepted'
    or auth.uid() not in (v_intro.requester_user_id, v_intro.recipient_user_id) then
    raise exception 'discovery_intro_conversation_not_allowed' using errcode = '42501';
  end if;

  select conversation.id into v_conversation_id
  from public.network_conversations conversation
  where conversation.discovery_intro_request_id = p_intro_request_id;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.network_conversations(
    discovery_intro_request_id, participant_a_user_id, participant_b_user_id
  ) values (
    p_intro_request_id, v_intro.requester_user_id, v_intro.recipient_user_id
  )
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.ensure_discovery_intro_conversation(uuid) from public;
grant execute on function public.ensure_discovery_intro_conversation(uuid) to authenticated;

comment on function public.ensure_discovery_intro_conversation(uuid) is
  'Legt das Gespraech zu einem angenommenen Intro an oder gibt das bestehende zurueck. Beide Seiten duerfen es eroeffnen; die Teilnehmenden ergeben sich aus dem Intro.';

-- ---------------------------------------------------------------------------
-- Der Nachrichtenbereich war an eine Connect-Mitgliedschaft gebunden
-- ---------------------------------------------------------------------------
--
-- Fuenf Funktionen begannen mit:
--
--     if v_user_id is null or not public.is_network_member(v_user_id) then
--       raise exception 'network_membership_required' ...
--
-- Das war richtig, solange ALLE Gespraeche aus Connect kamen. Mit dem Intro aus
-- Find ist es falsch: Wer nur Align und Find nutzt, kaeme an sein EIGENES
-- Gespraech nicht heran und bekaeme eine Fehlermeldung ueber eine
-- Mitgliedschaft, die mit der Sache nichts zu tun hat.
--
-- Die Sperre faellt und wird NICHT ersetzt, sondern war ueberzaehlig: Jede
-- dieser Funktionen ist ohnehin auf die eigenen Zeilen eingeschraenkt -
-- `can_use_network_conversation` bzw. `v_user_id in (participant_a,
-- participant_b)`. Wer keine Gespraeche hat, bekommt eine leere Liste. Die
-- Anmeldung bleibt Pflicht.
-- ---------------------------------------------------------------------------

-- Die Rueckgabe bekommt eine Spalte, deshalb erst weg damit: `create or
-- replace` kann den Rueckgabetyp nicht aendern.
drop function if exists public.list_network_conversations();

create function public.list_network_conversations()
returns table (
  conversation_id uuid,
  contact_request_id uuid,
  listing_id uuid,
  counterpart_user_id uuid,
  counterpart_display_name text,
  listing_title text,
  -- NEU: woraus das Gespraech entstanden ist. Mit drei Urspruengen in einem
  -- Postfach muss die Oberflaeche es sagen koennen, ohne zu raten.
  origin text,
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
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  return query
  select conversation.id,
    conversation.contact_request_id,
    request.listing_id,
    counterpart.user_id,
    -- DIE NAMENSQUELLE FOLGT DEM URSPRUNG, und das ist Absicht.
    --
    -- Vorher stand hier nur das Connect-Profil mit der Momentaufnahme aus der
    -- Anfrage als Rueckfall. Fuer ein Gespraech aus Find waere das immer null -
    -- ein Find-Nutzer hat kein Connect-Profil - und die Oberflaeche haette
    -- "Ehemaliges Mitglied" fuer einen lebenden Menschen angezeigt.
    --
    -- Umgekehrt waere ein pauschaler Rueckfall auf person_core eine stille
    -- Ausweitung: In einem Connect-Gespraech stuende dann der Klarname einer
    -- Person, die ihr Connect-Profil gerade zurueckgezogen hat. Deshalb je
    -- Ursprung die Quelle, die zu seiner Zustimmung passt.
    case
      when conversation.discovery_intro_request_id is not null then
        nullif(btrim(coalesce(discovery_profile.display_name, '')), '')
      else
        coalesce(
          counterpart_profile.display_name,
          case when counterpart.user_id is null then null
            when request.sender_user_id = counterpart.user_id
              then request.sender_display_name_snapshot
            else request.recipient_display_name_snapshot end
        )
    end,
    coalesce(request.listing_title_snapshot, problem.title),
    case
      when conversation.contact_request_id is not null then 'connect_contact'
      when conversation.problem_interest_id is not null then 'connect_problem'
      else 'discovery_intro'
    end,
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
  left join public.founder_discovery_profiles discovery_profile
    on discovery_profile.user_id = counterpart.user_id
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
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
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
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.network_messages message
  join public.network_conversations conversation
    on conversation.id = message.conversation_id
  where message.sender_user_id is distinct from v_user_id
    and message.read_at is null
    and not coalesce(
      public.is_network_interaction_blocked(
        conversation.participant_a_user_id, conversation.participant_b_user_id),
      false)
    and public.can_use_network_conversation(conversation.id, v_user_id);

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.list_network_conversations() to authenticated;

commit;
