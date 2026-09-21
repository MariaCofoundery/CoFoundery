begin;

-- ---------------------------------------------------------------------------
-- Das Interview - und die Bereiche, die bisher fehlten
-- ---------------------------------------------------------------------------
--
-- BESPROCHEN AM 21.09.2026: "Dass da eben gute Fragen gestellt werden [...]
-- richtig krassen Coach quasi hat, der nach realen Situationen fragt, nach
-- beruflichen Situationen, aber auch privaten Situationen, dass halt wirklich
-- die Stärken mal so ausgearbeitet werden."
--
-- WAS DAS INTERVIEW IST UND WAS NICHT: Es ist ein besserer Weg zu dem, was es
-- schon gibt - `person_capability_evidence`. Heute schreibt man EINE Erzaehlung
-- in ein Textfeld; danach schlaegt das System Bereiche vor, man bestaetigt bis
-- zu drei, setzt Stufe und Verantwortungswunsch. Dieser Ablauf bleibt
-- unveraendert. Das Interview fuehrt ihn nur mehrmals durch, mit Fragen statt
-- mit einem leeren Feld.
--
-- Es ist ausdruecklich KEIN zweites Modell daneben. Ein eigener Auswertungspfad
-- haette einen zweiten Vergleich, eine zweite Freigabeleiter und eine zweite
-- Wahrheit ueber denselben Menschen bedeutet.
--
-- ZWEI WEGE, EIN VERLAUF: Die Fragen kommen aus einem geschriebenen Katalog
-- oder von einem Sprachmodell, wenn es erreichbar ist (Marias Entscheidung vom
-- 21.09.2026: "Modell live, aber wenn es nicht verfuegbar ist, soll das
-- angezeigt werden und dann sollen vorgelegte Fragen ausgespielt werden"). Der
-- Verlauf haelt beide gleich fest, und er haelt fest, WELCHER Weg es war -
-- sonst liesse sich spaeter nicht sagen, warum ein Interview flacher blieb.
--
-- WAS NICHT GESPEICHERT WIRD: nichts Verborgenes. Kein Gedankengang des
-- Modells, keine Zwischenbewertung, keine Tonaufnahme. Es steht genau das da,
-- was gefragt und was geantwortet wurde - und beides kann die Person sehen und
-- loeschen.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Aussenauftritt und Moderation
-- ---------------------------------------------------------------------------
--
-- DIE LUECKE, DIE MARIAS BEISPIEL AUFGEDECKT HAT: "Ihr seid beide sehr ruhig,
-- eher zurueckhaltend, dann braeuchtet ihr vielleicht noch jemanden, der ganz
-- krass euch supportet und praesentieren kann."
--
-- Das liess sich bisher nirgends sagen. Die 42 Bereiche sind rein fachlich
-- (Kunde, Produkt, Technik, Finanzen, Recht ...), und das Align-Modell kennt
-- Unternehmenslogik, Entscheidungslogik, Arbeitsstruktur, Commitment, Risiko
-- und Konfliktstil - keinen Aussenauftritt.
--
-- ALS ROLLE, NICHT ALS CHARAKTER. Das ist die entscheidende Festlegung: Nicht
-- "ihr seid beide zurueckhaltend" - das waere eine Behauptung ueber Menschen,
-- und sie stuende in einer Auswertung, die andere Teammitglieder sehen.
-- Sondern "vor Gruppen sprechen will hier niemand verantworten" - eine Aussage
-- ueber eine Zustaendigkeit. Praktisch dieselbe Schlussfolgerung, aber
-- ueberpruefbar, widersprechbar und ohne Persoenlichkeitsprofil.
--
-- Und deshalb passen diese Bereiche in genau dieselbe Mechanik wie die
-- uebrigen: Anwendungsstufe 1-5 ("wiederholt angewandt"), ein
-- Verantwortungswunsch, ein Beispiel dazu. Eine Skala "wie offen bist du" gibt
-- es hier nicht und soll es nicht geben.

-- 'other' ist bewusst der letzte Eintrag. Die neue Familie schiebt sich davor.
update public.capability_families set sort_order = 10 where family_id = 'other';

insert into public.capability_families (family_id, sort_order) values
  ('communication_representation', 9);

insert into public.capability_areas (area_id, family_id, sort_order) values
  -- Vor Gruppen sprechen, die man nicht kennt. Buehne, Pitch, Kamera.
  ('public_speaking', 'communication_representation', 1),
  -- Gespraeche und Gruppen durch eine Entscheidung fuehren, ohne sie zu
  -- entscheiden.
  ('facilitation', 'communication_representation', 2),
  -- Beziehungen aufbauen und halten - auch die, aus denen gerade nichts folgt.
  ('networking', 'communication_representation', 3),
  -- Unangenehmes ansprechen: Rueckmeldung geben, Konflikte benennen,
  -- Erwartungen klarstellen.
  ('difficult_conversations', 'communication_representation', 4),
  -- Andere anleiten, erklaeren, befaehigen.
  ('teaching_mentoring', 'communication_representation', 5);

comment on table public.capability_areas is
  'Referenzliste der Bereiche. Seit 21.09.2026 mit der Familie communication_representation: Aussenauftritt und Moderation waren in keinem der beiden Modelle abbildbar, obwohl "hier will niemand praesentieren" eine der haeufigsten Teamluecken ist. Bewusst als Zustaendigkeit mit Anwendungsstufe, nicht als Persoenlichkeitsmerkmal.';


-- ---------------------------------------------------------------------------
-- 2. Der Gesprächsverlauf
-- ---------------------------------------------------------------------------
create table public.capability_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint capability_interview_sessions_status_check
    check (status in ('active', 'completed')),
  -- Abgeschlossen heisst abgeschlossen: ohne Zeitpunkt waere "fertig" eine
  -- Behauptung ohne Beleg.
  constraint capability_interview_sessions_completed_at
    check ((status = 'completed') = (completed_at is not null))
);

