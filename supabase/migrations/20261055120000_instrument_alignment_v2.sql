begin;

-- ---------------------------------------------------------------------------
-- Schritt 2b: Das Instrument v2 bekommt seine Kennung
-- ---------------------------------------------------------------------------
--
-- STATUS 'draft', UND DAS IST DER GANZE PUNKT. Die Fassung existiert, ist
-- referenzierbar und kann Antworten tragen - aber sie wird niemandem
-- vorgelegt. Ohne diesen Zwischenzustand gaebe es nur "fertig" oder "gibt es
-- nicht", und dann muesste der Umstieg an einem einzigen Tag passieren.
--
-- `introduced_at` bleibt leer, bis sie tatsaechlich vorgelegt wird. Die Spalte
-- ist fuer das Archiv und fuer Exporte gedacht; ein Datum einzutragen, bevor
-- ein Mensch die Fragen gesehen hat, waere eine Behauptung.

insert into public.instruments (id, label, status, introduced_at) values
  ('founder-alignment-v2', 'Founder-Alignment v2', 'draft', null);

-- v1 bleibt ausdruecklich 'active'. Erst der letzte Schritt dreht das um -
-- und zwar auf 'archived', nicht auf geloescht: Eine archivierte Fassung
-- bleibt gueltig und rechenbar fuer alle, die bei ihr bleiben.

commit;
