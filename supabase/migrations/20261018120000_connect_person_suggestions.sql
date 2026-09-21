begin;

-- ---------------------------------------------------------------------------
-- Menschen vorschlagen - aber nur, wer das moechte
-- ---------------------------------------------------------------------------
--
-- BESCHLOSSEN AM 21.09.2026: "Ein Personenvorschlag sollte nur vorgeschlagen
-- werden, wenn man im Profil bestaetigt hat, ich moechte anderen vorgeschlagen
-- werden. Da finde ich auch, das kann standardmaessig an sein. Muesste halt nur
-- gut eingeleitet werden."
--
-- WARUM DAS EINE EIGENE STUFE IST: Eine Anzeige vorzuschlagen heisst "das
-- koennte dich interessieren". Einen MENSCHEN vorzuschlagen heisst "ihr
-- koenntet zueinander passen" - eine Aussage ueber Menschen, nicht ueber
-- Inhalte. Sie braucht deshalb eine eigene Zustimmung, auch wenn der Vorschlag
-- nur bei der empfangenden Person erscheint.
--
-- WARUM DER SCHALTER TROTZDEM AN IST:
--   Wer sein Connect-Profil veroeffentlicht hat, steht in der Personenliste,
--   hat eine Profilseite und kann angeschrieben werden. Vorgeschlagen zu
--   werden fuegt dem keine neue Sichtbarkeit hinzu - es aendert nur, WER die
--   ohnehin sichtbare Seite zu sehen bekommt. Ein Schalter, der standardmaessig
--   aus ist, waere hier keine Vorsicht, sondern eine leere Liste.
--
--   Wer nicht vorgeschlagen werden will, schaltet ihn aus und bleibt
--   auffindbar - das ist der Unterschied zum Entwurf, mit dem man ganz
--   verschwindet.
--
-- DER SCHALTER GILT FUER DIE ANDERE RICHTUNG NICHT: Er entscheidet, ob ICH
-- anderen vorgeschlagen werde. Ob ich Vorschlaege BEKOMME, entscheidet, ob ich
-- die Seite oeffne. Beides in einen Schalter zu legen waere eine Strafe fuer
-- Zurueckhaltung.
-- ---------------------------------------------------------------------------

alter table public.network_profiles
  add column if not exists suggestable boolean not null default true;

comment on column public.network_profiles.suggestable is
  'Ob diese Person anderen vorgeschlagen werden darf. Standardmaessig true, weil ein veroeffentlichtes Profil ohnehin auffindbar ist; false laesst die Person auffindbar, aber nicht vorgeschlagen.';

-- ---------------------------------------------------------------------------
-- Der Vorschlag auf einen Menschen
-- ---------------------------------------------------------------------------
alter table public.connect_suggestions
  add column person_user_id uuid references auth.users (id) on delete cascade;

alter table public.connect_suggestions
  drop constraint connect_suggestions_exactly_one_subject;

alter table public.connect_suggestions
  add constraint connect_suggestions_exactly_one_subject check (
    (listing_id is not null)::int
    + (venture_id is not null)::int
    + (problem_id is not null)::int
    + (person_user_id is not null)::int = 1
  );

-- Bei einem Personenvorschlag IST der Gegenstand die Person - beide Spalten
-- muessen dann dasselbe sagen, sonst zeigt die Karte auf jemand anderen als
-- der Vorschlag meint.
alter table public.connect_suggestions
  add constraint connect_suggestions_person_matches_owner check (
    person_user_id is null or person_user_id = subject_owner_user_id
  );

create unique index connect_suggestions_person_unique
  on public.connect_suggestions (recipient_user_id, person_user_id)
  where person_user_id is not null;

-- ---------------------------------------------------------------------------
-- Die Erzeugung um Menschen erweitern
-- ---------------------------------------------------------------------------
/**
 * Wie zuvor, mit einem vierten Schritt.
 *
 * MENSCHEN KOMMEN ZULETZT, und das ist eine Reihenfolge mit Grund: Wer ein
 * Angebot eingestellt oder ein Problem geschildert hat, hat damit gesagt, dass
 * er angesprochen werden moechte. Ein Profil allein sagt das nicht. Bleibt vom
 * Wochenbudget nichts uebrig, bleibt der Mensch ungenannt - das ist besser als
 * umgekehrt.
 *
 * Die drei ersten Schritte sind unveraendert. Sie stehen hier trotzdem
 * vollstaendig, weil `create or replace function` keinen Teilersatz kennt.
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

  -- 1. Angebote.
  with candidate as (
    select listing.id, listing.owner_user_id, array_agg(distinct hit.term) as terms
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

  -- 2. Ungeloestes.
  if v_budget > 0 then
    with candidate as (
      select problem.id, problem.author_user_id, array_agg(distinct hit.term) as terms
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

  -- 3. Unternehmen.
  if v_budget > 0 then
    with candidate as (
      select venture.id, venture.owner_user_id, array_agg(distinct hit.term) as terms
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
    v_budget := v_budget - v_added;
  end if;

  -- 4. Menschen - und NUR die, die es erlauben.
  if v_budget > 0 then
    with candidate as (
      select profile.user_id, array_agg(distinct hit.term) as terms
      from public.network_profiles profile
      cross join lateral unnest(
        coalesce(profile.expertise, '{}'::text[]) || coalesce(profile.industries, '{}'::text[])
      ) as raw(value)
      cross join lateral (select lower(btrim(raw.value)) as term) as hit
      where profile.status = 'active'
        -- DER SCHALTER. Ohne ihn gibt es diesen Vorschlag nicht.
        and profile.suggestable
        and profile.user_id <> v_user
        and hit.term = any(v_terms)
        and public.is_network_member(profile.user_id)
        and not public.is_network_interaction_blocked(v_user, profile.user_id)
        and not exists (
          select 1 from public.connect_suggestions existing
          where existing.recipient_user_id = v_user and existing.person_user_id = profile.user_id
        )
      group by profile.user_id
      order by profile.published_at desc nulls last
      limit v_budget
    )
    insert into public.connect_suggestions (
      recipient_user_id, person_user_id, subject_owner_user_id, matched_terms
    )
    select v_user, candidate.user_id, candidate.user_id, candidate.terms[1:8]
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