comment on table public.capability_interview_sessions is
  'Ein gefuehrtes Gespraech zur Erhebung von Faehigkeiten. Erzeugt Evidenz in person_capability_evidence - kein eigener Auswertungspfad.';

-- EIN AKTIVES GESPRAECH JE PERSON. Zwei gleichzeitig waeren zwei Verlaeufe,
-- die sich beide als "das Interview" ausgeben, und beim Fortsetzen entschiede
-- der Zufall.
create unique index capability_interview_sessions_one_active
  on public.capability_interview_sessions (user_id)
  where status = 'active';

create index capability_interview_sessions_user_idx
  on public.capability_interview_sessions (user_id, started_at desc);

alter table public.capability_interview_sessions enable row level security;
revoke all on public.capability_interview_sessions from anon, authenticated;
grant select, insert, update, delete on public.capability_interview_sessions to authenticated;

-- NUR DIE EIGENEN. Ein Interview ueber die eigenen Staerken - auch die
-- privaten Beispiele - ist das Gegenteil von etwas, das ein Team einsehen
-- darf. In die Teamauswertung geht spaeter ausschliesslich der bestaetigte
-- Bereich, nie die Erzaehlung.
create policy capability_interview_sessions_select_self on public.capability_interview_sessions
  for select to authenticated using (user_id = auth.uid());
create policy capability_interview_sessions_insert_self on public.capability_interview_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy capability_interview_sessions_update_self on public.capability_interview_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy capability_interview_sessions_delete_self on public.capability_interview_sessions
  for delete to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. Frage und Antwort
