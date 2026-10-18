begin;

-- ---------------------------------------------------------------------------
-- Das Staerken-Interview - getrennt vom Capability-Interview
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 18.10.2026: Der Weg "Staerken im Interview entdecken" fuehrte in
-- das Capability-Interview, und am Ende stand eine Einordnung in
-- Funktionsbereiche ("Marketing & Brand", "Strategie & Geschaeftsmodell").
-- Das ist die Antwort auf "was kann ich", nicht auf "welche persoenlichen
-- Staerken zeigen sich in meinem Verhalten".
--
-- BIS HIERHER WAREN STAERKEN EIN NEBENPRODUKT: Der Job
-- `capability_area_proposal` fragte das Modell nach Bereichen UND nebenbei
-- nach einem Satz `strength`; `insert_ai_strength_proposal` nahm nur diesen
-- Job an, und `unique(turn_id)` liess genau einen Satz je Antwort zu.
--
-- JETZT, ALLES ADDITIV:
--
--   1. eine dritte Gespraechsart `strengths` (eigene Fragen, eigene Sitzung -
--      dieselben Tabellen, wie bei `direction`),
--   2. ein eigener Job-Typ `strength_proposal`, der ein ganzes
--      abgeschlossenes Staerken-Interview liest statt einer Antwort,
--   3. Bezeichnung und Begruendung an Vorschlag und Staerke (nullable - alte
--      Zeilen bleiben gueltig, wie sie sind),
--   4. mehrere Vorschlaege je Gespraech; die Antwort, an der das Zitat
--      haengt, ist der PRIMAERE Beleg, keine fachliche Eins-zu-eins-Regel,
--   5. eigene Anforderungs-, Lese- und Schreibfunktionen.
--
-- ABWAERTSKOMPATIBEL FUER DEN ROLLOUT: Waehrend eines Deployments kann noch
-- ein alter Arbeiter laufen, der `insert_ai_strength_proposal(job, statement,
-- quote, model, version)` mit einem `capability_area_proposal`-Job aufruft.
-- Diese alte Fassung bleibt deshalb hier bestehen (gleiche Signatur, gleiches
-- Verhalten) - neuer Code ruft sie nicht mehr auf. Sie wird erst mit der
-- getrennten Aufraeum-Migration entfernt
-- (`supabase/pending/20261206120000_strength_interview_cleanup.sql`), nach
-- Deployment und Production-Smoke-Test.
--
-- Keine bestehende Zeile wird veraendert oder geloescht.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Die Gespraechsart
-- ---------------------------------------------------------------------------
alter table public.capability_interview_sessions
  drop constraint capability_interview_sessions_kind_check;
alter table public.capability_interview_sessions
  add constraint capability_interview_sessions_kind_check
  check (kind in ('capability', 'direction', 'strengths'));

comment on table public.capability_interview_sessions is
  'Ein gefuehrtes Gespraech. `kind` sagt, welches: capability (Faehigkeiten, erzeugt Evidenz in person_capability_evidence), direction (Antriebe, erzeugt bestaetigte Aussagen) oder strengths (persoenliche Staerken aus erzaehlten Situationen, erzeugt Vorschlaege in person_strength_proposals). Der Tabellenname ist aelter als die Spalte.';


-- ---------------------------------------------------------------------------
-- 2. Der Job-Typ
-- ---------------------------------------------------------------------------
alter table public.ai_jobs drop constraint ai_jobs_job_type_check;
alter table public.ai_jobs add constraint ai_jobs_job_type_check check (job_type in (
  'ping',
  'connect_resource_extraction',
  'capability_area_proposal',
  'direction_statement_proposal',
  'strength_proposal'
));


-- ---------------------------------------------------------------------------
-- 3. Vorschlaege: Bezeichnung, Begruendung, Gespraech
-- ---------------------------------------------------------------------------
--
-- `session_id` ist das Gespraech, aus dem der Vorschlag stammt. Es steht
-- dabei, weil Dubletten je GESPRAECH zusammengefuehrt werden und nicht je
-- Antwort - eine Staerke kann sich in mehreren Situationen zeigen.
--
-- ALTE VORSCHLAEGE (aus dem Capability-Job) haben keine Bezeichnung, keine
-- Begruendung und kein Gespraech. Sie bleiben genau so gueltig; die
-- Bedingung unten verlangt nur, dass ein Vorschlag entweder ganz alt oder
-- ganz neu ist.
alter table public.person_strength_proposals
  add column label text,
  add column rationale text,
  add column session_id uuid
    references public.capability_interview_sessions (id) on delete cascade;

