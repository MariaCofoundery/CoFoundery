begin;

-- Phase 6 (01.10.2026): Das eigene Basisfoto darf in Connect erscheinen -
-- als KOPIE im Connect-Eimer, nie als Verweis auf das Original.
--
-- Bis hier liess der Vertrag `profile_avatar` nur mit einer
-- Bibliotheks-Illustration zu. Ein eigenes Basisfoto liess sich deshalb nicht
-- uebernehmen, und „mein vorhandenes Bild verwenden" wies es ab.
--
-- Jetzt gibt es eine vierte Form, und nur diese:
--
--   profile_avatar · keine Kennung · photo_path unter der eigenen user_id
--
-- Das ist die Kontextkopie: serverseitig aus `avatars` nach
-- `network-profile-images` kopiert, sobald jemand in Connect ausdruecklich
-- das vorhandene Profilfoto waehlt (`features/connect/connectBasePhoto.ts`).
-- Sie bleibt von `network_upload` unterscheidbar - und genau daran haengt,
-- dass der Nachzug beim Ersetzen und Entfernen des Basisfotos NUR die Kopie
-- anfasst und ein eigenes Connect-Bild nie.
--
-- Was sich NICHT aendert:
--   - kein neuer Eimer, keine neue Tabelle, keine neue Spalte
--   - `avatars` bleibt privat; der Pfad zeigt in den Connect-Eimer
--   - die Auslieferung bleibt an Mitgliedschaft und aktives Profil gebunden
--     (`can_read_network_profile_photo`, Migration 20260904120000)
--   - oeffentliche Seiten zeigen weiterhin nie ein Bild (20260907200000)
--   - eine Illustration und ein Pfad zugleich bleiben unzulaessig
--
-- Und eine Luecke geschlossen, die beim Testen auffiel: siehe unten.

-- Zeilen, die nur durch die Luecke unten bestehen konnten: `profile_avatar`
-- ohne Illustration und ohne Datei. Sie zeigen schon heute kein Bild - hier
-- werden sie zu dem, was sie sind, damit der strengere Vertrag greift.
update public.network_profiles
   set photo_source = null
 where photo_source = 'profile_avatar'
   and photo_avatar_id is null
   and photo_path is null;

alter table public.network_profiles
  drop constraint if exists network_profiles_photo_contract_check;

alter table public.network_profiles
  add constraint network_profiles_photo_contract_check
    check (
      (photo_source is null and photo_avatar_id is null and photo_path is null)
      or (
        photo_source = 'profile_avatar'
        -- `is not null` ausdruecklich: `null ~ '...'` ist NULL, und ein CHECK
        -- laesst NULL durch. Bis hier ging deshalb `profile_avatar` ohne
        -- Illustration und ohne Datei durch - ein Basisfoto, das keins ist.
        and photo_avatar_id is not null
        and photo_avatar_id ~ '^avatar-(0[1-9]|[12][0-9]|30)$'
        and photo_path is null
      )
      or (
        photo_source = 'profile_avatar'
        and photo_avatar_id is null
        and photo_path is not null
        and photo_path like user_id::text || '/%'
      )
      or (
        photo_source = 'network_upload'
        and photo_avatar_id is null
        and photo_path is not null
        and photo_path like user_id::text || '/%'
      )
    );

comment on column public.network_profiles.photo_source is
  'Woher das Bild kommt: profile_avatar (Basisfoto - Illustration als Kennung oder eigenes Foto als Kopie im Connect-Eimer) oder network_upload (eigenes Connect-Bild). Wird ausschliesslich Mitgliedern angezeigt; oeffentliche Seiten zeigen immer Initialen.';

commit;
