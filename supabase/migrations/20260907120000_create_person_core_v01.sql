begin;

-- PHASE 1 des Profil-Zusammenzugs.
--
-- Heute pflegen drei Tabellen unabhaengig voneinander dieselben Angaben ueber
-- denselben Menschen: profiles (Basis), founder_discovery_profiles (Discovery)
-- und network_profiles (Connect). Name und Headline existieren dreifach, Bio,
-- Expertise, Branchen, Region und Remote-Modus je zweifach, mit
-- unterschiedlichen Laengengrenzen und Wertelisten.
--
-- person_core wird die kanonische Identitaets- und Inventarzeile. Die drei
-- bestehenden Tabellen werden spaeter zu Publikationszeilen: sie halten dann
-- nur noch, was in ihrem Kontext veroeffentlicht wird, mit eigener
-- Sichtbarkeit und eigenem Consent.
--
-- Diese Migration ist absichtlich passiv. Sie legt die Zeile an und befuellt
-- sie, aber KEIN Anwendungscode liest sie. Umstellung der Leser passiert in
-- Phase 2, damit ein Rollback hier folgenlos bleibt.
--
-- Drei Konstruktionsregeln:
--   1. Der Kern impliziert nichts. Keine Rolle, kein Typ, kein Status, kein
--      inhaltlicher Default. Leer heisst leer. Das ist die Lehre aus
--      profiles.roles default '{founder}', das erzwungen hat, fuer
--      Connect-only-Accounts gar keine profiles-Zeile anzulegen.
--   2. Nichts aus auth-Metadaten uebernehmen. Der Kern enthaelt, was die
--      Person selbst eingetragen hat, nicht was ein Identity-Provider geraten
--      hat. Sonst wandert die Fallback-Kette aus layout.tsx in die Daten.
--   3. Der Kern ist permissiv, die Veroeffentlichung ist streng. Laengen sind
--      hier die Obergrenze aller Quellen; die strengeren Regeln pro Kontext
--      (etwa Bio min. 20 Zeichen beim Connect-Publish) bleiben dort, wo
--      veroeffentlicht wird.

create table public.person_core (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  headline text,
  bio text,
  location_region text,
  remote_mode text,
  expertise text[],
  industries text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_core_display_name_len check (display_name is null or char_length(display_name) <= 80),
  constraint person_core_headline_len check (headline is null or char_length(headline) <= 160),
  -- 1200 = Obergrenze aus founder_discovery_profiles; network_profiles erlaubt 800.
  constraint person_core_bio_len check (bio is null or char_length(bio) <= 1200),
  constraint person_core_location_region_len check (location_region is null or char_length(location_region) <= 120),
  constraint person_core_remote_mode_check check (remote_mode is null or remote_mode in ('onsite', 'hybrid', 'remote', 'flexible')),
  constraint person_core_expertise_len check (expertise is null or array_length(expertise, 1) <= 8),
  constraint person_core_industries_len check (industries is null or array_length(industries, 1) <= 5)
);

comment on table public.person_core is
  'Kanonische Identitaets- und Inventarzeile pro registriertem Menschen. Enthaelt keine Rollen, keinen Status und keine Sichtbarkeit - das gehoert in die kontextspezifischen Publikationszeilen. Ein leerer Datensatz bedeutet ausschliesslich, dass noch nichts eingetragen wurde.';

create or replace function public.set_person_core_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger person_core_set_updated_at
  before update on public.person_core
  for each row execute function public.set_person_core_updated_at();

-- Fail closed: in Phase 1 liest niemand diese Tabelle. Owner-only, damit
-- versehentliche Leser nichts sehen. Die Lesepolicies fuer Connect und
-- Discovery kommen in Phase 2 zusammen mit den Publikationszeilen.
alter table public.person_core enable row level security;
revoke all on public.person_core from public, anon, authenticated;
grant select, insert, update on public.person_core to authenticated;
create policy person_core_select_self on public.person_core
  for select using (auth.uid() = user_id);
create policy person_core_insert_self on public.person_core
  for insert with check (auth.uid() = user_id);
