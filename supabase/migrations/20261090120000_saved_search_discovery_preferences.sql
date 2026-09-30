begin;

-- ---------------------------------------------------------------------------
-- Eine gespeicherte Suche haelt fest, wonach gesucht wurde - vollstaendig
-- ---------------------------------------------------------------------------
--
-- Abschnitt 23 der FIND-Spec: Die gespeicherte Suche enthaelt die praktischen
-- Filter, die Faehigkeiten UND die Matching-Praeferenzen.
--
-- Die ersten beiden standen schon drin. Die dritten nicht: Wer seine Suche
-- speicherte und spaeter etwas an den Themen aenderte, konnte hinterher nicht
-- mehr sehen, wonach die gespeicherte Suche eigentlich gesucht hatte.
--
-- SIE FILTERN DAMIT NICHT. Um zu pruefen, ob eine Arbeitsweise passt, braucht
-- es die Antworten BEIDER Personen - und wer gerade erst ein Profil
-- veroeffentlicht, hat den Bogen oft nicht ausgefuellt. Was hier steht, ist
-- eine Aufzeichnung dessen, was gesucht wurde, und kein Versprechen darueber,
-- wer benachrichtigt wird.

alter table public.saved_searches
  add column if not exists discovery_preferences jsonb not null default '[]'::jsonb;

alter table public.saved_searches
  drop constraint if exists saved_searches_discovery_preferences_check;
alter table public.saved_searches
  add constraint saved_searches_discovery_preferences_check
  check (
    jsonb_typeof(discovery_preferences) = 'array'
    and jsonb_array_length(discovery_preferences) <= 12
  );

comment on column public.saved_searches.discovery_preferences is
  'Die Matching-Praeferenzen zum Zeitpunkt des Speicherns: je Thema Richtung '
  'und Gewicht. Aufzeichnung, kein Filter.';

-- ---------------------------------------------------------------------------
-- Kein Abonnement auf alle neuen Profile
-- ---------------------------------------------------------------------------
--
-- Abschnitt 24: "Benachrichtigungen duerfen nur ausgeloest werden, wenn
-- mindestens ein echtes Kriterium gesetzt wurde."
--
-- `alignment_dimensions` zaehlte bisher als solches - und hat nie gefiltert.
-- Eine Suche, in der NUR sie standen, war damit ein Abonnement auf jedes neue
-- Profil, nur mit einer Ueberschrift. Die neuen Matching-Praeferenzen zaehlen
-- aus demselben Grund NICHT mit: Sie sagen, wie jemand passen soll, nicht
-- wonach gesucht wird.
--
-- NOT VALID: Vorhandene Suchen werden nicht nachtraeglich ungueltig. Sie sind
-- Auskuenfte von Menschen; was sie kuenftig nicht mehr anlegen duerfen, macht
-- das Angelegte nicht falsch. Fuer jeden neuen Schreibvorgang gilt die Regel.
alter table public.saved_searches
  drop constraint if exists saved_searches_not_empty_check;
alter table public.saved_searches
  add constraint saved_searches_not_empty_check
  check (
    char_length(btrim(query)) > 0
    or cardinality(topics) > 0
    or cardinality(industries) > 0
    or cardinality(locations) > 0
    or cardinality(capability_area_ids) > 0
    or geographic_scope is not null
    or remote_mode is not null
    or connect_direction is not null
    or connect_category is not null
  )
  not valid;

commit;
