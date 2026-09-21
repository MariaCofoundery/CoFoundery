begin;

-- ---------------------------------------------------------------------------
-- Fünfte Schicht: eine Sperre muss sperren
-- ---------------------------------------------------------------------------
--
-- DIE EINZIGE DER FÜNF, DIE EINE ZUGRIFFSLÜCKE IST - die übrigen brachen eine
-- Kontolöschung ab oder nahmen einen Verlauf weg. Diese hier gab etwas heraus.
--
-- Drei Funktionen verlangten bis zum 24.09.2026 eine AKTIVE Mitgliedschaft:
--
--   list_network_conversations
--   get_unread_network_message_count
--   mark_network_conversation_read
--
--     if v_user_id is null or not public.is_network_member(v_user_id) then
--       raise exception 'network_membership_required' using errcode = '42501';
--
-- Am 08.10.2026 wurde daraus in allen drei eine Prüfung auf Anmeldung:
--
--     if v_user_id is null then
--       raise exception 'authentication_required' using errcode = '42501';
--
-- Seither konnte ein GESPERRTES Mitglied seine Unterhaltungen weiter
-- auflisten, die Zahl ungelesener Nachrichten abrufen und Nachrichten als
-- gelesen markieren. Eine Sperre ist das Werkzeug, mit dem dieses Netzwerk auf
-- Belästigung reagiert; wenn sie nur das Schreiben trifft, ist sie eine halbe
-- Sperre - und die betroffene Person merkt weiter, wer ihr schreibt.
--
-- `list_network_messages` und `send_network_message` haben die Prüfung
-- behalten; das Schreiben war also nie offen. Nachgezogen wird das Lesen.
--
-- DIE KÖRPER SIND UNVERÄNDERT aus dem laufenden Stand übernommen (per
-- pg_get_functiondef) - getauscht ist ausschliesslich der Wächter. Genau das
-- Gegenteil ist am 08.10.2026 passiert: Beim Erweitern wurde neu geschrieben,
-- und dabei ging Vorhandenes verloren. Vier weitere Migrationen
-- (20261024-20261027) holen die übrigen Zusagen derselben Nacht zurück.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_network_conversations()
 RETURNS TABLE(conversation_id uuid, contact_request_id uuid, listing_id uuid, counterpart_user_id uuid, counterpart_display_name text, listing_title text, origin text, created_at timestamp with time zone, last_message_at timestamp with time zone, unread_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  -- WIEDERHERGESTELLT: Alle Fassungen bis zum 24.09.2026 verlangten hier eine
  -- AKTIVE Mitgliedschaft. Am 08.10.2026 wurde daraus eine Pruefung auf
  -- Anmeldung - seither lasen gesperrte Mitglieder weiter mit.
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
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
$function$

;

CREATE OR REPLACE FUNCTION public.get_unread_network_message_count()
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  -- WIEDERHERGESTELLT: Alle Fassungen bis zum 24.09.2026 verlangten hier eine
  -- AKTIVE Mitgliedschaft. Am 08.10.2026 wurde daraus eine Pruefung auf
  -- Anmeldung - seither lasen gesperrte Mitglieder weiter mit.
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
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
$function$

;

CREATE OR REPLACE FUNCTION public.mark_network_conversation_read(p_conversation_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  -- WIEDERHERGESTELLT: Alle Fassungen bis zum 24.09.2026 verlangten hier eine
  -- AKTIVE Mitgliedschaft. Am 08.10.2026 wurde daraus eine Pruefung auf
  -- Anmeldung - seither lasen gesperrte Mitglieder weiter mit.
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
$function$

;

comment on function public.list_network_conversations() is
  'Die Unterhaltungen der aufrufenden Person. Verlangt eine aktive Netzwerk-Mitgliedschaft: Eine Sperre trifft auch das Lesen.';

commit;
