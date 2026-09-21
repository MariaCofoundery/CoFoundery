begin;

-- ---------------------------------------------------------------------------
-- Vorschlaege melden sich - auf dem Geraet, und per Mail nur mit Zustimmung
-- ---------------------------------------------------------------------------
--
-- BESCHLOSSEN AM 21.09.2026: "Dann machen wir das mit Push-Nachrichten. Aber
-- E-Mail waere eigentlich auch gut, wenn man das aber ausstellt."
--
-- DAS PROBLEM, DAS DIESE MIGRATION LOEST: Vorschlaege entstanden bisher NUR
-- beim Hinsehen. Eine Mitteilung darueber ging damit an jemanden, der sie in
-- genau diesem Moment schon ansieht - also an niemanden. Damit ein Hinweis
-- etwas bedeutet, muessen Vorschlaege entstehen, OHNE dass jemand hinsieht.
-- Also braucht es einen Weg, auf dem das fuer eine fremde Person geschehen
-- darf: `generate_connect_suggestions_for`, und nur fuer `service_role`.
--
-- ZWEI KANAELE MIT ZWEI VERSCHIEDENEN VOREINSTELLUNGEN, und das ist der Kern:
--
--   MITTEILUNG AUFS GERAET: an, solange nicht abbestellt. Sie setzt eine
--   Erlaubnis im Browser voraus, die jeder Mensch selbst erteilt hat - eine
--   zweite Zustimmung davor waere eine Huerde ohne Gewinn.
--
--   MAIL: aus, bis jemand ausdruecklich zustimmt. Marias Vorgabe vom
--   21.09.2026 lautete "nur, wenn man dann ausdruecklich zustimmt", und ein
--   Vorschlag geht von NIEMANDEM aus, der sich gemeldet hat - "an, bis man es
--   abbestellt" ist bei ungefragter Post in ein fremdes Postfach die falsche
--   Voreinstellung, und zwar nicht nur rechtlich.
--
-- Deshalb zwei Speicher: Die vorhandene Tabelle haelt ABBESTELLUNGEN
-- (Abwesenheit heisst ja), die neue haelt ZUSTIMMUNGEN (Abwesenheit heisst
-- nein). Beide Richtungen in eine Tabelle zu legen waere eine Spalte, deren
-- Bedeutung je Zeile kippt.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Der allgemeine Schalter fuer die Art
-- ---------------------------------------------------------------------------
alter table public.notification_opt_outs
  drop constraint notification_opt_outs_kind_check;

alter table public.notification_opt_outs
  add constraint notification_opt_outs_kind_check
    check (kind in (
      'contact_request',
      'message',
      'problem_interest',
      'connect_saved_search',
      'discovery_saved_search',
      'read_my_mind',
      'founder_in_the_wild',
      'discovery_intro_request',
      'discovery_intro_accepted',
      -- NEU: Eine Abbestellung hier schaltet die Art GANZ aus - auch die
      -- Mitteilung aufs Geraet, nicht nur die Mail.
      'connect_suggestions'
    ));


-- ---------------------------------------------------------------------------
-- 2. Die Zustimmung, die es vorher nicht gab
-- ---------------------------------------------------------------------------
--
-- ABWESENHEIT HEISST "NEIN" - genau umgekehrt zu notification_opt_outs, und
-- das ist der Grund fuer eine eigene Tabelle. Eine spaeter dazukommende Art
-- ist hier automatisch AUS, und das ist bei ungefragter Post die richtige
-- Voreinstellung.
create table public.notification_opt_ins (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind),
  constraint notification_opt_ins_kind_check check (kind in (
    'connect_suggestions_email'
  ))
);

comment on table public.notification_opt_ins is
  'Ausdrueckliche Zustimmungen. Eine Zeile heisst "ja, auch auf diesem Weg"; keine Zeile heisst nein. Gegenstueck zu notification_opt_outs, wo die Abwesenheit ja bedeutet - hier bedeutet sie nein, weil es um ungefragte Post geht.';

alter table public.notification_opt_ins enable row level security;
revoke all on public.notification_opt_ins from anon, authenticated;
grant select, insert, delete on public.notification_opt_ins to authenticated;

create policy notification_opt_ins_select_self on public.notification_opt_ins
  for select to authenticated using (user_id = auth.uid());
create policy notification_opt_ins_insert_self on public.notification_opt_ins
  for insert to authenticated with check (user_id = auth.uid());
create policy notification_opt_ins_delete_self on public.notification_opt_ins
  for delete to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. Darf diese Art per MAIL hinaus?
