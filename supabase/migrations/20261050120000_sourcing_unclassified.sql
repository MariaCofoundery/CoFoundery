begin;

-- ---------------------------------------------------------------------------
-- "Noch nicht eingeordnet" ist keine Einschaetzung
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 26.09.2026 auf die Frage, was zu Faltin eigentlich zu
-- entscheiden sei.
--
-- `sourcing` hat drei Werte, und `depends` ist die Voreinstellung der Spalte.
-- Eingeordnet wurden bei der Einfuehrung zwanzig Bereiche; die anderen 34
-- sind auf der Voreinstellung liegengeblieben.
--
-- DAMIT BEDEUTET `depends` ZWEIERLEI: "haengt wirklich davon ab, was ihr
-- baut" und "hat noch niemand entschieden". Angezeigt wird aber nur das
-- erste, und zwar als Aussage: "Ob das ins Team gehoert, haengt davon ab, was
-- ihr baut." Bei zwei Dritteln der Bereiche behauptet das Produkt damit
-- etwas, das nie entschieden wurde.
--
-- Am deutlichsten an `unit_economics`: Es stand auf `depends` - also genau
-- das Beispiel, mit dem die Begruendung der urspruenglichen Migration den
-- ganzen Mechanismus rechtfertigt ("Buchhaltung ist eine Komponente - die
-- kauft man. Unit Economics nicht.").
--
-- EIN VIERTER WERT LOEST DAS, und zwar ohne dass irgendjemand die Liste
-- durchgehen muss: `unclassified` ist die neue Voreinstellung und zeigt gar
-- nichts an. Ein Bereich bekommt sein Schildchen, wenn jemand ihn eingeordnet
-- hat - vorher nicht.
--
-- WARUM ALLE 34 UMGEZOGEN WERDEN: Keiner von ihnen wurde je auf `depends`
-- GESETZT. Sie haben den Wert bekommen, weil die Spalte ihn vergibt. Sie
-- stehenzulassen hiesse, eine Voreinstellung nachtraeglich zur Entscheidung
-- zu erklaeren.
--
-- `depends` bleibt und behaelt seine Bedeutung - fuer die Bereiche, bei denen
-- jemand wirklich zu dem Schluss kommt, dass es vom Vorhaben abhaengt.
-- ---------------------------------------------------------------------------

alter table public.capability_areas
  alter column sourcing set default 'unclassified';

alter table public.capability_areas
  drop constraint capability_areas_sourcing_check;
alter table public.capability_areas
  add constraint capability_areas_sourcing_check
  check (sourcing in ('internal_only', 'component', 'depends', 'unclassified'));

-- Die 34, die nie eingeordnet wurden.
update public.capability_areas
set sourcing = 'unclassified'
where sourcing = 'depends';

comment on column public.capability_areas.sourcing is
  'Nach Faltins Komponentenmodell: gehoert ins Team (internal_only), ist '
  'einkaufbar (component), haengt vom Vorhaben ab (depends) - oder ist noch '
  'nicht eingeordnet (unclassified, die Voreinstellung). Der letzte Wert ist '
  'keine Einschaetzung und wird nicht angezeigt.';

commit;
