begin;

-- ---------------------------------------------------------------------------
-- "Anderer Schwerpunkt" - und welcher?
-- ---------------------------------------------------------------------------
--
-- Die Rollenliste endet mit 'other'. Wer sie waehlte, sagte damit genau
-- nichts: "Anderer Schwerpunkt" steht dann im Profil, und die suchende Person
-- weiss weniger als vorher - sie sieht, dass da etwas ist, aber nicht was.
--
-- Zwei Felder, weil die Rollen zweimal vorkommen: was jemand selbst einbringt,
-- und was er sucht. Beide sind unabhaengig voneinander 'other'.
--
-- Die Bedingung ist der eigentliche Gewinn: Der Text darf nur dastehen, wenn
-- 'other' auch gewaehlt ist. Sonst bliebe nach dem Abwaehlen ein Satz im
-- Profil stehen, der zu keiner Rolle mehr gehoert - sichtbar fuer andere, und
-- fuer die schreibende Person unsichtbar, weil das Feld eingeklappt ist.
-- ---------------------------------------------------------------------------

alter table public.founder_discovery_profiles
  add column own_role_other text,
  add column seeking_role_other text,
  add constraint founder_discovery_profiles_own_role_other_check
    check (
      own_role_other is null
      or (char_length(btrim(own_role_other)) between 2 and 80 and 'other' = any(own_roles))
    ),
  add constraint founder_discovery_profiles_seeking_role_other_check
    check (
      seeking_role_other is null
      or (char_length(btrim(seeking_role_other)) between 2 and 80 and 'other' = any(seeking_roles))
    );

comment on column public.founder_discovery_profiles.own_role_other is
  'Was "Anderer Schwerpunkt" bei den eigenen Rollen konkret heisst. Nur gesetzt, solange other auch gewaehlt ist.';
comment on column public.founder_discovery_profiles.seeking_role_other is
  'Dasselbe fuer die gesuchten Rollen.';

-- ---------------------------------------------------------------------------
-- Auch in der Suche sichtbar
-- ---------------------------------------------------------------------------
-- Ohne diese Zeilen stuende der Text im eigenen Profil, aber nicht in der
-- Liste, in der andere ihn lesen sollen - und genau dort wird er gebraucht.
--
-- Wortgleich zur Fassung aus 20260831210000, nur um zwei Spalten erweitert.
-- Die Funktion bleibt security invoker: Sie stuetzt sich auf die
-- Zeilensicherheit der Tabelle, statt sie zu umgehen. Und die Parameternamen
-- bleiben unveraendert - die Anwendung ruft sie benannt auf.
--
-- Erst loeschen, dann anlegen: Ein Rueckgabetyp laesst sich nicht ersetzen.
drop function if exists public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
);

create function public.search_founder_discovery_profiles_v2(
  p_roles text[] default '{}'::text[],
  p_expertise text[] default '{}'::text[],
  p_location_region text default null,
  p_remote_modes text[] default '{}'::text[],
  p_min_availability smallint default null,
  p_page_size integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  candidate_user_id uuid,
  display_name text,
  headline text,
  own_roles text[],
  seeking_roles text[],
  own_role_other text,
  seeking_role_other text,
  expertise text[],
  location_region text,
  remote_mode text,
  availability_hours_per_week smallint,
  commitment_level text,
  venture_stage text,
  venture_goal text,
  search_intent text,
  start_horizon text,
  published_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with filtered as (
    select profile.*
    from public.founder_discovery_profiles profile
    where auth.uid() is not null
      and profile.status = 'active'
      and profile.user_id <> auth.uid()
      and (
        coalesce(cardinality(p_roles), 0) = 0
        or profile.own_roles && p_roles
      )
      and (
        coalesce(cardinality(p_expertise), 0) = 0
        or exists (
          select 1
          from unnest(profile.expertise) profile_expertise
          join unnest(p_expertise) requested_expertise
            on lower(btrim(profile_expertise)) = lower(btrim(requested_expertise))
        )
      )
      and (
        nullif(btrim(p_location_region), '') is null
        or lower(btrim(profile.location_region)) = lower(btrim(p_location_region))
      )
      and (
        coalesce(cardinality(p_remote_modes), 0) = 0
        or profile.remote_mode = any(p_remote_modes)
      )
      and (
        p_min_availability is null
        or profile.availability_hours_per_week >= p_min_availability
      )
  )
  select
    profile.id,
    profile.user_id as candidate_user_id,
    profile.display_name,
    profile.headline,
    profile.own_roles,
    profile.seeking_roles,
    profile.own_role_other,
    profile.seeking_role_other,
    profile.expertise,
    profile.location_region,
    profile.remote_mode,
    profile.availability_hours_per_week,
    profile.commitment_level,
    profile.venture_stage,
    profile.venture_goal,
    profile.search_intent,
    profile.start_horizon,
    profile.published_at,
    count(*) over() as total_count
  from filtered profile
  order by profile.published_at desc nulls last, profile.id
  limit least(greatest(coalesce(p_page_size, 12), 1), 24)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) from public, anon;
grant execute on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) to authenticated;

comment on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) is 'RLS-respecting Discovery projection. Intent and horizon are descriptive outputs only and do not filter or rank candidates.';

commit;
