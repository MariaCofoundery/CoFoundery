-- Empfehlungsseite (Entwurf 10.11.2026): Mitglieder empfehlen Software, Personen, Organisationen und Projekte - mit einem kurzen Wort.
--
-- KURATIERT, NICHT AUTOMATISCH. Jede Empfehlung wird von einem Menschen des Plattformteams gelesen, bevor sie erscheint
-- (`review` -> `published`). Wer empfohlen wird, bekommt bei Personen vorher die Frage (`pending_consent`); ohne Zustimmung
-- sieht niemand die Empfehlung. Das Plattformteam prueft nach den Kriterien Respekt, Fairness/keine Diskriminierung,
-- Ehrlichkeit und verantwortungsvolles, nachhaltiges Handeln. Es gibt kein Siegel "ethisch geprueft": die Plattform kann das nicht
-- bescheinigen, nur ausschliessen, was erkennbar gegen die Regeln verstoesst.
--
-- Sichtbar fuer angemeldete Connect-Mitglieder, nicht oeffentlich. Keine Sterne, keine Rangfolge, kein "beliebteste".
-- Eine Empfehlung laeuft nach einem Jahr aus und laesst sich erneuern. Meldungen: zwei verschiedene Melder nehmen eine
-- Empfehlung vorlaeufig vom Netz, bis das Plattformteam entschieden hat.

begin;

create table public.network_recommendations (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  sub text,
  url text,
  subject_user_id uuid references auth.users (id) on delete cascade,
  venture_id uuid references public.network_ventures (id) on delete cascade,
  topics text[] not null default '{}',
  region text,
  comment text not null,
  guidelines_accepted_at timestamptz not null default pg_catalog.now(),
  status text not null,
  created_at timestamptz not null default pg_catalog.now(),
  consent_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decision_note text,
  constraint network_recommendations_kind check (kind in ('software', 'person', 'org', 'project')),
  constraint network_recommendations_status check (status in ('pending_consent', 'review', 'published', 'declined', 'withdrawn', 'removed')),
  constraint network_recommendations_title check (char_length(btrim(title)) between 1 and 120),
  constraint network_recommendations_sub check (sub is null or char_length(sub) <= 160),
  constraint network_recommendations_url check (url is null or (url ~ '^https://[^ ]+$' and char_length(url) <= 400)),
  constraint network_recommendations_region check (region is null or char_length(region) <= 60),
  constraint network_recommendations_comment check (char_length(btrim(comment)) between 1 and 280),
  constraint network_recommendations_topics check (cardinality(topics) <= 3 and topics <@ array['ki', 'recht', 'finanzen', 'marketing', 'vertrieb', 'produkt', 'team', 'gesundheit', 'nachhaltigkeit', 'design']::text[]),
  constraint network_recommendations_subject check (
    (kind = 'person' and subject_user_id is not null and subject_user_id <> author_user_id)
    or (kind = 'project' and venture_id is not null)
    or (kind in ('software', 'org') and subject_user_id is null and venture_id is null and url is not null)
  )
);
create index network_recommendations_published_idx on public.network_recommendations (status, published_at desc);
create index network_recommendations_author_idx on public.network_recommendations (author_user_id);
create index network_recommendations_subject_idx on public.network_recommendations (subject_user_id) where subject_user_id is not null;

create table public.network_recommendation_reports (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.network_recommendations (id) on delete cascade,
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  comment text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint network_recommendation_reports_category check (category in ('discrimination', 'misleading', 'harmful', 'spam', 'other')),
  constraint network_recommendation_reports_comment check (comment is null or char_length(comment) <= 500),
  constraint network_recommendation_reports_one unique (recommendation_id, reporter_user_id)
);

alter table public.network_recommendations enable row level security;
alter table public.network_recommendation_reports enable row level security;
revoke all on public.network_recommendations, public.network_recommendation_reports from anon, authenticated;
-- Lesen: die eigenen Empfehlungen und die ueber einen selbst. Was andere sehen, kommt allein aus list_recommendations.
grant select on public.network_recommendations to authenticated;
create policy network_recommendations_own on public.network_recommendations for select to authenticated
  using (author_user_id = auth.uid() or subject_user_id = auth.uid());

create or replace function public.recommendation_name(p_user_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim(pr.display_name), ''), '')
  from public.network_profiles pr where pr.user_id = p_user_id and pr.status = 'active';
$$;
revoke all on function public.recommendation_name(uuid) from public, anon, authenticated;

