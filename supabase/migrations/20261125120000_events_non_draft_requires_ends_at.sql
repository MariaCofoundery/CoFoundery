-- Nicht-Draft-Events haben immer ein Ende.
--
-- WARUM: `cleanup_expired_event_data()` schließt Events nach `ends_at` und
-- löscht Teilnahmen und Antworten 24 Stunden danach. Ein Event ohne `ends_at`
-- fiel durch beide Regeln: Es blieb unbegrenzt `live`, und Namen, E-Mails und
-- Antworten blieben unbegrenzt erhalten. Events entstehen nur von Hand (kein
-- Codepfad, keine Policy); deshalb sichert die Datenbank die Regel selbst.
--
-- REGEL: status = 'draft' OR ends_at IS NOT NULL. Zulässige Status sind laut
-- events_status_check genau draft, live, closed.
--
-- ALTBESTAND: Production am 13.10.2026 read-only geprüft - keine Zeile mit
-- ends_at IS NULL, DB-Zeitzone UTC. Die Regel wird trotzdem erst NOT VALID
-- angelegt und dann validiert, damit ein Restbestand die Migration sichtbar
-- scheitern lässt statt still zu passieren. Es werden keine Daten geändert und
-- keine ends_at-Werte gesetzt. `cleanup_expired_event_data()` bleibt unverändert.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_non_draft_requires_ends_at'
  ) then
    alter table public.events
      add constraint events_non_draft_requires_ends_at
      check (status = 'draft' or ends_at is not null) not valid;
  end if;
end;
$$;

alter table public.events validate constraint events_non_draft_requires_ends_at;

comment on constraint events_non_draft_requires_ends_at on public.events is
  'Live und closed nur mit ends_at - sonst greifen Schließen und Löschen aus cleanup_expired_event_data() nie.';

commit;
