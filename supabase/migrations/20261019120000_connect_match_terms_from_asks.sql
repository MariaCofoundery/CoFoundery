begin;

-- ---------------------------------------------------------------------------
-- Was ich SUCHE, zaehlt mit
-- ---------------------------------------------------------------------------
--
-- MARIA FRAGTE AM 21.09.2026: "Welche Kriterien?" Bis hierher war die Antwort
-- unvollstaendig: Verglichen wurden ausschliesslich `expertise` und
-- `industries` aus meinem Profil - also das, was ich KANN.
--
-- Gefunden wurde damit "jemand bietet etwas aus deinem Fachgebiet". Das ist
-- ein schwaches Kriterium: Wer Podcasts macht, braucht nicht vorrangig andere
-- Podcast-Leute. Die deutlichste Aussage darueber, was jemand will, steht
-- woanders - in dem, was er selbst ausgeschrieben hat:
--
--   * eigene GESUCHE ("ich suche jemanden fuer den Schnitt")
--   * eigene PROBLEME ("Transkripte fehlen fast immer")
--
-- Beides sind Bitten, die diese Person selbst veroeffentlicht hat. Sie hier
-- mitzuzaehlen bringt keine neue Sichtbarkeit und keine neue Einwilligung ins
-- Spiel: Es aendert nur, WONACH fuer mich gesucht wird - und zwar nach dem,
-- was ich selbst aufgeschrieben habe.
--
-- WAS SICH NICHT AENDERT: Vorgeschlagen werden weiterhin nur ANGEBOTE (und
-- Unternehmen, Probleme, Menschen wie bisher). Ein fremdes Gesuch bleibt
-- aussen vor - wer etwas sucht, hat eine Bitte gestellt, und die gehoert
-- nicht ungefragt in die Vorschlagsliste eines Fremden. Hier wandert nur die
-- EIGENE Bitte in die Suchbegriffe.
--
-- ZUSAETZLICH GESCHLOSSEN: Die Funktion nahm eine beliebige Nutzer-ID und gab
-- als `security definer` die Begriffe jeder Person zurueck - auch einem
-- Angemeldeten, der nicht im Netzwerk ist. Gebraucht wurde das nie (beide
-- Aufrufer setzen die eigene ID ein), und mit den Gesuchen und Problemen
-- darin waere es eine Zusammenfassung dessen, was jemand umtreibt. Jetzt
-- beantwortet die Funktion nur noch Fragen nach der eigenen Person.
-- ---------------------------------------------------------------------------

create or replace function public.connect_match_terms(p_user_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Nur die eigenen Begriffe. Kein stilles leeres Ergebnis: Das liesse sich
  -- als "diese Person hat nichts angegeben" missdeuten, und ein Aufrufer
  -- wuerde den Fehler nie sehen.
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'own_terms_only' using errcode = '42501';
  end if;

  return (
    select coalesce(array_agg(distinct source.term), '{}'::text[])
    from (
      -- 1. Was ich kann.
      select lower(btrim(raw.value)) as term
      from public.network_profiles profile
      cross join lateral unnest(
        coalesce(profile.expertise, '{}'::text[]) || coalesce(profile.industries, '{}'::text[])
      ) as raw(value)
      where profile.user_id = p_user_id
        and profile.status = 'active'

      union all

      -- 2. Was ich suche. Abgelaufenes zaehlt nicht mit: Eine Anzeige, die
      -- ausgelaufen ist, ist eine Bitte, die ich zurueckgezogen habe.
      select lower(btrim(raw.value)) as term
      from public.network_listings listing
      cross join lateral unnest(
        coalesce(listing.topics, '{}'::text[]) || coalesce(listing.industries, '{}'::text[])
      ) as raw(value)
      where listing.owner_user_id = p_user_id
        and listing.direction = 'seeking'
        and listing.status = 'active'
        and listing.expires_at > now()

      union all

      -- 3. Was mich ungeloest umtreibt.
      select lower(btrim(raw.value)) as term
      from public.network_problems problem
      cross join lateral unnest(
        coalesce(problem.topics, '{}'::text[]) || coalesce(problem.industries, '{}'::text[])
      ) as raw(value)
      where problem.author_user_id = p_user_id
        and problem.status = 'active'
    ) as source
    -- Zu kurze Woerter treffen ueberall und machen aus einem Vorschlag
    -- Zufall. Unveraendert aus 20261017120000.
    where char_length(source.term) >= 3
  );
end;
$$;

comment on function public.connect_match_terms(uuid) is
  'Die Suchbegriffe einer Person: was sie kann (Profil), was sie sucht (eigene aktive Gesuche) und was sie ungeloest nennt (eigene Probleme). Nur fuer die aufrufende Person selbst.';

revoke all on function public.connect_match_terms(uuid) from public, anon;
grant execute on function public.connect_match_terms(uuid) to authenticated;

commit;
