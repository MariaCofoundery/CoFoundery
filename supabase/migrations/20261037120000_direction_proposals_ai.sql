begin;

-- ---------------------------------------------------------------------------
-- Das Modell schlaegt vor - die Datenbank rechnet nach
-- ---------------------------------------------------------------------------
--
-- SCHRITT S4 aus `web/docs/direction-interview-technical-brief.md`.
--
-- DER UNTERSCHIED ZU CAPABILITY, und er ist der Grund fuer jede Regel hier:
-- Dort waehlt ein Modell aus 48 geschlossenen Begriffen - es kann nichts
-- erfinden, hoechstens danebengreifen. Hier SCHREIBT es einen Satz ueber
-- einen Menschen. Drei Dinge halten das in Grenzen:
--
--   1. Das Pflichtzitat, hier nachgerechnet. Ein Satz ohne Beleg aus der
--      eigenen Antwort entsteht nicht.
--   2. Die Bestaetigung als Pflicht: Ein Vorschlag steht in einer anderen
--      Tabelle als eine Aussage, und nur Aussagen werden woanders gelesen.
--   3. Eine Herkunftsangabe statt einer Zahl.
--
-- UND DER TEXT BLEIBT, WO ER IST: `get_ai_job_source_text` gibt dem Arbeiter
-- nur die ANTWORT, nicht die Frage - das gilt fuer Direction unveraendert,
-- weil beide Arten in derselben Tabelle liegen. Die Frage wuerde die
-- Zitatpruefung aufweichen: Ein Modell koennte Teile der FRAGE als Beleg
-- ausgeben.
-- ---------------------------------------------------------------------------

alter table public.ai_jobs drop constraint ai_jobs_job_type_check;
alter table public.ai_jobs add constraint ai_jobs_job_type_check check (job_type in (
  'ping',
  'connect_resource_extraction',
  'capability_area_proposal',
  'direction_statement_proposal'
));

-- ---------------------------------------------------------------------------
-- 1. Die Person fragt
-- ---------------------------------------------------------------------------
/**
 * NUR AUF AUSDRUECKLICHE ANFORDERUNG, und nur fuer eine eigene, beantwortete
 * Direction-Antwort. Nichts laeuft automatisch los: Der privateste Text im
 * Produkt geht nicht deshalb an ein Modell, weil jemand eine Seite geoeffnet
 * hat.
 */
create or replace function public.request_direction_statement_proposals(p_turn_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_owns boolean;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.capability_interview_turns turn
    join public.capability_interview_sessions session on session.id = turn.session_id
    where turn.id = p_turn_id
      and session.user_id = v_user
      and turn.answer is not null
      -- Die Art muss stimmen: Eine Capability-Antwort darf hier nicht
      -- hineinrutschen, sonst entstuenden Richtungs-Aussagen aus einer
      -- Erzaehlung ueber Faehigkeiten.
      and turn.kind = 'direction'
  ) into v_owns;

  if not v_owns then
    raise exception 'direction_turn_not_readable' using errcode = '42501';
  end if;

  return public.enqueue_ai_job(
    'direction_statement_proposal', 'capability_interview_turns', p_turn_id
  );
end;
$$;

