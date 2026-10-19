begin;

-- ---------------------------------------------------------------------------
-- Werte & Zielkonflikte (venture-tradeoffs-v1) - das erste echte Vertiefungsmodul
-- ---------------------------------------------------------------------------
--
-- Siehe docs/architecture/phase-d-storage-decision.md. Kurz:
--
--   STORAGE: bestehende Familie `assessments.module = 'venture_alignment'` (zu
--   einem Vorhaben und einem Zeitraum) + eigene `instrument_id`. Kein neuer
--   Enum-Wert: `module` ist hier Speicherfamilie, und jeder Leser von
--   Vorhaben-Antworten filtert strikt nach `instrument_id`.
--
--   ADDITIV: eine Zeile in `instruments` und zwei Wachter, die AUSSCHLIESSLICH
--   fuer dieses Instrument greifen und sonst sofort `new` zurueckgeben. Keine
--   Aenderung an Enum, Policies, Tabellen oder anderen Instrumenten; keine
--   Daten werden angefasst. Die W03-W06-Antworten in venture-alignment-v1
--   bleiben, wie sie sind.
--
--   PRIVAT: Dieses Instrument ist fuer das Team unsichtbar. Die Teamsicht
--   (`venture_visible_in_team`, die Policies, der Teamleser) filtert auf
--   `venture-alignment-v1`; eine Freigabe optionaler Module entsteht erst
--   spaeter (Phase E).
-- ---------------------------------------------------------------------------

insert into public.instruments (id, label, status, introduced_at)
values ('venture-tradeoffs-v1', 'Werte und Zielkonflikte v1', 'draft', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Wachter am Bogen
-- ---------------------------------------------------------------------------
--
-- Fuer dieses Instrument gilt, was der Bestand nur in der Anwendung prueft:
--   - es gehoert zu EINEM Vorhaben (`module = venture_alignment`, `venture_id`),
--   - zu einem Vorhaben, in dem die Person Mitglied ist,
--   - es ist nach der Abgabe unveraenderlich,
--   - und es wird nur vollstaendig abgegeben: alle vier Situationen
--     (W03-W06) beantwortet - notfalls mit einem Auslassungsgrund.
create or replace function public.guard_venture_tradeoffs_assessment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.instrument_id is distinct from 'venture-tradeoffs-v1'
     and not (tg_op = 'UPDATE' and old.instrument_id = 'venture-tradeoffs-v1') then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
       new.id <> old.id
    or new.user_id <> old.user_id
    or new.instrument_id <> old.instrument_id
    or new.venture_id is distinct from old.venture_id
  ) then
    raise exception 'venture_tradeoffs_identity_immutable' using errcode = '23514';
  end if;

  if new.module::text <> 'venture_alignment' or new.venture_id is null then
    raise exception 'venture_tradeoffs_venture_scope_required' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.founder_team_members member
    where member.team_id = new.venture_id and member.user_id = new.user_id
  ) then
    raise exception 'venture_tradeoffs_member_required' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.submitted_at is not null
     and new.submitted_at is distinct from old.submitted_at then
    raise exception 'venture_tradeoffs_submitted_immutable' using errcode = '23514';
  end if;

  -- Abgeben heisst: alle vier Situationen sind beantwortet.
  if new.submitted_at is not null and (tg_op = 'INSERT' or old.submitted_at is null) then
    if (
      select count(distinct answer.block_id)
      from public.alignment_answers answer
      where answer.assessment_id = new.id
        and answer.block_id in ('W03', 'W04', 'W05', 'W06')
    ) <> 4 then
      raise exception 'venture_tradeoffs_incomplete' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_venture_tradeoffs_assessment() from public, anon, authenticated;

create trigger guard_venture_tradeoffs_assessment
  before insert or update on public.assessments
  for each row execute function public.guard_venture_tradeoffs_assessment();

-- ---------------------------------------------------------------------------
-- Wachter an der Antwort
-- ---------------------------------------------------------------------------
--
-- Nur die vier Situationen, nur im Format `value_case`. Ein anderes Item in
-- diesem Bogen waere kein Zielkonflikt mehr, und eine andere Form liesse sich
-- spaeter nicht als zwei Gewichte und ein Weg lesen.
create or replace function public.guard_venture_tradeoffs_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instrument text;
begin
  select assessment.instrument_id into v_instrument
  from public.assessments assessment
  where assessment.id = new.assessment_id;

  if v_instrument is distinct from 'venture-tradeoffs-v1' then
    return new;
  end if;

  if new.block_id not in ('W03', 'W04', 'W05', 'W06') then
    raise exception 'venture_tradeoffs_unknown_item' using errcode = '23514';
  end if;

  if new.answer_format <> 'value_case' then
    raise exception 'venture_tradeoffs_format' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_venture_tradeoffs_answer() from public, anon, authenticated;

create trigger guard_venture_tradeoffs_answer
  before insert or update on public.alignment_answers
  for each row execute function public.guard_venture_tradeoffs_answer();

comment on function public.guard_venture_tradeoffs_assessment() is
  'Nur fuer venture-tradeoffs-v1: ein Vorhaben, Mitglied, unveraenderlich nach der Abgabe, Abgabe nur vollstaendig (W03-W06). Fuer alle anderen Instrumente ein No-op.';
comment on function public.guard_venture_tradeoffs_answer() is
  'Nur fuer venture-tradeoffs-v1: nur W03-W06, nur value_case. Fuer alle anderen Instrumente ein No-op.';

commit;
