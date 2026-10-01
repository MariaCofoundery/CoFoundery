begin;

-- ---------------------------------------------------------------------------
-- Die Identitaet fliesst nur noch in eine Richtung
-- ---------------------------------------------------------------------------
--
-- GEMESSENER DATENVERLUST, Bestandsaufnahme v2 Abschnitt 4.2:
--
--     person_core.bio  1000 Zeichen
--     Connect-Profil speichern
--     person_core.bio   800 Zeichen
--
-- Zwei Ursachen greifen ineinander. Connect kappt die Bio auf 800 Zeichen -
-- die Bedingung `network_profiles_text_check` aus 20260903180000 und die
-- Kappung in `connectValidation.ts`. Und der Rueck-Trigger aus 20260907140000
-- schreibt den gekuerzten Wert in den Kern zurueck. Beim naechsten
-- Bearbeiten stehen dort 800 Zeichen, und die letzten 400 sind weg.
--
-- Diese Migration behebt beides:
--
--   1. Connect erlaubt dieselben 1200 Zeichen wie der Kern und wie FIND.
--   2. Die Kontextzeilen schreiben Identitaet nicht mehr in den Kern zurueck.
--
-- ---------------------------------------------------------------------------
-- WARUM DIE RUECK-TRIGGER UEBERHAUPT ENTBEHRLICH SIND
-- ---------------------------------------------------------------------------
--
-- Sie stammen aus Phase 2 des Profil-Zusammenzugs (20260907140000). Damals
-- hatten die Kontextformulare eigene Identitaetsfelder: Wer seine Bio in
-- Connect aenderte, aenderte sie nur dort, und der Kern zog nach.
--
-- Das ist vorbei. Beide Formulare nehmen Identitaet heute AUS dem Kern
-- entgegen und lesen sie nicht mehr aus dem Formular:
--
--     connectValidation.ts    parseConnectProfile(formData, identity)
--     discoveryActions.ts     parseDiscoveryProfileFormData(formData, identity)
--
-- Geprueft wurden am 30.09.2026 alle Schreibwege auf die beiden Tabellen -
-- Server Actions, Seeds, Edge Functions, Datenbankfunktionen, Tests. Kein
-- Weg schreibt Identitaet unabhaengig vom Kern; `prepare_suggestion_notifications`
-- fasst nur `suggestions_checked_at` an.
--
-- ---------------------------------------------------------------------------
-- WARUM DER DRITTE TRIGGER BLEIBT - VERKLEINERT
-- ---------------------------------------------------------------------------
--
-- `profiles.display_name` hat fuenf eigenstaendige Schreibwege, die NICHT
-- ueber den Kern laufen:
--
--     features/profile/actions.ts          saveProfileBasicsAction  (Einstieg)
--     app/(product)/dashboard/actions.ts   updateDisplayNameAction
--     features/questionnaire/actions.ts    saveDisplayName
--     features/questionnaire/actionsB.ts   saveDisplayNameB
--     scripts/dev-seed.ts
--
-- Ohne den Trigger haette ein Mensch nach dem Einstieg einen Namen in
-- `profiles` und keinen im Kern - und der Kern ist das, was /me/profile, FIND
-- und Connect anzeigen. Der Trigger bleibt deshalb, bis diese fuenf Stellen
-- in den Kern schreiben.
--
-- Er wird aber auf `display_name` verkleinert. `profiles.headline` hat keinen
-- eigenstaendigen Schreibweg: `saveProfileBasicsAction` reicht den
-- vorhandenen Wert unveraendert durch, und sonst schreibt dort nur die
-- Propagation aus dem Kern. Eine Headline ist damit nie etwas, das der Kern
-- von `profiles` lernen muesste.

-- ---------------------------------------------------------------------------
-- 1. Connect erlaubt dieselbe Bio-Laenge wie der Kern
-- ---------------------------------------------------------------------------
alter table public.network_profiles
  drop constraint if exists network_profiles_text_check;

alter table public.network_profiles
  add constraint network_profiles_text_check check (
    char_length(display_name) <= 80
    and char_length(headline) <= 160
    -- 1200 wie public.person_core (person_core_bio_len) und wie
    -- public.founder_discovery_profiles (…_bio_length_check). Drei Tabellen,
    -- eine Zahl: Sobald eine davon kleiner ist, kuerzt sie fuer alle.
    and char_length(bio) <= 1200
    and (location_region is null or char_length(location_region) <= 120)
  );

-- ---------------------------------------------------------------------------
-- 2. Connect schreibt nicht mehr in den Kern
-- ---------------------------------------------------------------------------
drop trigger if exists sync_person_core_after_connect_profile_write on public.network_profiles;
drop function if exists public.sync_person_core_from_connect_profile();

-- ---------------------------------------------------------------------------
-- 3. FIND schreibt nicht mehr in den Kern
-- ---------------------------------------------------------------------------
drop trigger if exists sync_person_core_after_discovery_profile_write on public.founder_discovery_profiles;
drop function if exists public.sync_person_core_from_discovery_profile();

-- ---------------------------------------------------------------------------
-- 4. Das Basisprofil traegt nur noch den Namen nach
-- ---------------------------------------------------------------------------
create or replace function public.sync_person_core_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text := nullif(btrim(new.display_name), '');
begin
  -- LEER GILT NICHT ALS EINGABE, und nur tatsaechlich Geaendertes wandert.
  -- Beide Regeln stammen aus 20260907140000 und gelten unveraendert.
  if tg_op = 'UPDATE' and new.display_name is not distinct from old.display_name then
    return null;
  end if;

  if v_display_name is null then
    return null;
  end if;

  insert into public.person_core as core (user_id, display_name)
  values (new.user_id, v_display_name)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, core.display_name);
  return null;
end;
$$;

comment on function public.sync_person_core_from_profiles() is
  'Uebergangsweise: traegt den Namen aus dem Einstiegsformular in den Kern. '
  'Entfaellt, sobald saveProfileBasicsAction, updateDisplayNameAction, '
  'saveDisplayName und saveDisplayNameB direkt in person_core schreiben.';

commit;
