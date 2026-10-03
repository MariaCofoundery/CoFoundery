begin;

-- Closed beta is deliberately not an environment toggle. Future public release
-- requires a new consent contract and a reviewed migration, not flipping old flags.
create function public.connect_public_rollout_enabled() returns boolean language sql stable security definer set search_path='' as $$ select false $$;
revoke all on function public.connect_public_rollout_enabled() from public,anon,authenticated;
create function public.connect_beta_visibility() returns trigger language plpgsql set search_path='' as $$
begin new.visibility:='members_only'; return new; end $$;
revoke all on function public.connect_beta_visibility() from public,anon,authenticated;

update public.network_profiles set visibility='members_only' where visibility='public';
create trigger a0_connect_beta_visibility before insert or update on public.network_profiles for each row execute function public.connect_beta_visibility();

update public.network_listings set visibility='members_only' where visibility='public';
create trigger a0_connect_beta_visibility before insert or update on public.network_listings for each row execute function public.connect_beta_visibility();

update public.network_problems set visibility='members_only' where visibility='public';
create trigger a0_connect_beta_visibility before insert or update on public.network_problems for each row execute function public.connect_beta_visibility();

CREATE OR REPLACE FUNCTION public.get_public_network_profile(p_public_slug text) RETURNS TABLE(public_slug text, display_name text, headline text, bio text, network_roles text[], expertise text[], industries text[], location_region text, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select profile.public_slug,
    profile.display_name,
    profile.headline,
    profile.bio,
    profile.network_roles,
    profile.expertise,
    profile.industries,
    profile.location_region,
    profile.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where profile.public_slug = p_public_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active') beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.get_public_network_listing(p_public_slug text) RETURNS TABLE(public_slug text, direction text, category text, title text, summary text, topics text[], industries text[], locations text[], geographic_scope text, remote_mode text, starts_on date, ends_on date, venture_stage text, owner_display_name text, owner_headline text, owner_profile_slug text, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select listing.public_slug,
    listing.direction,
    listing.category,
    listing.title,
    listing.summary,
    listing.topics,
    listing.industries,
    listing.locations,
    listing.geographic_scope,
    listing.remote_mode,
    listing.starts_on,
    listing.ends_on,
    listing.venture_stage,
    profile.display_name,
    profile.headline,
    -- Bleibt: ein oeffentliches Listing verlinkt kein nicht oeffentliches Profil.
    case when profile.visibility = 'public' then profile.public_slug else null end,
    listing.updated_at
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.public_slug = p_public_slug
    and listing.visibility = 'public'
    and listing.status = 'active'
    and listing.expires_at > now()
    and profile.status = 'active'
    and membership.status = 'active') beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.get_public_network_problem(p_public_slug text) RETURNS TABLE(public_slug text, title text, description text, author_intent text, locations text[], topics text[], industries text[], geographic_scope text, author_display_name text, author_headline text, author_profile_slug text, published_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select problem.public_slug,
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
    and (problem.author_user_id is null or (profile.user_id is not null and membership.user_id is not null))) beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.get_public_network_profile_linkedin(p_public_slug text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select core.linkedin_url
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  join public.person_core core on core.user_id = profile.user_id
  where profile.public_slug = p_public_slug
    -- Dieselben Bedingungen wie get_public_network_profile: Ist die Seite
    -- selbst nicht oeffentlich, gibt es hier auch nichts zu holen.
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active'
    -- Und zusaetzlich die eigene Entscheidung fuer genau diese Angabe. Ein
    -- oeffentliches Netzwerkprofil zu haben, ist keine Zustimmung dazu, auch
    -- den Klarnamen-Lebenslauf daneben zu stellen.
    and core.linkedin_visibility = 'public'
    and core.linkedin_url is not null) beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.list_public_network_profile_listings(p_profile_slug text) RETURNS TABLE(public_slug text, direction text, category text, title text, summary text, topics text[], industries text[], geographic_scope text, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select listing.public_slug,
    listing.direction,
    listing.category,
    listing.title,
    listing.summary,
    listing.topics,
    listing.industries,
    listing.geographic_scope,
    listing.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  join public.network_listings listing on listing.owner_user_id = profile.user_id
  where profile.public_slug = p_profile_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active'
    and listing.visibility = 'public'
    and listing.status = 'active'
    and listing.expires_at > now()
  order by listing.published_at desc) beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.list_public_network_profile_ventures(p_profile_slug text) RETURNS TABLE(name text, role_label text, what_it_does text, audience text, motivation text, website text, logo_available boolean, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select venture.name,
    venture.role_label,
    venture.what_it_does,
    venture.audience,
    venture.motivation,
    venture.website,
    venture.logo_path is not null,
    venture.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  join public.network_ventures venture on venture.owner_user_id = profile.user_id
  where profile.public_slug = p_profile_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active'
    and venture.status = 'active'
  order by venture.created_at) beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.list_public_network_sitemap() RETURNS TABLE(path text, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$ select * from (select '/connect/p/' || profile.public_slug, profile.updated_at
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
    and (problem.author_user_id is null or (profile.user_id is not null and membership.user_id is not null))) beta_projection where public.connect_public_rollout_enabled(); $$;

CREATE OR REPLACE FUNCTION public.transition_connect_content(p_kind text, p_id uuid, p_action text, p_expected text, p_confirm boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare l public.network_listings; p public.network_problems;
begin
 if p_confirm is distinct from true or not public.is_network_member() then raise exception 'lifecycle_forbidden' using errcode='42501'; end if;
 if p_kind='listing' then
  select * into l from public.network_listings where id=p_id and owner_user_id=auth.uid() for update;
  if not found or l.status is distinct from p_expected then raise exception 'lifecycle_conflict' using errcode='40001'; end if;
  if p_action='delete' then delete from public.network_listings where id=p_id;
  elsif p_action in ('pause','complete') and l.status='active' then update public.network_listings set status=case when p_action='pause' then 'paused' else 'completed' end where id=p_id;
  elsif p_action in ('publish','renew') then
   if char_length(btrim(l.title))<5 then raise exception 'listing_title_required' using errcode='23514'; end if;
   if char_length(btrim(l.summary))<20 then raise exception 'listing_summary_required' using errcode='23514'; end if;
   if not exists(select 1 from public.network_profiles where user_id=auth.uid() and status='active') then
    raise exception 'active_network_profile_required' using errcode='23514'; end if;
   update public.network_listings set status='active',published_at=now(),expires_at=now()+interval '60 days' where id=p_id;
  else raise exception 'lifecycle_invalid' using errcode='23514'; end if;
 elsif p_kind='problem' then
  select * into p from public.network_problems where id=p_id and author_user_id=auth.uid() for update;
  if not found or p.status is distinct from p_expected then raise exception 'lifecycle_conflict' using errcode='40001'; end if;
  if p_action='delete' then delete from public.network_problems where id=p_id;
  elsif p_action='active' and not p.moderation_blocked then update public.network_problems set status='active',published_at=coalesce(published_at,now()),resolved_at=null where id=p_id;
  elsif p_action in ('withdrawn','resolved') and p.status='active' then update public.network_problems set status=p_action,resolved_at=case when p_action='resolved' then now() end where id=p_id;
  else raise exception 'lifecycle_forbidden' using errcode='42501'; end if;
 else raise exception 'lifecycle_invalid' using errcode='23514'; end if;
end $$;

-- One current eligibility predicate for cards, counts and notification claims.
create function public.connect_suggestion_eligible(s public.connect_suggestions) returns boolean
language sql stable security definer set search_path='' as $$
 select s.dismissed_at is null and public.is_network_member(s.recipient_user_id)
 and public.is_network_member(s.subject_owner_user_id)
 and exists(select 1 from public.network_profiles p where p.user_id=s.subject_owner_user_id and p.status='active')
 and not public.is_network_interaction_blocked(s.recipient_user_id,s.subject_owner_user_id)
 and case
 when s.person_user_id is not null then s.person_user_id=s.subject_owner_user_id and exists(select 1 from public.network_profiles p where p.user_id=s.person_user_id and p.status='active' and p.suggestable)
 when s.listing_id is not null then exists(select 1 from public.network_listings l where l.id=s.listing_id and l.owner_user_id=s.subject_owner_user_id and l.status='active' and l.expires_at>now())
 when s.problem_id is not null then exists(select 1 from public.network_problems p where p.id=s.problem_id and p.author_user_id=s.subject_owner_user_id and p.status='active' and not p.moderation_blocked)
 when s.venture_id is not null then exists(select 1 from public.network_ventures v where v.id=s.venture_id and v.owner_user_id=s.subject_owner_user_id and v.status='active')
 else false end;
$$;
revoke all on function public.connect_suggestion_eligible(public.connect_suggestions) from public,anon,authenticated;
create function public.can_read_connect_suggestion(s public.connect_suggestions) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and s.recipient_user_id=auth.uid() and public.connect_suggestion_eligible(s);
$$;
revoke all on function public.can_read_connect_suggestion(public.connect_suggestions) from public,anon;
grant execute on function public.can_read_connect_suggestion(public.connect_suggestions) to authenticated;
drop policy if exists connect_suggestions_select_own on public.connect_suggestions;
create policy connect_suggestions_select_own on public.connect_suggestions for select to authenticated using(public.can_read_connect_suggestion(connect_suggestions));

CREATE OR REPLACE FUNCTION public.prepare_suggestion_notifications(p_limit integer DEFAULT 25) RETURNS TABLE(recipient_user_id uuid, new_count integer, wants_email boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
          and public.connect_suggestion_eligible(suggestion)
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
CREATE OR REPLACE FUNCTION public.generate_connect_suggestions_for(p_user_id uuid, p_limit integer DEFAULT 3) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
        and exists(select 1 from public.network_profiles owner_profile where owner_profile.user_id=problem.author_user_id and owner_profile.status='active')
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

create function public.list_connect_highlight_candidates(p_kind text) returns setof jsonb
language sql stable security invoker set search_path='' as $$
 select candidate from (
 select to_jsonb(l) candidate,l.published_at stamp,l.id from public.network_listings l
 join public.network_profiles p on p.user_id=l.owner_user_id
 where p_kind='listing' and public.is_network_member() and p.status='active' and p.suggestable and public.connect_owner_visible(p.user_id) and l.status='active' and l.expires_at>now()
 union all
 select to_jsonb(v),v.created_at,v.id from public.network_ventures v join public.network_profiles p on p.user_id=v.owner_user_id
 where p_kind='venture' and public.is_network_member() and p.status='active' and p.suggestable and public.connect_owner_visible(p.user_id) and v.status='active'
 union all
 select to_jsonb(p),p.published_at,p.user_id from public.network_profiles p
 where p_kind='person' and public.is_network_member() and p.status='active' and p.suggestable and public.connect_owner_visible(p.user_id)
 union all
 select to_jsonb(n),n.published_at,n.id from public.network_problems n join public.network_profiles p on p.user_id=n.author_user_id
 where p_kind='problem' and public.is_network_member() and p.status='active' and p.suggestable and public.connect_owner_visible(p.user_id) and n.status='active' and not n.moderation_blocked
 ) candidates order by stamp desc nulls last,id limit 30;
$$;
revoke all on function public.list_connect_highlight_candidates(text) from public,anon;
grant execute on function public.list_connect_highlight_candidates(text) to authenticated;

create function public.search_connect_people(p_q text default '',p_role text default '',p_expertise text default '',p_industry text default '',p_region text default '',p_remote text default '',p_open_to text default '',p_offset integer default 0)
returns setof public.network_profiles language sql stable security invoker set search_path='' as $$
 select p.* from public.network_profiles p
 where public.is_network_member() and p.user_id<>auth.uid() and p.status='active' and public.connect_owner_visible(p.user_id)
 and (p_role='' or p_role=any(p.network_roles))
 and (p_expertise='' or p_expertise=any(p.expertise))
 and (p_industry='' or p_industry=any(p.industries))
 and (p_remote='' or p_remote=p.remote_mode)
 and (p_open_to='' or p_open_to=any(p.open_to_formats))
 and (p_region='' or strpos(lower(coalesce(p.location_region,'')),lower(p_region))>0)
 and (btrim(p_q)='' or strpos(lower(concat_ws(' ',p.display_name,p.headline,p.bio,p.network_reach,p.contact_note,array_to_string(p.expertise,' '),array_to_string(p.industries,' '),p.location_region)),lower(btrim(p_q)))>0
 or exists(select 1 from public.network_ventures v where v.owner_user_id=p.user_id and v.status='active' and strpos(lower(v.search_text),lower(btrim(p_q)))>0))
 order by p.published_at desc nulls last,p.user_id limit 25 offset greatest(0,least(coalesce(p_offset,0),100000));
$$;
revoke all on function public.search_connect_people(text,text,text,text,text,text,text,integer) from public,anon;
grant execute on function public.search_connect_people(text,text,text,text,text,text,text,integer) to authenticated;
create function public.resolve_connect_member_slug(p_kind text,p_slug text) returns text language sql stable security invoker set search_path='' as $$
 select path from (
 select '/connect/people/'||p.user_id path from public.network_profiles p where p_kind='p' and p.public_slug=p_slug and p.status='active' and public.connect_owner_visible(p.user_id)
 union all select '/connect/listings/'||l.id from public.network_listings l where p_kind='l' and l.public_slug=p_slug and l.status='active' and l.expires_at>now() and public.connect_owner_visible(l.owner_user_id)
 union all select '/connect/problems/'||p.id from public.network_problems p where p_kind='pr' and p.public_slug=p_slug and p.status='active' and not p.moderation_blocked and (p.author_user_id is null or public.connect_owner_visible(p.author_user_id))
 ) allowed where public.is_network_member() limit 1;
$$;
revoke all on function public.resolve_connect_member_slug(text,text) from public,anon;
grant execute on function public.resolve_connect_member_slug(text,text) to authenticated;
notify pgrst,'reload schema';
commit;