alter table public.person_strength_proposals
  add constraint person_strength_proposals_label_length
    check (label is null or char_length(btrim(label)) between 2 and 60),
  add constraint person_strength_proposals_rationale_length
    check (rationale is null or char_length(btrim(rationale)) between 10 and 400),
  add constraint person_strength_proposals_shape
    check (
      (label is null and rationale is null and session_id is null)
      or (label is not null and rationale is not null and session_id is not null)
    );

-- `unique(turn_id)` faellt. Fuer die alten Vorschlaege bleibt die Zusage als
-- Teilindex bestehen (sie wurden so erzeugt); fuer die neuen gilt: dieselbe
-- Bezeichnung nur einmal je Gespraech - auch nicht, nachdem sie abgelehnt
-- wurde. Wer "Passt nicht" sagt, soll denselben Vorschlag nicht beim
-- naechsten Lesen wieder vorgelegt bekommen.
alter table public.person_strength_proposals
  drop constraint person_strength_proposals_once;

create unique index person_strength_proposals_legacy_once
  on public.person_strength_proposals (turn_id)
  where label is null;

create unique index person_strength_proposals_session_label
  on public.person_strength_proposals (session_id, lower(btrim(label)))
  where label is not null;

create index person_strength_proposals_session_idx
  on public.person_strength_proposals (session_id, status)
  where session_id is not null;

comment on column public.person_strength_proposals.turn_id is
  'Die Antwort, aus der das Zitat stammt - der primaere Beleg. Keine Aussage darueber, dass die Staerke nur zu dieser einen Situation gehoert.';


-- ---------------------------------------------------------------------------
-- 4. Staerken: eine optionale Bezeichnung
-- ---------------------------------------------------------------------------
alter table public.person_strengths
  add column label text;

alter table public.person_strengths
  add constraint person_strengths_label_length
    check (label is null or char_length(btrim(label)) between 2 and 60);

comment on column public.person_strengths.label is
  'Kurze Bezeichnung ("Verantwortung uebernehmen"). Optional: eigene Saetze und alte Staerken haben keine.';


-- ---------------------------------------------------------------------------
-- 5. Capability bleibt Capability
-- ---------------------------------------------------------------------------
--
-- Unveraendert bis auf eine Zeile: Die Capability-Auswertung darf nur noch
-- Antworten aus einem Capability-Gespraech anfordern. Vorher war die Art gar
-- nicht geprueft - eine Staerken- oder Direction-Antwort waere sonst in die
-- Bereichszuordnung gelaufen.
create or replace function public.request_capability_area_proposals(p_turn_id uuid)
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
      and turn.kind = 'capability'
      and turn.answer is not null
  ) into v_owns;

  if not v_owns then
    raise exception 'capability_turn_not_readable' using errcode = '42501';
  end if;

  return public.enqueue_ai_job('capability_area_proposal', 'capability_interview_turns', p_turn_id);
end;
$$;

revoke all on function public.request_capability_area_proposals(uuid) from public, anon;
grant execute on function public.request_capability_area_proposals(uuid) to authenticated;