-- ---------------------------------------------------------------------------
/**
 * Die Antwort auf die Frage, die `wants_email_notification` nicht beantwortet.
 *
 * Trotz ihres Namens beantwortet jene Funktion "will diese Person diese Art
 * UEBERHAUPT" - sie gilt fuer beide Wege (der Name stammt aus der Zeit, als es
 * nur den einen gab). Diese hier beantwortet die zweite Frage: Darf es
 * zusaetzlich per Mail hinaus?
 *
 * Fuer alle bisherigen Arten ist die Antwort dieselbe wie die erste: Sie
 * entstehen, weil ein MENSCH sich gemeldet hat, und dafuer war die Mail von
 * Anfang an der Weg. Fuer Vorschlaege nicht: Da hat sich niemand gemeldet.
 */
create or replace function public.wants_email_channel(p_user_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.wants_email_notification(p_user_id, p_kind)
    and case
      when p_kind = 'connect_suggestions' then exists (
        select 1 from public.notification_opt_ins opt_in
        where opt_in.user_id = p_user_id
          and opt_in.kind = 'connect_suggestions_email'
      )
      else true
    end;
$$;

comment on function public.wants_email_channel(uuid, text) is
  'Ob diese Art zusaetzlich per Mail hinausgehen darf. Fuer connect_suggestions braucht es dafuer eine ausdrueckliche Zustimmung in notification_opt_ins; fuer alle uebrigen Arten genuegt das Fehlen einer Abbestellung, weil sie aus der Meldung eines Menschen entstehen.';

revoke all on function public.wants_email_channel(uuid, text) from public, anon;
grant execute on function public.wants_email_channel(uuid, text) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. Der Stempel, der eine zweite Meldung verhindert
-- ---------------------------------------------------------------------------
--
-- WARUM NICHT DIE VORHANDENE ANSPRUCHSTABELLE: `network_notification_claims`
-- ist auf (Art, VORGANG, Empfaenger) geschluesselt - ein Vorgang, eine
-- Meldung. Eine Meldung ueber Vorschlaege umfasst aber einen SCHWUNG, und ein
-- Schwung hat keine Kennung. Den Zeilen selbst einen Stempel zu geben ist
-- nicht nur einfacher, sondern strenger: Das Stempeln und das Zaehlen sind
-- EINE Anweisung (`update ... returning`), und damit kann ein zweiter Lauf
-- denselben Schwung nicht noch einmal nehmen.
alter table public.connect_suggestions
  add column notified_at timestamptz;

comment on column public.connect_suggestions.notified_at is
  'Wann dieser Vorschlag Teil einer Meldung war. Gesetzt, BEVOR gesendet wird - lieber eine Meldung zu wenig als zwei.';

create index connect_suggestions_unnotified
  on public.connect_suggestions (recipient_user_id)
  where notified_at is null and dismissed_at is null;


-- ---------------------------------------------------------------------------
-- 5. Wann wurde fuer diese Person zuletzt gesucht?
-- ---------------------------------------------------------------------------
--
-- Der Zeitplan hat eine Zeitgrenze (Vercel beendet eine Funktion nach
-- Sekunden). Er kann also nicht "alle" abarbeiten, sondern muss dort
-- weitermachen, wo er aufgehoert hat - sonst bekaeme immer dieselbe Handvoll
-- Menschen Vorschlaege und der Rest nie.
alter table public.network_profiles
  add column suggestions_checked_at timestamptz;

comment on column public.network_profiles.suggestions_checked_at is
  'Wann der Zeitplan fuer diese Person zuletzt nach Vorschlaegen gesucht hat. Null heisst "noch nie" und kommt zuerst.';


-- ---------------------------------------------------------------------------
-- 6. Begriffe auch fuer den Zeitplan lesbar machen
-- ---------------------------------------------------------------------------
--
-- Die Fassung von 20261019120000 verlangt `p_user_id = auth.uid()`. Fuer den
-- Zeitplan ist `auth.uid()` null - er handelt fuer niemanden, sondern fuer
-- alle. Die Grenze bleibt trotzdem scharf, weil sie jetzt von den Rechten
-- getragen wird und nicht von einem Vergleich: `anon` darf die Funktion
-- ueberhaupt nicht ausfuehren, `authenticated` nur fuer sich selbst, und der
-- dritte Fall ist der Zeitplan.
create or replace function public.connect_match_terms(p_user_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'own_terms_only' using errcode = '42501';
  end if;

  -- Ein Angemeldeter fragt nur nach sich selbst. Ist keine Anmeldung im Spiel,
  -- ist es der Zeitplan (`service_role`) - und der darf es, weil `anon` und
  -- `public` kein Ausfuehrungsrecht auf diese Funktion haben.
  if auth.uid() is not null and p_user_id <> auth.uid() then
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

      -- 2. Was ich suche.
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
    where char_length(source.term) >= 3
  );
end;
$$;

revoke all on function public.connect_match_terms(uuid) from public, anon;
grant execute on function public.connect_match_terms(uuid) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 7. Erzeugen fuer eine bestimmte Person
-- ---------------------------------------------------------------------------
/**
 * Dieselbe Auswahl wie bisher, nur nicht mehr an `auth.uid()` gebunden.
 *
 * WER DARF DAS: Niemand ausser dem Zeitplan. `authenticated` hat kein
 * Ausfuehrungsrecht - wer angemeldet ist, ruft weiter die Fassung ohne
 * Personenangabe auf, und die setzt die eigene Kennung ein. Damit kann ein
 * Angemeldeter keine Vorschlagsliste fuer eine fremde Person fuellen.
 *
 * Die vier Schritte sind unveraendert aus 20261018120000 und stehen hier
 * vollstaendig, weil `create or replace function` keinen Teilersatz kennt.
 * Geaendert ist ausschliesslich, woher die Kennung kommt.
 */
create or replace function public.generate_connect_suggestions_for(
  p_user_id uuid,
  p_limit integer default 3
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms text[];
  v_recent integer;
  v_budget integer;
  v_created integer := 0;
  v_added integer;
begin
  if p_user_id is null or not public.is_network_member(p_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  v_terms := public.connect_match_terms(p_user_id);
  if array_length(v_terms, 1) is null then
    return 0;
  end if;

  select count(*) into v_recent
  from public.connect_suggestions suggestion
  where suggestion.recipient_user_id = p_user_id
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
      and listing.owner_user_id <> p_user_id
      and hit.term = any(v_terms)
      and public.is_network_member(listing.owner_user_id)
      and not public.is_network_interaction_blocked(p_user_id, listing.owner_user_id)
      and exists (
        select 1 from public.network_profiles profile
        where profile.user_id = listing.owner_user_id and profile.status = 'active'
      )
      and not exists (
        select 1 from public.connect_suggestions existing
        where existing.recipient_user_id = p_user_id and existing.listing_id = listing.id
      )
    group by listing.id, listing.owner_user_id
    order by listing.published_at desc nulls last
    limit v_budget
  )
  insert into public.connect_suggestions (
    recipient_user_id, listing_id, subject_owner_user_id, matched_terms
  )
  select p_user_id, candidate.id, candidate.owner_user_id, candidate.terms[1:8]
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
        and problem.author_user_id <> p_user_id
        and hit.term = any(v_terms)
        and public.is_network_member(problem.author_user_id)
        and not public.is_network_interaction_blocked(p_user_id, problem.author_user_id)
        and not exists (
          select 1 from public.connect_suggestions existing
          where existing.recipient_user_id = p_user_id and existing.problem_id = problem.id
        )
      group by problem.id, problem.author_user_id
      order by problem.created_at desc
      limit v_budget
    )
    insert into public.connect_suggestions (
      recipient_user_id, problem_id, subject_owner_user_id, matched_terms
    )
    select p_user_id, candidate.id, candidate.author_user_id, candidate.terms[1:8]
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
        and venture.owner_user_id <> p_user_id
        and position(hit.term in lower(venture.search_text)) > 0
        and public.is_network_member(venture.owner_user_id)
        and not public.is_network_interaction_blocked(p_user_id, venture.owner_user_id)
        and exists (
          select 1 from public.network_profiles profile
          where profile.user_id = venture.owner_user_id and profile.status = 'active'
        )
        and not exists (
          select 1 from public.connect_suggestions existing
          where existing.recipient_user_id = p_user_id and existing.venture_id = venture.id
        )
      group by venture.id, venture.owner_user_id
      order by venture.created_at desc
      limit v_budget
    )
    insert into public.connect_suggestions (
      recipient_user_id, venture_id, subject_owner_user_id, matched_terms
    )
    select p_user_id, candidate.id, candidate.owner_user_id, candidate.terms[1:8]
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
        and profile.suggestable
        and profile.user_id <> p_user_id
        and hit.term = any(v_terms)
        and public.is_network_member(profile.user_id)
        and not public.is_network_interaction_blocked(p_user_id, profile.user_id)
        and not exists (
          select 1 from public.connect_suggestions existing
          where existing.recipient_user_id = p_user_id and existing.person_user_id = profile.user_id
        )
      group by profile.user_id
      order by profile.published_at desc nulls last
      limit v_budget
    )
    insert into public.connect_suggestions (
      recipient_user_id, person_user_id, subject_owner_user_id, matched_terms
    )
    select p_user_id, candidate.user_id, candidate.user_id, candidate.terms[1:8]
    from candidate
    on conflict do nothing;

    get diagnostics v_added = row_count;
    v_created := v_created + v_added;
  end if;

  return v_created;
