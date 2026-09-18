begin;

-- ---------------------------------------------------------------------------
-- Obergrenze oder Jetzt-Stand?
-- ---------------------------------------------------------------------------
--
-- "15 Stunden pro Woche" heisst zweierlei, und der Unterschied ist grosz:
-- Entweder ist das die Grenze des Moeglichen - oder es ist der heutige Stand,
-- und die Person wuerde ihre Woche umbauen, wenn Idee und Menschen stimmen.
--
-- WARUM NICHT EINFACH "MOTIVATION":
--   Eine Selbsteinschaetzung auf einer Skala waere wertlos. Wer kreuzt bei
--   "wie viel Bock hast du?" schon etwas anderes an als das Hoechste? Eine
--   Angabe, bei der alle dasselbe sagen, traegt keine Information - sie
--   erzeugt nur Vergleich auf einer Achse, die sich nicht messen laesst.
--
--   Diese Frage funktioniert, weil BEIDE Antworten respektabel sind. "Mein
--   Rahmen steht" ist keine Absage an die Sache; es ist eine ehrliche Grenze,
--   die spaeteren Aerger verhindert. Und "ich wuerde umbauen" kostet etwas:
--   Wer das sagt, muss dazusagen, WAS passieren muesste.
--
-- DIE BEDINGUNG IST DER EIGENTLICHE INHALT:
--   "Ja, fuer das Richtige" ist billig. "Wenn wir eine Finanzierung haben,
--   gehe ich im Job auf 30 Stunden runter" ist eine Aussage, ueber die sich
--   reden laesst - und genau darueber reden zwei Menschen spaeter.
--
--   Deshalb haengt der Text an der Antwort, so wie der Freitext an "Anderer
--   Schwerpunkt": Ohne "would_expand" darf er nicht dastehen, und mit
--   "would_expand" muss er etwas sagen.
--
-- Beides bleibt freiwillig. Ein Profil laesst sich weiterhin ohne diese Angabe
-- veroeffentlichen - eine neue Pflicht wuerde Bestandsprofile unsichtbar
-- machen, und nicht jede Person kann die Frage heute beantworten.
-- ---------------------------------------------------------------------------

alter table public.founder_discovery_profiles
  add column availability_flexibility text,
  add column availability_condition text,
  add constraint founder_discovery_profiles_availability_flexibility_check
    check (availability_flexibility is null
      or availability_flexibility in ('fixed', 'would_expand')),
  add constraint founder_discovery_profiles_availability_condition_check
    check (
      availability_condition is null
      or (
        char_length(btrim(availability_condition)) between 10 and 200
        and availability_flexibility = 'would_expand'
      )
    );

comment on column public.founder_discovery_profiles.availability_flexibility is
  'Ob die Stundenangabe eine Obergrenze ist (fixed) oder der heutige Stand, der sich fuer das Richtige aendern wuerde (would_expand). Freiwillig.';
comment on column public.founder_discovery_profiles.availability_condition is
  'Was passieren muesste, damit mehr Zeit entsteht. Nur gesetzt, solange would_expand gewaehlt ist - ohne Bedingung waere die Zusage eine Floskel.';

-- ---------------------------------------------------------------------------
-- Auch in der Suche sichtbar
-- ---------------------------------------------------------------------------
-- Ohne diese Spalten stuende die Angabe im eigenen Profil, aber nicht in der
-- Liste, in der andere sie lesen sollen.
--
-- Wortgleich zur Fassung aus 20260922120000, nur um zwei Spalten erweitert.
-- security invoker bleibt: Die Funktion stuetzt sich auf die Zeilensicherheit
-- der Tabelle, statt sie zu umgehen. Die Parameternamen bleiben ebenfalls -
-- die Anwendung ruft sie benannt auf.
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
  availability_flexibility text,
  availability_condition text,
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
    profile.availability_flexibility,
    profile.availability_condition,
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
