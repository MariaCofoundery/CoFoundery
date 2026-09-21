begin;

-- ---------------------------------------------------------------------------
-- Wer die Gegenseite ist, stand an zwei Stellen - und die widersprachen sich
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 21.09.2026 beim Durchlaufen aller pgTAP-Suiten. Dieser Fehler
-- ist NICHT Teil der Regression vom 08.10.2026; er ist aelter und hat eine
-- andere Ursache - dieselbe Frage wurde an zwei Stellen beantwortet.
--
-- Seit dem 19.09.2026 kann sich ein Interesse nicht nur auf ein PROBLEM
-- richten, sondern auch auf einen ANSATZ dazu. Die Gegenseite ist dann eine
-- andere: nicht die Person, die das Problem geschildert hat, sondern die, die
-- den Ansatz geschrieben hat.
--
--   `accept_network_problem_interest` weiss das seit dem 19.09.2026.
--   `enforce_network_conversation_contract` wusste es nie - der Vertrag
--   verlangte unveraendert, dass Teilnehmer b der Problem-Autor ist.
--
-- FOLGE: Wer einen Ansatz geschrieben hatte und ein Interesse daran annehmen
-- wollte, bekam `network_conversation_participants_invalid`. Das Annehmen war
-- also seit dem Tag der Einfuehrung kaputt - fuer Ansaetze, nicht fuer
-- Probleme. Der zugehoerige Test war seither rot, und weil `npm run ci:check`
-- keine Datenbanktests ausfuehrt, sah es niemand.
--
-- REPARIERT MIT EINER GEMEINSAMEN QUELLE, statt die Antwort ein zweites Mal
-- hinzuschreiben: `network_problem_interest_counterpart` beantwortet die Frage
-- einmal, und beide fragen dort. Zwei Stellen, die dasselbe entscheiden,
-- laufen auseinander - genau das ist hier passiert.
-- ---------------------------------------------------------------------------

create or replace function public.network_problem_interest_counterpart(p_interest_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- Interesse am Problem selbst: die Person, die es geschildert hat.
    when interest.approach_id is null then problem.author_user_id
    -- Interesse an einem Ansatz: die Person, die ihn geschrieben hat. Nur
    -- solange der Ansatz aktiv ist - ein zurueckgezogener Ansatz hat keine
    -- Gegenseite mehr.
    else (
      select approach.author_user_id
      from public.network_problem_approaches approach
      where approach.id = interest.approach_id
        and approach.status = 'active'
    )
  end
  from public.network_problem_interests interest
  join public.network_problems problem on problem.id = interest.problem_id
  where interest.id = p_interest_id;
$$;

revoke all on function public.network_problem_interest_counterpart(uuid) from public, anon;
grant execute on function public.network_problem_interest_counterpart(uuid) to authenticated;

comment on function public.network_problem_interest_counterpart(uuid) is
  'Wer bei einem Interesse die Gegenseite ist: bei einem Interesse am Problem dessen Autor, bei einem Interesse an einem Ansatz dessen Autor. Die eine Quelle fuer diese Frage - vorher stand die Antwort in accept_network_problem_interest und im Vertrag der Unterhaltung, und die beiden widersprachen sich.';

create or replace function public.enforce_network_conversation_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
  v_interest public.network_problem_interests%rowtype;
  v_counterpart uuid;
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

  -- Die Gegenseite kommt aus der gemeinsamen Quelle. Vorher stand hier der
  -- Autor des Problems - und damit scheiterte jedes Interesse an einem ANSATZ,
  -- denn dort ist die Gegenseite der Autor des Ansatzes.
  v_counterpart := public.network_problem_interest_counterpart(new.problem_interest_id);
  if v_counterpart is null then
    raise exception 'network_conversation_requires_interest' using errcode = '23514';
  end if;

  if new.participant_a_user_id <> v_interest.user_id
    or new.participant_b_user_id <> v_counterpart then
    raise exception 'network_conversation_participants_invalid' using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.enforce_network_conversation_contract() is
  'Prueft beim Anlegen und Aendern einer Unterhaltung, dass sie zu ihrem Ursprung passt. Die Gegenseite eines Problem-Interesses kommt aus network_problem_interest_counterpart - bei einem Interesse an einem Ansatz ist das dessen Autor und nicht der Autor des Problems.';

commit;
