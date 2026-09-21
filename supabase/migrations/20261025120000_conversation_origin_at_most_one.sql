begin;

-- ---------------------------------------------------------------------------
-- "Genau ein Ursprung" beim Anlegen, "höchstens einer" danach
-- ---------------------------------------------------------------------------
--
-- ZWEITE SCHICHT DERSELBEN REGRESSION VOM 08.10.2026 (die erste steht in
-- 20261024120000): Dieselbe Migration hat nicht nur die Schutzklauseln im
-- Vertrag verloren, sondern auch die Lockerung der Bedingung.
--
--   24.09.2026 machte aus "genau einer" ausdruecklich "hoechstens einer", mit
--   dieser Begruendung: "Faellt die Person weg, faellt ihr Ursprung mit - und
--   ohne diese Lockerung schluege die Bedingung bei genau dem Update fehl, das
--   der Fremdschluessel ausloest."
--
--   08.10.2026 schrieb sie auf "= 1" zurueck, um den dritten Ursprung
--   aufzunehmen - und nahm die Begruendung nicht mit.
--
-- Seither scheiterte eine Kontoloeschung an dieser Bedingung, sobald die
-- betroffene Person eine Unterhaltung hatte: `on delete set null` loest den
-- Ursprung, und "= 1" verbietet genau das.
--
-- UND DIESMAL OHNE DEN ALTEN KOMPROMISS. Am 24.09.2026 war die Folge der
-- Lockerung, dass sich eine Unterhaltung OHNE Ursprung auch anlegen liess -
-- die Bedingung kann nicht zwischen Einfuegen und Aendern unterscheiden. Ein
-- Trigger kann das. Deshalb:
--
--   Die Bedingung verbietet ZWEI Urspruenge - immer, und das ist die
--   Zusage, die wirklich zaehlt: Eine Unterhaltung hat nie zwei Herkuenfte.
--
--   Der Vertrag verlangt beim EINFUEGEN genau einen. Eine Unterhaltung ohne
--   Herkunft entsteht damit nur noch durch eine Kontoloeschung - und nicht
--   mehr durch einen Programmierfehler.
--
-- Zusammen ist das strenger als beide Fassungen davor.
-- ---------------------------------------------------------------------------

alter table public.network_conversations
  drop constraint network_conversations_single_origin_check;

alter table public.network_conversations
  add constraint network_conversations_single_origin_check
    check (
      (contact_request_id is not null)::int
      + (problem_interest_id is not null)::int
      + (discovery_intro_request_id is not null)::int
      <= 1
    );

-- ---------------------------------------------------------------------------
-- Und der Vertrag holt die Strenge zurueck, wo sie hingehoert
-- ---------------------------------------------------------------------------
--
-- Unveraendert aus 20261024120000, mit EINER neuen Pruefung am Anfang. Der
-- ganze Koerper steht hier, weil `create or replace function` keinen
-- Teilersatz kennt - und genau dieses Kopieren war der Anlass fuer beide
-- Migrationen: Am 08.10.2026 gingen beim Kopieren zwei Zeilen verloren.
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
  v_origins integer;
begin
  v_origins :=
    (new.contact_request_id is not null)::int
    + (new.problem_interest_id is not null)::int
    + (new.discovery_intro_request_id is not null)::int;

  -- BEIM ANLEGEN GENAU EINER. Ohne Herkunft laesst sich keine Unterhaltung
  -- eroeffnen - die Bedingung kann das nicht pruefen, der Trigger schon.
  if tg_op = 'INSERT' and v_origins <> 1 then
    raise exception 'network_conversation_requires_origin' using errcode = '23514';
  end if;

  -- Die zwei Schutzklauseln vom 24.09.2026: Eine Unterhaltung ohne Ursprung
  -- oder ohne beide Teilnehmenden entsteht ausschliesslich durch eine
  -- Kontoloeschung. Es gibt dann nichts mehr abzugleichen - und den Verlauf
  -- der verbliebenen Seite darf das nicht kosten.
  if v_origins = 0 then
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

comment on constraint network_conversations_single_origin_check on public.network_conversations is
  'Eine Unterhaltung hat nie zwei Herkuenfte. Null Herkuenfte sind erlaubt, weil eine Kontoloeschung den Ursprung loest (on delete set null); dass beim ANLEGEN genau eine vorliegen muss, erzwingt enforce_network_conversation_contract.';

commit;
