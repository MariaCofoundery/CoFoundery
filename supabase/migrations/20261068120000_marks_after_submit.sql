begin;

-- ---------------------------------------------------------------------------
-- Nach der Abgabe: die Antwort ist eingefroren, die Markierung nicht
-- ---------------------------------------------------------------------------
--
-- Maria am 28.09.2026: Das Ankreuzfeld "darueber moechte ich sprechen" soll
-- aus dem Fragebogen heraus - dort lenkt es vom Antworten ab - und stattdessen
-- auf eine Seite, auf der man die eigenen Antworten IM NACHGANG durchgeht.
--
-- DAMIT STOESST DIE BISHERIGE REGEL AN IHRE GRENZE. Seit Schritt 2a gilt:
-- Nach der Abgabe aendert sich an einer Antwort nichts mehr. Das ist richtig
-- und soll bleiben - sonst waere "du kannst deine alte Fassung behalten" ein
-- leeres Versprechen.
--
-- Aber die Gespraechsmarkierung IST KEINE ANTWORT. Sie sagt nichts darueber
-- aus, wie jemand arbeiten moechte; sie sagt "darueber moechte ich reden".
-- Das ist eine Aussage ueber das naechste Gespraech, und die darf sich
-- aendern - gerade nach der Abgabe, wenn man den eigenen Report zum ersten Mal
-- im Zusammenhang liest.
--
-- Dasselbe gilt fuer "was wuerde deine Antwort aendern": eine freiwillige
-- Notiz, kein Messwert.
--
-- ---------------------------------------------------------------------------
-- WARUM EIN TRIGGER UND NICHT ZWEI POLICIES
-- ---------------------------------------------------------------------------
--
-- Eine Policy entscheidet ueber ZEILEN, nicht ueber Spalten. "Diese Zeile darf
-- man aendern, aber nur diese zwei Felder" laesst sich damit nicht sagen. Der
-- Trigger kann es, und er sagt es an genau einer Stelle - statt dass jede
-- schreibende Stelle im Code daran denken muss.

create function public.keep_submitted_alignment_answers_frozen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitted boolean;
begin
  select assessment.submitted_at is not null into submitted
  from public.assessments assessment
  where assessment.id = new.assessment_id;

  if not submitted then
    return new;
  end if;

  -- Abgegeben: Die Antwort selbst ist ein Dokument.
  if new.value is distinct from old.value
     or new.missing_code is distinct from old.missing_code
     or new.answer_format is distinct from old.answer_format
     or new.block_id is distinct from old.block_id
     or new.language is distinct from old.language then
    raise exception 'alignment_answer_frozen_after_submit'
      using errcode = '42501',
            hint = 'Nach der Abgabe laesst sich nur noch die Gespraechsmarkierung aendern.';
  end if;

  return new;
end;
$$;

create trigger alignment_answers_frozen_after_submit
  before update on public.alignment_answers
  for each row execute function public.keep_submitted_alignment_answers_frozen();

-- Die Policy laesst das Aendern jetzt grundsaetzlich zu; WAS sich aendern
-- darf, entscheidet der Trigger.
drop policy alignment_answers_update_owner on public.alignment_answers;

create policy alignment_answers_update_owner on public.alignment_answers
  for update to authenticated
  using (
    public.has_founder_assessment_access()
    and public.owns_assessment(alignment_answers.assessment_id)
  );

comment on policy alignment_answers_update_owner on public.alignment_answers is
  'Die eigene Zeile darf man aendern. Nach der Abgabe laesst der Trigger nur '
  'noch die Gespraechsmarkierung und die freiwillige Notiz durch.';

-- Loeschen bleibt an den Entwurf gebunden: Eine abgegebene Antwort
-- zurueckzunehmen waere keine Markierung, sondern eine Aenderung am Dokument.

commit;