revoke all on function public.request_direction_statement_proposals(uuid) from public, anon;
grant execute on function public.request_direction_statement_proposals(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Der Arbeiter schreibt - wenn der Beleg stimmt
-- ---------------------------------------------------------------------------
/**
 * Dieselbe Pruefung wie bei den Faehigkeitsvorschlaegen, in denselben Worten:
 * Das Zitat muss NORMALISIERT in der Antwort vorkommen (Leerraum darf sich
 * unterscheiden, Gross- und Kleinschreibung auch). Ein Modell, das etwas
 * hinzudichtet, bekommt hier ein `false` und keinen Eintrag.
 *
 * `false` STATT AUSNAHME: Ein misslungener Vorschlag darf die uebrigen
 * derselben Antwort nicht mitnehmen. Der Arbeiter schickt sie einzeln.
 */
create or replace function public.insert_ai_direction_proposal(
  p_job_id uuid,
  p_facet text,
  p_statement text,
  p_quote text,
  p_model text default null,
  p_prompt_version text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
  v_source text;
  v_normalized_source text;
  v_normalized_quote text;
  v_statement text := btrim(coalesce(p_statement, ''));
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id
    and job.status = 'running'
    and job.job_type = 'direction_statement_proposal';
  if not found then return false; end if;

  -- Eine erfundene Rubrik faengt der Constraint ohnehin - aber als Fehler,
  -- und der wuerde die uebrigen Vorschlaege mitnehmen.
  if p_facet not in (
    'recurring_theme', 'problem_cared_about', 'people_cared_about',
    'desired_change', 'meaningful_outcome', 'energising_activity',
    'preferred_contribution', 'frustrating_condition', 'recurring_tension',
    'open_question'
  ) then
    return false;
  end if;

  -- Eine Aussage, die laenger ist als ein Satz, ist keine Richtung mehr.
  if char_length(v_statement) < 3 or char_length(v_statement) > 200 then
    return false;
  end if;

  v_source := public.get_ai_job_source_text(p_job_id);
  if v_source is null then return false; end if;

  v_normalized_source := regexp_replace(lower(v_source), '\s+', ' ', 'g');
  v_normalized_quote := btrim(regexp_replace(lower(coalesce(p_quote, '')), '\s+', ' ', 'g'));

  -- Ein einzelnes Wort ist kein Beleg; das findet sich immer.
  if char_length(v_normalized_quote) < 12 then return false; end if;
  if position(v_normalized_quote in v_normalized_source) = 0 then return false; end if;

  insert into public.direction_statement_proposals (
    turn_id, facet, statement, evidence_quote, model, prompt_version
  )
  values (
    v_job.source_id, p_facet, v_statement, btrim(p_quote),
    left(nullif(btrim(coalesce(p_model, '')), ''), 60), p_prompt_version
  );

  return true;
end;
$$;

revoke all on function public.insert_ai_direction_proposal(uuid, text, text, text, text, text)
  from public, anon;
-- DAS AUSFUEHRUNGSRECHT LIEGT BEI `authenticated`, UND DAS IST ABSICHT: Der
-- Arbeiter hat keinen Service-Role-Schluessel. Er meldet sich mit einem
-- eigenen Konto an und ist damit ein gewoehnlicher angemeldeter Nutzer - die
-- Schranke ist `is_ai_worker()` IN der Funktion, nicht das Recht davor.
-- Genauso ist `insert_ai_capability_proposal` vergeben.
--
-- Ich hatte es hier zuerst auch `authenticated` entzogen. Das sah strenger
-- aus und haette den Arbeiter in der Produktion mit "permission denied"
-- stehen lassen; der pgTAP-Test hat es gefangen.
grant execute on function public.insert_ai_direction_proposal(uuid, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Der Mensch entscheidet
-- ---------------------------------------------------------------------------
/**
 * Aus einem Vorschlag wird eine Aussage - oder eben nicht.
 *
 * WARUM DAS EINE FUNKTION IST und nicht zwei Schreibzugriffe der Anwendung:
 * Die Herkunft (`confirmed_proposal` gegen `edited_proposal`) soll eine
 * Tatsache sein und keine Behauptung des Aufrufers. Hier entsteht sie aus dem
 * Vergleich mit dem, was das Modell geschrieben hat - und die beiden
 * Schreibvorgaenge haengen zusammen: eine Aussage ohne entschiedenen
 * Vorschlag waere ein Vorschlag, der zweimal bestaetigt werden kann.
 *
 * DIE STUFE IST `one_example`, IMMER. Der Beleg ist EINE Antwort, also ist es
 * ein Beispiel - auch wenn die Person den Satz umformuliert. `recurring`
 * verlangt einen Fund ueber mehrere Antworten hinweg; den gibt es noch nicht,
 * und ihn zu behaupten waere genau die Scheinpraezision, die dieses Interview
 * nicht haben soll. `tentative` waere eine Selbsteinschaetzung des Modells.
 */
create or replace function public.confirm_direction_proposal(
  p_proposal_id uuid,
  p_statement text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_proposal public.direction_statement_proposals;
  v_owner uuid;
  v_statement text;
  v_origin text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select proposal.* into v_proposal
  from public.direction_statement_proposals proposal
  where proposal.id = p_proposal_id
  for update;
  if not found or v_proposal.status <> 'pending' then
    return null;
  end if;

  select session.user_id into v_owner
  from public.capability_interview_turns turn
  join public.capability_interview_sessions session on session.id = turn.session_id
  where turn.id = v_proposal.turn_id;

  if v_owner is null or v_owner <> v_user then
    raise exception 'direction_proposal_not_yours' using errcode = '42501';
  end if;

  v_statement := btrim(coalesce(nullif(btrim(coalesce(p_statement, '')), ''), v_proposal.statement));
  if char_length(v_statement) < 3 or char_length(v_statement) > 200 then
    raise exception 'direction_statement_length' using errcode = '22001';
  end if;

  v_origin := case when v_statement = v_proposal.statement
    then 'confirmed_proposal' else 'edited_proposal' end;

  insert into public.direction_statements (
    user_id, facet, statement, confidence, origin, source_turn_id
  )
  values (v_user, v_proposal.facet, v_statement, 'one_example', v_origin, v_proposal.turn_id)
  returning id into v_id;

  update public.direction_statement_proposals
  set status = 'accepted', decided_at = pg_catalog.now()
  where id = p_proposal_id;

  return v_id;
end;
$$;

revoke all on function public.confirm_direction_proposal(uuid, text) from public, anon;
grant execute on function public.confirm_direction_proposal(uuid, text) to authenticated;

commit;
