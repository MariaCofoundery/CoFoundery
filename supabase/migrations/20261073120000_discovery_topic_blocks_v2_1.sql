begin;

-- ---------------------------------------------------------------------------
-- Welche Frage zu welchem Discovery-Thema gehoert - v2.1
-- ---------------------------------------------------------------------------
--
-- ERZEUGT AUS discoveryTopicsV21.ts, NICHT ABGETIPPT. Die Zusammensetzung
-- steht im Code, weil sie dort aus den Abschnitten der geprueften Quelle
-- entsteht. Hier liegt sie noch einmal, weil die Urteilsfunktion in der
-- Datenbank laeuft und den Code nicht lesen kann.
--
-- Eine Doppelung laeuft auseinander, wenn sie niemand zusammenhaelt. Deshalb
-- gibt es einen Test, der beide Seiten vergleicht - er liest diese Zeilen aus
-- der Datenbank und stellt sie gegen die Themen im Code.
--
-- Was hier NICHT steht: die Ueberschriften. Die duerfen sich aendern, ohne
-- dass jemand eine Migration schreibt - die Kennung T01 bleibt dieselbe.
-- Genau dafuer ist sie eine Nummer und kein Kuerzel aus dem Titel.

insert into public.discovery_alignment_topic_blocks (instrument_id, topic_key, block_id) values
  ('founder-alignment-v2-1', 'T01', 'A01'),
  ('founder-alignment-v2-1', 'T01', 'A02'),
  ('founder-alignment-v2-1', 'T02', 'I01'),
  ('founder-alignment-v2-1', 'T02', 'I03'),
  ('founder-alignment-v2-1', 'T03', 'E01'),
  ('founder-alignment-v2-1', 'T04', 'U04'),
  ('founder-alignment-v2-1', 'T05', 'K01'),
  ('founder-alignment-v2-1', 'T05', 'K02'),
  ('founder-alignment-v2-1', 'T06', 'T03'),
  ('founder-alignment-v2-1', 'T07', 'D01'),
  ('founder-alignment-v2-1', 'T08', 'X01'),
  ('founder-alignment-v2-1', 'T08', 'X06'),
  ('founder-alignment-v2-1', 'T09', 'B01'),
  ('founder-alignment-v2-1', 'T09', 'B05'),
  ('founder-alignment-v2-1', 'T10', 'G01'),
  ('founder-alignment-v2-1', 'T11', 'G02a'),
  ('founder-alignment-v2-1', 'T11', 'G02b'),
  ('founder-alignment-v2-1', 'T12', 'S01'),
  ('founder-alignment-v2-1', 'T12', 'S02'),
  ('founder-alignment-v2-1', 'T12', 'S03'),
  ('founder-alignment-v2-1', 'T13', 'R01'),
  ('founder-alignment-v2-1', 'T13', 'R04'),
  ('founder-alignment-v2-1', 'T13', 'R06'),
  ('founder-alignment-v2-1', 'T13', 'R12'),
  ('founder-alignment-v2-1', 'T90', 'W01'),
  ('founder-alignment-v2-1', 'T90', 'W02'),
  ('founder-alignment-v2-1', 'T90', 'W03'),
  ('founder-alignment-v2-1', 'T90', 'W04'),
  ('founder-alignment-v2-1', 'T90', 'W05'),
  ('founder-alignment-v2-1', 'T90', 'W06')
;

commit;
