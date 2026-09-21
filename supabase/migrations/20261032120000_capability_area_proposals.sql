begin;

-- ---------------------------------------------------------------------------
-- "Guck mal, ich sehe das hier" - Vorschläge aus der eigenen Erzählung
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 21.09.2026: "Das Tool hat schon rausgefiltert, ey, das könnte
-- das und das sein, dass man aber trotzdem noch sagen müsste, vielleicht mit
-- einem Schieberegler: so würde ich mich selber einschätzen."
--
-- WAS DAS MODELL DARF: eine Erzählung lesen und Bereiche vorschlagen, jeweils
-- mit dem wörtlichen Satz, auf den es sich beruft. Nichts weiter. Es setzt
-- keine Stufe, es bestätigt nichts, und es schreibt in keinen Eintrag.
--
-- WAS DIE DATENBANK PRÜFT, und das ist die eigentliche Sicherung: Ein
-- Vorschlag wird nur gespeichert, wenn sein Zitat WÖRTLICH in der Antwort
-- vorkommt - von Groß- und Kleinschreibung und Leerraum abgesehen, sonst
-- genau. Damit hält die Sicherung auch dann, wenn der Prompt schlecht ist, das
-- Modell schwach antwortet oder die Anwendung einen Fehler hat: Ein Modell,
-- das etwas hinzudichtet, kann es nicht belegen - und was es nicht belegen
-- kann, kommt hier nicht hinein. Dasselbe Verfahren wie bei
-- `insert_ai_resource_proposal` (20261015120000), und aus demselben Grund.
--
-- UND DER ENTSCHEIDENDE UNTERSCHIED ZU JENER STELLE: Dort war die Quelle eine
-- VEROEFFENTLICHTE Anzeige - öffentlich, und deshalb ohne Rückfrage lesbar.
-- Eine Interview-Antwort ist das Gegenteil. Frage 3 des Leitfadens fragt
-- ausdrücklich nach dem Leben außerhalb der Erwerbsarbeit; dort steht
-- Pflegearbeit, ein Verein, eine Trennung.
--
-- Deshalb entsteht eine Aufgabe dieser Art NICHT von selbst beim Einordnen.
-- Sie entsteht nur, wenn ein Mensch sie anfordert - eine Aufgabe je Antwort,
-- und das erzwingt `request_capability_area_proposals` unten, nicht die
-- Oberfläche. Ein Modell, das ungefragt private Erzählungen liest, wäre genau
-- das, was an solchen Werkzeugen zu Recht kritisiert wird.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Eine neue Art Arbeit
-- ---------------------------------------------------------------------------
alter table public.ai_jobs drop constraint ai_jobs_job_type_check;

alter table public.ai_jobs
  add constraint ai_jobs_job_type_check check (job_type in (
    'ping',
    -- Liest einen VEROEFFENTLICHTEN eigenen Text und schlaegt daraus Zugaenge
    -- vor. Nur veroeffentlichte: Ein Entwurf ist fuer niemanden sichtbar, auch
    -- nicht fuer ein Modell.
    'connect_resource_extraction',
    -- Liest eine Interview-Antwort und schlaegt Bereiche vor. Nur auf
    -- ausdrueckliche Anforderung der Person, siehe der Kommentar oben.
    'capability_area_proposal'
  ));


-- ---------------------------------------------------------------------------
-- 2. Der Text, den der Arbeiter bekommt
-- ---------------------------------------------------------------------------
/**
 * Unveraendert aus 20261015120000, mit einem dritten Fall.
 *
 * DER ARBEITER LIEST KEINE TABELLE. Er bekommt genau den einen Text, zu dem er
 * eine laufende Aufgabe in der Hand hat - und nur, wenn die Antwort der Person
 * gehoert, fuer die die Aufgabe angelegt wurde. Er kann sich keinen anderen
 * Text besorgen, auch nicht durch eine erfundene Kennung.
 */
