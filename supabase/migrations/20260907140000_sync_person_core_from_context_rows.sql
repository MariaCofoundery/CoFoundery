begin;

-- PHASE 2 des Profil-Zusammenzugs.
--
-- Phase 1 hat person_core angelegt und einmalig befuellt. Damit der Kern nicht
-- sofort veraltet, halten Trigger ihn ab jetzt aktuell: Wer sein Basis-,
-- Discovery- oder Connect-Profil bearbeitet, schreibt weiterhin in die
-- jeweilige Kontextzeile, und der Kern zieht nach.
--
-- Rueckwaertskompatibel: die Kontextzeilen behalten ihre eigenen Kopien. Erst
-- Phase 4 loescht die Doppelspalten.
--
-- Zwei Regeln, die aus dem Backfill gelernt sind:
--
--   1. LEER GILT NICHT ALS EINGABE.
--      founder_discovery_profiles und network_profiles deklarieren
--      display_name, headline und bio als `not null default ''` sowie
--      expertise und industries als `not null default '{}'`. Ein leeres,
--      gerade angelegtes Profil wuerde sonst einen echten Namen im Kern mit ''
--      ueberschreiben.
--
--   2. NUR TATSAECHLICH GEAENDERTE FELDER WANDERN.
--      Ein UPDATE feuert bei jeder Aenderung an der Zeile. Ohne Feldvergleich
--      wuerde das Bearbeiten von `industries` auch eine alte `bio` in den Kern
--      schieben - und genau die haben wir in Phase 1 bewusst nicht uebernommen.
--
-- Sonderfall remote_mode: founder_discovery_profiles hat
-- `not null default 'flexible'`. Eine Wahl ist dort nicht von einem
-- unberuehrten Default unterscheidbar, deshalb synchronisiert Discovery dieses
-- Feld nicht. network_profiles.remote_mode ist nullable und damit ein echtes
-- Signal.

-- ---------------------------------------------------------------------------
-- Basisprofil -> Kern
-- ---------------------------------------------------------------------------
create or replace function public.sync_person_core_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text := nullif(btrim(new.display_name), '');
  v_headline text := nullif(btrim(new.headline), '');
begin
  if tg_op = 'UPDATE' then
    if new.display_name is not distinct from old.display_name then v_display_name := null; end if;
    if new.headline is not distinct from old.headline then v_headline := null; end if;
  end if;

  if v_display_name is null and v_headline is null then
    return null;
  end if;

  insert into public.person_core as core (user_id, display_name, headline)
  values (new.user_id, v_display_name, v_headline)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, core.display_name),
        headline = coalesce(excluded.headline, core.headline);
  return null;
end;
$$;

create trigger sync_person_core_after_profiles_write
  after insert or update on public.profiles
  for each row execute function public.sync_person_core_from_profiles();

-- ---------------------------------------------------------------------------
-- Discovery-Profil -> Kern
-- ---------------------------------------------------------------------------
create or replace function public.sync_person_core_from_discovery_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text := nullif(btrim(new.display_name), '');
  v_headline text := nullif(btrim(new.headline), '');
  v_bio text := left(nullif(btrim(new.bio), ''), 1200);
  v_location_region text := nullif(btrim(new.location_region), '');
  v_expertise text[] := case when cardinality(new.expertise) > 0 then new.expertise end;
  v_industries text[] := case when cardinality(new.industries) > 0 then new.industries end;
begin
  if tg_op = 'UPDATE' then
    if new.display_name is not distinct from old.display_name then v_display_name := null; end if;
    if new.headline is not distinct from old.headline then v_headline := null; end if;
    if new.bio is not distinct from old.bio then v_bio := null; end if;
    if new.location_region is not distinct from old.location_region then v_location_region := null; end if;
    if new.expertise is not distinct from old.expertise then v_expertise := null; end if;
    if new.industries is not distinct from old.industries then v_industries := null; end if;
  end if;

  if v_display_name is null and v_headline is null and v_bio is null
     and v_location_region is null and v_expertise is null and v_industries is null then
    return null;
  end if;

  insert into public.person_core as core
    (user_id, display_name, headline, bio, location_region, expertise, industries)
  values
    (new.user_id, v_display_name, v_headline, v_bio, v_location_region, v_expertise, v_industries)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, core.display_name),
        headline = coalesce(excluded.headline, core.headline),
        bio = coalesce(excluded.bio, core.bio),
        location_region = coalesce(excluded.location_region, core.location_region),
        expertise = coalesce(excluded.expertise, core.expertise),
        industries = coalesce(excluded.industries, core.industries);
  return null;
end;
$$;

create trigger sync_person_core_after_discovery_profile_write
  after insert or update on public.founder_discovery_profiles
  for each row execute function public.sync_person_core_from_discovery_profile();

-- ---------------------------------------------------------------------------
-- Connect-Profil -> Kern
-- ---------------------------------------------------------------------------
create or replace function public.sync_person_core_from_connect_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text := nullif(btrim(new.display_name), '');
  v_headline text := nullif(btrim(new.headline), '');
  v_bio text := left(nullif(btrim(new.bio), ''), 1200);
  v_location_region text := nullif(btrim(new.location_region), '');
  v_remote_mode text := new.remote_mode;
  v_expertise text[] := case when cardinality(new.expertise) > 0 then new.expertise end;
  v_industries text[] := case when cardinality(new.industries) > 0 then new.industries end;
begin
  if tg_op = 'UPDATE' then
    if new.display_name is not distinct from old.display_name then v_display_name := null; end if;
    if new.headline is not distinct from old.headline then v_headline := null; end if;
    if new.bio is not distinct from old.bio then v_bio := null; end if;
    if new.location_region is not distinct from old.location_region then v_location_region := null; end if;
    if new.remote_mode is not distinct from old.remote_mode then v_remote_mode := null; end if;
    if new.expertise is not distinct from old.expertise then v_expertise := null; end if;
    if new.industries is not distinct from old.industries then v_industries := null; end if;
  end if;

  if v_display_name is null and v_headline is null and v_bio is null
     and v_location_region is null and v_remote_mode is null
     and v_expertise is null and v_industries is null then
    return null;
  end if;

  insert into public.person_core as core
    (user_id, display_name, headline, bio, location_region, remote_mode, expertise, industries)
  values
    (new.user_id, v_display_name, v_headline, v_bio, v_location_region, v_remote_mode, v_expertise, v_industries)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, core.display_name),
        headline = coalesce(excluded.headline, core.headline),
        bio = coalesce(excluded.bio, core.bio),
        location_region = coalesce(excluded.location_region, core.location_region),
        remote_mode = coalesce(excluded.remote_mode, core.remote_mode),
        expertise = coalesce(excluded.expertise, core.expertise),
        industries = coalesce(excluded.industries, core.industries);
  return null;
end;
$$;

create trigger sync_person_core_after_connect_profile_write
  after insert or update on public.network_profiles
  for each row execute function public.sync_person_core_from_connect_profile();

comment on function public.sync_person_core_from_profiles() is
  'Haelt person_core aktuell. Uebernimmt nur tatsaechlich geaenderte, nicht leere Werte.';
comment on function public.sync_person_core_from_discovery_profile() is
  'Haelt person_core aktuell. Uebernimmt remote_mode bewusst nicht, weil die Quelle dort einen nicht unterscheidbaren Default hat.';
comment on function public.sync_person_core_from_connect_profile() is
  'Haelt person_core aktuell. Uebernimmt nur tatsaechlich geaenderte, nicht leere Werte.';

commit;
