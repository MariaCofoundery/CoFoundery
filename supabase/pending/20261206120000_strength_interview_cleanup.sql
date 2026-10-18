begin;

-- ---------------------------------------------------------------------------
-- Aufraeumen nach dem Rollout des Staerken-Interviews
-- ---------------------------------------------------------------------------
--
-- NOCH NICHT IN `supabase/migrations/`, und das mit Absicht: Liegt die Datei
-- dort, nimmt `supabase db push` sie zusammen mit 20261205120000 mit - und
-- dann gaebe es kein Zeitfenster, in dem alter und neuer Arbeiter
-- nebeneinander laufen koennen. Sie wird erst verschoben, wenn:
--
--   1. 20261205120000_strength_interview.sql remote eingespielt ist,
--   2. die App mit dem neuen Code deployt ist,
--   3. der Arbeiter auf dem Laptop mit dem neuen Code neu gestartet wurde,
--   4. der Production-Smoke-Test gruen ist, und
--   5. `supabase/healthchecks/strength_interview_rollout_check.sql` keine
--      offenen `capability_area_proposal`-Jobs mehr zeigt, die ein alter
--      Arbeiter gerade bearbeitet.
--
-- Dann, als ein Commit:
--
--   a. diese Datei nach `supabase/migrations/` verschieben und in die
--      Migrationsliste des Reihenfolge-Tests eintragen
--      (`web/src/features/instruments/workstyle/__tests__/phase116c.test.ts`),
--   b. `supabase/pending/strength_interview_cleanup_test.sql` nach
--      `supabase/tests/` verschieben,
--   c. `supabase/tests/person_strengths.sql` durch
--      `supabase/pending/person_strengths.after_cleanup.sql` ersetzen,
--   d. `supabase/tests/strength_interview_transition.sql` loeschen - sie
--      prueft genau den Uebergang, den es dann nicht mehr gibt,
--   e. im App-Test `strengthsInterview.test.ts` die Erwartung umdrehen
--      ("Aufraeum-Migration liegt noch nicht in migrations/"),
--   f. `npm run db:test` und `npm run ci:check`, dann `db push`.
--
-- Lokal geprueft am 18.10.2026: frische DB + diese Datei -> alle Suiten
-- gruen bis auf genau die beiden aus c. und d.; deren Nachfolger gruen.
--
-- WAS SIE TUT: Sie entfernt den alten Capability->Staerken-Schreibweg.
-- Danach gibt es genau eine Funktion, die Staerken-Vorschlaege schreibt, und
-- sie nimmt nur `strength_proposal`-Jobs an.
--
-- WAS SIE NICHT TUT: Daten loeschen. Alte Vorschlaege (ohne Bezeichnung)
-- bleiben, lassen sich weiter bestaetigen oder ablehnen, und der Teilindex
-- `person_strength_proposals_legacy_once` bleibt als Zusage fuer genau diese
-- Zeilen bestehen.
-- ---------------------------------------------------------------------------

drop function if exists public.insert_ai_strength_proposal(uuid, text, text, text, text);

comment on function public.insert_ai_strength_proposal(uuid, uuid, text, text, text, text, text, text) is
  'Der einzige Schreibweg fuer Staerken-Vorschlaege: nur fuer strength_proposal-Jobs, mit woertlichem Zitat aus der angegebenen Antwort. Der alte Weg ueber capability_area_proposal wurde mit 20261206120000 entfernt.';

commit;
