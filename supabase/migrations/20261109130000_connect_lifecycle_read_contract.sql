begin;
-- The internal bilateral block helper has intentionally no client grant.
create or replace function public.connect_owner_visible(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_network_member(p_user) and exists(select 1 from public.network_profiles where user_id=p_user and status='active') and not public.is_network_interaction_blocked(p_user,auth.uid());
$$;
drop policy network_profiles_select on public.network_profiles;
create policy network_profiles_select on public.network_profiles for select to authenticated using(public.is_network_member() and (user_id=auth.uid() or (public.connect_owner_visible(user_id))));
drop policy network_listings_select on public.network_listings;
create policy network_listings_select on public.network_listings for select to authenticated using(public.is_network_member() and (owner_user_id=auth.uid() or (status='active' and expires_at>now() and public.connect_owner_visible(owner_user_id))));
drop policy network_problems_select on public.network_problems;
create policy network_problems_select on public.network_problems for select to authenticated using(author_user_id=auth.uid() or (status='active' and not moderation_blocked and public.is_network_member() and (author_user_id is null or (public.connect_owner_visible(author_user_id)))));

create function public.can_send_network_conversation(p_conversation uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.network_conversations c where c.id=p_conversation
 and auth.uid() in(c.participant_a_user_id,c.participant_b_user_id)
 and c.participant_a_user_id is not null and c.participant_b_user_id is not null
 and public.can_use_network_conversation(c.id,auth.uid())
 and not public.is_network_interaction_blocked(c.participant_a_user_id,c.participant_b_user_id)
 and (c.discovery_intro_request_id is not null or
 ((c.contact_request_id is not null or c.problem_interest_id is not null)
 and public.is_network_member(c.participant_a_user_id) and public.is_network_member(c.participant_b_user_id))));
$$;
revoke all on function public.can_send_network_conversation(uuid) from public,anon;
grant execute on function public.can_send_network_conversation(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.list_network_conversations() RETURNS TABLE(conversation_id uuid, contact_request_id uuid, listing_id uuid, counterpart_user_id uuid, counterpart_display_name text, listing_title text, origin text, created_at timestamp with time zone, last_message_at timestamp with time zone, unread_count bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
begin
  -- WIEDERHERGESTELLT: Alle Fassungen bis zum 24.09.2026 verlangten hier eine
  -- AKTIVE Mitgliedschaft. Am 08.10.2026 wurde daraus eine Pruefung auf
  -- Anmeldung - seither lasen gesperrte Mitglieder weiter mit.
  -- Postfach ja oder nein. Welche Unterhaltung, entscheidet
  -- can_use_network_conversation je Ursprung.
  if not public.can_use_network_messaging(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  return query
  select conversation.id,
    conversation.contact_request_id,
    request.listing_id,
    counterpart.user_id,
    -- DIE NAMENSQUELLE FOLGT DEM URSPRUNG, und das ist Absicht.
    --
    -- Vorher stand hier nur das Connect-Profil mit der Momentaufnahme aus der
    -- Anfrage als Rueckfall. Fuer ein Gespraech aus Find waere das immer null -
    -- ein Find-Nutzer hat kein Connect-Profil - und die Oberflaeche haette
    -- "Ehemaliges Mitglied" fuer einen lebenden Menschen angezeigt.
    --
    -- Umgekehrt waere ein pauschaler Rueckfall auf person_core eine stille
    -- Ausweitung: In einem Connect-Gespraech stuende dann der Klarname einer
    -- Person, die ihr Connect-Profil gerade zurueckgezogen hat. Deshalb je
    -- Ursprung die Quelle, die zu seiner Zustimmung passt.
    case
      when conversation.discovery_intro_request_id is not null then
        nullif(btrim(coalesce(discovery_profile.display_name, '')), '')
      else
        coalesce(
          counterpart_profile.display_name,
          case when counterpart.user_id is null then null
            when request.sender_user_id = counterpart.user_id
              then request.sender_display_name_snapshot
            else request.recipient_display_name_snapshot end
        )
    end,
    coalesce(request.listing_title_snapshot, problem.title),
    case
      when conversation.contact_request_id is not null then 'connect_contact'
      when conversation.problem_interest_id is not null then 'connect_problem'
      when conversation.discovery_intro_request_id is not null then 'discovery_intro'
      else 'history'
    end,
    conversation.created_at,
    conversation.last_message_at,
    (
      select count(*)
      from public.network_messages message
      where message.conversation_id = conversation.id
        and message.sender_user_id is distinct from v_user_id
        and message.read_at is null
    )
  from public.network_conversations conversation
  cross join lateral (
    select case
      when conversation.participant_a_user_id is not distinct from v_user_id
        then conversation.participant_b_user_id
      else conversation.participant_a_user_id
    end as user_id
  ) counterpart
  left join public.network_profiles counterpart_profile
    on counterpart_profile.user_id = counterpart.user_id
  left join public.founder_discovery_profiles discovery_profile
    on discovery_profile.user_id = counterpart.user_id
  left join public.network_contact_requests request
    on request.id = conversation.contact_request_id
  left join public.network_problem_interests interest
    on interest.id = conversation.problem_interest_id
  left join public.network_problems problem
    on problem.id = interest.problem_id
  where public.can_use_network_conversation(conversation.id, v_user_id)
  order by conversation.last_message_at desc nulls last, conversation.created_at desc;
end;
$$;


notify pgrst,'reload schema';
commit;
