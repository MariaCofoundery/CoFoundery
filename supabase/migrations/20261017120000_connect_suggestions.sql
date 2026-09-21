begin;

-- ---------------------------------------------------------------------------
-- Vorschlaege: "Guck mal, das koennte dich interessieren"
-- ---------------------------------------------------------------------------
--
-- BESPROCHEN AM 21.09.2026. Der Wunsch war: Wer Podcasts macht, soll das
-- Stimmentool sehen, das jemand hier eingestellt hat.
--
-- OHNE SPRACHMODELL. Das ist keine Sparmassnahme, sondern die Antwort auf die
-- Sorge, "dass die KI einfach irgendwas macht, was sie gar nicht machen soll":
-- Die Kandidaten kommen aus Feldern, die Menschen selbst eingetragen haben -
-- Branche, Fachgebiet, Thema. Der Abgleich ist eine Mengenschnittmenge, also
-- nachlesbar und reproduzierbar. Ein Modell kann spaeter den SATZ formulieren,
-- warum etwas passt; finden muss es nichts.
--
-- JEDER VORSCHLAG TRAEGT SEINEN GRUND ALS DATEN, nicht als Prosa:
-- `matched_terms` haelt die Woerter, die zum Treffer gefuehrt haben. Damit kann
-- die Oberflaeche sagen "weil bei dir Podcast steht und dort auch" - und
-- niemand muss einer Maschine glauben.
--
-- DREI SACHEN, KEINE MENSCHEN. In dieser Stufe werden Anzeigen, Unternehmen
-- und Ungeloestes vorgeschlagen. Ein Mensch einem anderen vorzuschlagen ist
-- eine Aussage darueber, wer wem als passend gilt - das kommt als eigener
-- Schritt, mit einem Schalter im Profil ("Ich moechte anderen vorgeschlagen
-- werden"), und nicht als Nebenwirkung von diesem hier.
--
-- NUR IN DER PLATTFORM. Es gibt in dieser Migration bewusst keinen Mailweg und
-- keine Benachrichtigungsart: Solange es keinen Schalter gibt, mit dem jemand
-- ausdruecklich zustimmt, soll auch technisch nichts hinausgehen koennen. Ein
-- Vorschlag geht nicht von einem Menschen aus, der sich gemeldet hat - dafuer
-- ist "an, bis man es abbestellt" die falsche Voreinstellung.
--
-- WERTE GEHOEREN NICHT HIERHIN. Was hier keinen Platz hat, entscheiden
-- Hausregeln und Menschen, nicht ein Kriterium und schon gar nicht ein Modell.
-- Was diese Mechanik dazu beitraegt, ist eine Auslassung: Gesperrtes,
-- Zurueckgezogenes und Blockiertes wird niemandem vorgeschlagen.
-- ---------------------------------------------------------------------------

create table public.connect_suggestions (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,

  -- Genau eines der drei. Fremdschluessel statt einer freien Kennung, damit
  -- ein zurueckgezogener Eintrag den Vorschlag mitnimmt - ein Vorschlag auf
  -- etwas, das es nicht mehr gibt, ist eine Sackgasse.
  listing_id uuid references public.network_listings (id) on delete cascade,
  venture_id uuid references public.network_ventures (id) on delete cascade,
  problem_id uuid references public.network_problems (id) on delete cascade,

  -- Wem es gehoert. Fuer die Karte und fuer den Weg zu dem Menschen.
  subject_owner_user_id uuid not null references auth.users (id) on delete cascade,

  -- DER GRUND, als Daten. Die Woerter, die zum Treffer gefuehrt haben.
  matched_terms text[] not null,

  created_at timestamptz not null default now(),
  dismissed_at timestamptz,

  constraint connect_suggestions_exactly_one_subject check (
    (listing_id is not null)::int
    + (venture_id is not null)::int
    + (problem_id is not null)::int = 1
  ),
  constraint connect_suggestions_terms_check check (
    array_length(matched_terms, 1) between 1 and 8
  ),
  constraint connect_suggestions_not_own check (recipient_user_id <> subject_owner_user_id)
);

comment on table public.connect_suggestions is
  'Vorschlaege an eine Person. Entstehen deterministisch aus Feldern, die Menschen selbst eingetragen haben; matched_terms haelt den Grund als Daten.';

create unique index connect_suggestions_listing_unique
  on public.connect_suggestions (recipient_user_id, listing_id)
  where listing_id is not null;
create unique index connect_suggestions_venture_unique
  on public.connect_suggestions (recipient_user_id, venture_id)
  where venture_id is not null;
create unique index connect_suggestions_problem_unique
  on public.connect_suggestions (recipient_user_id, problem_id)
  where problem_id is not null;

create index connect_suggestions_open_idx
  on public.connect_suggestions (recipient_user_id, created_at desc)
  where dismissed_at is null;

alter table public.connect_suggestions enable row level security;

create policy connect_suggestions_select_own on public.connect_suggestions
  for select to authenticated
  using (recipient_user_id = auth.uid());

-- Wegklicken: ja. Anlegen: nur ueber die Funktion unten.
create policy connect_suggestions_update_own on public.connect_suggestions
  for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

create policy connect_suggestions_delete_own on public.connect_suggestions
  for delete to authenticated
  using (recipient_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Die eigenen Suchwoerter
-- ---------------------------------------------------------------------------
/**
 * Fachgebiete und Branchen einer Person, kleingeschrieben und entdoppelt.
 *
 * DAS KLEINSCHREIBEN IST NOETIG UND NICHT KOSMETIK: `topics` und `industries`
 * sind freie Kommalisten, beim Speichern nur getrimmt. "Podcast" und "podcast"
 * waeren sonst zwei verschiedene Dinge, und der Abgleich wuerde bei der
 * Haelfte der Eintraege still nichts finden.
 *
 * Zu kurze Woerter fallen weg: "ai" oder "hr" treffen in Freitextlisten fast
 * ueberall und machen aus einem Vorschlag Zufall.
 */
create or replace function public.connect_match_terms(p_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct term), '{}'::text[])
  from public.network_profiles profile
  cross join lateral unnest(
    coalesce(profile.expertise, '{}'::text[]) || coalesce(profile.industries, '{}'::text[])
  ) as raw(value)
  cross join lateral (select lower(btrim(raw.value)) as term) as normalized
  where profile.user_id = p_user_id
    and profile.status = 'active'
    and char_length(normalized.term) >= 3;
$$;

revoke all on function public.connect_match_terms(uuid) from public, anon;
grant execute on function public.connect_match_terms(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Vorschlaege erzeugen
-- ---------------------------------------------------------------------------
/**
 * Erzeugt bis zu `p_limit` neue Vorschlaege fuer die aufrufende Person.
 *
 * WIRD BEIM HINSEHEN AUFGERUFEN und nicht von einem Zeitplan: Es gibt in
 * diesem Projekt keinen Cron, und eine Handvoll Mengenschnitte braucht keinen.
 * Wer nicht hinsieht, bekommt auch keine - das ist kein Mangel, sondern die
 * Voreinstellung "nur in der Plattform".
 *
 * DIE WOCHENGRENZE IST TEIL DES PRODUKTS: drei, nicht dreissig. Ein
 * Vorschlagsstrom wird zu Werbung, und dann sieht niemand mehr hin.
 *
 * WAS AUSGESCHLOSSEN IST, und das ist der Beitrag dieser Funktion zu der
 * Frage, was hier keinen Platz hat: eigene Sachen, Entwuerfe, abgelaufene
 * Anzeigen, Menschen ohne aktives Profil, Blockierungen in beide Richtungen
 * und alles, was schon einmal vorgeschlagen wurde - auch das Weggeklickte.
 */
create or replace function public.generate_connect_suggestions(p_limit integer default 3)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_terms text[];
  v_recent integer;
  v_budget integer;
  v_created integer := 0;
  v_added integer;
begin
  if v_user is null or not public.is_network_member(v_user) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  v_terms := public.connect_match_terms(v_user);
  -- Ohne eigene Angaben gibt es nichts zu vergleichen. Lieber nichts
  -- vorschlagen als etwas Beliebiges.
  if array_length(v_terms, 1) is null then
    return 0;
  end if;

  select count(*) into v_recent
  from public.connect_suggestions suggestion
  where suggestion.recipient_user_id = v_user
    and suggestion.created_at > now() - interval '7 days';

  v_budget := least(coalesce(p_limit, 3), 3) - v_recent;
  if v_budget <= 0 then
    return 0;
  end if;

  -- 1. Angebote, deren Thema oder Branche sich mit den eigenen Angaben
  --    schneidet. Nur 'offering': Ein Gesuch ist kein Vorschlag, sondern eine
  --    Bitte - die gehoert nicht ungefragt in eine Vorschlagsliste.
  with candidate as (
    select
      listing.id,
      listing.owner_user_id,
      array_agg(distinct hit.term) as terms
    from public.network_listings listing
    cross join lateral unnest(
      coalesce(listing.topics, '{}'::text[]) || coalesce(listing.industries, '{}'::text[])
    ) as raw(value)
    cross join lateral (select lower(btrim(raw.value)) as term) as hit
    where listing.status = 'active'
      and listing.direction = 'offering'
      and listing.expires_at > now()
      and listing.owner_user_id <> v_user
      and hit.term = any(v_terms)
      and public.is_network_member(listing.owner_user_id)
      and not public.is_network_interaction_blocked(v_user, listing.owner_user_id)
      and exists (
        select 1 from public.network_profiles profile
        where profile.user_id = listing.owner_user_id and profile.status = 'active'
      )
      and not exists (
        select 1 from public.connect_suggestions existing
        where existing.recipient_user_id = v_user and existing.listing_id = listing.id
      )
    group by listing.id, listing.owner_user_id
    order by listing.published_at desc nulls last
    limit v_budget
  )
  insert into public.connect_suggestions (
    recipient_user_id, listing_id, subject_owner_user_id, matched_terms
  )
  select v_user, candidate.id, candidate.owner_user_id, candidate.terms[1:8]
  from candidate
  on conflict do nothing;

  get diagnostics v_added = row_count;
  v_created := v_created + v_added;
  v_budget := v_budget - v_added;

  -- 2. Ungeloestes zum eigenen Feld. Bewusst nach den Angeboten: Wer etwas
  --    anbietet, hat schon gesagt, dass er angesprochen werden will.
  if v_budget > 0 then
    with candidate as (
      select
        problem.id,
        problem.author_user_id,
        array_agg(distinct hit.term) as terms
      from public.network_problems problem
      cross join lateral unnest(
        coalesce(problem.topics, '{}'::text[]) || coalesce(problem.industries, '{}'::text[])
      ) as raw(value)
      cross join lateral (select lower(btrim(raw.value)) as term) as hit
      where problem.status = 'active'
        and problem.author_user_id <> v_user
        and hit.term = any(v_terms)
        and public.is_network_member(problem.author_user_id)
        and not public.is_network_interaction_blocked(v_user, problem.author_user_id)
        and not exists (
          select 1 from public.connect_suggestions existing
          where existing.recipient_user_id = v_user and existing.problem_id = problem.id
        )
      group by problem.id, problem.author_user_id
      order by problem.created_at desc
      limit v_budget
    )
    insert into public.connect_suggestions (
      recipient_user_id, problem_id, subject_owner_user_id, matched_terms
    )
    select v_user, candidate.id, candidate.author_user_id, candidate.terms[1:8]
    from candidate
    on conflict do nothing;

    get diagnostics v_added = row_count;
    v_created := v_created + v_added;
    v_budget := v_budget - v_added;
  end if;

  -- 3. Unternehmen. Sie tragen KEINE Themenfelder, nur einen Suchtext - also
  --    wird darin nach den eigenen Woertern gesucht. Das ist groeber als eine
  --    Schnittmenge und steht deshalb zuletzt; der Grund bleibt trotzdem das
  --    getroffene Wort.
  if v_budget > 0 then
    with candidate as (
      select
        venture.id,
        venture.owner_user_id,
        array_agg(distinct hit.term) as terms
      from public.network_ventures venture
      cross join lateral unnest(v_terms) as hit(term)
      where venture.status = 'active'
        and venture.owner_user_id <> v_user
        and position(hit.term in lower(venture.search_text)) > 0
        and public.is_network_member(venture.owner_user_id)
        and not public.is_network_interaction_blocked(v_user, venture.owner_user_id)
        and exists (
          select 1 from public.network_profiles profile
          where profile.user_id = venture.owner_user_id and profile.status = 'active'
        )
        and not exists (
          select 1 from public.connect_suggestions existing
          where existing.recipient_user_id = v_user and existing.venture_id = venture.id
        )
      group by venture.id, venture.owner_user_id
      order by venture.created_at desc
      limit v_budget
    )
    insert into public.connect_suggestions (
      recipient_user_id, venture_id, subject_owner_user_id, matched_terms
    )
    select v_user, candidate.id, candidate.owner_user_id, candidate.terms[1:8]
    from candidate
    on conflict do nothing;

    get diagnostics v_added = row_count;
    v_created := v_created + v_added;
  end if;

  return v_created;
end;
$$;

revoke all on function public.generate_connect_suggestions(integer) from public, anon;
grant execute on function public.generate_connect_suggestions(integer) to authenticated;

commit;
