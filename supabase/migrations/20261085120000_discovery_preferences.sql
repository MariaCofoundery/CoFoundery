begin;

-- ---------------------------------------------------------------------------
-- Was jemand bei der Suche sucht
-- ---------------------------------------------------------------------------
--
-- Je Thema zwei Angaben: eine Richtung und ein Gewicht. Grundlage ist
-- `docs/FIND_UX_Discovery_Integration_Spec_v0.1.md`, Abschnitt 27.
--
-- ---------------------------------------------------------------------------
-- DIE THEMENKENNUNG STEHT NICHT ALS PRUEFREGEL HIER
-- ---------------------------------------------------------------------------
--
-- Welche sechs Themen es gibt, haengt daran, welche Fragen des Arbeitsprofils
-- zu welchem Thema gehoeren - und diese Zuordnung steht in TypeScript
-- (`discoveryThemes.ts`), weil sie dort gegen die Registratur geprueft werden
-- kann. Eine zweite Aufzaehlung in SQL waere eine zweite Wahrheit, die beim
-- naechsten Umbenennen stillschweigend falsch wird. Geprueft wird hier nur die
-- Form; die Liste prueft die Anwendung.
--
-- ---------------------------------------------------------------------------
-- NEUTRAL UND GEWICHT SCHLIESSEN SICH AUS
-- ---------------------------------------------------------------------------
--
-- "ist mir egal" mit Gewicht 2 waeren zwei Angaben, die sich widersprechen,
-- und sie koennen aus einer halb ausgefuellten Maske entstehen. Die Datenbank
-- laesst sie nicht zu - dann muss niemand spaeter raten, welche gilt.

create table if not exists public.discovery_preference_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- ---------------------------------------------------------------------
  -- VERSIONSBINDUNG (Spec, Abschnitt 28)
  -- ---------------------------------------------------------------------
  --
  -- Die Praeferenzen beziehen sich auf die Fragen EINER Fassung des
  -- Arbeitsprofils. Aendert sich das Instrument so stark, dass die
  -- Zuordnung nicht mehr stimmt, darf die alte Auswahl nicht still
  -- weiterverwendet werden - dann steht hier eine andere Kennung als in
  -- der Anwendung, und die Anwendung fragt nach.
  founder_profile_instrument_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ein Satz je Person und Fassung. Wer die naechste Fassung ausfuellt,
  -- bekommt einen zweiten - die alte Auswahl bleibt lesbar.
  unique (user_id, founder_profile_instrument_id)
);

create table if not exists public.discovery_theme_preferences (
  preference_set_id uuid not null
    references public.discovery_preference_sets (id) on delete cascade,
  theme_id text not null,
  direction text not null check (direction in ('similar', 'complementary', 'neutral')),
  importance smallint not null check (importance between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (preference_set_id, theme_id),
  constraint discovery_theme_preferences_theme_id_shape
    check (theme_id ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint discovery_theme_preferences_neutral_has_no_weight
    check ((direction = 'neutral') = (importance = 0))
);

create index if not exists discovery_preference_sets_user_idx
  on public.discovery_preference_sets (user_id);

-- ---------------------------------------------------------------------------
-- Zeilensicherheit: die eigene Suche ist privat
-- ---------------------------------------------------------------------------
--
-- Spec, Abschnitt 22: "Private Matching-Praeferenzen werden nicht oeffentlich
-- angezeigt." Niemand liest die Praeferenzen einer anderen Person - auch nicht
-- die Anwendung.
--
-- ACHTUNG FUER DEN NAECHSTEN SCHRITT: Das beidseitige Matching (Abschnitt 13
-- und 16) braucht die Praeferenzen der ANDEREN Person, um zu sagen "fuer euch
-- beide ein starker Matchpunkt". Das gehoert in eine enge SECURITY-DEFINER-
-- Funktion, die das ERGEBNIS zurueckgibt und nicht die Praeferenzen. Diese
-- Policies hier bitte nicht dafuer aufmachen.

alter table public.discovery_preference_sets enable row level security;
alter table public.discovery_theme_preferences enable row level security;

drop policy if exists discovery_preference_sets_own on public.discovery_preference_sets;
create policy discovery_preference_sets_own
  on public.discovery_preference_sets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists discovery_theme_preferences_own on public.discovery_theme_preferences;
create policy discovery_theme_preferences_own
  on public.discovery_theme_preferences
  for all
  using (
    exists (
      select 1 from public.discovery_preference_sets s
      where s.id = preference_set_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.discovery_preference_sets s
      where s.id = preference_set_id and s.user_id = auth.uid()
    )
  );

comment on table public.discovery_preference_sets is
  'Die private Suche einer Person, gebunden an eine Fassung des Arbeitsprofils.';
comment on table public.discovery_theme_preferences is
  'Je Thema: Richtung (aehnlich / ergaenzend / egal) und Gewicht 0 bis 3.';

commit;
