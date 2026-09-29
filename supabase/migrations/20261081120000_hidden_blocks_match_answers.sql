begin;

-- ---------------------------------------------------------------------------
-- Ausblenden konnte weniger als Antworten
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 29.09.2026 beim Durchsehen des Datenmodells.
--
-- `alignment_answers.block_id` erlaubt seit Migration 20261069120000 einen
-- angehaengten Kleinbuchstaben: `^[A-Z][0-9]{2}[a-z]?$`. Der Grund waren G02a
-- und G02b - zwei Fragen, die zusammengehoeren und sich sonst eine Kennung
-- teilen muessten.
--
-- `alignment_share_hidden_blocks.block_id` blieb bei `^[A-Z][0-9]{2}$`.
--
-- ---------------------------------------------------------------------------
-- WARUM DAS MEHR IST ALS EINE UNGENAUIGKEIT
-- ---------------------------------------------------------------------------
--
-- Die Freigabeseite bietet jede beantwortete Frage zum Ausblenden an - auch
-- G02a. Wer sie ausblenden wollte, bekam einen Fehler. Die engere Regel stand
-- also ausgerechnet auf der Seite, die schuetzt: Antworten liessen sich
-- speichern, aber nicht zurueckhalten.
--
-- Beide Kennungen gibt es nur in v2.1, und die ist inzwischen archiviert. Wer
-- sie ausgefuellt hat, hat seinen Bericht aber weiterhin - und dort steht das
-- Formular.
--
-- Die Regel wird nur WEITER, nie enger: Es gibt nichts, was dadurch
-- ungueltig wuerde.

alter table public.alignment_share_hidden_blocks
  drop constraint alignment_share_hidden_block_shape;

alter table public.alignment_share_hidden_blocks
  add constraint alignment_share_hidden_block_shape
  check (block_id ~ '^[A-Z][0-9]{2}[a-z]?$');

comment on constraint alignment_share_hidden_block_shape
  on public.alignment_share_hidden_blocks is
  'Dieselbe Form wie alignment_answers.block_id. Wer eine Frage beantworten '
  'kann, muss sie auch zurueckhalten koennen - eine engere Regel auf der '
  'schuetzenden Seite ist immer der falsche Weg herum.';

commit;