create or replace function public.get_ai_job_source_text(p_job_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
  v_text text;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id and job.status = 'running';
  if not found then return null; end if;

  if v_job.source_table = 'network_listings' then
    select concat_ws(E'\n', listing.title, listing.summary) into v_text
    from public.network_listings listing
    where listing.id = v_job.source_id
      and listing.owner_user_id = v_job.subject_user_id
      and listing.status = 'active';
  elsif v_job.source_table = 'network_problems' then
    select concat_ws(E'\n', problem.title, problem.description) into v_text
    from public.network_problems problem
    where problem.id = v_job.source_id
      and problem.author_user_id = v_job.subject_user_id
      and problem.status = 'active';
  elsif v_job.source_table = 'capability_interview_turns' then
    -- NUR DIE ANTWORT, nicht die Frage: Die Frage steht im Sprachbundle und
    -- hilft dem Modell nicht beim Belegen - aber sie wuerde die Zitatpruefung
    -- aufweichen, weil ein Modell dann Teile der FRAGE als Beleg ausgeben
    -- koennte.
    select turn.answer into v_text
    from public.capability_interview_turns turn
    join public.capability_interview_sessions session on session.id = turn.session_id
    where turn.id = v_job.source_id
      and session.user_id = v_job.subject_user_id
      and turn.answer is not null;
  else
    return null;
  end if;

  return v_text;
end;
$$;

revoke all on function public.get_ai_job_source_text(uuid) from public, anon;
grant execute on function public.get_ai_job_source_text(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 3. Die Vorschläge
-- ---------------------------------------------------------------------------
create table public.capability_area_proposals (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null
    references public.capability_interview_turns (id) on delete cascade,
  area_id text not null
    references public.capability_areas (area_id) on delete restrict,
  /** Der wörtliche Satz aus der Antwort. Ohne ihn gibt es keinen Vorschlag. */
  evidence_quote text not null,
  status text not null default 'pending',
  /** Welches Modell und welche Fassung des Prompts - fuer die Nachvollziehbarkeit. */
  model text,
  prompt_version smallint,
  created_at timestamptz not null default now(),
  decided_at timestamptz,

  -- Einen Bereich schlaegt das Modell je Antwort nur einmal vor.
  constraint capability_area_proposals_unique unique (turn_id, area_id),
  constraint capability_area_proposals_status_check
    check (status in ('pending', 'accepted', 'rejected')),
  -- Entschieden heisst entschieden: ohne Zeitpunkt waere "angenommen" eine
  -- Behauptung ohne Beleg.
  constraint capability_area_proposals_decided
    check ((status = 'pending') = (decided_at is null)),
  -- Zu kurz ist kein Beleg: Ein einzelnes Wort findet sich in jedem Text. Und
  -- zu lang ist kein Zitat, sondern die halbe Antwort.
  constraint capability_area_proposals_quote_length
    check (char_length(btrim(evidence_quote)) between 12 and 300)
);

comment on table public.capability_area_proposals is
  'Bereichsvorschlaege eines Sprachmodells zu einer Interview-Antwort, jeder mit dem woertlichen Beleg. Nichts davon gilt, bis ein Mensch es annimmt - und die Stufe setzt ausschliesslich der Mensch.';

create index capability_area_proposals_turn_idx
  on public.capability_area_proposals (turn_id, status);

alter table public.capability_area_proposals enable row level security;
revoke all on public.capability_area_proposals from anon, authenticated;
-- KEIN INSERT FUER ANGEMELDETE. Vorschlaege entstehen ausschliesslich in
-- `insert_ai_capability_proposal`, und die prueft das Zitat. Ohne diese Grenze
-- koennte die Anwendung Vorschlaege erfinden, die nie ein Modell gemacht hat -
-- und der Beleg waere wertlos.
grant select, update, delete on public.capability_area_proposals to authenticated;

create policy capability_area_proposals_select_self on public.capability_area_proposals
  for select to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_area_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );

-- Annehmen und Ablehnen ist ein Update auf `status`. Mehr kann man daran nicht
-- aendern, was die Spaltenrechte erzwingen.
revoke update on public.capability_area_proposals from authenticated;
grant update (status, decided_at) on public.capability_area_proposals to authenticated;

create policy capability_area_proposals_update_self on public.capability_area_proposals
  for update to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_area_proposals.turn_id
        and session.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_area_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );

