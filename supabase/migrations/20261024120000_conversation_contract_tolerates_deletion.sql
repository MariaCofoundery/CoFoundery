begin;

-- ---------------------------------------------------------------------------
-- Eine Kontoloeschung darf an einer Unterhaltung nicht scheitern
-- ---------------------------------------------------------------------------
--
-- REGRESSION VOM 08.10.2026, gefunden am 21.09.2026 beim Durchlaufen aller
-- pgTAP-Suiten - sechs davon waren rot, und weil `npm run ci:check` keine
-- Datenbanktests ausfuehrt, sah es niemand.
--
-- WAS PASSIERT IST, in drei Schritten:
--
--   24.09.2026 (`20260924120000_conversations_outlive_account.sql`) hat
--   Unterhaltungen eine Kontoloeschung ueberleben lassen: Die Verknuepfungen
--   loesen sich (`on delete set null`), der Verlauf der verbliebenen Seite
--   bleibt lesbar. Dazu bekam der Vertrag zwei Schutzklauseln - "ist kein
--   Ursprung mehr da, gibt es nichts zu pruefen" und "fehlt eine
--   teilnehmende Person, gibt es nichts abzugleichen". Ohne sie schlaegt
--   genau das Update fehl, das der Fremdschluessel selbst ausloest.
--
--   08.10.2026 (`20261008120000_discovery_intro_conversations.sql`) hat den
--   Vertrag um einen dritten Ursprung erweitert - Vorstellungsanfragen aus
--   Find - und dabei die beiden Schutzklauseln verloren. `create or replace
--   function` ersetzt den ganzen Koerper; wer eine Stelle ergaenzt, muss alles
--   andere mitnehmen, und hier fehlten zwei Zeilen.
--
--   SEITDEM: Wer eine angenommene Kontaktanfrage und damit eine Unterhaltung
--   hatte, konnte sein Konto nicht mehr loeschen. Die Loeschung setzt die
--   Anfrage auf null und die teilnehmende Person auf null; der Vertrag prueft
--   daraufhin einen Ursprung, den es nicht mehr gibt, und bricht mit
--   `network_conversation_requires_accepted_request` ab. Das trifft jeden, der
--   das Produkt wirklich benutzt hat - also genau die Fehlerart, gegen die am
--   18.09.2026 schon einmal aufgeraeumt wurde.
--
-- WIEDERHERGESTELLT, mit dem dritten Ursprung darin. Der Rest des Koerpers ist
-- unveraendert aus der Fassung vom 08.10.2026 uebernommen.
--
-- WARUM DAS KEINE LOCKERUNG IST: Beide Klauseln greifen nur bei Zustaenden,
-- die ausschliesslich durch eine Kontoloeschung entstehen koennen. Eine
-- Unterhaltung ohne Ursprung laesst sich nicht anlegen - der Constraint
-- verlangt beim Einfuegen genau einen -, und eine ohne Teilnehmende auch
-- nicht. Geprueft wird weiterhin alles, was sich pruefen laesst.
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
  -- DIE ZWEI SCHUTZKLAUSELN. Sie standen am 24.09.2026 hier und sind am
  -- 08.10.2026 verloren gegangen.
  --
  -- Eine Unterhaltung ohne Ursprung oder ohne beide Teilnehmenden entsteht
  -- ausschliesslich durch eine Kontoloeschung. Es gibt dann nichts mehr
  -- abzugleichen - und den Verlauf der verbliebenen Seite darf das nicht
  -- kosten.
  if new.contact_request_id is null
    and new.problem_interest_id is null
    and new.discovery_intro_request_id is null then
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

comment on function public.enforce_network_conversation_contract() is
  'Prueft beim Anlegen und Aendern einer Unterhaltung, dass sie zu ihrem Ursprung passt - angenommene Kontaktanfrage, angenommene Vorstellungsanfrage oder Interesse an einem Problem. Toleriert ausdruecklich einen fehlenden Ursprung und fehlende Teilnehmende: Beides entsteht nur durch eine Kontoloeschung, und die darf nicht an einer Unterhaltung scheitern.';

commit;
