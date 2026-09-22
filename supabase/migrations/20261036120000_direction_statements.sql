begin;

-- ---------------------------------------------------------------------------
-- Was aus dem Richtungs-Gespraech bleibt
-- ---------------------------------------------------------------------------
--
-- SCHRITT S3 aus `web/docs/direction-interview-technical-brief.md`.
--
-- ZWEI TABELLEN, UND DAS IST DIE EIGENTLICHE ZUSAGE. Aus dem Briefing vom
-- 21.09.2026: "Nur bestaetigte Inhalte duerfen spaeter fuer andere
-- Produktbereiche genutzt werden."
--
-- Das ist keine Regel der Oberflaeche. Es wird dadurch wahr, dass ein
-- Vorschlag und eine bestaetigte Aussage VERSCHIEDENE ZEILEN IN
-- VERSCHIEDENEN TABELLEN sind: Andere Produktbereiche lesen
-- `direction_statements`, und auf `direction_statement_proposals` haben sie
-- kein Leserecht. Eine `status`-Spalte in einer gemeinsamen Tabelle waere
-- dieselbe Zusage mit einem vergessenen `where` Abstand.
--
-- WARUM DAS HIER STRENGER SEIN MUSS ALS BEI CAPABILITY: Dort waehlt ein
-- Modell aus 48 geschlossenen Begriffen - es kann nichts erfinden. Hier
-- schreibt es einen Satz ueber einen Menschen. Drei Dinge halten das in
-- Grenzen: das Pflichtzitat (in der Datenbank geprueft, Schritt S4), die
-- Bestaetigung als Pflicht statt Angebot, und eine Herkunftsangabe statt
-- einer Zahl.
--
-- KEIN SCORE. Es gibt keine Spalte, in die eine Punktzahl passen wuerde, und
-- `confidence` ist keine: Sie sagt, WORAUF eine Aussage beruht ("in mehreren
-- Beispielen aufgetaucht"), nicht wie stark sie ist. Es wird nichts
-- aggregiert.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Bestaetigte Aussagen
-- ---------------------------------------------------------------------------
create table public.direction_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  /**
   * Welche Art von Aussage das ist. Die Werteliste muss mit DIRECTION_FACETS
   * im Code uebereinstimmen; ein Test vergleicht beide.
   */
  facet text not null,

  /** Die Formulierung - moeglichst die der PERSON, nicht die eines Modells. */
  statement text not null,

  /**
   * Worauf sie beruht. VIER STUFEN, KEINE ZAHL:
   *
   *   stated       - so gesagt.
   *   one_example  - durch ein Beispiel gestuetzt.
   *   recurring    - taucht in mehreren Beispielen auf.
   *   tentative    - eine vorsichtige Deutung.
   *
   * Aus dem Briefing, Abschnitt 9: "Keine scheinpraezisen Scores."
   */
  confidence text not null,

  /**
   * Woher sie kommt.
   *
   *   own_words           - selbst geschrieben.
   *   confirmed_proposal  - ein Vorschlag, unveraendert bestaetigt.
   *   edited_proposal     - ein Vorschlag, umformuliert.
   *
   * DIE UNTERSCHEIDUNG BLEIBT SICHTBAR, weil sie spaeter zaehlt: Wer liest,
   * was ueber ihn dasteht, soll erkennen koennen, wessen Formulierung das
   * ist.
   */
  origin text not null,

  /** Die Antwort, aus der sie stammt. Bleibt bestehen, wenn das Gespraech geht. */
  source_turn_id uuid references public.capability_interview_turns (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint direction_statements_facet_check check (facet in (
    'recurring_theme',
    'problem_cared_about',
    'people_cared_about',
    'desired_change',
    'meaningful_outcome',
    'energising_activity',
    'preferred_contribution',
    'frustrating_condition',
    'recurring_tension',
    'open_question'
  )),
  constraint direction_statements_confidence_check
    check (confidence in ('stated', 'one_example', 'recurring', 'tentative')),
  constraint direction_statements_origin_check
    check (origin in ('own_words', 'confirmed_proposal', 'edited_proposal')),
  -- Drei Zeichen sind das Minimum fuer ein Wort; zweihundert die Grenze, ab
  -- der aus einer Aussage ein Absatz wird. Eine Richtung, die man nicht in
  -- einem Satz sagen kann, ist noch keine.
  constraint direction_statements_length
    check (char_length(btrim(statement)) between 3 and 200)
);

comment on table public.direction_statements is
  'Bestaetigte Aussagen aus dem Richtungs-Gespraech. NUR diese Tabelle darf von anderen Produktbereichen gelesen werden - ein Vorschlag ist keine Aussage.';

create index direction_statements_user_idx
  on public.direction_statements (user_id, facet);

alter table public.direction_statements enable row level security;
revoke all on public.direction_statements from anon, authenticated;
grant select, insert, update, delete on public.direction_statements to authenticated;

-- NUR DIE EIGENEN, und zwar ohne Ausnahme. Es gibt hier bewusst KEINE
-- Freigabestufe: Solange es keinen Weg gibt, etwas zu teilen, ist "privat"
-- kein Vorgabewert in einer Spalte, sondern die Abwesenheit jeder anderen
-- Regel. Eine Spalte `direction_disclosure`, die niemand liest, waere das
-- Gegenteil: ein Versprechen, das nichts einloest.
create policy direction_statements_select_self on public.direction_statements
  for select to authenticated using (user_id = auth.uid());
create policy direction_statements_insert_self on public.direction_statements
  for insert to authenticated with check (user_id = auth.uid());
create policy direction_statements_update_self on public.direction_statements
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy direction_statements_delete_self on public.direction_statements
  for delete to authenticated using (user_id = auth.uid());

create trigger direction_statements_updated_at
  before update on public.direction_statements
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Vorschlaege eines Modells
-- ---------------------------------------------------------------------------
--
-- SIE ENTSTEHEN ERST IN SCHRITT S4. Die Tabelle steht trotzdem jetzt, weil
-- der Bestaetigungsweg zuerst gebaut wird: Wer den Menschen nachtraeglich in
-- einen Ablauf einbaut, der ohne ihn entworfen wurde, bekommt einen
-- Bestaetigungsknopf statt einer Entscheidung.
create table public.direction_statement_proposals (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null
    references public.capability_interview_turns (id) on delete cascade,

  facet text not null,
  statement text not null,

  /**
   * Der Beleg - WORTWOERTLICH aus der Antwort.
   *
   * Dieselbe Bauweise wie bei den Faehigkeitsvorschlaegen: Die schreibende
   * Funktion rechnet in Schritt S4 nach, dass dieses Zitat wirklich in der
   * Antwort steht. Ein Satz ueber einen Menschen ohne Beleg entsteht nicht.
   */
  evidence_quote text not null,

  status text not null default 'pending',
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,

  constraint direction_proposals_facet_check check (facet in (
    'recurring_theme',
    'problem_cared_about',
    'people_cared_about',
    'desired_change',
    'meaningful_outcome',
    'energising_activity',
    'preferred_contribution',
    'frustrating_condition',
    'recurring_tension',
    'open_question'
  )),
  constraint direction_proposals_status_check
    check (status in ('pending', 'accepted', 'rejected')),
  constraint direction_proposals_decided
    check ((status = 'pending') = (decided_at is null)),
  constraint direction_proposals_statement_length
    check (char_length(btrim(statement)) between 3 and 200),
  constraint direction_proposals_quote_length
    check (char_length(btrim(evidence_quote)) between 12 and 300)
);

comment on table public.direction_statement_proposals is
  'Was ein Modell vorschlaegt, mit wortwoertlichem Beleg. Existiert nur, bis ein Mensch entschieden hat - und wird von keinem anderen Produktbereich gelesen.';

create index direction_proposals_turn_idx
  on public.direction_statement_proposals (turn_id, status);

alter table public.direction_statement_proposals enable row level security;
revoke all on public.direction_statement_proposals from anon, authenticated;

-- LESEN JA, SCHREIBEN NEIN. Ein Vorschlag entsteht ausschliesslich durch die
-- Arbeiterfunktion in Schritt S4 - die Anwendung kann keinen anlegen, auch
-- nicht im Namen der eigenen Person. Sonst waere die Zitatpruefung eine
-- Hoeflichkeit statt einer Zusage.
grant select on public.direction_statement_proposals to authenticated;
grant update (status, decided_at) on public.direction_statement_proposals to authenticated;

create policy direction_proposals_select_own on public.direction_statement_proposals
  for select to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = direction_statement_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );

create policy direction_proposals_decide_own on public.direction_statement_proposals
  for update to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = direction_statement_proposals.turn_id
        and session.user_id = auth.uid()
    )
  );

commit;
