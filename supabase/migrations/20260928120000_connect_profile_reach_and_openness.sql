begin;

-- ---------------------------------------------------------------------------
-- Was ein Profil ueber die Aufzaehlung hinaus sagt
-- ---------------------------------------------------------------------------
--
-- Bisher trug ein Connect-Profil Name, Headline, einen kurzen Text, Expertise,
-- Branchen, Rollen, Ort und Arbeitsweise. Alles davon beschreibt, WAS jemand
-- kann. Zwei Dinge fehlten, die in einem Netzwerk mindestens so viel wert
-- sind:
--
-- WEN JEMAND KENNT.
--   Der Wert einer Person in einem Netzwerk liegt oft im zweiten Grad. "Ich
--   kenne viele Leute aus der ambulanten Pflege" ist fuer die suchende Person
--   manchmal nuetzlicher als jede Faehigkeit im Lebenslauf - und es stand
--   nirgends.
--
-- WIE MAN SIE ANSPRICHT.
--   Die erste Nachricht ist die schwerste, und meistens nicht wegen des
--   Themas, sondern wegen der Form: Schreibe ich lang? Frage ich nach einem
--   Call? Ist ein Spaziergang zu viel verlangt? Wer vorher sagt "Kaffee gern,
--   Videocall auch", nimmt genau diese Huerde weg.
--
--   Deshalb eine geschlossene Auswahl statt Freitext: Sie ist vergleichbar,
--   sie laesst sich spaeter filtern, und sie ist mit einem Klick beantwortet.
--   Der Satz daneben faengt alles auf, was die sechs nicht treffen.
--
-- ALLE DREI SIND FREIWILLIG. Ein Profil bleibt ohne sie veroeffentlichbar;
-- eine neue Pflicht haette Bestandsprofile unsichtbar gemacht.
--
-- UND SIE BLEIBEN DRINNEN. Die oeffentliche Projektion bekommt sie nicht: Auf
-- einer von Google erfassten Seite waere "ich kenne Menschen bei X" eine
-- Aussage ueber Dritte, und "offen fuer Spaziergaenge" neben Name und Region
-- ist mehr, als fuer das Gefundenwerden noetig ist.
-- ---------------------------------------------------------------------------

alter table public.network_profiles
  add column network_reach text,
  add column open_to_formats text[] not null default '{}',
  add column contact_note text,
  add constraint network_profiles_network_reach_check
    check (network_reach is null or char_length(btrim(network_reach)) between 20 and 400),
  add constraint network_profiles_contact_note_check
    check (contact_note is null or char_length(btrim(contact_note)) between 10 and 300),
  add constraint network_profiles_open_to_formats_check
    check (
      cardinality(open_to_formats) <= 6
      and open_to_formats <@ array['coffee','walk','video','call','sparring','intro']::text[]
    );

comment on column public.network_profiles.network_reach is
  'Wen diese Person kennt. Freiwillig. Der Wert im Netzwerk liegt oft im zweiten Grad - und der stand bisher nirgends.';
comment on column public.network_profiles.open_to_formats is
  'In welcher Form diese Person ansprechbar ist. Geschlossene Auswahl, damit es vergleichbar und spaeter filterbar bleibt.';
comment on column public.network_profiles.contact_note is
  'Ein Satz dazu, wie man sie am besten erreicht. Faengt auf, was die sechs Formate nicht treffen.';

commit;
