begin;

-- ---------------------------------------------------------------------------
-- Was bleiben darf, wenn jemand geht
-- ---------------------------------------------------------------------------
--
-- Bisher hing alles an `on delete cascade`: Wer sein Konto loeschte, nahm
-- seine geschilderten Probleme mit - und mit ihnen die Ansaetze und
-- Bestaetigungen, die ANDERE dazu geschrieben hatten. Und die eigenen Ansaetze
-- auf fremden Problemen verschwanden von Seiten, die jemand anderem gehoeren.
--
-- DER RECHTLICHE GEDANKE:
--   Zu loeschen sind personenbezogene Daten. Der Satz "Pflegedienste finden
--   keine Vertretung" ist fuer sich keiner - personenbezogen ist die
--   VERKNUEPFUNG zwischen Text und Person. Wird die unwiderruflich getrennt,
--   ist das Ergebnis anonym und faellt aus der DSGVO heraus (ErwG 26).
--
--   Deshalb: kein Loeschen und kein Behalten, sondern Trennen. author_user_id
--   wird auf null gesetzt, nicht auf einen Platzhalter - es gibt danach keinen
--   Weg zurueck zur Person, auch nicht fuer uns.
--
--   Ein Urheberrecht laesst sich in Deutschland nicht abtreten (§ 29 UrhG).
--   Gebraucht wird auch keins: Es reicht die ausdrueckliche Einwilligung, den
--   Text stehen zu lassen. Die faellt zweimal - beim Einstellen als
--   Voreinstellung und beim Loeschen noch einmal bewusst.
--
-- WAS DARAUS FOLGT, ohne dass es jemand extra bauen muesste:
--   Die Policies pruefen `author_user_id = auth.uid()`. Gegen null ergibt das
--   NULL, also nie wahr. Ein verwaistes Problem laesst sich damit von
--   niemandem mehr aendern, zurueckziehen oder als geloest markieren - es ist
--   ab dem Moment schreibgeschuetzt. Genau richtig: Es gibt niemanden mehr,
--   der es pflegen koennte.
--
--   Dasselbe gilt fuer eine Interessensmeldung AM PROBLEM: Sie ginge an
--   niemanden. Sie wird unten ausdruecklich verboten statt nur zufaellig durch
--   eine NULL-Auswertung - man soll die Absicht lesen koennen.
--
--   Rueckmeldungen zu einem ANSATZ bleiben moeglich, solange dessen Verfasser
--   noch da ist. Und bestaetigen ("kenne ich auch") darf man weiterhin: Das
--   erreicht niemanden und veraltet nicht.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Die Verknuepfung darf sich loesen
-- ---------------------------------------------------------------------------
alter table public.network_problems
  alter column author_user_id drop not null,
  drop constraint network_problems_author_user_id_fkey,
  add constraint network_problems_author_user_id_fkey
    foreign key (author_user_id) references auth.users(id) on delete set null,
  add column outlives_account boolean not null default false;

alter table public.network_problem_approaches
  alter column author_user_id drop not null,
  drop constraint network_problem_approaches_author_user_id_fkey,
  add constraint network_problem_approaches_author_user_id_fkey
    foreign key (author_user_id) references auth.users(id) on delete set null,
  add column outlives_account boolean not null default false;

comment on column public.network_problems.outlives_account is
  'Voreinstellung der einstellenden Person, ob dieses Problem eine Kontoloeschung anonym ueberdauern darf. Verbindlich ist die Bestaetigung im Loeschdialog.';
comment on column public.network_problems.author_user_id is
  'Null heisst: Die Person hat ihr Konto geloescht und den Text anonym stehen lassen. Es gibt keinen Weg zurueck.';

-- Der eindeutige Ansatz je Person und Problem darf mehrere verwaiste
-- nebeneinander zulassen: Ohne diese Einschraenkung koennte nur EIN Ansatz je
-- Problem verwaisen, der zweite liefe in die Eindeutigkeitsbedingung.
alter table public.network_problem_approaches
  drop constraint network_problem_approaches_unique;

create unique index network_problem_approaches_one_per_author
  on public.network_problem_approaches (problem_id, author_user_id)
  where author_user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Was an einem verwaisten Problem noch geht
-- ---------------------------------------------------------------------------
drop policy network_problem_interests_insert on public.network_problem_interests;

create policy network_problem_interests_insert
on public.network_problem_interests
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_network_member(auth.uid())
  and exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_interests.problem_id
      and problem.status = 'active'
      and (
        approach_id is not null
        -- Nicht beim eigenen Problem - und nicht bei einem verwaisten,
        -- denn dort erreicht die Meldung niemanden mehr.
        or (problem.author_user_id is not null and problem.author_user_id <> auth.uid())
      )
  )
  and (
    approach_id is null
    or exists (
      select 1 from public.network_problem_approaches approach
      where approach.id = network_problem_interests.approach_id
        and approach.status = 'active'
        and approach.author_user_id is not null
        and approach.author_user_id <> auth.uid()
    )
  )
);

drop policy network_problem_confirmations_insert on public.network_problem_confirmations;