create policy capability_area_proposals_delete_self on public.capability_area_proposals
  for delete to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_area_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 4. Die Anforderung - von einem Menschen, nicht vom Ablauf
-- ---------------------------------------------------------------------------
/**
 * Legt die Aufgabe an, eine Antwort lesen zu lassen.
 *
 * NUR FUER DIE EIGENE ANTWORT, und nur fuer eine beantwortete: Ohne Text gibt
 * es nichts zu lesen.
 *
 * Und nur EINE offene Aufgabe je Antwort - das erzwingt `enqueue_ai_job` schon
 * ueber seine eigene Pruefung; hier steht die Bedingung, die davor liegt: Es
 * muss die eigene Antwort sein.
 */
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


-- ---------------------------------------------------------------------------
-- 5. Einen Vorschlag ablegen - und die Datenbank prüft den Beleg
-- ---------------------------------------------------------------------------
/**
 * Dasselbe Verfahren wie `insert_ai_resource_proposal`, und aus demselben
 * Grund: Ein Vorschlag wird nur gespeichert, wenn sein Zitat WOERTLICH in der
 * Antwort vorkommt.
 *
 * Gibt false zurueck, wenn der Beleg nicht traegt oder der Bereich nicht
 * existiert. Kein Fehler: Der Arbeiter soll die uebrigen Vorschlaege derselben
 * Antwort trotzdem ablegen koennen - ein nicht belegbarer nimmt die anderen
 * nicht mit.
 */
create or replace function public.insert_ai_capability_proposal(
  p_job_id uuid,
  p_area_id text,
  p_quote text,
  p_model text,
  p_prompt_version smallint
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
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id
    and job.status = 'running'
    and job.job_type = 'capability_area_proposal';
  if not found then return false; end if;

  -- Ein Bereich, den das Vokabular nicht kennt, ist ein erfundener. Der
  -- Fremdschluessel faengt ihn ohnehin - aber als Fehler, und der wuerde die
  -- uebrigen Vorschlaege derselben Antwort mitnehmen.
  if not exists (
    select 1 from public.capability_areas area where area.area_id = p_area_id
  ) then
    return false;
  end if;

  v_source := public.get_ai_job_source_text(p_job_id);
  if v_source is null then return false; end if;

  v_normalized_source := regexp_replace(lower(v_source), '\s+', ' ', 'g');
  v_normalized_quote := btrim(regexp_replace(lower(coalesce(p_quote, '')), '\s+', ' ', 'g'));

  if char_length(v_normalized_quote) < 12 then return false; end if;
  if position(v_normalized_quote in v_normalized_source) = 0 then return false; end if;

  insert into public.capability_area_proposals (
    turn_id, area_id, evidence_quote, model, prompt_version
  )
  values (
    v_job.source_id, p_area_id, btrim(p_quote),
    left(nullif(btrim(coalesce(p_model, '')), ''), 60), p_prompt_version
  )
  -- Denselben Vorschlag nicht zweimal: Wer ihn schon abgelehnt hat, soll ihn
  -- nicht wiederbekommen, wenn die Antwort noch einmal gelesen wird.
  on conflict (turn_id, area_id) do nothing;

  return true;
end;
$$;

revoke all on function public.insert_ai_capability_proposal(uuid, text, text, text, smallint) from public, anon;
grant execute on function public.insert_ai_capability_proposal(uuid, text, text, text, smallint) to authenticated;

commit;
