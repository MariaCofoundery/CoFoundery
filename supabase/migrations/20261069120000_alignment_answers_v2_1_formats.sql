-- ---------------------------------------------------------------------------
-- Was v2.1 speichern koennen muss und die Tabelle heute nicht kann
-- ---------------------------------------------------------------------------
--
-- Die fachliche Durchsicht vom 28.09.2026 hat das Instrument geaendert. Zwei
-- der Aenderungen brechen an dieser Tabelle, und zwar hart:
--
--   G02 ist in G02a und G02b geteilt worden. Die Blockform laesst genau drei
--   Zeichen zu, `^[A-Z][0-9]{2}$`. Eine Antwort auf G02a haette die Tabelle
--   abgewiesen - nicht stillschweigend, aber eben erst beim ersten Menschen,
--   der den Fragebogen ausfuellt.
--
--   Die geordneten Stufen heissen jetzt ordinal_choice und sind ausdruecklich
--   etwas anderes als eine Wahl ohne Rangfolge. Das Format stand nicht in der
--   erlaubten Liste.
--
-- Es gibt weiterhin keine einzige Zeile in dieser Tabelle. Das hier ist also
-- eine Korrektur am leeren Haus, keine Migration von Daten.
--
-- WAS HIER BEWUSST NICHT STEHT: welche Option alle anderen ausschliesst
-- (B05_o6 „keine zusaetzliche Absicherung", G02b_o6). Die Datenbank kennt die
-- Registratur nicht, und eine Liste fester Kennungen im SQL waere genau die
-- Doppelfuehrung, die beim naechsten Umformulieren auseinanderlaeuft. Das
-- prueft der Validator im Code, wo die Registratur ohnehin liegt.

-- ---------------------------------------------------------------------------
-- Drei Hilfsfunktionen, weil ein CHECK keine Unterabfrage enthalten darf
-- ---------------------------------------------------------------------------
--
-- Die Regeln unten muessen ueber die Elemente einer Liste laufen - „keine
-- Kennung doppelt", „kein Fenster ohne Zeitzone". Das geht in einem CHECK
-- nicht direkt. Es sind bewusst kleine, unveraenderliche Funktionen: Sie lesen
-- keine Tabelle, sie haengen an nichts, und sie duerfen deshalb in einem
-- CHECK stehen.

create or replace function public.jsonb_text_array_is_distinct(entries jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(entries) = 'array'
     and jsonb_array_length(entries) = (
       select count(distinct entry) from jsonb_array_elements_text(entries) as entry
     );
$$;

comment on function public.jsonb_text_array_is_distinct(jsonb) is
  'Zweimal dieselbe Option angekreuzt ist kein staerkeres Ja.';

create or replace function public.alignment_time_windows_are_complete(windows jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(windows) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(windows) as entry
       where nullif(btrim(coalesce(entry ->> 'day', '')), '') is null
          or nullif(btrim(coalesce(entry ->> 'from', '')), '') is null
          or nullif(btrim(coalesce(entry ->> 'to', '')), '') is null
          or nullif(btrim(coalesce(entry ->> 'timezone', '')), '') is null
     );
$$;

comment on function public.alignment_time_windows_are_complete(jsonb) is
  'Ein Zeitfenster ohne Zeitzone ist keine Angabe. Wer in Berlin sitzt und wer '
  'in Lissabon, meint mit „18 Uhr" nicht dasselbe.';

create or replace function public.alignment_entries_are_named(entries jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(entries) = 'array'
     and jsonb_array_length(entries) > 0
     and not exists (
       select 1 from jsonb_array_elements(entries) as entry
       where nullif(btrim(coalesce(entry ->> 'text', '')), '') is null
          or nullif(btrim(coalesce(entry ->> 'entryId', '')), '') is null
     );
$$;

comment on function public.alignment_entries_are_named(jsonb) is
  'Jede genannte Grenze braucht einen Text und eine eigene Kennung - die '
  'Anschlussfragen L02 und L03 haengen sich an diese Kennung, nicht an den '
  'Text, der sich noch aendern darf.';

-- ---------------------------------------------------------------------------
-- Geteilte Bloecke duerfen einen Buchstaben tragen
-- ---------------------------------------------------------------------------

alter table public.alignment_answers
  drop constraint alignment_answers_block_shape;

alter table public.alignment_answers
  add constraint alignment_answers_block_shape
  check (block_id ~ '^[A-Z][0-9]{2}[a-z]?$');

comment on constraint alignment_answers_block_shape on public.alignment_answers is
  'G02a und G02b sind aus einer Frage entstanden, die zwei Dinge auf einmal '
  'gefragt hat. Der Buchstabe haelt die Herkunft sichtbar, statt zwei neue '
  'Nummern zu vergeben, unter denen niemand mehr sieht, dass sie zusammen '
  'gehoeren.';

-- ---------------------------------------------------------------------------
-- Die Formate aus v2.1
-- ---------------------------------------------------------------------------
--
-- ordinal_choice und single_choice sind getrennt, weil der Unterschied spaeter
-- zaehlt: Bei geordneten Stufen darf man von „mehr" und „weniger" sprechen,
-- bei einer Handlungswahl nicht. Wer beides single_choice nennt, hat die
-- Information verloren, bevor die erste Auswertung beginnt.

alter table public.alignment_answers
  drop constraint alignment_answers_format_check;

alter table public.alignment_answers
  add constraint alignment_answers_format_check
  check (answer_format in (
    'F', 'C',
    'ordinal_choice', 'single_choice', 'multi_choice', 'multi_choice_priority',
    'free_text', 'free_text_repeatable', 'free_text_per_entry',
    'structured_text',
    'number_range', 'person_number_range', 'money_range', 'time_windows',
    'importance_rating', 'date',
    'value_case'
  ));

-- ---------------------------------------------------------------------------
-- Eine Mehrfachwahl ist eine Liste verschiedener Kennungen
-- ---------------------------------------------------------------------------

alter table public.alignment_answers
  add constraint alignment_answers_multi_choice_shape
  check (
    answer_format not in ('multi_choice', 'multi_choice_priority')
    or value is null
    or (
      jsonb_typeof(value -> 'optionIds') = 'array'
      and jsonb_array_length(value -> 'optionIds') > 0
      and public.jsonb_text_array_is_distinct(value -> 'optionIds')
    )
  );

-- Der Vorrang aus S01 muss unter dem stehen, was gewaehlt wurde. Eine
-- Rangfolge ueber eine nicht gewaehlte Option ist keine Praeferenz, sondern
-- ein Fehler in der Oberflaeche - und die Datenbank kann das hier wirklich
-- wissen, ohne die Registratur zu kennen.
alter table public.alignment_answers
  add constraint alignment_answers_priority_is_chosen
  check (
    answer_format <> 'multi_choice_priority'
    or value is null
    or value -> 'priorityOptionId' is null
    or (value -> 'optionIds') @> jsonb_build_array(value -> 'priorityOptionId')
  );

-- ---------------------------------------------------------------------------
-- Zeitfenster tragen ihre Zeitzone
-- ---------------------------------------------------------------------------
--
-- „Dienstag 18 bis 20 Uhr" ist ohne Zeitzone keine Verabredung, sondern eine
-- Einladung zum Missverstaendnis. Genau dafuer ist R03 da: gemeinsame Arbeit
-- zu planen, oft ueber Orte hinweg.

alter table public.alignment_answers
  add constraint alignment_answers_time_windows_shape
  check (
    answer_format <> 'time_windows'
    or value is null
    or value -> 'windows' is null
    or public.alignment_time_windows_are_complete(value -> 'windows')
  );

comment on constraint alignment_answers_time_windows_shape on public.alignment_answers is
  'Ein Zeitfenster ohne Zeitzone ist keine Angabe. Wer in Berlin sitzt und wer '
  'in Lissabon, meint mit „18 Uhr" nicht dasselbe.';

-- ---------------------------------------------------------------------------
-- Wiederholte Freitexte
-- ---------------------------------------------------------------------------
--
-- L01 sammelt Grenzen, L02 und L03 fragen zu JEDER genannten Grenze nach.
-- Gespeichert wird das in einer Zeile je Block - die Wiederholung steckt im
-- Wert, nicht in zusaetzlichen Zeilen, weil der Primaerschluessel
-- (assessment_id, block_id) ist und bleiben soll.

alter table public.alignment_answers
  add constraint alignment_answers_repeatable_shape
  check (
    answer_format <> 'free_text_repeatable'
    or value is null
    or public.alignment_entries_are_named(value -> 'entries')
  );

alter table public.alignment_answers
  add constraint alignment_answers_per_entry_shape
  check (
    answer_format <> 'free_text_per_entry'
    or value is null
    or (
      jsonb_typeof(value -> 'perEntry') = 'object'
      -- Eine Anschlussfrage ohne einen einzigen Bezug ist keine Antwort.
      and value -> 'perEntry' <> '{}'::jsonb
    )
  );
