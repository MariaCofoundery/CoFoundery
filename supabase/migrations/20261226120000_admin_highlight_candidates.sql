begin;

-- Die Auswahlliste im Adminbereich: Eintraege, die als Highlight gezeigt werden
-- duerfen - veroeffentlicht, und die Person hat das Highlight-Haekchen gesetzt.
-- So gibt es nichts auszuwaehlen, was nachher unsichtbar bliebe.
create function public.admin_list_highlight_candidates() returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return query
    select jsonb_build_object('kind', x.kind, 'id', x.id, 'title', x.title, 'owner_name', x.owner_name, 'at', x.at,
             'placed', exists (select 1 from public.connect_highlight_placements pl
                               where pl.target_kind = x.kind and pl.target_id = x.id and pl.starts_at <= now() and pl.ends_at > now()))
    from (
      select 'listing'::text as kind, l.id, l.title, p.display_name as owner_name, coalesce(l.published_at, l.created_at) as at
      from public.network_listings l join public.network_profiles p on p.user_id = l.owner_user_id
      where l.status = 'active' and l.expires_at > now() and p.status = 'active' and p.highlightable
      union all
      select 'venture', v.id, v.name, p.display_name, v.created_at
      from public.network_ventures v join public.network_profiles p on p.user_id = v.owner_user_id
      where v.status = 'active' and p.status = 'active' and p.highlightable
      union all
      select 'person', p.user_id, p.display_name, p.headline, coalesce(p.published_at, p.updated_at)
      from public.network_profiles p
      where p.status = 'active' and p.highlightable
      union all
      select 'problem', n.id, n.title, p.display_name, coalesce(n.published_at, n.created_at)
      from public.network_problems n join public.network_profiles p on p.user_id = n.author_user_id
      where n.status = 'active' and not n.moderation_blocked and p.status = 'active' and p.highlightable
    ) x
    order by x.at desc nulls last, x.id
    limit 80;
end $$;
revoke all on function public.admin_list_highlight_candidates() from public, anon;
grant execute on function public.admin_list_highlight_candidates() to authenticated;

notify pgrst, 'reload schema';
commit;
