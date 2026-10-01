begin;

-- ---------------------------------------------------------------------------
-- Der letzte Rueckweg in den Kern faellt weg
-- ---------------------------------------------------------------------------
--
-- Migration 20261092120000 hat die Rueckwege aus Connect und FIND entfernt.
-- Einer blieb: `sync_person_core_from_profiles`, verkleinert auf
-- `display_name`. Er war noetig, weil fuenf Stellen den Namen direkt nach
-- `profiles` schrieben - haette man ihn damals entfernt, haette jemand nach
-- dem Einstieg einen Namen in `profiles` gehabt und keinen im Kern.
--
-- Diese fuenf Stellen schreiben seit dem 01.10.2026 in den Kern:
--
--     features/profile/actions.ts          upsertProfileBasicsAction
--     app/(product)/dashboard/actions.ts   updateDisplayNameAction
--     features/questionnaire/actions.ts    saveDisplayName
--     features/questionnaire/actionsB.ts   saveDisplayNameB
--     scripts/dev-seed.ts                  seedProfile / seedPersonCore
--
-- Alle ueber denselben Helfer (`features/profile/displayNameWrite.ts`), und
-- `profiles.display_name` bekommt den Wert von der Propagation aus
-- 20260907180000.
--
-- ---------------------------------------------------------------------------
-- DIE ZIELARCHITEKTUR, VOLLSTAENDIG
-- ---------------------------------------------------------------------------
--
--     person_core                          kanonisch, privat
--         |
--         +--> profiles                    Rollen, Avatar - und der Name als Kopie
--         +--> network_profiles            veroeffentlichte Kopie
--         +--> founder_discovery_profiles  veroeffentlichte Kopie
--
-- Kein Rueckweg. Ein Schreibvorgang auf eine der drei Tabellen aendert die
-- private Identitaet nicht mehr - das war die Bauart, die bei Connect die Bio
-- von 1200 auf 800 Zeichen gekuerzt hat.
--
-- ---------------------------------------------------------------------------
-- WAS `profiles.display_name` JETZT IST
-- ---------------------------------------------------------------------------
--
-- Eine Kopie, die von der Propagation gepflegt wird. Sie bleibt, weil sieben
-- Lesestellen sie benutzen (Advisor-Ansichten, Team-Auswertungen,
-- Dashboard-Rollen, Workbook). Sie zu entfernen ist ein eigener Schritt und
-- gehoert nicht hierher.

drop trigger if exists sync_person_core_after_profiles_write on public.profiles;
drop function if exists public.sync_person_core_from_profiles();

commit;