end;
$$;

revoke all on function public.generate_connect_suggestions_for(uuid, integer) from public, anon, authenticated;
grant execute on function public.generate_connect_suggestions_for(uuid, integer) to service_role;

-- Die Fassung fuer Angemeldete ist jetzt eine Weiterleitung mit der eigenen
-- Kennung. Dieselbe Auswahl an einer Stelle - vorher haette jede Aenderung an
-- den vier Schritten zweimal gemacht werden muessen.
create or replace function public.generate_connect_suggestions(p_limit integer default 3)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  return public.generate_connect_suggestions_for(auth.uid(), p_limit);
end;
$$;

revoke all on function public.generate_connect_suggestions(integer) from public, anon;
grant execute on function public.generate_connect_suggestions(integer) to authenticated;


-- ---------------------------------------------------------------------------
-- 8. Was der Zeitplan tut
-- ---------------------------------------------------------------------------
/**
 * Sucht fuer die am laengsten nicht bedachten Menschen nach Vorschlaegen und
 * gibt zurueck, wer eine Meldung bekommen soll.
 *
 * DIE REIHENFOLGE IST WICHTIG und steht hier, nicht im Aufrufer:
 *
 *   1. Erzeugen. Die Wochengrenze von drei gilt unveraendert.
 *   2. Vermerken, dass gesucht wurde - AUCH wenn nichts gefunden wurde.
 *      Sonst bliebe dieselbe Person morgen wieder die aelteste.
 *   3. Nur fuer Menschen, die diese Art wollen: die neuen Zeilen stempeln
 *      und dabei zaehlen. Ein Lauf kann denselben Schwung damit nicht
 *      zweimal nehmen.
 *   4. Erst dann die Zeile zurueckgeben, aus der der Aufrufer sendet.
 *
 * WER ABBESTELLT HAT, BEKOMMT KEINEN STEMPEL. Sonst waeren die Vorschlaege
 * aus der Zeit vor dem Einschalten fuer immer stumm - derselbe Grund, aus dem
 * `claim_network_notification` bei einer Abbestellung keinen Anspruch vermerkt.
 *
 * GESTEMPELT WIRD VOR DEM SENDEN. Ein fehlgeschlagener Versand verliert damit
 * eine Meldung. Das ist die gewollte Richtung: lieber eine zu wenig als zwei.
 */
