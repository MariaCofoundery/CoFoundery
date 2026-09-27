begin;

-- ---------------------------------------------------------------------------
-- Der Datenvertrag aus Teil F7: stabile Options-Kennungen und die Sprache
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN BEIM LESEN VON TEIL F, nicht durch einen Fehler im Betrieb. Das
-- Gutachten verlangt, dass jede Antwort die "urspruengliche Options-ID"
-- speichert und dass randomisierte Optionen "vor Interpretation auf ihre
-- stabilen IDs zurueckgefuehrt" werden.
--
-- Gespeichert wurde bisher der ANTWORTTEXT. Der Grund, warum das nicht
-- reicht, ist derselbe wie bei der Instrumentversion: Der Text darf sich
-- aendern - er hat es am 27.09.2026 bereits getan, siehe die
-- Umformulierungen - die Bedeutung einer schon gegebenen Antwort nicht. Wer
-- den Text speichert, verliert beim ersten Umformulieren die Zuordnung aller
-- bisherigen Antworten. Und zwar lautlos: Die Zeile bleibt stehen, sie passt
-- nur zu keiner Option mehr.
--
-- Es gibt noch keine einzige Zeile in dieser Tabelle. Deshalb ist das hier
-- eine Korrektur und keine Migration von Daten.

-- Eine Auswahl wird ueber ihre Kennung gespeichert, nie ueber ihren Text.
-- Die Kennungen haben die Form S01_o1 und stehen in der Registratur im Code.
alter table public.alignment_answers
  add constraint alignment_answers_choice_uses_ids
  check (
    value is null
    or (not (value ? 'option') and not (value ? 'options'))
  );

comment on constraint alignment_answers_choice_uses_ids on public.alignment_answers is
  'Eine Auswahl wird als optionId/optionIds gespeichert. Der Antworttext darf '
  'nicht in die Zeile - sonst haengt sie nach jeder Umformulierung in der Luft.';

-- ---------------------------------------------------------------------------
-- Die Sprachfassung
-- ---------------------------------------------------------------------------
--
-- Heute ist sie immer 'de': Die Items stehen auf Deutsch, und das bleibt so,
-- bis es eine geprueft aequivalente Uebersetzung gibt - ein Item, das sich
-- anders liest, misst etwas anderes.
--
-- TROTZDEM GEHOERT DIE SPALTE JETZT HIN. Teil F7 verlangt sie, und ihr Sinn
-- zeigt sich erst an dem Tag, an dem es eine zweite Sprachfassung gibt: Ab
-- dann waeren Antworten aus beiden Fassungen ohne diese Angabe nicht mehr
-- auseinanderzuhalten - und genau dieser Vergleich waere der falsche.

alter table public.alignment_answers
  add column language text not null default 'de';

alter table public.alignment_answers
  add constraint alignment_answers_language_check
  check (language in ('de'));

comment on column public.alignment_answers.language is
  'In welcher Sprachfassung die Frage vorlag. Heute immer de. Eine weitere '
  'Sprache erfordert eine Aequivalenzpruefung, nicht nur eine Uebersetzung - '
  'deshalb ist die Liste hier absichtlich eng.';

commit;
