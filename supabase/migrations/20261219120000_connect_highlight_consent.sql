begin;

-- ---------------------------------------------------------------------------
-- CONNECT: eigene Zustimmung fuer Highlights
-- ---------------------------------------------------------------------------
-- "Fuer dich vorgeschlagen werden" und "als Highlight oben in Connect stehen"
-- sind zwei verschiedene Dinge: das eine sieht eine Person gelegentlich, das
-- andere sieht jedes Mitglied, auch als Empfehlung von uns oder als Anzeige.
-- Deshalb ein eigenes Haekchen, und zwar ausdruecklich: Standard ist AUS, es
-- gilt nur, wer es selbst gesetzt hat. Wer es abschaltet, verschwindet auch
-- aus laufenden Plaetzen.
alter table public.network_profiles
  add column if not exists highlightable boolean not null default false;
comment on column public.network_profiles.highlightable is
  'Person agreed to appear in CONNECT highlights (random, recommended by us, or ad). Separate from suggestable; default off.';

create or replace function public.list_connect_highlight_candidates(p_kind text) returns setof jsonb
language sql stable security invoker set search_path='' as $$
 select candidate from (
 select to_jsonb(l) candidate,l.published_at stamp,l.id from public.network_listings l
 join public.network_profiles p on p.user_id=l.owner_user_id
 where p_kind='listing' and public.is_network_member() and p.status='active' and p.highlightable and public.connect_owner_visible(p.user_id) and l.status='active' and l.expires_at>now()
 union all
 select to_jsonb(v),v.created_at,v.id from public.network_ventures v join public.network_profiles p on p.user_id=v.owner_user_id
 where p_kind='venture' and public.is_network_member() and p.status='active' and p.highlightable and public.connect_owner_visible(p.user_id) and v.status='active'
 union all
 select to_jsonb(p),p.published_at,p.user_id from public.network_profiles p
 where p_kind='person' and public.is_network_member() and p.status='active' and p.highlightable and public.connect_owner_visible(p.user_id)
 union all
 select to_jsonb(n),n.published_at,n.id from public.network_problems n join public.network_profiles p on p.user_id=n.author_user_id
 where p_kind='problem' and public.is_network_member() and p.status='active' and p.highlightable and public.connect_owner_visible(p.user_id) and n.status='active' and not n.moderation_blocked
 ) candidates order by stamp desc nulls last,id limit 30;
$$;

create or replace function public.get_connect_highlight_owners(p_user_ids uuid[])
returns setof public.network_profiles
language sql stable security definer set search_path = '' as $$
  select profile.* from public.network_profiles profile
  where public.is_network_member()
    and profile.user_id = any(p_user_ids)
    and profile.status = 'active' and profile.highlightable
    and public.is_network_member(profile.user_id)
    and not public.is_network_interaction_blocked(auth.uid(), profile.user_id);
$$;

create or replace function public.list_connect_highlight_placements()
returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'placement_id', x.id, 'source', x.source,
           'note', case when x.source = 'editorial' then x.note end,
           'kind', x.target_kind, 'item', x.item)
  from (
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(l) as item
    from public.connect_highlight_placements pl
    join public.network_listings l on pl.target_kind = 'listing' and l.id = pl.target_id
    join public.network_profiles p on p.user_id = l.owner_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
      and l.status = 'active' and l.expires_at > now()
    union all
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(v)
    from public.connect_highlight_placements pl
    join public.network_ventures v on pl.target_kind = 'venture' and v.id = pl.target_id
    join public.network_profiles p on p.user_id = v.owner_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
      and v.status = 'active'
    union all
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(p)
    from public.connect_highlight_placements pl
    join public.network_profiles p on pl.target_kind = 'person' and p.user_id = pl.target_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
    union all
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(n)
    from public.connect_highlight_placements pl
    join public.network_problems n on pl.target_kind = 'problem' and n.id = pl.target_id
    join public.network_profiles p on p.user_id = n.author_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
      and n.status = 'active' and not n.moderation_blocked
  ) x
  where public.is_network_member();
$$;

create or replace function public.admin_list_connect_highlight_placements()
returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  return query
    select jsonb_build_object(
      'id', pl.id, 'source', pl.source, 'kind', pl.target_kind, 'target_id', pl.target_id,
      'note', pl.note, 'starts_at', pl.starts_at, 'ends_at', pl.ends_at,
      'title', case pl.target_kind
        when 'listing' then (select l.title from public.network_listings l where l.id = pl.target_id)
        when 'venture' then (select v.name from public.network_ventures v where v.id = pl.target_id)
        when 'person' then (select p.display_name from public.network_profiles p where p.user_id = pl.target_id)
        else (select n.title from public.network_problems n where n.id = pl.target_id)
      end,
      'owner_name', (select p.display_name from public.network_profiles p where p.user_id = pl.owner_user_id),
      'owner_consent', coalesce((select p.highlightable from public.network_profiles p where p.user_id = pl.owner_user_id), false))
    from public.connect_highlight_placements pl
    order by pl.ends_at desc, pl.id;
end;
$$;
notify pgrst, 'reload schema';
commit;
