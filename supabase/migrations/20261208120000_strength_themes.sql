begin;

-- ---------------------------------------------------------------------------
-- Staerken-Themen (20.10.2026)
-- ---------------------------------------------------------------------------
--
-- Das Staerken-Interview ordnet erzaehlten Situationen jetzt eines von 28
-- Themen zu (`web/src/features/strengths/strengthThemes.ts`) - ein eigener
-- Wortschatz in vier Bereichen, beschreibend, ohne Rangfolge und ohne Zahl.
--
-- RUECKWAERTSKOMPATIBEL: `theme` und `evidence_level` sind optional. Alle
-- bisherigen Vorschlaege und bestaetigten Staerken bleiben unveraendert gueltig
-- und ohne Thema. Die alte Funktion `insert_ai_strength_proposal` (8
-- Parameter) bleibt; die Fassung mit Thema heisst `insert_ai_strength_theme_proposal`; neu ist die Fassung mit Thema und Belegstaerke.
--
-- BELEGSTAERKE, NICHT AUSPRAEGUNG: `clear` (mind. drei verschiedene
-- Situationen), `shown` (zwei), `hint` (eine). Das ist kein Mass fuer "wie
-- stark", sondern wie gut belegt.
-- ---------------------------------------------------------------------------

alter table public.person_strength_proposals
  add column theme text,
  add column evidence_level text;

alter table public.person_strength_proposals
  add constraint person_strength_proposals_theme_check
    check (theme is null or theme in ('keep_going', 'reliable', 'build_structure', 'move_fast', 'thorough', 'take_ownership', 'hold_focus', 'convince', 'speak_plainly', 'inspire', 'negotiate', 'make_visible', 'kick_off', 'decide', 'empathize', 'build_trust', 'connect', 'develop_others', 'resolve_conflict', 'build_cohesion', 'listen', 'spot_patterns', 'learn_fast', 'generate_ideas', 'envision_future', 'break_down', 'spot_opportunities', 'experiment')),
  add constraint person_strength_proposals_level_check
    check (evidence_level is null or evidence_level in ('clear', 'shown', 'hint')),
  add constraint person_strength_proposals_theme_shape
    check ((theme is null) = (evidence_level is null));

-- Ein Thema nur einmal je Gespraech.
create unique index person_strength_proposals_session_theme
  on public.person_strength_proposals (session_id, theme)
  where theme is not null;

alter table public.person_strengths
  add column theme text,
  add column evidence_level text;

alter table public.person_strengths
  add constraint person_strengths_theme_check
    check (theme is null or theme in ('keep_going', 'reliable', 'build_structure', 'move_fast', 'thorough', 'take_ownership', 'hold_focus', 'convince', 'speak_plainly', 'inspire', 'negotiate', 'make_visible', 'kick_off', 'decide', 'empathize', 'build_trust', 'connect', 'develop_others', 'resolve_conflict', 'build_cohesion', 'listen', 'spot_patterns', 'learn_fast', 'generate_ideas', 'envision_future', 'break_down', 'spot_opportunities', 'experiment')),
  add constraint person_strengths_level_check
    check (evidence_level is null or evidence_level in ('clear', 'shown', 'hint')),
  add constraint person_strengths_theme_shape
    check ((theme is null) = (evidence_level is null));

comment on column public.person_strengths.theme is
  'Eines der 28 Staerken-Themen; null bei eigenen Saetzen und aelteren Staerken.';
comment on column public.person_strengths.evidence_level is
  'Wie gut belegt (clear/shown/hint) - aus der Zahl verschiedener Situationen, keine Auspraegung.';


-- ---------------------------------------------------------------------------
-- Der Arbeiter schreibt - mit Thema und Belegstaerke
-- ---------------------------------------------------------------------------
create or replace function public.insert_ai_strength_theme_proposal(
  p_job_id uuid,
  p_turn_id uuid,
  p_label text,
  p_statement text,
  p_rationale text,
  p_quote text,
  p_theme text,
  p_evidence_level text,
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

  if p_theme is null or p_theme not in ('keep_going', 'reliable', 'build_structure', 'move_fast', 'thorough', 'take_ownership', 'hold_focus', 'convince', 'speak_plainly', 'inspire', 'negotiate', 'make_visible', 'kick_off', 'decide', 'empathize', 'build_trust', 'connect', 'develop_others', 'resolve_conflict', 'build_cohesion', 'listen', 'spot_patterns', 'learn_fast', 'generate_ideas', 'envision_future', 'break_down', 'spot_opportunities', 'experiment')
    or p_evidence_level is null or p_evidence_level not in ('clear', 'shown', 'hint') then
    return false;
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

  if concat_ws(' ', v_label, v_statement, v_rationale) ~* '(\mdu bist\M|\myou are\M|pers(ö|oe)nlichkeit|personality)' then
    return false;
  end if;

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
    turn_id, session_id, label, statement, rationale, evidence_quote,
    theme, evidence_level, model, prompt_version
  )
  values (
    p_turn_id, v_job.source_id, v_label, v_statement, v_rationale, left(btrim(p_quote), 300),
    p_theme, p_evidence_level,
    left(nullif(btrim(coalesce(p_model, '')), ''), 60), p_prompt_version
  )
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.insert_ai_strength_theme_proposal(uuid, uuid, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.insert_ai_strength_theme_proposal(uuid, uuid, text, text, text, text, text, text, text, text)
  to authenticated;


-- ---------------------------------------------------------------------------
-- Der Mensch entscheidet - Thema und Belegstaerke wandern mit
-- ---------------------------------------------------------------------------
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

  insert into public.person_strengths (user_id, statement, label, origin, source_turn_id, theme, evidence_level)
  values (v_user, v_statement, v_label, v_origin, v_proposal.turn_id, v_proposal.theme, v_proposal.evidence_level)
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
