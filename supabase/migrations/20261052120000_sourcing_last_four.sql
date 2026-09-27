begin;

-- ---------------------------------------------------------------------------
-- Die letzten vier - entschieden
-- ---------------------------------------------------------------------------
--
-- ENTSCHIEDEN AM 27.09.2026 von Maria: "Ja, ich stimme dir zu, dass die
-- erstmal ins Team kommen."
--
-- Damit ist die Faltin-Einordnung vollstaendig: kein Bereich steht mehr auf
-- `unclassified`.
--
-- WARUM DIESE VIER INS TEAM GEHOEREN - es ist bei allen dieselbe Bewegung:
--
--   `b2b_sales` - "founder-led sales" ist in der Gruendungslehre am Anfang
--   nicht delegierbar. Wer nicht selbst verkauft, lernt den Kunden nicht
--   kennen; der Vertriebsdienstleister lernt ihn statt einem.
--
--   `fundraising` und `investor_relations` - es gibt einen Beratungsmarkt,
--   aber investiert wird in Gruender. Das Vertrauen entsteht zwischen
--   Personen, und das Gespraech fuehrt niemand fuer einen.
--
--   `financial_planning` - die Annahmen im Modell SIND die Strategie. Faltin
--   trennt genau hier: Buchhaltung ist eine Komponente (steht schon so da),
--   Unit Economics nicht (steht seit gestern so da). Die Finanzplanung liegt
--   naeher an der zweiten als an der ersten.
--
-- `unclassified` bleibt als Wert bestehen. Nicht aus Ordnungsliebe: Kommen
-- neue Bereiche dazu, sollen sie wieder unentschieden anfangen und nicht mit
-- einer Voreinstellung, die wie eine Einschaetzung aussieht.
-- ---------------------------------------------------------------------------

update public.capability_areas set sourcing = 'internal_only'
where area_id in (
  'b2b_sales',
  'fundraising',
  'investor_relations',
  'financial_planning'
);

commit;
