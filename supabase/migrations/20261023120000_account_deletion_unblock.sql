begin;

-- ---------------------------------------------------------------------------
-- Sechs Verweise, die eine Kontoloeschung verbieten konnten
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 21.09.2026, weil `npm run ci:check` keine pgTAP-Tests ausfuehrt:
-- `supabase/tests/account_deletion_has_no_blockers.sql` war rot und niemand
-- sah es. Der Test stammt vom 18.09.2026, und sein Anlass war kein
-- theoretischer - damals schlug die Kontoloeschung fuer JEDEN fehl, der das
-- Produkt wirklich benutzt hatte, wegen acht Fremdschluesseln auf `auth.users`
-- mit `on delete restrict`, die sich seit dem Schreiben der Loeschung
-- angesammelt hatten.
--
-- Seither sind sechs neue dazugekommen: drei aus Read My Mind (28.08.) und
-- drei aus den Alignment-Workbooks.
--
-- WARUM DAS TROTZDEM NIEMAND GEMERKT HAT, und warum es zu reparieren ist:
-- Alle sechs sind AKTUELL abgedeckt - drei von einem `before delete`-Trigger
-- auf `auth.users`, drei von der Loesch-RPC. Ich habe das gegen die lokale
-- Datenbank geprueft: Eine Person, die eine Runde angelegt hat, laesst sich
-- loeschen. Die Loeschung ist also NICHT kaputt.
--
-- Aber genau davor warnt der Test: Die Zusage haengt an zwei Stellen Code, die
-- woanders liegen als der Fremdschluessel. Wer morgen eine Tabelle anlegt,
-- bekommt davon nichts mitgeteilt - bis jemand sich loeschen will. Deshalb
-- wird hier das Schema so gesetzt, dass die Zusage struktureller Natur ist
-- statt eine Verabredung.
--
-- JE FALL DIE PASSENDE REGEL, und das ist der Grund, warum das nicht einfach
-- ueberall `cascade` ist:
--
--   CASCADE, wo die Zeile ohne diesen Menschen keinen Sinn hat und der
--   vorhandene Aufraeumcode sie ohnehin loescht. Fuer die drei
--   Collaboration-Verweise ist das VERHALTENSGLEICH: Der Trigger loescht
--   heute schon genau diese Runden.
--
--   SET NULL fuer die Workbooks. Ein Workbook gehoert einem TEAM; es zu
--   loeschen, weil ein Mitglied gegangen ist, waere falsch - die anderen
--   verlieren sonst ihre Arbeit. Die Loesch-RPC schreibt `created_by` und
--   `updated_by` deshalb auf die einladende Person um, und das bleibt der
--   Weg. `set null` ist nicht der Plan, sondern das Netz darunter.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Read My Mind: cascade, wie der Trigger es heute schon tut
-- ---------------------------------------------------------------------------
--
-- Dass eine Runde mitgeht, wenn die Person geht, die sie angelegt hat, ist
-- eine bestehende Produktentscheidung - sie steht seit dem 28.08.2026 in
-- `delete_unlinked_personal_data_for_auth_user`
-- ("where round_row.created_by_user_id = old.id"). Hier wird sie nur dort
-- hingeschrieben, wo sie hingehoert.
alter table public.collaboration_experience_rounds
  drop constraint collaboration_experience_rounds_created_by_user_id_fkey;
alter table public.collaboration_experience_rounds
  add constraint collaboration_experience_rounds_created_by_user_id_fkey
    foreign key (created_by_user_id) references auth.users (id) on delete cascade;

alter table public.collaboration_experience_round_participants
  drop constraint collaboration_experience_round_participant_founder_user_id_fkey;
alter table public.collaboration_experience_round_participants
  add constraint collaboration_experience_round_participant_founder_user_id_fkey
    foreign key (founder_user_id) references auth.users (id) on delete cascade;

-- Diese Zeile konnte den Weg ohnehin nie blockieren: Ueber
-- (round_id, target_user_id) haengt sie per `cascade` an der
-- Teilnehmerzeile - ein Ziel ist immer auch Teilnehmer. Der Verweis auf
-- `auth.users` war also schon immer nur eine Falle ohne Funktion.
alter table public.collaboration_experience_prompt_assignments
  drop constraint collaboration_experience_prompt_assignments_target_user_id_fkey;
alter table public.collaboration_experience_prompt_assignments
  add constraint collaboration_experience_prompt_assignments_target_user_id_fkey
    foreign key (target_user_id) references auth.users (id) on delete cascade;


-- ---------------------------------------------------------------------------
-- 2. Advisor-Einladung: cascade, wie die RPC es heute schon tut
-- ---------------------------------------------------------------------------
--
-- Eine Einladung, die von einer geloeschten Person ausgesprochen wurde, ist
-- tot: Sie kann nicht mehr bestaetigt und nicht mehr zurueckgezogen werden.
-- `delete_founder_account_data` loescht sie deshalb bereits
-- ("or fa.requested_by = v_user_id").
alter table public.founder_alignment_workbook_advisors
  drop constraint founder_alignment_workbook_advisors_requested_by_fkey;
alter table public.founder_alignment_workbook_advisors
  add constraint founder_alignment_workbook_advisors_requested_by_fkey
    foreign key (requested_by) references auth.users (id) on delete cascade;


-- ---------------------------------------------------------------------------
-- 3. Workbooks: set null, denn die Arbeit gehört dem Team
-- ---------------------------------------------------------------------------
--
-- `set null` auf einer `not null`-Spalte waere ein Constraint-Fehler mitten in
-- der Loeschung - also derselbe Fehlschlag, nur an anderer Stelle. Genau davor
-- warnt der zweite Fall in `account_deletion_has_no_blockers.sql`. Also werden
-- die Spalten zuerst nullable.
--
-- IM CODE AENDERT SICH DADURCH NICHTS: Beide Spalten werden nur geschrieben,
-- nie gelesen (`founderAlignmentWorkbookActions.ts` setzt sie beim Anlegen).
-- Und der Normalfall bleibt die Umschreibung auf die einladende Person in der
-- Loesch-RPC - null steht nur dort, wo sonst gar nichts stehen koennte.
alter table public.founder_alignment_workbooks
  alter column created_by drop not null,
  alter column updated_by drop not null;

alter table public.founder_alignment_workbooks
  drop constraint founder_alignment_workbooks_created_by_fkey;
alter table public.founder_alignment_workbooks
  add constraint founder_alignment_workbooks_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.founder_alignment_workbooks
  drop constraint founder_alignment_workbooks_updated_by_fkey;
alter table public.founder_alignment_workbooks
  add constraint founder_alignment_workbooks_updated_by_fkey
    foreign key (updated_by) references auth.users (id) on delete set null;

comment on column public.founder_alignment_workbooks.created_by is
  'Wer das Workbook angelegt hat. Nullable seit 21.09.2026: Ein Workbook gehoert dem Team und ueberlebt die Loeschung eines Mitglieds. Die Loesch-RPC schreibt die Spalte auf die einladende Person um; null ist das Netz darunter, nicht der Plan.';

commit;
