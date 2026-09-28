begin;

-- ---------------------------------------------------------------------------
-- "Spaeter entscheiden" ist eine Antwort
-- ---------------------------------------------------------------------------
--
-- Der Hinweis auf die neue Fassung soll einmal auffallen und dann nicht mehr
-- nerven. Bisher gab es dafuer nur `pending` - und ein Hinweis, der bei jedem
-- Seitenaufbau wiederkommt, wird nach dem dritten Mal weggeklickt, ohne
-- gelesen zu werden. Danach ist er wertlos, egal was drinsteht.
--
-- WARUM NICHT EINFACH 'postponed' ALS ENTSCHEIDUNG. Weil es keine ist. Wer
-- "spaeter" sagt, hat sich weder fuer die alte noch fuer die neue Fassung
-- entschieden - die Zeile bleibt `pending`, und nur die Erinnerung ruht. Eine
-- vierte Entscheidungsart wuerde das verwischen, und jede Auswertung muesste
-- danach raten, ob 'postponed' naeher an "bleiben" oder an "wechseln" liegt.

alter table public.instrument_transitions
  add column remind_after timestamptz;

comment on column public.instrument_transitions.remind_after is
  'Bis wann der Hinweis ruht. Nur fuer `pending` sinnvoll: Wer sich entschieden '
  'hat, bekommt ihn ohnehin nicht mehr. Leer heisst: zeigen.';

-- Ruhen kann nur, was noch offen ist. Ein Datum an einer getroffenen
-- Entscheidung waere eine Angabe ohne Bedeutung - und die naechste Person,
-- die es liest, wuerde sich etwas dabei denken.
alter table public.instrument_transitions
  add constraint instrument_transitions_remind_only_pending
    check (remind_after is null or decision = 'pending');

commit;
