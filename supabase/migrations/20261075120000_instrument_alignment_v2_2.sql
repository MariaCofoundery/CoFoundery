begin;

-- ---------------------------------------------------------------------------
-- v2.2 bekommt seine Kennung, v2 und v2.1 werden archiviert
-- ---------------------------------------------------------------------------
--
-- Die Master-Arbeitsfassung v0.2 vom 29.09.2026 fuehrt die bisherigen
-- Arbeitsfassungen zusammen und vergibt dabei ANDERE KENNUNGEN als v2.1. In
-- zwei Faellen dieselbe Kennung fuer eine andere Frage:
--
--   U04 hiess in v2.1 "entscheiden, ohne Zustimmung einzuholen" und heisst
--   jetzt "auswaehlen, welchen Weg du gehst".
--   K02 war in v2.1 die Informationsregel; die steht jetzt unter K04.
--
-- Eine gespeicherte Antwort merkt sich die Kennung. Dieselbe Kennung mit neuer
-- Bedeutung heisst: Alte Antworten bedeuten etwas anderes, ohne dass es jemand
-- merkt. Zum zweiten Mal aus demselben Grund eine neue Fassung statt einer
-- Korrektur.
--
-- ---------------------------------------------------------------------------
-- ARCHIVIERT, NICHT GELOESCHT - AUCH WENN MARIA "KOENNEN WEG" GESAGT HAT
-- ---------------------------------------------------------------------------
--
-- Maria am 29.09.2026: "wobei Version 2 und 2.1 ja im Prinzip auch weg
-- koennen."
--
-- Weg heisst hier archiviert. Drei Gruende, und der dritte genuegt allein:
--
--   Die Kennung steht in `assessments.instrument_id` als Fremdschluessel. Sie
--   zu loeschen hiesse, jede Antwort darunter heimatlos zu machen - und es
--   gibt Antworten: Maria hat v2.1 in Production angefangen.
--
--   `person_alignment_snapshots` und `instrument_transitions` verweisen
--   ebenfalls darauf.
--
--   Und die Regel, die hier seit dem 27.09. gilt: Eine Fassung, die es gab,
--   verschwindet nicht. Sie ist nichts wert, wenn sie beim ersten bequemen
--   Fall gebrochen wird.
--
-- Wer seine v2.1-Antworten wirklich loeschen will, loescht seinen Fragebogen -
-- das raeumt alles daran haengende mit ab, einschliesslich des
-- Ausfuellverlaufs. Das ist eine Entscheidung je Person und keine Migration.

insert into public.instruments (id, label, status, introduced_at) values
  ('founder-alignment-v2-2', 'Founder-Alignment v2.2', 'draft', null);

update public.instruments
   set status = 'archived'
 where id in ('founder-alignment-v2', 'founder-alignment-v2-1');

-- v1 bleibt 'active', bis der Umstieg wirklich stattfindet.

commit;
