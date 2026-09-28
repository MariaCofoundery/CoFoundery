begin;

-- ---------------------------------------------------------------------------
-- Schritt 8: Umstieg und Archiv
-- ---------------------------------------------------------------------------
--
-- Marias Vorgabe, woertlich: "dass halt auch das, was jetzt da ist, nicht
-- einfach verschwindet, sondern vielleicht in so einem Archiv landet und dass
-- man dann pro Profil, wenn man den Test vielleicht schon mal gemacht hat,
-- eine Meldung bekommt, hey, es gibt eine neue Version von dem Test, du kannst
-- deinen alten behalten oder du machst das nochmal neu."
--
-- DAS ARCHIV IST SCHON DA. Seit Schritt 0 ist es kein zweiter Speicher,
-- sondern ein Status: Eine archivierte Fassung bleibt vollstaendig lesbar und
-- rechenbar, sie wird nur niemandem mehr neu vorgelegt. Deshalb braucht es
-- hier keine Kopie und keine Umzugslogik - nur die Entscheidung der Person.
--
-- ---------------------------------------------------------------------------
-- WARUM DIE ENTSCHEIDUNG EINE ZEILE BRAUCHT UND KEIN FLAG
-- ---------------------------------------------------------------------------
--
-- "Ich behalte meine alte Fassung" ist eine Aussage ueber ein bestimmtes
-- Fassungspaar, nicht ueber die Person. Wer heute bei v1 bleibt, hat damit
-- nichts ueber v3 gesagt. Ein Haekchen am Profil ("Umstieg erledigt") waere
-- genau die Verwechslung - und in zwei Jahren wuesste niemand mehr, worauf es
-- sich bezog.
--
-- UMENTSCHEIDEN IST VORGESEHEN. Wer die alte Fassung behaelt und drei Monate
-- spaeter doch neu ausfuellen moechte, aendert die Zeile. Eine Entscheidung,
-- die man nur einmal treffen darf, wird nicht getroffen, sondern aufgeschoben.
-- ---------------------------------------------------------------------------

create table public.instrument_transitions (
  user_id uuid not null references auth.users (id) on delete cascade,

  from_instrument_id text not null
    references public.instruments (id) on delete restrict,
  to_instrument_id text not null
    references public.instruments (id) on delete restrict,

  /**
   * `pending`        - gesehen, aber noch nicht entschieden
   * `keep_previous`  - die alte Fassung bleibt gueltig, kein neuer Fragebogen
   * `retake`         - die neue Fassung wird ausgefuellt; die alte bleibt
   *                    trotzdem erhalten und lesbar
   */
  decision text not null default 'pending',
  decided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, from_instrument_id, to_instrument_id),

  constraint instrument_transitions_decision_check
    check (decision in ('pending', 'keep_previous', 'retake')),

  -- Eine getroffene Entscheidung hat ein Datum, eine offene nicht. Als
  -- Implikation formuliert und NICHT als Aequivalenz: Sonst muesste beim
  -- Umentscheiden von 'retake' zurueck auf 'pending' das Datum geloescht
  -- werden, und die Information ginge verloren. Genau diese Falle steckt in
  -- `advisor_person_grants_approved` und hat dort schon einmal Aerger gemacht.
  constraint instrument_transitions_decided_at
    check (decision = 'pending' or decided_at is not null),

  constraint instrument_transitions_not_itself
    check (from_instrument_id <> to_instrument_id)
);

comment on table public.instrument_transitions is
  'Die Entscheidung einer Person zu EINEM Fassungspaar: alte behalten oder '
  'neu ausfuellen. Umentscheiden ist vorgesehen; die alten Antworten bleiben '
  'in jedem Fall erhalten.';

comment on column public.instrument_transitions.decision is
  'keep_previous loescht nichts und retake auch nicht - die alte Fassung '
  'bleibt lesbar und rechenbar, sie wird nur nicht mehr vorgelegt.';

alter table public.instrument_transitions enable row level security;
revoke all on public.instrument_transitions from public, anon, authenticated;
grant select, insert, update on public.instrument_transitions to authenticated;

-- Nur die eigene Entscheidung, und niemand entscheidet fuer jemanden.
create policy instrument_transitions_select on public.instrument_transitions
  for select to authenticated using (user_id = auth.uid());

create policy instrument_transitions_insert on public.instrument_transitions
  for insert to authenticated with check (user_id = auth.uid());

create policy instrument_transitions_update on public.instrument_transitions
  for update to authenticated using (user_id = auth.uid());

-- LOESCHEN GIBT ES NICHT. Eine zurueckgenommene Entscheidung waere nicht mehr
-- von "nie gefragt worden" zu unterscheiden - und die Person bekaeme den
-- Hinweis wieder, als haette sie nie geantwortet.

create trigger instrument_transitions_updated_at
  before update on public.instrument_transitions
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- Wem der Hinweis ueberhaupt angezeigt wird
-- ---------------------------------------------------------------------------
--
-- Nur, wer die alte Fassung TATSAECHLICH ABGEGEBEN hat. Wer sie nie ausgefuellt
-- hat, bekommt keinen Umstiegshinweis, sondern einfach die neue Fassung - ein
-- "du kannst deine alte behalten" waere fuer ihn sinnlos und verwirrend.

create function public.needs_instrument_transition_notice(
  p_from text,
  p_to text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.assessments assessment
      where assessment.user_id = p_user_id
        and assessment.instrument_id = p_from
        and assessment.submitted_at is not null
    )
    and not exists (
      select 1 from public.instrument_transitions transition
      where transition.user_id = p_user_id
        and transition.from_instrument_id = p_from
        and transition.to_instrument_id = p_to
        and transition.decision <> 'pending'
    );
$$;

comment on function public.needs_instrument_transition_notice(text, text, uuid) is
  'Hat diese Person die alte Fassung abgegeben und noch nicht entschieden? '
  'Wer die alte nie ausgefuellt hat, bekommt keinen Umstiegshinweis.';

revoke all on function public.needs_instrument_transition_notice(text, text, uuid)
  from public, anon;
grant execute on function public.needs_instrument_transition_notice(text, text, uuid)
  to authenticated;

commit;
