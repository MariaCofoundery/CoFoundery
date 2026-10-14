begin;

-- ---------------------------------------------------------------------------
-- Capability-Matching-Freigabe
-- ---------------------------------------------------------------------------
--
-- „Darf Made2Found meine Capability-Daten intern für Founder-Vorschläge
-- verwenden?“ (Spec matching-engine-v0.1 §5, Implementation Decisions §1).
--
-- STRIKT GETRENNT von `capability_disclosure` („Wer darf meine Fähigkeiten
-- sehen?“): Keine der beiden Angaben ändert die andere, keine wird aus der
-- anderen abgeleitet. Eine Sichtbarkeitsfreigabe ist keine Matching-Freigabe.
--
-- WARUM IN person_core: Capability ist person-level, und die verwandte
-- Einstellung `capability_disclosure` liegt bereits hier. person_core ist
-- owner-only (Lesen und Schreiben nur durch die Person selbst), hat genau eine
-- Zeile je Mensch (Trigger auf auth.users), geht mit dem Konto (on delete
-- cascade) und erscheint im Datenexport. Der Kontext-Sync
-- (20260907180000) kopiert nur benannte Spalten; diese gehört nicht dazu.
--
-- DEFAULT false: Ohne ausdrückliche Freigabe gelten Capability-Daten für das
-- Matching als nicht verfügbar. Bestehende Zeilen bekommen ebenfalls false -
-- niemand hat bisher zugestimmt.
--
-- Noch keine Oberfläche: Die Freigabe wird erst eingeholt, wenn FIND die
-- Matching-Engine tatsächlich nutzt.

alter table public.person_core
  add column capability_matching_allowed boolean not null default false;

comment on column public.person_core.capability_matching_allowed is
  'Ausdrückliche Freigabe, Capability-Bereich, Erfahrung und Verantwortungswunsch intern für Founder-Vorschläge zu verwenden. Default false. Unabhängig von capability_disclosure (Sichtbarkeit).';

commit;
