begin;

-- ---------------------------------------------------------------------------
-- Staerken - und zwei Blickrichtungen darauf
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 22.09.2026: "Einmal, dass die Einzelperson ein bisschen was
-- ueber sich erfaehrt und vielleicht das auch noch mal ein bisschen selbst
-- einschaetzen soll. Vielleicht auch noch mal mit so einem Perspektivwechsel:
-- was glaubst du denn, was deine alten Kolleginnen oder jetzigen Kolleginnen
-- oder Chefs, Freunde, Verwandte sagen wuerden."
--
-- WAS EINE STAERKE HIER IST: ein SATZ ueber eine Arbeitsweise, die in einer
-- erzaehlten Situation sichtbar wurde - "bleibt an einem langen Prozess
-- dran". Kein Bereich aus einem Vokabular; dafuer gibt es
-- `person_capability_entries`. Und kein Merkmal einer Person: Was hier steht,
-- hat sich in einer Situation gezeigt, und die Situation steht daneben.
--
-- ZWEI BLICKRICHTUNGEN, UND DER ABSTAND DAZWISCHEN IST DAS EIGENTLICHE
-- ERGEBNIS:
--
--   `self_frequency`      - wie oft sich das nach eigener Einschaetzung zeigt.
--   `reflected_frequency` - was Menschen sagen wuerden, die einen erlebt haben.
--
-- Der Perspektivwechsel ist keine Deko. Eine Selbsteinschaetzung misst
-- Selbstbild und Selbstvertrauen, und beides ist ungleich verteilt: Menschen,
-- die gelernt haben, sich zurueckzunehmen, antworten systematisch niedriger.
-- Die Frage "was wuerden andere sagen" umgeht das teilweise, weil sie nicht
-- verlangt, sich selbst zu loben - man berichtet ja nur.
--
-- Wer sich selbst niedriger einschaetzt als die Aussensicht, ist genau der
-- Fall, den Maria am 21.09.2026 beschrieben hat: "Ihr seid beide sehr ruhig,
-- braeuchtet ihr vielleicht noch jemanden, der praesentieren kann" - waehrend
-- es im Team jemanden gab, der es kann und es nur nicht fuer sich beansprucht.
--
-- KEINE ZAHL, KEIN MITTELWERT, KEIN ABGLEICH ZU EINER NORM. Vier benannte
-- Haeufigkeiten, und sie werden nirgends verrechnet. "Staerke 7,4" waere
-- Scheinpraezision auf einem Selbstbericht.
--
-- HAEUFIGKEIT UND NICHT AUSPRAEGUNG: "Wie stark ist deine Ausdauer" ist eine
-- Eigenschaftsfrage. "Wie oft zeigt sich das bei dir" fragt nach etwas, das
-- man beobachten kann - dieselbe Entscheidung wie beim Fragenkatalog des
-- Interviews.
-- ---------------------------------------------------------------------------

create table public.person_strengths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  /** Der Satz. Moeglichst in den Worten der Person. */
  statement text not null,

  /**
   * Woher er kommt - dieselben drei Herkuenfte wie bei den
   * Richtungs-Aussagen, und aus demselben Grund: Wer liest, was ueber ihn
   * dasteht, soll erkennen koennen, wessen Formulierung das ist.
   */
  origin text not null,

  /** Die Erzaehlung, in der es sichtbar wurde. Bleibt, wenn das Gespraech geht. */
  source_turn_id uuid references public.capability_interview_turns (id) on delete set null,

  self_frequency text,
  reflected_frequency text,
  /**
   * An wen die Person beim Beantworten gedacht hat.
   *
   * Es steht dabei, WEIL es die Antwort veraendert: "Was wuerden meine
   * Geschwister sagen" und "was wuerde mein letzter Chef sagen" sind zwei
   * verschiedene Fragen, und eine Aussensicht ohne Angabe, wessen, waere eine
   * Behauptung ueber alle.
   */
  reflected_who text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint person_strengths_length
    check (char_length(btrim(statement)) between 3 and 200),
  constraint person_strengths_origin_check
    check (origin in ('own_words', 'confirmed_proposal', 'edited_proposal')),
  constraint person_strengths_self_check
    check (self_frequency is null or self_frequency in
      ('rarely', 'sometimes', 'often', 'almost_always')),
  constraint person_strengths_reflected_check
    check (reflected_frequency is null or reflected_frequency in
      ('rarely', 'sometimes', 'often', 'almost_always')),
  constraint person_strengths_who_check
    check (reflected_who is null or reflected_who in
      ('former_colleagues', 'current_colleagues', 'managers', 'friends', 'family')),
  -- Eine Aussensicht ohne Angabe, wessen, ist keine Aussensicht.
  constraint person_strengths_reflected_needs_who
    check ((reflected_frequency is null) = (reflected_who is null))
);

