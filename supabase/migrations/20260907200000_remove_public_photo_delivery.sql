begin;

-- Produktentscheidung vom 07.09.2026: Auf oeffentlichen Seiten erscheint
-- niemals ein Bild. Weder ein hochgeladenes Foto noch ein Bibliotheks-Avatar,
-- auch nicht mit Zustimmung. Oeffentliche Profil- und Listingseiten zeigen
-- immer Initialen.
--
-- Begruendung: Ein Gesicht auf einer indexierbaren Seite ist eine andere
-- Kategorie als ein Name. Es ermoeglicht Rueckwaerts-Bildsuche und Scraping
-- fuer Gesichtserkennung, und das laesst sich nach einer Indexierung nicht
-- zurueckholen - auch nicht durch Depublizieren. Der Gegenwert war
-- ueberwiegend aesthetisch.
--
-- Damit entfaellt eine ganze Ebene statt neue hinzuzukommen:
--   - die Fotoerlaubnis als Nutzerentscheidung (photo_visibility)
--   - die serverseitige Fotoaufloesung fuer anonyme Aufrufe
--   - das photo_available-Feld in den beiden oeffentlichen Projektionen
--
-- Innerhalb CoFoundery bleibt alles wie es ist: Wer ein Foto oder einen
-- Avatar gewaehlt hat, wird Mitgliedern weiterhin so angezeigt. Diese
-- Auslieferung haengt an der Mitgliedschaft, nicht an photo_visibility.

-- ---------------------------------------------------------------------------
-- 1. Die privilegierte Fotoaufloesung entfaellt vollstaendig
-- ---------------------------------------------------------------------------
-- Sie war die einzige Funktion, die anonymen Seiten ueber eine service_role
-- Route ein Bild verschaffen konnte. Ohne oeffentliche Bilder gibt es keinen
-- Grund, diesen privilegierten Pfad weiter zu betreiben.
drop function if exists public.resolve_public_network_photo(text, text);

-- ---------------------------------------------------------------------------
-- 2. Oeffentliche Projektionen ohne Fotofeld
-- ---------------------------------------------------------------------------
-- Die Rueckgabeform aendert sich, deshalb drop und neu anlegen statt replace.
-- Inhaltlich sind die Projektionen unveraendert bis auf das entfallene Feld:
-- dieselbe Whitelist, dieselben Bedingungen, dieselbe Mitgliedschaftspruefung.
drop function if exists public.get_public_network_profile(text);

create function public.get_public_network_profile(p_public_slug text)
returns table (
  public_slug text,
  display_name text,
  headline text,
  bio text,
  network_roles text[],
  expertise text[],
  industries text[],
  location_region text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.public_slug,
    profile.display_name,
    profile.headline,
    profile.bio,
    profile.network_roles,
    profile.expertise,
    profile.industries,
    profile.location_region,
    profile.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where profile.public_slug = p_public_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active';
$$;

drop function if exists public.get_public_network_listing(text);

create function public.get_public_network_listing(p_public_slug text)
returns table (
  public_slug text,
  direction text,
  category text,
  title text,
  summary text,
  topics text[],
  industries text[],
  locations text[],
  geographic_scope text,
  remote_mode text,
  starts_on date,
  ends_on date,
  venture_stage text,
  owner_display_name text,
  owner_headline text,
  owner_profile_slug text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select listing.public_slug,
    listing.direction,
    listing.category,
    listing.title,
    listing.summary,
    listing.topics,
    listing.industries,
    listing.locations,
    listing.geographic_scope,
    listing.remote_mode,
    listing.starts_on,
    listing.ends_on,
    listing.venture_stage,
    profile.display_name,
    profile.headline,
    -- Bleibt: ein oeffentliches Listing verlinkt kein nicht oeffentliches Profil.
    case when profile.visibility = 'public' then profile.public_slug else null end,
    listing.updated_at
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.public_slug = p_public_slug
    and listing.visibility = 'public'
    and listing.status = 'active'
    and listing.expires_at > now()
    and profile.status = 'active'
    and membership.status = 'active';
$$;

-- Rechte nach dem Neuanlegen erneut setzen.
revoke all on function public.get_public_network_profile(text) from public;
revoke all on function public.get_public_network_listing(text) from public;
grant execute on function public.get_public_network_profile(text) to anon, authenticated, service_role;
grant execute on function public.get_public_network_listing(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Die Fotoerlaubnis entfaellt als Nutzerentscheidung
-- ---------------------------------------------------------------------------
-- Ein Schalter, der nichts mehr bewirkt, ist schlimmer als kein Schalter: er
-- verspricht eine Wahl, die es nicht gibt. Die Spalte wurde ausschliesslich
-- von den oeffentlichen Projektionen und der entfallenen Fotoaufloesung
-- gelesen; die Mitglieder-Auslieferung prueft die Mitgliedschaft.
alter table public.network_profiles
  drop constraint if exists network_profiles_photo_visibility_check,
  drop column if exists photo_visibility;

comment on column public.network_profiles.photo_source is
  'Woher das Bild kommt: Bibliotheks-Avatar oder eigener Upload. Wird ausschliesslich Mitgliedern angezeigt; oeffentliche Seiten zeigen immer Initialen.';

commit;
