begin;

-- ---------------------------------------------------------------------------
-- Dritte Schicht derselben Regression vom 08.10.2026
-- ---------------------------------------------------------------------------
--
-- Nach dem Vertrag der Unterhaltung (20261024120000) und der Bedingung zum
-- Ursprung (20261025120000) fehlt noch der Vertrag der NACHRICHT. Auch er
-- wurde am 08.10.2026 um den dritten Ursprung erweitert und hat dabei zwei
-- Dinge verloren, die am 24.09.2026 ausdruecklich hineingeschrieben worden
-- waren.
--
-- 1. DIE ZEILE MIT DER VORHERSAGE. Sie stand dort mit diesem Kommentar:
--
--      "Das Trennen der Verknuepfung ist selbst ein Update auf sender_user_id
--       und laeuft damit durch diesen Vertrag. Es gibt dann nichts zu pruefen:
--       Die Nachricht ist geschrieben, sie wird nur anonym. Ohne diese Zeile
--       haette der Trigger JEDE Kontoloeschung abgebrochen, an der eine
--       Nachricht haengt."
--
--    Genau das ist seit dem 08.10.2026 der Zustand gewesen.
--
-- 2. DEN EHRLICHEN FEHLER. Wer in eine verwaiste Unterhaltung schreiben will -
--    die Gegenseite ist gegangen -, bekam `network_message_request_not_accepted`.
--    Das ist doppelt falsch: Die Anfrage war angenommen, sie existiert nur
--    nicht mehr. Der Grund ist ein anderer, und er hat einen eigenen Namen:
--    `network_conversation_counterpart_gone`.
--
--    DASS DAS SCHREIBEN VERWEIGERT WIRD, IST RICHTIG und bleibt: Es gaebe
--    keinen Empfaenger, die Nachricht laege nur da. Lesen bleibt erlaubt - der
--    Verlauf gehoert der Haelfte, die bleibt.
--
-- Der uebrige Koerper ist unveraendert aus der Fassung vom 08.10.2026.
-- ---------------------------------------------------------------------------

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
  -- Wiederhergestellt vom 24.09.2026: Das Trennen der Verknuepfung ist selbst
  -- ein Update auf sender_user_id und laeuft damit durch diesen Vertrag. Es
  -- gibt dann nichts zu pruefen - die Nachricht ist geschrieben, sie wird nur
  -- anonym.
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

  -- Ebenfalls wiederhergestellt: In eine verwaiste Unterhaltung schreibt
  -- niemand mehr, und der Grund dafuer wird beim Namen genannt.
  if v_conversation.participant_a_user_id is null
    or v_conversation.participant_b_user_id is null then
    raise exception 'network_conversation_counterpart_gone' using errcode = '42501';
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

comment on function public.enforce_network_message_contract() is
  'Prueft beim Schreiben einer Nachricht, dass Absender und Ursprung zur Unterhaltung passen. Toleriert einen fehlenden Absender (das Anonymisieren bei einer Kontoloeschung laeuft selbst durch diesen Vertrag) und verweigert das Schreiben in eine verwaiste Unterhaltung mit eigenem Grund: network_conversation_counterpart_gone.';

commit;
