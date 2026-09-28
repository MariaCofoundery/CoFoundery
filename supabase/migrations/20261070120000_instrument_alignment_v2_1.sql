begin;

-- ---------------------------------------------------------------------------
-- v2.1 bekommt seine Kennung, v2 wird archiviert
-- ---------------------------------------------------------------------------
--
-- Die fachliche Durchsicht vom 28.09.2026 hat vier Items gestrichen, eines
-- geteilt und fuenf so veraendert, dass sie etwas anderes messen als vorher.
-- Das ist kein Umformulieren. Die Durchsicht warnt ausdruecklich davor,
-- dieselbe Kennung mit neuer Bedeutung weiterzufuehren - genau daran haengt
-- spaeter jede Auswertung, die Antworten aus zwei Zeitraeumen nebeneinander
-- legt.
--
-- Deshalb eine eigene Kennung und nicht ein korrigiertes v2.
--
-- v2 wird ARCHIVIERT, nicht geloescht. Zwar hat es nie jemand ausgefuellt -
-- aber die Regel „eine Fassung, die es gab, verschwindet nicht" ist nichts
-- wert, wenn sie beim ersten bequemen Fall gebrochen wird. Und die
-- Instrumentkennung steht in alignment_answers als Fremdschluessel: Sie
-- spaeter zu loeschen hiesse, Antworten heimatlos zu machen.

insert into public.instruments (id, label, status, introduced_at) values
  ('founder-alignment-v2-1', 'Founder-Alignment v2.1', 'draft', null);

update public.instruments
   set status = 'archived'
 where id = 'founder-alignment-v2';

-- v1 bleibt 'active', bis der Umstieg wirklich stattfindet. Bis dahin gibt es
-- eine aktive Fassung, die vorgelegt wird, und zwei, die es nicht werden:
-- eine archivierte und einen Entwurf.

commit;