-- ---------------------------------------------------------------------------
create table public.capability_interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.capability_interview_sessions (id) on delete cascade,
  sort_order smallint not null,

  -- WOHER DIE FRAGE KAM. Das ist keine Statistik, sondern Teil der Auskunft:
  -- Wer liest, was er geantwortet hat, soll sehen, ob ihn ein geschriebener
  -- Katalog oder ein Modell gefragt hat.
  question_source text not null,
  /**
   * Bei einer Katalogfrage der Schluessel (z. B. 'owned_last'); bei einer
   * Modellfrage 'model'. Der TEXT einer Katalogfrage steht NICHT hier, sondern
   * im Sprachbundle: Zweimal derselbe Satz an zwei Orten laeuft auseinander,
   * und dann zeigt der Verlauf eine Frage, die so nie gestellt wurde.
   */
  question_id text not null,
  /** Nur bei Modellfragen - sonst gaebe es den Satz nirgends. */
  question_text text,

  answer text,
  answered_at timestamptz,

  /**
   * Die Antwort, nachdem sie zu Evidenz geworden ist.
   *
   * `on delete set null`: Wer eine Evidenz loescht, loescht nicht seinen
   * Gespraechsverlauf - und umgekehrt bleibt die Evidenz bestehen, wenn das
   * Gespraech geloescht wird. Beides sind eigene Entscheidungen.
   */
  evidence_id uuid references public.person_capability_evidence (id) on delete set null,

  created_at timestamptz not null default now(),

  constraint capability_interview_turns_order_unique unique (session_id, sort_order),
  constraint capability_interview_turns_source_check
    check (question_source in ('catalogue', 'model')),
  constraint capability_interview_turns_question_id_format
    check (question_id ~ '^[a-z][a-z_0-9]{1,39}$'),
  -- Eine Modellfrage ohne Text waere nicht nachlesbar; eine Katalogfrage mit
  -- Text waere die zweite Quelle fuer denselben Satz.
  constraint capability_interview_turns_model_has_text
    check ((question_source = 'model') = (question_text is not null)),
  constraint capability_interview_turns_model_id
    check ((question_source = 'model') = (question_id = 'model')),
  constraint capability_interview_turns_question_text_length
    check (question_text is null or char_length(question_text) between 10 and 400),
  -- Dieselben Grenzen wie bei der Erzaehlung im Textfeld
  -- (NARRATIVE_MIN_LENGTH/NARRATIVE_MAX_LENGTH in capabilityTypes.ts): Aus
  -- einer Antwort WIRD eine Erzaehlung, sie kann also nicht laxer sein.
  constraint capability_interview_turns_answer_length
    check (answer is null or char_length(btrim(answer)) between 10 and 2000),
  constraint capability_interview_turns_answered_at
    check ((answer is null) = (answered_at is null))
);

comment on table public.capability_interview_turns is
  'Gestellte Frage und gegebene Antwort, in der Reihenfolge des Gespraechs. Enthaelt nichts Verborgenes: kein Gedankengang eines Modells, keine Zwischenbewertung, keine Tonaufnahme.';

create index capability_interview_turns_session_idx
  on public.capability_interview_turns (session_id, sort_order);

alter table public.capability_interview_turns enable row level security;
revoke all on public.capability_interview_turns from anon, authenticated;
grant select, insert, update, delete on public.capability_interview_turns to authenticated;

-- Ueber die Sitzung, nicht ueber eine eigene Spalte: Eine zweite Kennung der
-- Person waere eine zweite Stelle, an der sie falsch stehen koennte.
create policy capability_interview_turns_select_self on public.capability_interview_turns
  for select to authenticated using (
    exists (
      select 1 from public.capability_interview_sessions session
      where session.id = capability_interview_turns.session_id
        and session.user_id = auth.uid()
    )
  );
create policy capability_interview_turns_insert_self on public.capability_interview_turns
  for insert to authenticated with check (
    exists (
      select 1 from public.capability_interview_sessions session
      where session.id = capability_interview_turns.session_id
        and session.user_id = auth.uid()
        and session.status = 'active'
    )
  );
create policy capability_interview_turns_update_self on public.capability_interview_turns
  for update to authenticated using (
    exists (
      select 1 from public.capability_interview_sessions session
      where session.id = capability_interview_turns.session_id
        and session.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.capability_interview_sessions session
      where session.id = capability_interview_turns.session_id
        and session.user_id = auth.uid()
    )
  );
create policy capability_interview_turns_delete_self on public.capability_interview_turns
  for delete to authenticated using (
    exists (
      select 1 from public.capability_interview_sessions session
      where session.id = capability_interview_turns.session_id
        and session.user_id = auth.uid()
    )
  );

commit;
