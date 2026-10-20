begin;

-- ---------------------------------------------------------------------------
-- Wofuer ich hier bin
-- ---------------------------------------------------------------------------
-- Was eine Person hier tun moechte: Align (das Gruendungsteam verstehen),
-- Find (Mitgruender finden), Connect (vernetzen), Advise (Gruendende
-- begleiten). Gesetzt im Einstieg, aenderbar im Profil.
--
-- DAS IST EINE ABSICHT, KEINE BERECHTIGUNG. Sie oeffnet nichts und schliesst
-- nichts: Rollen bleiben in `profiles`, Zugaenge und Freigaben in ihren
-- eigenen Tabellen. Die Angabe steuert allein, was die Startseite vorschlaegt.
-- Sie ist owner-only wie der ganze Kern und wird nirgends an andere gegeben.
--
-- Leer ist erlaubt und heisst "noch nichts gesagt".
alter table public.person_core
  add column interests text[] not null default '{}';

alter table public.person_core
  add constraint person_core_interests_check
    check (
      interests <@ array['align', 'find', 'connect', 'advise']::text[]
      and cardinality(interests) <= 4
    );

comment on column public.person_core.interests is
  'Wofuer die Person hier ist: align, find, connect, advise. Eine Absicht, keine Berechtigung - sie steuert nur Vorschlaege auf der Startseite und oeffnet keinen Zugang.';

commit;