-- Empfehlung abgeben. Der Name steht bei der Empfehlung, die Regeln muessen bestaetigt sein.
create or replace function public.create_recommendation(
  p_kind text, p_title text, p_sub text, p_url text, p_subject_user_id uuid, p_venture_id uuid,
  p_topics text[], p_region text, p_comment text, p_guidelines boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_status text;
  v_title text := btrim(coalesce(p_title, ''));
begin
  if auth.uid() is null or not public.is_network_member() then
    raise exception 'recommendation_not_yours' using errcode = '42501';
  end if;
  if not coalesce(p_guidelines, false) then
    raise exception 'recommendation_guidelines' using errcode = '22023';
  end if;
  if not exists (select 1 from public.network_profiles pr where pr.user_id = auth.uid() and pr.status = 'active') then
    raise exception 'recommendation_profile_needed' using errcode = '22023';
  end if;
  if p_kind = 'person' then
    -- Nur Personen mit sichtbarem Connect-Profil; Titel und Zeile kommen aus ihrem Profil, nicht von der empfehlenden Person.
    select coalesce(nullif(btrim(pr.display_name), ''), ''), pr.headline into v_title, p_sub
    from public.network_profiles pr where pr.user_id = p_subject_user_id and pr.status = 'active';
    if v_title is null then
      raise exception 'recommendation_invalid' using errcode = '22023';
    end if;
    v_status := 'pending_consent';
  elsif p_kind = 'project' then
    select v.name, left(v.what_it_does, 160) into v_title, p_sub
    from public.network_ventures v where v.id = p_venture_id and v.status = 'active';
    if v_title is null then
      raise exception 'recommendation_invalid' using errcode = '22023';
    end if;
    v_status := 'review';
  else
    v_status := 'review';
  end if;
  insert into public.network_recommendations (author_user_id, kind, title, sub, url, subject_user_id, venture_id, topics, region, comment, status)
  values (auth.uid(), p_kind, v_title, nullif(left(btrim(coalesce(p_sub, '')), 160), ''), nullif(btrim(coalesce(p_url, '')), ''),
          case when p_kind = 'person' then p_subject_user_id end, case when p_kind = 'project' then p_venture_id end,
          coalesce(p_topics, '{}'), nullif(left(btrim(coalesce(p_region, '')), 60), ''), btrim(coalesce(p_comment, '')), v_status)
  returning id into v_id;
  return v_id;
exception
  when check_violation then
    raise exception 'recommendation_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.create_recommendation(text, text, text, text, uuid, uuid, text[], text, text, boolean) from public, anon;
grant execute on function public.create_recommendation(text, text, text, text, uuid, uuid, text[], text, text, boolean) to authenticated;

-- Die empfohlene Person entscheidet: Zustimmen schickt die Empfehlung zur Pruefung, Ablehnen beendet sie (ohne Grund fuer den Autor).
create or replace function public.decide_recommendation_consent(p_id uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.network_recommendations
  set status = case when p_accept then 'review' else 'declined' end, consent_at = pg_catalog.now()
  where id = p_id and subject_user_id = auth.uid() and kind = 'person' and status = 'pending_consent';
  return found;
end;
$$;
revoke all on function public.decide_recommendation_consent(uuid, boolean) from public, anon;
grant execute on function public.decide_recommendation_consent(uuid, boolean) to authenticated;

-- Zurueckziehen: wer empfohlen hat, und wer als Person empfohlen wird.
create or replace function public.withdraw_recommendation(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.network_recommendations set status = 'withdrawn', published_at = published_at
  where id = p_id and status in ('pending_consent', 'review', 'published') and (author_user_id = auth.uid() or subject_user_id = auth.uid());
  return found;
end;
$$;
revoke all on function public.withdraw_recommendation(uuid) from public, anon;
grant execute on function public.withdraw_recommendation(uuid) to authenticated;

create or replace function public.renew_recommendation(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.network_recommendations set expires_at = pg_catalog.now() + interval '1 year'
  where id = p_id and author_user_id = auth.uid() and status = 'published';
  return found;
end;
$$;
revoke all on function public.renew_recommendation(uuid) from public, anon;
grant execute on function public.renew_recommendation(uuid) to authenticated;

-- Melden: zwei verschiedene Melder nehmen die Empfehlung vorlaeufig vom Netz.
create or replace function public.report_recommendation(p_id uuid, p_category text, p_comment text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_open integer;
begin
  if auth.uid() is null or not public.is_network_member() then
    raise exception 'recommendation_not_yours' using errcode = '42501';
  end if;
  if not exists (select 1 from public.network_recommendations r where r.id = p_id and r.status = 'published' and r.author_user_id <> auth.uid()) then
    return false;
  end if;
  insert into public.network_recommendation_reports (recommendation_id, reporter_user_id, category, comment)
  values (p_id, auth.uid(), p_category, nullif(btrim(coalesce(p_comment, '')), ''))
  on conflict (recommendation_id, reporter_user_id) do nothing;
  select count(*) into v_open from public.network_recommendation_reports where recommendation_id = p_id;
  if v_open >= 2 then
    update public.network_recommendations set status = 'review', decision_note = 'reported' where id = p_id and status = 'published';
  end if;
  return true;
exception
  when check_violation then
    raise exception 'recommendation_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.report_recommendation(uuid, text, text) from public, anon;
grant execute on function public.report_recommendation(uuid, text, text) to authenticated;

-- Die Seite: nur veroeffentlichte, nicht abgelaufene Empfehlungen, fuer angemeldete Connect-Mitglieder.
create or replace function public.list_recommendations(
  p_kinds text[], p_topics text[], p_region text, p_q text, p_since_days integer, p_sort text, p_limit integer, p_offset integer
)
returns table (
  id uuid, kind text, title text, sub text, url text, subject_user_id uuid, venture_id uuid, topics text[], region text, comment text,
  author_user_id uuid, author_name text, published_at timestamptz, mine boolean
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.kind, r.title, r.sub, r.url, r.subject_user_id, r.venture_id, r.topics, r.region, r.comment,
         r.author_user_id, public.recommendation_name(r.author_user_id), r.published_at, r.author_user_id = auth.uid()
  from public.network_recommendations r
  where auth.uid() is not null and public.is_network_member()
    and r.status = 'published' and (r.expires_at is null or r.expires_at > pg_catalog.now())
    and (p_kinds is null or cardinality(p_kinds) = 0 or r.kind = any (p_kinds))
    and (p_topics is null or cardinality(p_topics) = 0 or r.topics && p_topics)
    and (nullif(btrim(coalesce(p_region, '')), '') is null or lower(r.region) = lower(btrim(p_region)))
    and (nullif(btrim(coalesce(p_q, '')), '') is null or r.title ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%' or coalesce(r.sub, '') ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%' or r.comment ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%')
    and (p_since_days is null or r.published_at >= pg_catalog.now() - make_interval(days => p_since_days))
  order by case when p_sort = 'alpha' then lower(r.title) end asc nulls last, r.published_at desc
  limit least(coalesce(p_limit, 24), 60) offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.list_recommendations(text[], text[], text, text, integer, text, integer, integer) from public, anon;
grant execute on function public.list_recommendations(text[], text[], text, text, integer, text, integer, integer) to authenticated;

create or replace function public.recommendation_kind_counts()
returns table (kind text, total bigint) language sql stable security definer set search_path = '' as $$
  select r.kind, count(*) from public.network_recommendations r
  where auth.uid() is not null and public.is_network_member() and r.status = 'published' and (r.expires_at is null or r.expires_at > pg_catalog.now())
  group by r.kind;
$$;
revoke all on function public.recommendation_kind_counts() from public, anon;
grant execute on function public.recommendation_kind_counts() to authenticated;

create or replace function public.list_recommendation_regions()
returns table (region text) language sql stable security definer set search_path = '' as $$
  select distinct r.region from public.network_recommendations r
  where auth.uid() is not null and public.is_network_member() and r.status = 'published' and r.region is not null
  order by r.region limit 40;
$$;
revoke all on function public.list_recommendation_regions() from public, anon;
grant execute on function public.list_recommendation_regions() to authenticated;

-- Plattformteam: Pruefliste und Entscheidung.
create or replace function public.admin_list_recommendations(p_status text)
returns table (
  id uuid, kind text, title text, sub text, url text, comment text, topics text[], region text, status text, created_at timestamptz,
  author_user_id uuid, author_name text, report_count bigint, decision_note text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.kind, r.title, r.sub, r.url, r.comment, r.topics, r.region, r.status, r.created_at,
         r.author_user_id, public.recommendation_name(r.author_user_id),
         (select count(*) from public.network_recommendation_reports x where x.recommendation_id = r.id), r.decision_note
  from public.network_recommendations r
  where public.is_platform_admin() and r.status = coalesce(nullif(p_status, ''), 'review')
  order by (select count(*) from public.network_recommendation_reports x where x.recommendation_id = r.id) desc, r.created_at
  limit 100;
$$;
revoke all on function public.admin_list_recommendations(text) from public, anon;
grant execute on function public.admin_list_recommendations(text) to authenticated;

create or replace function public.admin_decide_recommendation(p_id uuid, p_approve boolean, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'recommendation_not_yours' using errcode = '42501';
  end if;
  update public.network_recommendations
  set status = case when p_approve then 'published' else 'removed' end,
      published_at = case when p_approve then coalesce(published_at, pg_catalog.now()) else published_at end,
      expires_at = case when p_approve then coalesce(expires_at, pg_catalog.now() + interval '1 year') else expires_at end,
      decided_by_user_id = auth.uid(), decision_note = nullif(left(btrim(coalesce(p_note, '')), 300), '')
  where id = p_id and status = 'review';
  return found;
end;
$$;
revoke all on function public.admin_decide_recommendation(uuid, boolean, text) from public, anon;
grant execute on function public.admin_decide_recommendation(uuid, boolean, text) to authenticated;

commit;
