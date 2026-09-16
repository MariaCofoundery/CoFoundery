begin;

-- ---------------------------------------------------------------------------
-- location_label ist weg
-- ---------------------------------------------------------------------------
--
-- Zwei Spalten fuer dieselbe Sache: location_label aus dem urspruenglichen
-- Discovery-Schema und location_region aus dem V2-Schnitt. Seit der
-- Profilzusammenlegung kommt die Region aus person_core und wird bei jedem
-- Speichern aufgefrischt - location_label dagegen nicht.
--
-- Das war kein Schoenheitsfehler, sondern ein stiller Fehler:
--   Das Formular schrieb den Altwert nur noch als verstecktes Feld an sich
--   selbst zurueck. Er veraltete also ab dem Tag der Zusammenlegung. Drei
--   Anzeigen lasen trotzdem weiter ihn, und der Abgleich gespeicherter Suchen
--   verglich Orte ebenfalls gegen ihn. Wer nach dem Umzug seine Region
--   aenderte, wurde weiter am alten Ort gefunden.
--
-- REIHENFOLGE, und sie ist der Punkt:
--   Erst wird gerettet, was nur dort steht - dann erst faellt die Spalte. Bei
--   frueheren Nutzerinnen kann location_label der einzige Ort sein, an dem je
--   ein Ort eingetragen wurde; person_core hat sie beim Zusammenlegen nur von
--   location_region uebernommen.
-- ---------------------------------------------------------------------------

-- 1. In die gemeinsame Identitaet, denn von dort kommt die Region kuenftig.
update public.person_core core
set location_region = left(btrim(profile.location_label), 120)
from public.founder_discovery_profiles profile
where profile.user_id = core.user_id
  and coalesce(btrim(core.location_region), '') = ''
  and coalesce(btrim(profile.location_label), '') <> '';

-- 2. Und ins Suchprofil selbst, damit die Anzeige sofort stimmt und nicht
--    erst nach dem naechsten Speichern.
update public.founder_discovery_profiles
set location_region = left(btrim(location_label), 120)
where coalesce(btrim(location_region), '') = ''
  and coalesce(btrim(location_label), '') <> '';

-- 3. Erst jetzt.
alter table public.founder_discovery_profiles
  drop column location_label;

commit;