-- DER ALTE SCHREIBWEG BLEIBT WAEHREND DES ROLLOUTS - neu definiert, nicht
-- veraendert. Grund: Er schrieb mit `on conflict (turn_id) do nothing`, und
-- dieser Konflikt-Bezug braucht einen passenden Unique-Index. Ohne die
-- Neudefinition wuerde der alte Arbeiter nach dem Wegfall von
-- `person_strength_proposals_once` bei jedem Aufruf mit einem Fehler
-- abbrechen. Jetzt verweist er auf den Teilindex der alten Zeilen
-- (`where label is null`) und schreibt genau wie vorher: nur fuer
-- `capability_area_proposal`-Jobs, ein Satz je Antwort, ohne Bezeichnung,
-- Begruendung und Gespraech.
--
-- NEUER CODE RUFT IHN NICHT AUF (ein Test prueft den Arbeiter). Entfernt wird
-- er mit `supabase/pending/20261206120000_strength_interview_cleanup.sql`.
create or replace function public.insert_ai_strength_proposal(
  p_job_id uuid,
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
    and job.job_type = 'capability_area_proposal';
  if not found then return false; end if;

  if char_length(v_statement) < 3 or char_length(v_statement) > 200 then
    return false;
  end if;

  v_source := public.get_ai_job_source_text(p_job_id);
  if v_source is null then return false; end if;

  v_normalized_source := regexp_replace(lower(v_source), '\s+', ' ', 'g');
  v_normalized_quote := btrim(regexp_replace(lower(coalesce(p_quote, '')), '\s+', ' ', 'g'));

  if char_length(v_normalized_quote) < 12 then return false; end if;
  if position(v_normalized_quote in v_normalized_source) = 0 then return false; end if;

  insert into public.person_strength_proposals (
    turn_id, statement, evidence_quote, model, prompt_version
  )
  values (
    v_job.source_id, v_statement, btrim(p_quote),
    left(nullif(btrim(coalesce(p_model, '')), ''), 60), p_prompt_version
  )
  on conflict (turn_id) where label is null do nothing;

  return found;
end;
$$;

revoke all on function public.insert_ai_strength_proposal(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.insert_ai_strength_proposal(uuid, text, text, text, text)
  to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Die Person fragt
-- ---------------------------------------------------------------------------
--
-- NUR AUF AUSDRUECKLICHE ANFORDERUNG, nur fuer ein eigenes, ABGESCHLOSSENES
-- Staerken-Interview mit mindestens einer Antwort. Gelesen wird das ganze
-- Gespraech auf einmal - Staerken zeigen sich ueber Situationen hinweg, und
-- Dubletten lassen sich nur so zusammenfuehren.
create or replace function public.request_strength_proposals(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ok boolean;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.capability_interview_sessions session
    where session.id = p_session_id
      and session.user_id = v_user
      and session.kind = 'strengths'
      and session.status = 'completed'
      and exists (
        select 1 from public.capability_interview_turns turn
        where turn.session_id = session.id and turn.answer is not null
      )
  ) into v_ok;

  if not v_ok then
    raise exception 'strength_session_not_readable' using errcode = '42501';
  end if;

  return public.enqueue_ai_job('strength_proposal', 'capability_interview_sessions', p_session_id);
end;
$$;

revoke all on function public.request_strength_proposals(uuid) from public, anon;
grant execute on function public.request_strength_proposals(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 7. Der Arbeiter liest - genau dieses eine Gespraech
-- ---------------------------------------------------------------------------
--
-- Wie `get_ai_job_source_text`: nur waehrend der Job laeuft, nur fuer
-- Staerken-Jobs, nur die Antworten (nicht die Fragetexte - die stehen im
-- Sprachbundle), und nur, solange das Gespraech der Person gehoert, fuer die
-- der Job angelegt wurde.
create or replace function public.get_ai_strength_job_answers(p_job_id uuid)
returns table (turn_id uuid, question_id text, answer text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id
    and job.status = 'running'
    and job.job_type = 'strength_proposal'
    and job.source_table = 'capability_interview_sessions';
  if not found then return; end if;

  return query
  select turn.id, turn.question_id, turn.answer
  from public.capability_interview_turns turn
  join public.capability_interview_sessions session on session.id = turn.session_id
  where session.id = v_job.source_id
    and session.user_id = v_job.subject_user_id
    and session.kind = 'strengths'
    and turn.answer is not null
  order by turn.sort_order;
end;
$$;

revoke all on function public.get_ai_strength_job_answers(uuid) from public, anon;
grant execute on function public.get_ai_strength_job_answers(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 8. Der Arbeiter schreibt - mit Beleg, nur fuer Staerken-Jobs
-- ---------------------------------------------------------------------------
--
-- Gibt false zurueck statt zu werfen, wenn etwas nicht traegt: Ein nicht
-- belegbarer Vorschlag darf die uebrigen desselben Gespraechs nicht
-- mitnehmen.
create or replace function public.insert_ai_strength_proposal(
  p_job_id uuid,
  p_turn_id uuid,
  p_label text,
  p_statement text,
  p_rationale text,
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
  v_answer text;
  v_label text := btrim(coalesce(p_label, ''));
  v_statement text := btrim(coalesce(p_statement, ''));
  v_rationale text := btrim(coalesce(p_rationale, ''));
  v_normalized_source text;
  v_normalized_quote text;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id
    and job.status = 'running'
    and job.job_type = 'strength_proposal'
    and job.source_table = 'capability_interview_sessions';
  if not found then return false; end if;

  if char_length(v_label) not between 2 and 60
    or char_length(v_statement) not between 3 and 200
    or char_length(v_rationale) not between 10 and 400 then
    return false;
  end if;

  -- Ein Satz UEBER die Person ist keine beobachtete Staerke. Dieselbe Grenze
  -- steht in der Pruefung des Arbeiters; hier steht sie ein zweites Mal,
  -- weil die Datenbank keinem Aufrufer vertraut.
  if concat_ws(' ', v_label, v_statement, v_rationale) ~* '(\mdu bist\M|\myou are\M|pers(ö|oe)nlichkeit|personality)' then
    return false;
  end if;

  -- Die Antwort muss zu genau diesem Gespraech gehoeren.
  select turn.answer into v_answer
  from public.capability_interview_turns turn
  join public.capability_interview_sessions session on session.id = turn.session_id
  where turn.id = p_turn_id
    and session.id = v_job.source_id
    and session.user_id = v_job.subject_user_id
    and session.kind = 'strengths'
    and turn.answer is not null;
  if v_answer is null then return false; end if;

  v_normalized_source := regexp_replace(lower(v_answer), '\s+', ' ', 'g');
  v_normalized_quote := btrim(regexp_replace(lower(coalesce(p_quote, '')), '\s+', ' ', 'g'));

  if char_length(v_normalized_quote) < 12 then return false; end if;
  if position(v_normalized_quote in v_normalized_source) = 0 then return false; end if;

  insert into public.person_strength_proposals (
    turn_id, session_id, label, statement, rationale, evidence_quote, model, prompt_version
  )
  values (
    p_turn_id, v_job.source_id, v_label, v_statement, v_rationale, left(btrim(p_quote), 300),
    left(nullif(btrim(coalesce(p_model, '')), ''), 60), p_prompt_version
  )
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.insert_ai_strength_proposal(uuid, uuid, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.insert_ai_strength_proposal(uuid, uuid, text, text, text, text, text, text)
  to authenticated;


-- ---------------------------------------------------------------------------
-- 9. Der Mensch entscheidet - jetzt mit Bezeichnung
-- ---------------------------------------------------------------------------
--
-- Bezeichnung und Aussage koennen vor dem Uebernehmen geaendert werden. Die
-- Herkunft entsteht weiterhin hier aus dem Vergleich: unveraendert heisst
-- `confirmed_proposal`, sonst `edited_proposal`. Ein alter Vorschlag ohne
-- Bezeichnung bleibt ohne - es sei denn, die Person gibt selbst eine an.
drop function public.confirm_strength_proposal(uuid, text);

create or replace function public.confirm_strength_proposal(
  p_proposal_id uuid,
  p_statement text default null,
  p_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_proposal public.person_strength_proposals;
  v_owner uuid;
  v_statement text;
  v_label text;
  v_origin text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select proposal.* into v_proposal
  from public.person_strength_proposals proposal
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
    raise exception 'strength_proposal_not_yours' using errcode = '42501';
  end if;

  v_statement := btrim(coalesce(nullif(btrim(coalesce(p_statement, '')), ''), v_proposal.statement));
  if char_length(v_statement) < 3 or char_length(v_statement) > 200 then
    raise exception 'strength_statement_length' using errcode = '22001';
  end if;

  v_label := nullif(btrim(coalesce(nullif(btrim(coalesce(p_label, '')), ''), v_proposal.label, '')), '');
  if v_label is not null and char_length(v_label) not between 2 and 60 then
    raise exception 'strength_label_length' using errcode = '22001';
  end if;

  v_origin := case
    when v_statement = v_proposal.statement and v_label is not distinct from v_proposal.label
      then 'confirmed_proposal'
    else 'edited_proposal'
  end;

  insert into public.person_strengths (user_id, statement, label, origin, source_turn_id)
  values (v_user, v_statement, v_label, v_origin, v_proposal.turn_id)
  returning id into v_id;

  update public.person_strength_proposals
  set status = 'accepted', decided_at = pg_catalog.now()
  where id = p_proposal_id;

  return v_id;
end;
$$;

revoke all on function public.confirm_strength_proposal(uuid, text, text) from public, anon;
grant execute on function public.confirm_strength_proposal(uuid, text, text) to authenticated;

commit;
