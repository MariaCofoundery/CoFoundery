begin;

-- ---------------------------------------------------------------------------
-- Ein Problem oeffentlich stellen
-- ---------------------------------------------------------------------------
--
-- Dasselbe Muster wie bei Profilen und Anzeigen (20260904140000): nicht
-- oeffentlich als Voreinstellung, Freigabe je Eintrag, jederzeit widerrufbar.
--
-- WARUM DAS HIER HEIKLER IST ALS BEI EINER ANZEIGE:
--   Ein Problem beschreibt oft ein Arbeitsumfeld - und damit mittelbar einen
--   Arbeitgeber. Wer schreibt, dass in seinem Pflegedienst stundenlang Listen
--   abtelefoniert werden, sagt etwas ueber seine Arbeitsstelle. Deshalb bleibt
--   die Voreinstellung 'members_only', und die Oberflaeche verlangt beim
--   ersten Umschalten eine ausdrueckliche Bestaetigung.
--
-- WAS OEFFENTLICH WIRD - UND WAS AUSDRUECKLICH NICHT:
--   Oeffentlich: das Problem selbst, samt Themen, Orten und der Absicht der
--   einstellenden Person. Ihr Name steht dabei, wie bei einer Anzeige auch;
--   verlinkt wird ihr Profil nur, wenn sie es selbst oeffentlich gestellt hat.
--
--   NICHT oeffentlich: die Ansaetze. Sie stammen von anderen Menschen, und die
--   Einwilligung der einstellenden Person kann deren Texte nicht mit
--   abdecken. Wer einen Ansatz schreibt, tut das fuer die Plattform - nicht
--   fuer Google. Dasselbe gilt fuer Bestaetigungen und Interessen: Die Zahlen
--   sind ein Signal nach innen und haetten draussen nur eine Wirkung, naemlich
--   eine Rangfolge.
-- ---------------------------------------------------------------------------

alter table public.network_problems
  add column visibility text not null default 'members_only',
  add column public_slug text not null
    default ('problem-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)),
  add constraint network_problems_visibility_check
    check (visibility in ('members_only', 'public')),
  add constraint network_problems_public_slug_check
    check (public_slug ~ '^problem-[a-f0-9]{24}$'),
  add constraint network_problems_public_slug_key unique (public_slug);

comment on column public.network_problems.visibility is
  'members_only: nur eingeloggt sichtbar. public: auch ohne Konto und fuer Suchmaschinen. Voreinstellung ist members_only, die Freigabe gilt je Eintrag.';

create index network_problems_public_idx
  on public.network_problems (updated_at desc)
  where visibility = 'public' and status = 'active';

-- ---------------------------------------------------------------------------
-- Die oeffentliche Seite eines Problems
-- ---------------------------------------------------------------------------
create or replace function public.get_public_network_problem(p_public_slug text)
returns table (
  public_slug text,
  title text,
  description text,
  author_intent text,
  locations text[],
  topics text[],
  industries text[],
  geographic_scope text,
  author_display_name text,
  author_headline text,
  author_profile_slug text,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select problem.public_slug,
    problem.title,
    problem.description,
    problem.author_intent,
    problem.locations,
    problem.topics,
    problem.industries,
    problem.geographic_scope,
    profile.display_name,
    profile.headline,
    -- Nur wenn diese Person ihr Profil selbst oeffentlich gestellt hat. Die
    -- Freigabe des Problems ist keine Freigabe des Profils.
    case when profile.visibility = 'public' then profile.public_slug else null end,
    problem.published_at,
    problem.updated_at
  from public.network_problems problem
  join public.network_profiles profile on profile.user_id = problem.author_user_id
  join public.network_memberships membership on membership.user_id = problem.author_user_id
  where problem.public_slug = p_public_slug
    -- 'resolved' und 'withdrawn' verschwinden damit auch von aussen. Ein
    -- geloestes Problem oeffentlich stehen zu lassen, waere irrefuehrend.
    and problem.visibility = 'public'
    and problem.status = 'active'
    and profile.status = 'active'
    and membership.status = 'active';
$$;

comment on function public.get_public_network_problem(text) is
  'Ein oeffentlich gestelltes Problem fuer Menschen ohne Konto. Gibt bewusst keine Ansaetze, Bestaetigungen oder Interessen zurueck - dafuer liegt keine Einwilligung der jeweiligen Menschen vor.';

-- ---------------------------------------------------------------------------
-- Die Sitemap
-- ---------------------------------------------------------------------------
-- Dabei zwei Pfade richtiggestellt: Der Bereich heisst seit der Umbenennung
-- /connect, die Funktion gab aber weiter /network aus. Die Adressen
-- funktionierten nur ueber eine Weiterleitung - in einer Sitemap gehoert die
-- endgueltige Adresse, nicht eine, die erst woandershin zeigt.
create or replace function public.list_public_network_sitemap()
returns table (path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select '/connect/p/' || profile.public_slug, profile.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where profile.visibility = 'public' and profile.status = 'active' and membership.status = 'active'
  union all
  select '/connect/l/' || listing.public_slug, listing.updated_at
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.visibility = 'public' and listing.status = 'active' and listing.expires_at > now()
    and profile.status = 'active' and membership.status = 'active'
  union all
  select '/connect/pr/' || problem.public_slug, problem.updated_at
  from public.network_problems problem
  join public.network_profiles profile on profile.user_id = problem.author_user_id
  join public.network_memberships membership on membership.user_id = problem.author_user_id
  where problem.visibility = 'public' and problem.status = 'active'
    and profile.status = 'active' and membership.status = 'active';
$$;

-- Erreichbar ohne Konto - das ist der Zweck. Die Funktion selbst laesst nur
-- durch, was freigegeben ist.
revoke all on function public.get_public_network_problem(text) from public;
grant execute on function public.get_public_network_problem(text) to anon, authenticated, service_role;

commit;