comment on table public.person_strengths is
  'Arbeitsweisen, die in erzaehlten Situationen sichtbar wurden - mit eigener Einschaetzung und der vermuteten Aussensicht. Kein Merkmal, keine Zahl, kein Vergleich zu einer Norm.';

create index person_strengths_user_idx on public.person_strengths (user_id, created_at desc);

alter table public.person_strengths enable row level security;
revoke all on public.person_strengths from anon, authenticated;
grant select, insert, update, delete on public.person_strengths to authenticated;

-- NUR DIE EIGENEN. Was ein Team davon sieht, entsteht spaeter und
-- ausdruecklich - nicht dadurch, dass diese Tabelle offen ist.
create policy person_strengths_select_self on public.person_strengths
  for select to authenticated using (user_id = auth.uid());
create policy person_strengths_insert_self on public.person_strengths
  for insert to authenticated with check (user_id = auth.uid());
create policy person_strengths_update_self on public.person_strengths
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy person_strengths_delete_self on public.person_strengths
  for delete to authenticated using (user_id = auth.uid());

create trigger person_strengths_updated_at
  before update on public.person_strengths
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- Vorschlaege aus den Erzaehlungen
-- ---------------------------------------------------------------------------
--
-- DAS MODELL WIRD SCHON DANACH GEFRAGT. In der Anweisung des
-- Capability-Modells steht seit dem 20.09.2026: "`strength` ist ein kurzer
-- Satz ueber eine Arbeitsweise, die im Text sichtbar wird (z. B. Ausdauer,
-- Umgang mit Unsicherheit)." Der Code liest das Feld aus - und warf es dann
-- weg, weil es keinen Ort dafuer gab. Hier ist der Ort.
create table public.person_strength_proposals (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null
    references public.capability_interview_turns (id) on delete cascade,

  statement text not null,
  /** Woertlich aus der Antwort. Die Funktion unten rechnet es nach. */
  evidence_quote text not null,

  status text not null default 'pending',
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,

  constraint person_strength_proposals_status_check
    check (status in ('pending', 'accepted', 'rejected')),
  constraint person_strength_proposals_decided
    check ((status = 'pending') = (decided_at is null)),
  constraint person_strength_proposals_length
    check (char_length(btrim(statement)) between 3 and 200),
  constraint person_strength_proposals_quote_length
    check (char_length(btrim(evidence_quote)) between 12 and 300),
  -- Je Antwort einer. Zweimal lesen lassen gibt nicht denselben Satz doppelt -
  -- der Fehler vom 22.09.2026, hier von Anfang an mitgedacht.
  constraint person_strength_proposals_once unique (turn_id)
);

create index person_strength_proposals_turn_idx
  on public.person_strength_proposals (turn_id, status);

alter table public.person_strength_proposals enable row level security;
revoke all on public.person_strength_proposals from anon, authenticated;
grant select on public.person_strength_proposals to authenticated;
grant update (status, decided_at) on public.person_strength_proposals to authenticated;

create policy person_strength_proposals_select_own on public.person_strength_proposals
  for select to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = person_strength_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );

create policy person_strength_proposals_decide_own on public.person_strength_proposals
  for update to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = person_strength_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Der Arbeiter schreibt - mit Beleg
-- ---------------------------------------------------------------------------
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
  on conflict (turn_id) do nothing;

  return found;
end;
$$;

revoke all on function public.insert_ai_strength_proposal(uuid, text, text, text, text)
  from public, anon;
-- Wie bei den anderen Arbeiterfunktionen: Der Arbeiter hat keinen
-- Service-Role-Schluessel, er ist ein gewoehnlicher angemeldeter Nutzer. Die
-- Schranke ist `is_ai_worker()` IN der Funktion.
grant execute on function public.insert_ai_strength_proposal(uuid, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Der Mensch entscheidet
-- ---------------------------------------------------------------------------
create or replace function public.confirm_strength_proposal(
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
  v_proposal public.person_strength_proposals;
  v_owner uuid;
  v_statement text;
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

  v_origin := case when v_statement = v_proposal.statement
    then 'confirmed_proposal' else 'edited_proposal' end;

  insert into public.person_strengths (user_id, statement, origin, source_turn_id)
  values (v_user, v_statement, v_origin, v_proposal.turn_id)
  returning id into v_id;

  update public.person_strength_proposals
  set status = 'accepted', decided_at = pg_catalog.now()
  where id = p_proposal_id;

  return v_id;
end;
$$;

revoke all on function public.confirm_strength_proposal(uuid, text) from public, anon;
grant execute on function public.confirm_strength_proposal(uuid, text) to authenticated;

commit;