create or replace function public.prepare_suggestion_notifications(p_limit integer default 25)
returns table (
  recipient_user_id uuid,
  new_count integer,
  wants_email boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_count integer;
begin
  for v_candidate in
    select profile.user_id
    from public.network_profiles profile
    join public.network_memberships membership
      on membership.user_id = profile.user_id
     and membership.status = 'active'
    where profile.status = 'active'
    order by profile.suggestions_checked_at asc nulls first
    limit greatest(1, least(coalesce(p_limit, 25), 200))
  loop
    perform public.generate_connect_suggestions_for(v_candidate.user_id, 3);

    update public.network_profiles
      set suggestions_checked_at = now()
      where public.network_profiles.user_id = v_candidate.user_id;

    -- Wer diese Art nicht will, wird nicht gestempelt: Ein spaeteres
    -- Einschalten soll nicht an alten Zeilen haengen bleiben.
    if not public.wants_email_notification(v_candidate.user_id, 'connect_suggestions') then
      continue;
    end if;

    with claimed as (
      update public.connect_suggestions suggestion
        set notified_at = now()
        where suggestion.recipient_user_id = v_candidate.user_id
          and suggestion.notified_at is null
          and suggestion.dismissed_at is null
        returning 1 as one
    )
    select count(*)::int into v_count from claimed;

    if v_count > 0 then
      recipient_user_id := v_candidate.user_id;
      new_count := v_count;
      wants_email := public.wants_email_channel(v_candidate.user_id, 'connect_suggestions');
      return next;
    end if;
  end loop;
end;
$$;

comment on function public.prepare_suggestion_notifications(integer) is
  'Erzeugt Vorschlaege fuer die am laengsten nicht bedachten Menschen und gibt zurueck, wer eine Meldung bekommen soll. Nur fuer service_role: Sie handelt fuer fremde Personen.';

revoke all on function public.prepare_suggestion_notifications(integer) from public, anon, authenticated;
grant execute on function public.prepare_suggestion_notifications(integer) to service_role;

commit;
