-- Connect-Profil: Der Text ueber dich ist freiwillig (Entwurf 16.11.2026: "erst das Noetige").
--
-- Pflicht zum Sichtbarmachen sind jetzt: Name, eine Zeile (headline) und mindestens eine Rolle. Der laengere Text (bio, vorher mindestens
-- 20 Zeichen) bleibt moeglich, ist aber keine Bedingung mehr. Find hat eigene Regeln und bleibt unveraendert.
begin;

alter table public.network_profiles drop constraint network_profiles_active_complete_check;
alter table public.network_profiles add constraint network_profiles_active_complete_check check (
  status <> 'active' or (
    char_length(btrim(display_name)) >= 2 and char_length(btrim(headline)) >= 3 and
    cardinality(network_roles) >= 1 and published_at is not null
  )
);

commit;
