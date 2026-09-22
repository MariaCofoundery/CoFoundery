begin;

-- ---------------------------------------------------------------------------
-- Auch ohne Modell wird hingeschaut
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 22.09.2026: "Es muss ja auch ohne KI gehen, dass der Text mal
-- ein bisschen analysiert wird und geschaut wird, was sind so typische
-- Sachen, die Menschen so anschreiben - und dass man das dann bestaetigen
-- kann. Und sagt: hey, wir arbeiten noch dran, bitte pruefe gut, aber
-- zumindest ist das etwas, was wir hier rausgelesen haben."
--
-- DAMIT WIRD EINE ENTSCHEIDUNG AUS DEM BRIEF ZURUECKGENOMMEN. Dort stand:
-- "Der Regelweg taugt fuer Direction nicht - eine Begriffsliste wuerde raten
-- und dabei serioes aussehen." Das galt fuer einen Regelweg, der DEUTET (aus
-- Stichwoertern auf ein Thema schliessen). Der hier deutet nicht:
--
--   Er findet die STELLE, an der jemand gesagt hat, was ihm wichtig war -
--   ueber Wendungen wie "mir war wichtig", "hat mich genervt", "damit ...
--   endlich". Und dann schlaegt er GENAU DIESEN SATZ vor, woertlich, als
--   Anfang fuer eine eigene Formulierung.
--
-- Der Vorschlag ist damit kein Urteil ueber einen Menschen, sondern ein
-- Zitat mit einer Rubrik daneben. Er kann falsch einsortiert sein - er kann
-- nichts behaupten, was nicht dasteht.
--
-- DESHALB MUSS DIE HERKUNFT SICHTBAR SEIN: `source` unterscheidet, wer
-- gelesen hat. Die Oberflaeche sagt bei den Regel-Funden ausdruecklich, dass
-- daran noch gearbeitet wird und dass man genau hinsehen soll. Ohne diese
-- Spalte stuenden beide Arten nebeneinander, als waeren sie dasselbe.
-- ---------------------------------------------------------------------------

alter table public.direction_statement_proposals
  add column source text not null default 'model';

alter table public.direction_statement_proposals
  add constraint direction_proposals_source_check check (source in ('model', 'rules'));

-- JE VORGANG UND RUBRIK EINER, je Herkunft. Wer zweimal durchsehen laesst,
-- bekommt nicht denselben Fund doppelt - und ein abgelehnter kommt nicht
-- wieder.
alter table public.direction_statement_proposals
  add constraint direction_proposals_once unique (turn_id, facet, source);

comment on column public.direction_statement_proposals.source is
  'Wer gelesen hat: model (ein Sprachmodell, mit eigener Formulierung) oder rules (eine Fundstelle im Text, woertlich uebernommen).';

-- ---------------------------------------------------------------------------
-- Die Person laesst durchsehen - ohne Modell, ohne Warteschlange
-- ---------------------------------------------------------------------------
/**
 * DIESELBE ZITATPRUEFUNG WIE BEIM MODELL, und hier ist sie noch schaerfer:
 * Weil der Vorschlag der Satz selbst ist, muss auch der `statement` woertlich
 * in der Antwort vorkommen. Ein Regelweg, der etwas formuliert, waere genau
 * der, den der Brief zu Recht abgelehnt hat.
 *
 * Aufgerufen wird sie von der Person selbst (nicht vom Arbeiter): Es laeuft
 * kein Modell, es gibt nichts zu warten, und es verlaesst nichts das Haus.
 */
create or replace function public.insert_rule_direction_proposal(
  p_turn_id uuid,
  p_facet text,
  p_statement text,
  p_quote text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_source text;
  v_normalized_source text;
  v_normalized_quote text;
  v_normalized_statement text;
  v_statement text := btrim(coalesce(p_statement, ''));
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_facet not in (
    'recurring_theme', 'problem_cared_about', 'people_cared_about',
    'desired_change', 'meaningful_outcome', 'energising_activity',
    'preferred_contribution', 'frustrating_condition', 'recurring_tension',
    'open_question'
  ) then
    return false;
  end if;

  if char_length(v_statement) < 3 or char_length(v_statement) > 200 then
    return false;
  end if;

  -- Die eigene, beantwortete Richtungs-Antwort. Dieselbe Bedingung wie beim
  -- Anfordern eines Modelllaufs.
  select turn.answer into v_source
  from public.capability_interview_turns turn
  join public.capability_interview_sessions session on session.id = turn.session_id
  where turn.id = p_turn_id
    and session.user_id = v_user
    and turn.kind = 'direction'
    and turn.answer is not null;
  if v_source is null then
    raise exception 'direction_turn_not_readable' using errcode = '42501';
  end if;

  v_normalized_source := regexp_replace(lower(v_source), '\s+', ' ', 'g');
  v_normalized_quote := btrim(regexp_replace(lower(coalesce(p_quote, '')), '\s+', ' ', 'g'));
  v_normalized_statement := btrim(regexp_replace(lower(v_statement), '\s+', ' ', 'g'));

  if char_length(v_normalized_quote) < 12 then return false; end if;
  if position(v_normalized_quote in v_normalized_source) = 0 then return false; end if;
  -- UND DER VORSCHLAG SELBST MUSS DASTEHEN. Das ist der Unterschied zum
  -- Modell: Dieses darf formulieren, der Regelweg nicht.
  if position(v_normalized_statement in v_normalized_source) = 0 then return false; end if;

  insert into public.direction_statement_proposals (
    turn_id, facet, statement, evidence_quote, source
  )
  values (p_turn_id, p_facet, v_statement, btrim(p_quote), 'rules')
  on conflict (turn_id, facet, source) do nothing;

  return found;
end;
$$;

revoke all on function public.insert_rule_direction_proposal(uuid, text, text, text)
  from public, anon;
grant execute on function public.insert_rule_direction_proposal(uuid, text, text, text)
  to authenticated;

commit;
