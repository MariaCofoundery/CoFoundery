begin;

-- ---------------------------------------------------------------------------
-- Zusammenarbeit als Zustaendigkeit - und was man einkaufen kann
-- ---------------------------------------------------------------------------
--
-- BESPROCHEN AM 22./23.09.2026: "Das Team soll sehen, aha, die Person
-- uebernimmt super gerne Verantwortung oder eher weniger. [...] Was nicht
-- vorhanden ist in dem Founder-Team, das kann man dann halt von aussen suchen,
-- also extern oder man stellt Mitarbeitende. Da denke ich immer gerne an das
-- Komponentenmodell von Guenter Faltin."
--
-- ZWEI DINGE IN EINER MIGRATION, weil das eine ohne das andere die falsche
-- Botschaft ergibt:
--
--   1. Eine zweite Verhaltensfamilie. Die 48 Bereiche sind fachlich, bis auf
--      Aussenauftritt und Moderation. "Verantwortung uebernehmen",
--      "entscheiden, wenn Informationen fehlen", "abgeben" hatten keinen Ort -
--      und genau danach fragt der Interview-Katalog in Frage 1, 2, 7 und 8.
--      Diese Erzaehlungen landeten unter "Sonstiges".
--
--   2. Was sich einkaufen laesst. Ohne das heisst eine Luecke "euch fehlt
--      Finance", und das erzeugt Panik. Mit Faltin heisst sie: "Buchhaltung
--      ist eine Komponente - die kauft man. Unit Economics nicht."
--
-- ALS ZUSTAENDIGKEIT, NICHT ALS CHARAKTER - dieselbe Festlegung wie bei der
-- Familie vom 21.09.2026 und der Grund, warum diese Bereiche ueberhaupt in
-- dieses Modell duerfen. Nicht "ist hartnaeckig", sondern "verantwortet, dass
-- eine Sache zum Ergebnis kommt". Nicht "entscheidet gut" - das waere ein
-- Urteil, das niemand belegen kann -, sondern "entscheidet, wenn Informationen
-- fehlen". Eine Skala "wie belastbar bist du" gibt es hier nicht und soll es
-- nicht geben.
--
-- Deshalb passen sie in dieselbe Mechanik: Anwendungsstufe, ein
-- Verantwortungswunsch, ein Beispiel dazu.
-- ---------------------------------------------------------------------------

update public.capability_families set sort_order = 11 where family_id = 'other';

insert into public.capability_families (family_id, sort_order) values
  ('working_style', 10);

insert into public.capability_areas (area_id, family_id, sort_order) values
  -- Eine Sache bis zu einem Ergebnis tragen - oder bis zur bewussten
  -- Entscheidung, sie zu stoppen. Frage 1 des Interviews fragt genau danach.
  ('owning_outcomes', 'working_style', 1),
  -- Entscheiden, wenn Informationen fehlen. NICHT "gut entscheiden": Das waere
  -- ein Urteil, das keine Selbstauskunft belegen kann.
  ('deciding_under_uncertainty', 'working_style', 2),
  -- Festlegen, was zuerst passiert, wenn nicht alles geht.
  ('prioritising', 'working_style', 3),
  -- Arbeit so ordnen, dass andere andocken koennen.
  ('structuring_work', 'working_style', 4),
  -- Abgeben: an Menschen im Team oder nach aussen. Bei Faltin die
  -- Kernfaehigkeit des Gruenders ueberhaupt.
  ('handing_over', 'working_style', 5),
  -- Nach einem Rueckschlag auswerten, was anders laufen muss. Frage 2 des
  -- Interviews.
  ('reviewing_setbacks', 'working_style', 6);

-- ---------------------------------------------------------------------------
-- Das Komponentenmodell
-- ---------------------------------------------------------------------------
/**
 * Ob ein Bereich im Team sein MUSS oder sich einkaufen laesst.
 *
 * Faltins Punkt in "Kopf schlaegt Kapital": Ein Gruender muss nicht alles
 * koennen. Vieles ist als fertige, professionelle Komponente zu haben - und
 * zwar besser, als man es selbst machen wuerde. Was nicht einkaufbar ist, ist
 * das Konzept und die unternehmerische Verantwortung dafuer.
 *
 *   internal_only - gehoert ins Team. Wer das abgibt, gibt das Unternehmen ab.
 *   component     - als Leistung einkaufbar. Eine Luecke hier ist eine
 *                   Bestellung, kein Problem.
 *   depends       - je nach Vorhaben. Der ehrliche Vorgabewert: Fuer die
 *                   meisten Bereiche haengt es davon ab, was gebaut wird.
 *
 * DIESE EINTEILUNG IST INHALT UND KEINE TECHNIK. Sie gehoert einem Menschen,
 * der das Modell kennt; sie steht hier als erste Fassung und ist mit einer
 * Migration zu aendern.
 */
alter table public.capability_areas
  add column sourcing text not null default 'depends';

alter table public.capability_areas
  add constraint capability_areas_sourcing_check
  check (sourcing in ('internal_only', 'component', 'depends'));

comment on column public.capability_areas.sourcing is
  'Nach Faltins Komponentenmodell: gehoert ins Team (internal_only), ist einkaufbar (component) oder haengt vom Vorhaben ab (depends).';

-- INS TEAM GEHOERT, WER ENTSCHEIDET UND VERANTWORTET.
--
-- Die ganze Verhaltensfamilie: Man kann nicht einkaufen, dass jemand anders
-- fuer das eigene Unternehmen Verantwortung traegt. Und der Kern des Konzepts -
-- Geschaeftsmodell, Positionierung, Produktstrategie, Planung und das
-- Verstehen der Kunden. Bei Faltin ist genau das die Arbeit des Gruenders,
-- waehrend alles andere zugekauft werden kann.
update public.capability_areas set sourcing = 'internal_only'
where area_id in (
  'owning_outcomes', 'deciding_under_uncertainty', 'prioritising',
  'structuring_work', 'handing_over', 'reviewing_setbacks',
  'business_model', 'positioning', 'product_strategy', 'strategic_planning',
  'customer_discovery'
);

-- EINKAUFBAR ist, was als fertige, professionelle Leistung existiert - und
-- meistens besser, als ein Gruenderteam es nebenbei koennte. Eine Luecke hier
-- ist eine Bestellung.
update public.capability_areas set sourcing = 'component'
where area_id in (
  'accounting_controlling', 'corporate_legal', 'ip', 'data_protection',
  'compliance_regulatory', 'security', 'performance_marketing',
  'hardware_production', 'prototyping'
);

commit;
