begin;
-- Browse projections deliberately exclude owner-only management exceptions.
create view public.connect_discovery_listings with(security_invoker=true) as
 select l.* from public.network_listings l where public.is_network_member() and l.status='active' and l.expires_at>now() and public.connect_owner_visible(l.owner_user_id);
create view public.connect_discovery_problems with(security_invoker=true) as
 select p.* from public.network_problems p where public.is_network_member() and p.status='active' and not p.moderation_blocked and (p.author_user_id is null or public.connect_owner_visible(p.author_user_id));
create view public.connect_discovery_ventures with(security_invoker=true) as
 select v.* from public.network_ventures v where public.is_network_member() and v.status='active' and public.connect_owner_visible(v.owner_user_id);
revoke all on public.connect_discovery_listings,public.connect_discovery_problems,public.connect_discovery_ventures from public,anon,authenticated;
grant select on public.connect_discovery_listings,public.connect_discovery_problems,public.connect_discovery_ventures to authenticated;
create function public.count_connect_notification_delivery(p_recipient uuid,p_since timestamptz) returns integer language sql stable security definer set search_path='' as $$
 select count(*)::integer from public.connect_suggestions s where s.recipient_user_id=p_recipient and s.notified_at>=p_since and public.connect_suggestion_eligible(s) and public.wants_email_notification(p_recipient,'connect_suggestions');
$$;
revoke all on function public.count_connect_notification_delivery(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.count_connect_notification_delivery(uuid,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