create policy person_core_update_self on public.person_core
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Jeder registrierte Mensch bekommt eine Zeile, auch wenn sie zunaechst leer
-- bleibt. Damit braucht kein Leser je einen Fallback - die heutige
-- fuenfstufige Namenskette in layout.tsx existiert genau deshalb.
--
-- Als Trigger auf auth.users und nicht im Anwendungscode: es gibt fuenf
-- Auth-Einstiegspunkte (callback, confirm, landing, login, start), und der
-- sechste, der spaeter dazukommt, wuerde es vergessen. Dasselbe Muster nutzt
-- schon ensure_network_membership_for_product_role.
--
-- on conflict do nothing, damit kein Signup an dieser Zeile scheitern kann.
create or replace function public.ensure_person_core_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.person_core(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger ensure_person_core_after_user_insert
  after insert on auth.users
  for each row execute function public.ensure_person_core_for_user();

-- Backfill.
--
-- Schritt 1: leere Zeile fuer jeden bestehenden Nutzer.
insert into public.person_core(user_id)
select users.id from auth.users users
on conflict (user_id) do nothing;

-- Schritt 2: Werte uebernehmen.
--
-- ACHTUNG, der wichtigste Teil dieser Migration:
--
-- founder_discovery_profiles und network_profiles deklarieren display_name,
-- headline und bio als `not null default ''` sowie expertise und industries
-- als `not null default '{}'`. Diese Spalten sind also NIE null - eine nie
-- ausgefuellte Zeile enthaelt leere Strings und leere Arrays. Nur profiles
-- verwendet echte NULLs.
--
-- Ein naiver `filter (where x is not null)` wuerde deshalb leere Werte als
-- Eingaben behandeln: ein kuerzlich angelegtes, aber leeres Connect-Profil
-- wuerde einen echten Namen aus dem Basisprofil mit '' ueberschreiben. Alle
-- Quellwerte werden daher zuerst normalisiert - leer gilt als nicht gesetzt.
--
-- Quellenpraeferenz danach nach Aktualitaet, nicht nach fester
-- Tabellenrangfolge: pro Feld gewinnt die Quelle, die die Person zuletzt
-- bearbeitet hat. Eine feste Rangfolge wuerde einen alten Connect-Eintrag
-- ueber ein frisch gepflegtes Discovery-Profil stellen.
--
-- Sonderfall remote_mode: founder_discovery_profiles hat hier
-- `not null default 'flexible'`. Eine Wahl ist dort nicht von einem
-- unberuehrten Default unterscheidbar. network_profiles.remote_mode ist
-- nullable, ein Wert dort ist also ein echtes Signal. Deshalb gilt fuer
-- dieses eine Feld: Connect gewinnt, Discovery ist nur Rueckfall.
--
-- Vor dem Ausfuehren gegen Produktion sollte die Konfliktabfrage aus
-- scripts/person_core_preflight_check.sql gelaufen sein. Zeigt sie null
-- Konflikte, ist die Aktualitaetslogik ohnehin wirkungslos und rein defensiv.
with quellen as (
  select profile.user_id,
         nullif(btrim(profile.display_name), '') as display_name,
         nullif(btrim(profile.headline), '') as headline,
         null::text as bio,
         null::text as location_region,
         null::text as remote_mode_signal,
         null::text as remote_mode_fallback,
         null::text[] as expertise,
         null::text[] as industries,
         profile.updated_at
  from public.profiles profile
  union all
  select discovery.user_id,
         nullif(btrim(discovery.display_name), ''),
         nullif(btrim(discovery.headline), ''),
         nullif(btrim(discovery.bio), ''),
         nullif(btrim(discovery.location_region), ''),
         null::text,
         discovery.remote_mode,
         case when cardinality(discovery.expertise) > 0 then discovery.expertise end,
         case when cardinality(discovery.industries) > 0 then discovery.industries end,
         discovery.updated_at
  from public.founder_discovery_profiles discovery
  union all
  select connect.user_id,
         nullif(btrim(connect.display_name), ''),
         nullif(btrim(connect.headline), ''),
         nullif(btrim(connect.bio), ''),
         nullif(btrim(connect.location_region), ''),
         connect.remote_mode,
         null::text,
         case when cardinality(connect.expertise) > 0 then connect.expertise end,
         case when cardinality(connect.industries) > 0 then connect.industries end,
         connect.updated_at
  from public.network_profiles connect
)
-- Pro Feld eine skalare Unterabfrage: nimm den jeweils zuletzt bearbeiteten
-- nicht-leeren Wert. Bewusst nicht array_agg(...)[1] - ueber einer
-- Array-Spalte wie expertise erzeugt array_agg ein mehrdimensionales Array,
-- aus dem sich das erste Element nicht als Teilarray herausziehen laesst.
-- Diese Form ist fuer Text und Arrays identisch und typsicher.
update public.person_core core
set display_name = (
      select quelle.display_name from quellen quelle
      where quelle.user_id = core.user_id and quelle.display_name is not null
      order by quelle.updated_at desc limit 1),
    headline = (
      select quelle.headline from quellen quelle
      where quelle.user_id = core.user_id and quelle.headline is not null
      order by quelle.updated_at desc limit 1),
    -- bio wird BEWUSST NICHT uebernommen.
    --
    -- Der Preflight gegen die Zieldatenbank zeigte: von 19 Nutzern haben zwei
    -- ein Discovery- und einer zusaetzlich ein Connect-Profil, und genau eine
    -- Person hat dort zwei verschiedene Bios. Produktseitige Entscheidung:
    -- diese Texte stammen aus der Testphase und werden neu geschrieben,
    -- sobald es einen einzigen Profil-Ort gibt.
    --
    -- Die Quelldaten bleiben unberuehrt in founder_discovery_profiles und
    -- network_profiles, werden dort weiter angezeigt und sind damit jederzeit
    -- nachtraeglich uebernehmbar. Der Kern startet bei bio nur leer.
    location_region = (
      select quelle.location_region from quellen quelle
      where quelle.user_id = core.user_id and quelle.location_region is not null
      order by quelle.updated_at desc limit 1),
    remote_mode = coalesce(
      (select quelle.remote_mode_signal from quellen quelle
       where quelle.user_id = core.user_id and quelle.remote_mode_signal is not null
       order by quelle.updated_at desc limit 1),
      (select quelle.remote_mode_fallback from quellen quelle
       where quelle.user_id = core.user_id and quelle.remote_mode_fallback is not null
       order by quelle.updated_at desc limit 1)),
    expertise = (
      select quelle.expertise from quellen quelle
      where quelle.user_id = core.user_id and quelle.expertise is not null
      order by quelle.updated_at desc limit 1),
    industries = (
      select quelle.industries from quellen quelle
      where quelle.user_id = core.user_id and quelle.industries is not null
      order by quelle.updated_at desc limit 1)
where exists (select 1 from quellen quelle where quelle.user_id = core.user_id);

commit;
