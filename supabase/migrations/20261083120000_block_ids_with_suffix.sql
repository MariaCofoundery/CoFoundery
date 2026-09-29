begin;

-- ---------------------------------------------------------------------------
-- Kennungen duerfen einen benannten Zusatz tragen
-- ---------------------------------------------------------------------------
--
-- Bisher: `^[A-Z][0-9]{2}[a-z]?$` - ein Buchstabe fuer zusammengehoerende
-- Fragen (G02a, G02b, jetzt S01a bis S01f).
--
-- Das Sprachreview v0.1 baut S01 als sechs Wichtigkeiten neu auf und stellt
-- eine Priorisierungsfrage daneben. Ihr Schluessel heisst dort `S01_top` - und
-- der faellt durch die bisherige Regel.
--
-- ---------------------------------------------------------------------------
-- WARUM NICHT EINFACH "S01g"
-- ---------------------------------------------------------------------------
--
-- Weil es keine siebte Wichtigkeit ist. S01a bis S01f sind sechs gleichartige
-- Fragen; S01_top fragt etwas anderes ueber dieselben sechs Ziele. Eine
-- Kennung, die so aussieht wie die Reihe, aber nicht dazugehoert, waere beim
-- naechsten Lesen eine Falle - und die Auswertung wuerde sie mitzaehlen.
--
-- Der Zusatz ist eng gefasst: Kleinbuchstaben nach einem Unterstrich, sonst
-- nichts. Kein freies Textfeld in einer Kennung.

alter table public.alignment_answers
  drop constraint alignment_answers_block_shape;
alter table public.alignment_answers
  add constraint alignment_answers_block_shape
  check (block_id ~ '^[A-Z][0-9]{2}([a-z]|_[a-z]+)?$');

alter table public.alignment_share_hidden_blocks
  drop constraint alignment_share_hidden_block_shape;
alter table public.alignment_share_hidden_blocks
  add constraint alignment_share_hidden_block_shape
  check (block_id ~ '^[A-Z][0-9]{2}([a-z]|_[a-z]+)?$');

alter table public.alignment_item_views
  drop constraint alignment_item_views_block_shape;
alter table public.alignment_item_views
  add constraint alignment_item_views_block_shape
  check (block_id ~ '^[A-Z][0-9]{2}([a-z]|_[a-z]+)?$');

comment on constraint alignment_answers_block_shape on public.alignment_answers is
  'Alle drei Tabellen benutzen dieselbe Form. Wer eine Frage beantworten kann, '
  'muss sie auch zurueckhalten koennen und darf dabei gemessen werden - eine '
  'engere Regel auf einer der drei Seiten faellt erst auf, wenn ein Mensch '
  'davorsitzt.';

commit;
