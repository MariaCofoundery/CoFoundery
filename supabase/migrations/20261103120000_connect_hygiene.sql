begin;

-- Keep the existing latest-30 window and mixing. Authorize every candidate's
-- owner, including owners whose own profile is outside that window.
create function public.get_connect_highlight_owners(p_user_ids uuid[])
returns setof public.network_profiles
language sql stable security definer set search_path = '' as $$
  select profile.* from public.network_profiles profile
  where public.is_network_member()
    and profile.user_id = any(p_user_ids)
    and profile.status = 'active' and profile.suggestable
    and public.is_network_member(profile.user_id)
    and not public.is_network_interaction_blocked(auth.uid(), profile.user_id);
$$;
revoke all on function public.get_connect_highlight_owners(uuid[]) from public, anon;
grant execute on function public.get_connect_highlight_owners(uuid[]) to authenticated;

-- Saved CONNECT searches lead to member routes. Public publication does not
-- opt suspended accounts back into this member notification feature.
-- Derive ownership, title and route from current rows, never client assertions.
create function public.get_connect_saved_search_delivery(
  p_saved_search_id uuid, p_subject_kind text, p_subject_id uuid
)
returns table(recipient_user_id uuid, title text, path text)
language sql stable security definer set search_path = '' as $$
  select search.user_id, subject.title, subject.path
  from public.saved_searches search
  cross join lateral (
    select listing.owner_user_id, listing.title, '/connect/listings/' || listing.id as path
    from public.network_listings listing
    where p_subject_kind = 'listing' and listing.id = p_subject_id
      and listing.status = 'active' and listing.expires_at > now() and search.include_listings
    union all
    select problem.author_user_id, problem.title, '/connect/problems/' || problem.id
    from public.network_problems problem
    where p_subject_kind = 'problem' and problem.id = p_subject_id
      and problem.status = 'active' and search.include_problems
  ) subject
  join public.network_profiles owner on owner.user_id = subject.owner_user_id and owner.status = 'active'
  where search.id = p_saved_search_id and search.context = 'connect' and search.notify
    and auth.uid() = subject.owner_user_id
    and search.user_id <> subject.owner_user_id
    and public.is_network_member(subject.owner_user_id)
    and public.is_network_member(search.user_id)
    and not public.is_network_interaction_blocked(search.user_id, subject.owner_user_id);
$$;
revoke all on function public.get_connect_saved_search_delivery(uuid, text, uuid) from public, anon;
grant execute on function public.get_connect_saved_search_delivery(uuid, text, uuid) to authenticated;

create or replace function public.claim_saved_search_hit(
  p_saved_search_id uuid, p_subject_kind text, p_subject_id uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_subject_kind in ('listing', 'problem') then
    if not exists(select 1 from public.get_connect_saved_search_delivery(p_saved_search_id, p_subject_kind, p_subject_id)) then
      return false;
    end if;
  elsif p_subject_kind = 'profile' then
    -- FIND uses the same duplicate ledger; retain its existing flow, without
    -- imposing CONNECT membership on FIND-only accounts.
    if not exists(select 1 from public.saved_searches where id = p_saved_search_id and context = 'discovery') then
      return false;
    end if;
  else
    return false;
  end if;
  insert into public.saved_search_hits(saved_search_id, subject_kind, subject_id)
  values (p_saved_search_id, p_subject_kind, p_subject_id)
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.claim_saved_search_hit(uuid, text, uuid) from public, anon;

create or replace function public.list_saved_searches_for_matching(
  p_context text,
  p_author_user_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  query text,
  topics text[],
  industries text[],
  locations text[],
  geographic_scope text,
  remote_mode text,
  capability_area_ids text[],
  connect_direction text,
  connect_category text,
  include_listings boolean,
  include_problems boolean,
  alignment_dimensions text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select search.id, search.user_id, search.query, search.topics, search.industries,
    search.locations, search.geographic_scope, search.remote_mode,
    search.capability_area_ids, search.connect_direction, search.connect_category,
    search.include_listings, search.include_problems, search.alignment_dimensions
  from public.saved_searches search
  where search.context = p_context
    and search.notify
    and search.user_id <> p_author_user_id
    and (p_context <> 'connect' or (
      auth.uid() = p_author_user_id
      and public.is_network_member(p_author_user_id)
      and public.is_network_member(search.user_id)
      and not public.is_network_interaction_blocked(search.user_id, p_author_user_id)
    ));
$$;

-- Dismissal is the only client mutation. System columns and removal are not
-- user interactions; deleting would also defeat the existing duplicate budget.
drop policy connect_suggestions_update_own on public.connect_suggestions;
drop policy connect_suggestions_delete_own on public.connect_suggestions;
revoke insert, update, delete on public.connect_suggestions from public, authenticated;
revoke all on public.connect_suggestions from anon;
create function public.dismiss_connect_suggestion(p_suggestion_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.connect_suggestions set dismissed_at = coalesce(dismissed_at, now())
  where id = p_suggestion_id and recipient_user_id = auth.uid();
  if not found then raise exception 'connect_suggestion_denied' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.dismiss_connect_suggestion(uuid) from public, anon;
grant execute on function public.dismiss_connect_suggestion(uuid) to authenticated;

-- Revoking anon alone is insufficient while PUBLIC still has EXECUTE.
revoke execute on function public.list_network_conversations() from public, anon;
grant execute on function public.list_network_conversations() to authenticated, service_role;
notify pgrst, 'reload schema';
commit;
