begin;

-- ---------------------------------------------------------------------------
-- Der Zugang zum Postfach gehört zum URSPRUNG, nicht zu einer Mitgliedschaft
-- ---------------------------------------------------------------------------
--
-- KORREKTUR MEINER EIGENEN MIGRATION 20261028120000, und zwar bevor sie je
-- lief - der Fehler steckte in ihrer Begründung.
--
-- Dort hatte ich die Prüfung auf eine AKTIVE Connect-Mitgliedschaft
-- wiederhergestellt, die am 08.10.2026 verloren gegangen war, und das als
-- Zugriffslücke beschrieben: Ein gesperrtes Mitglied konnte weiterlesen. Das
-- stimmt, war aber nur die halbe Geschichte.
--
-- WAS ICH ÜBERSEHEN HABE: Dieselbe Migration vom 08.10.2026 hat Find
-- Unterhaltungen gegeben ("ein Postfach für drei Ursprünge"). Ein Mensch, der
-- nur Find benutzt, ist KEIN Connect-Mitglied - die globale Prüfung hätte ihn
-- aus seiner eigenen Unterhaltung ausgeschlossen. Der Wegfall der Prüfung war
-- also nicht nur ein Verlust, sondern zur Hälfte Absicht. Gesehen habe ich es
-- an einem Test, der nie gelaufen war (`discovery_intro_conversations.sql`,
-- Kennungen mit einem 'g' darin): "a find-only user can write in their own
-- conversation".
--
-- DIE RICHTIGE REGEL IST DESHALB NICHT GLOBAL, SONDERN JE URSPRUNG:
--
--   Aus einer Kontaktanfrage oder einem Problem: Beides sind
--   Connect-Vorgänge. Wer dort gesperrt ist, kommt nicht mehr hinein - auch
--   nicht lesend. Eine Sperre, die nur das Schreiben trifft, ist eine halbe
--   Sperre.
--
--   Aus einer Vorstellungsanfrage in Find: Dafür braucht es Find, nicht
--   Connect. Eine Connect-Sperre darf hier nichts abschneiden - sie betrifft
--   einen anderen Bereich.
--
--   Verwaist (die Gegenseite ist gegangen): bleibt lesbar. Welcher Ursprung es
--   war, steht nicht mehr da - und eine verwaiste Unterhaltung hat niemanden,
--   den eine Sperre schützen müsste.
--
-- Und der Türsteher am Postfach verlangt genau so viel, wie er wissen muss:
-- entweder eine aktive Connect-Mitgliedschaft oder eine angenommene
-- Vorstellungsanfrage. Wer keins von beidem hat, hat kein Postfach.
--
-- Die Körper sind unverändert aus dem laufenden Stand übernommen (per
-- pg_get_functiondef); getauscht ist ausschliesslich der Wächter.
-- ---------------------------------------------------------------------------

create or replace function public.can_use_network_messaging(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    public.is_network_member(p_user_id)
    or exists (
      select 1 from public.discovery_intro_requests intro
      where intro.status = 'accepted'
        and (intro.requester_user_id = p_user_id or intro.recipient_user_id = p_user_id)
    )
  );
$$;

revoke all on function public.can_use_network_messaging(uuid) from public, anon;
grant execute on function public.can_use_network_messaging(uuid) to authenticated;

comment on function public.can_use_network_messaging(uuid) is
  'Ob diese Person ueberhaupt ein Postfach hat: als aktives Connect-Mitglied oder ueber eine angenommene Vorstellungsanfrage aus Find. Welche EINZELNE Unterhaltung sie benutzen darf, entscheidet can_use_network_conversation je Ursprung.';

CREATE OR REPLACE FUNCTION public.can_use_network_conversation(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        -- Aus Connect: angenommene Anfrage UND aktive Mitgliedschaft. Eine
        -- Sperre trifft auch das Lesen.
        (conversation.contact_request_id is not null
          and request.status = 'accepted'
          and public.is_network_member(p_user_id))
        -- Aus einem Problem: ebenfalls ein Connect-Vorgang.
        or (conversation.problem_interest_id is not null
          and public.is_network_member(p_user_id))
        -- Aus Find: dafuer braucht es Find, nicht Connect.
        or (conversation.discovery_intro_request_id is not null and intro.status = 'accepted')
        -- WIEDERHERGESTELLT VOM 24.09.2026: Verwaist - die Gegenseite ist
        -- gegangen, der Ursprung mit ihr. Der Verlauf bleibt lesbar; das
        -- Schreiben verhindert der Nachrichtenvertrag, nicht diese Regel.
        or conversation.participant_a_user_id is null
        or conversation.participant_b_user_id is null
      )
  );
$function$;

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
  -- Postfach ja oder nein. Welche Unterhaltung, entscheidet
  -- can_use_network_conversation je Ursprung.
  if not public.can_use_network_messaging(v_user_id) then
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
$function$;

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
  -- Postfach ja oder nein. Welche Unterhaltung, entscheidet
  -- can_use_network_conversation je Ursprung.
  if not public.can_use_network_messaging(v_user_id) then
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
$function$;

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
  -- Postfach ja oder nein. Welche Unterhaltung, entscheidet
  -- can_use_network_conversation je Ursprung.
  if not public.can_use_network_messaging(v_user_id) then
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
$function$;

CREATE OR REPLACE FUNCTION public.list_network_messages(p_conversation_id uuid)
 RETURNS TABLE(id uuid, conversation_id uuid, sender_user_id uuid, body text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  -- Postfach ja oder nein. Welche Unterhaltung, entscheidet
  -- can_use_network_conversation je Ursprung.
  if not public.can_use_network_messaging(v_user_id) then
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
$function$;

CREATE OR REPLACE FUNCTION public.send_network_message(p_conversation_id uuid, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_message_id uuid;
  v_created_at timestamptz := now();
begin
  -- Postfach ja oder nein. Welche Unterhaltung, entscheidet
  -- can_use_network_conversation je Ursprung.
  if not public.can_use_network_messaging(v_user_id) then
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
$function$;

comment on function public.can_use_network_conversation(uuid, uuid) is
  'Ob diese Person diese Unterhaltung benutzen darf - je Ursprung: Connect-Vorgaenge verlangen eine aktive Mitgliedschaft, eine Find-Vorstellung nicht. Eine verwaiste Unterhaltung bleibt lesbar.';

commit;
