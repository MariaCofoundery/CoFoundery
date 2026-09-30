begin;

-- ---------------------------------------------------------------------------
-- Nachtrag zu 20261086120000
-- ---------------------------------------------------------------------------
--
-- Die Migration davor wurde geaendert, nachdem sie moeglicherweise schon
-- angewandt war. Supabase merkt sich angewandte Migrationen am DATEINAMEN -
-- eine geaenderte Datei laeuft nicht noch einmal. Damit gaebe es zwei
-- moegliche Zustaende da draussen:
--
--   Die alte Fassung: `discovery_has_preferences` existiert,
--   `discovery_preferences_for_match` fehlt.
--
--   Die neue Fassung: genau umgekehrt.
--
-- Diese Datei stellt beide auf denselben Stand. Sie ist absichtlich
-- wiederholbar: Wo schon alles stimmt, aendert sie nichts.
--
-- ---------------------------------------------------------------------------
-- WARUM `discovery_has_preferences` WIEDER VERSCHWINDET
-- ---------------------------------------------------------------------------
--
-- Sie beantwortete einen Satz aus Abschnitt 13 der Spec: "[Name] hat fuer die
-- eigene Suche noch keine Matching-Praeferenzen festgelegt." Maria am
-- 30.09.2026: "das sollte nicht erkennbar sein." Was fuer die eine Person gut
-- ist, ist es fuer die andere nicht - und ob jemand seine Suche festgelegt
-- hat, ist eine Auskunft ueber ihn, die er nicht gegeben hat.
--
-- Eine Funktion, die niemand mehr aufruft, aber jeder aufrufen darf, ist eine
-- offene Tuer ohne Zweck.

drop function if exists public.discovery_has_preferences(uuid);

-- ---------------------------------------------------------------------------
-- Die Suche der anderen Person - fuer den Server, nicht fuer den Browser
-- ---------------------------------------------------------------------------
--
-- Wortgleich mit 20261086120000. Sie steht hier ein zweites Mal, weil sie in
-- der alten Fassung jener Datei noch nicht enthalten war.
--
-- Eine Funktion, die die angemeldete Person aufrufen darf, darf ihr BROWSER
-- aufrufen: Dort liegt dieselbe Sitzung und derselbe oeffentliche Schluessel.
-- "Nur der Server" heisst deshalb: nur mit dem Dienstschluessel. Damit gibt es
-- kein `auth.uid()` mehr - wer fragt, steht als Parameter da.

create or replace function public.discovery_preferences_for_match(
  p_viewer uuid,
  p_candidate uuid
)
returns table (theme_id text, direction text, importance smallint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_viewer is null or p_candidate is null or p_viewer = p_candidate then
    raise exception 'discovery_self_match' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles pr
    where pr.user_id = p_viewer and 'founder' = any (coalesce(pr.roles, '{}'::text[]))
  ) then
    raise exception 'not_a_discovery_founder' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.founder_discovery_profiles p
    where p.user_id = p_candidate and p.status = 'active'
  ) then
    raise exception 'candidate_not_discoverable' using errcode = '42501';
  end if;

  return query
  select pref.theme_id, pref.direction, pref.importance
  from public.discovery_theme_preferences pref
  join public.discovery_preference_sets s on s.id = pref.preference_set_id
  where s.user_id = p_candidate
    and s.founder_profile_instrument_id = 'founder-profile-v1';
end;
$$;

comment on function public.discovery_preferences_for_match(uuid, uuid) is
  'Die Suchpraeferenzen einer Person, damit der Server beurteilen kann, ob ein '
  'Thema fuer BEIDE ein Matchpunkt ist. Nur mit dem Dienstschluessel '
  'aufrufbar - der Browser bekommt sie nie zu sehen.';

revoke all on function public.discovery_preferences_for_match(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.discovery_preferences_for_match(uuid, uuid) to service_role;

commit;
