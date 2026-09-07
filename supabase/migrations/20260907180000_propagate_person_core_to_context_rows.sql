begin;

-- Gegenrichtung zu 20260907140000.
--
-- Bisher fliessen Aenderungen nur Kontextzeile -> Kern. Sobald der Kern selbst
-- bearbeitet werden kann - auf /profile als dem einen Profil-Ort - braucht es
-- die Gegenrichtung, sonst waere ein dort geaenderter Name in Discovery und
-- Connect nicht sichtbar. Und genau die Kontextzeilen sind es, die andere
-- Menschen sehen.
--
-- Drei Regeln:
--
--   1. NUR NICHT-LEERE KERNWERTE WANDERN.
--      Ein leeres Kernfeld bedeutet "noch nichts eingetragen", nicht "loesche
--      den Wert im Kontext". coalesce(new.x, ziel.x) haelt ausserdem die
--      not-null-Spalten der beiden neueren Tabellen ein.
--
--   2. KEINE ZEILEN ANLEGEN.
--      Der Kern erzeugt keine Discovery- oder Connect-Profile. Wer dort kein
--      Profil hat, hat sich dagegen entschieden.
--
--   3. KEINE VEROEFFENTLICHUNG.
--      visibility, status, published_at und public_slug bleiben unberuehrt.
--      Der Kern aendert Inhalte, nie die Entscheidung, sie zu zeigen.
--
-- Schleifenschutz: pg_trigger_depth() > 1 bricht ab. Ohne das wuerde diese
-- Schreibung die Trigger aus 20260907140000 ausloesen, die denselben Wert
-- zurueck in den Kern schreiben - und der wieder hierhin.
create or replace function public.propagate_person_core_to_context_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  update public.profiles target
  set display_name = coalesce(new.display_name, target.display_name),
      headline = coalesce(new.headline, target.headline)
  where target.user_id = new.user_id;

  update public.founder_discovery_profiles target
  set display_name = coalesce(new.display_name, target.display_name),
      headline = coalesce(new.headline, target.headline),
      bio = coalesce(new.bio, target.bio),
      location_region = coalesce(new.location_region, target.location_region),
      -- remote_mode dort ist `not null default 'flexible'`; ohne Kernwert
      -- bleibt der bestehende stehen statt auf einen Default zu fallen.
      remote_mode = coalesce(new.remote_mode, target.remote_mode),
      expertise = coalesce(new.expertise, target.expertise),
      industries = coalesce(new.industries, target.industries)
  where target.user_id = new.user_id;

  update public.network_profiles target
  set display_name = coalesce(new.display_name, target.display_name),
      headline = coalesce(new.headline, target.headline),
      bio = coalesce(new.bio, target.bio),
      location_region = coalesce(new.location_region, target.location_region),
      remote_mode = coalesce(new.remote_mode, target.remote_mode),
      expertise = coalesce(new.expertise, target.expertise),
      industries = coalesce(new.industries, target.industries)
  where target.user_id = new.user_id;

  return null;
end;
$$;

-- Nur bei UPDATE: eine frisch angelegte, leere Kernzeile hat nichts zu
-- verteilen, und beim Signup existiert noch keine Kontextzeile.
create trigger propagate_person_core_after_update
  after update on public.person_core
  for each row execute function public.propagate_person_core_to_context_rows();

comment on function public.propagate_person_core_to_context_rows() is
  'Verteilt Kerninhalte in die Kontextzeilen. Uebernimmt nur nicht-leere Werte, legt keine Zeilen an und aendert keine Veroeffentlichungsentscheidung.';

commit;