create policy network_problem_confirmations_insert
on public.network_problem_confirmations
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_network_member(auth.uid())
  and exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_confirmations.problem_id
      and problem.status = 'active'
      -- Bei einem verwaisten Problem ausdruecklich erlaubt: Bestaetigen
      -- erreicht niemanden und bleibt auch ohne Verfasser wahr.
      and (problem.author_user_id is null or problem.author_user_id <> auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 3. Die oeffentliche Seite ueberlebt die Person
-- ---------------------------------------------------------------------------
-- Der Join auf das Profil war zwingend - ein verwaistes Problem waere damit
-- von aussen verschwunden, obwohl die Freigabe genau dafuer erteilt wurde.
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
    case when profile.visibility = 'public' then profile.public_slug else null end,
    problem.published_at,
    problem.updated_at
  from public.network_problems problem
  left join public.network_profiles profile
    on profile.user_id = problem.author_user_id
   and profile.status = 'active'
  left join public.network_memberships membership
    on membership.user_id = problem.author_user_id
   and membership.status = 'active'
  where problem.public_slug = p_public_slug
    and problem.visibility = 'public'
    and problem.status = 'active'
    -- Entweder es gibt eine aktive Person dahinter, oder es gibt gar keine
    -- mehr. Ein pausiertes oder gesperrtes Profil zaehlt weiter nicht.
    and (problem.author_user_id is null or (profile.user_id is not null and membership.user_id is not null));
$$;

comment on function public.get_public_network_problem(text) is
  'Ein oeffentlich gestelltes Problem fuer Menschen ohne Konto. Gibt keine Ansaetze, Bestaetigungen oder Interessen zurueck. Bei einem verwaisten Problem bleiben die Angaben zur Person leer.';

-- Die Sitemap folgt derselben Regel.
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
  left join public.network_profiles profile
    on profile.user_id = problem.author_user_id and profile.status = 'active'
  left join public.network_memberships membership
    on membership.user_id = problem.author_user_id and membership.status = 'active'
  where problem.visibility = 'public' and problem.status = 'active'
    and (problem.author_user_id is null or (profile.user_id is not null and membership.user_id is not null));
$$;

-- ---------------------------------------------------------------------------
-- 4. Der Schritt vor dem Loeschen
-- ---------------------------------------------------------------------------
-- Laeuft VOR delete_founder_account_data und entfernt, was nicht bleiben soll.
-- Was danach noch dasteht, verliert beim Loeschen der Person nur seine
-- Verknuepfung - das erledigt der Fremdschluessel.
--
-- Die Reihenfolge ist der Punkt: Andersherum waere alles verwaist, auch das,
-- wogegen sich jemand ausdruecklich entschieden hat.
create or replace function public.prepare_network_content_for_account_deletion(
  p_user_id uuid,
  p_keep_problems boolean,
  p_keep_approaches boolean
)
returns table (deleted_problems integer, deleted_approaches integer, kept_problems integer, kept_approaches integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_problems integer := 0;
  v_deleted_approaches integer := 0;
  v_kept_problems integer := 0;
  v_kept_approaches integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'network_content_preparation_service_required' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'network_content_preparation_user_required' using errcode = '22023';
  end if;

  if not coalesce(p_keep_approaches, false) then
    delete from public.network_problem_approaches where author_user_id = p_user_id;
    get diagnostics v_deleted_approaches = row_count;
  end if;

  if not coalesce(p_keep_problems, false) then
    -- Die Ansaetze anderer an diesen Problemen fallen per Fremdschluessel mit.
    -- Das ist die Folge einer Entscheidung gegen das Stehenlassen und laesst
    -- sich nicht vermeiden: Ein Ansatz ohne sein Problem ergibt nichts.
    delete from public.network_problems where author_user_id = p_user_id;
    get diagnostics v_deleted_problems = row_count;
  end if;

  select count(*) into v_kept_problems
  from public.network_problems where author_user_id = p_user_id;
  select count(*) into v_kept_approaches
  from public.network_problem_approaches where author_user_id = p_user_id;

  return query select v_deleted_problems, v_deleted_approaches, v_kept_problems, v_kept_approaches;
end;
$$;

comment on function public.prepare_network_content_for_account_deletion(uuid, boolean, boolean) is
  'Entfernt vor der Kontoloeschung, was nicht anonym stehen bleiben soll. Der Rest verliert danach per Fremdschluessel nur die Verknuepfung zur Person.';

revoke all on function public.prepare_network_content_for_account_deletion(uuid, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.prepare_network_content_for_account_deletion(uuid, boolean, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. Der Trigger darf das Trennen nicht verhindern
-- ---------------------------------------------------------------------------
-- enforce_network_problem_publication verlangt bei status='active' eine
-- Mitgliedschaft und ein aktives Profil. Beim Loesen der Verknuepfung setzt
-- der Fremdschluessel author_user_id auf null - und genau dann gibt es beides
-- nicht mehr. Der Trigger haette die Kontoloeschung abgebrochen.
--
-- Gefunden von der pgTAP-Pruefung zu dieser Migration, nicht im Betrieb.
create or replace function public.enforce_network_problem_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Ein verwaistes Problem hat niemanden, den man pruefen koennte. Es ist
  -- auch niemand mehr da, der es veroeffentlichen wuerde: Diesen Zustand
  -- erreicht ausschliesslich das Loesen der Verknuepfung.
  if new.author_user_id is null then
    return new;
  end if;

  if new.status = 'active' then
    if not public.is_network_member(new.author_user_id) then
      raise exception 'network_membership_required' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.network_profiles profile
      where profile.user_id = new.author_user_id and profile.status = 'active'
    ) then
      raise exception 'active_network_profile_required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

commit;
