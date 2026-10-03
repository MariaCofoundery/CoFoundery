begin;
alter table public.network_memberships drop constraint network_memberships_status_check;
alter table public.network_memberships add constraint network_memberships_status_check check(status in ('active','inactive','suspended'));
-- Content moderation is independent of author lifecycle; no new moderation UI.
alter table public.network_problems add column moderation_blocked boolean not null default false;

-- Preserve accepted conversations when their public listing is deleted.
alter table public.network_contact_requests drop constraint network_contact_requests_listing_id_fkey;
alter table public.network_contact_requests add constraint network_contact_requests_listing_id_fkey foreign key(listing_id) references public.network_listings(id) on delete set null;
create function public.connect_before_listing_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.network_contact_requests set listing_id=null,listing_title_snapshot=null,
 status=case when status='pending' then 'canceled' else status end where listing_id=old.id;
 return old;
end $$;
create trigger connect_before_listing_delete before delete on public.network_listings for each row execute function public.connect_before_listing_delete();

-- INVOKER trigger deliberately distinguishes ordinary direct table writes from
-- narrow SECURITY DEFINER lifecycle RPCs; no client-settable GUC bypass.
create function public.connect_guard_publication_lifecycle() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='network_problems' then
  if current_user in ('authenticated','anon') and ((tg_op='INSERT' and new.moderation_blocked) or (tg_op='UPDATE' and new.moderation_blocked is distinct from old.moderation_blocked)) then
   raise exception 'moderation_forbidden' using errcode='42501';
  end if;
  if new.moderation_blocked then
   if tg_op='UPDATE' and old.moderation_blocked and new.status='active' then raise exception 'content_restricted' using errcode='42501'; end if;
   new.status:='withdrawn';
  end if;
 end if;
 if tg_op='UPDATE' and current_user in ('authenticated','anon') then
  if tg_table_name='network_problems' then
   if old.moderation_blocked then raise exception 'content_restricted' using errcode='42501'; end if;
  end if;
  if old.status='active' and new.status='draft' then
   new.status:='active'; new.published_at:=old.published_at;
   if tg_table_name='network_listings' then new.expires_at:=old.expires_at; end if;
  end if;
  if tg_table_name in ('network_listings','network_problems') and old.status not in ('active','draft') and new.status is distinct from old.status then
   raise exception 'explicit_lifecycle_required' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger aa_connect_lifecycle before insert or update on public.network_profiles for each row execute function public.connect_guard_publication_lifecycle();
create trigger aa_connect_lifecycle before insert or update on public.network_listings for each row execute function public.connect_guard_publication_lifecycle();
create trigger aa_connect_lifecycle before insert or update on public.network_problems for each row execute function public.connect_guard_publication_lifecycle();

create function public.connect_owner_visible(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_network_member(p_user) and exists(select 1 from public.network_profiles where user_id=p_user and status='active');
$$;
drop policy network_profiles_select on public.network_profiles;
create policy network_profiles_select on public.network_profiles for select to authenticated using(public.is_network_member() and (user_id=auth.uid() or (public.connect_owner_visible(user_id) and not public.is_network_interaction_blocked(user_id,auth.uid()))));
drop policy network_listings_select on public.network_listings;
create policy network_listings_select on public.network_listings for select to authenticated using(public.is_network_member() and (owner_user_id=auth.uid() or (status='active' and expires_at>now() and public.connect_owner_visible(owner_user_id) and not public.is_network_interaction_blocked(owner_user_id,auth.uid()))));
drop policy network_problems_select on public.network_problems;
create policy network_problems_select on public.network_problems for select to authenticated using(author_user_id=auth.uid() or (status='active' and not moderation_blocked and public.is_network_member() and (author_user_id is null or (public.connect_owner_visible(author_user_id) and not public.is_network_interaction_blocked(author_user_id,auth.uid())))));
-- No direct destructive profile deletion: leaving is not account deletion.
revoke delete on public.network_profiles from authenticated;

create function public.get_connect_participation() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 return (select jsonb_build_object('status',m.status,'profile_status',p.status) from public.network_memberships m left join public.network_profiles p on p.user_id=m.user_id where m.user_id=auth.uid());
end $$;
create function public.set_connect_participation(p_active boolean,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
declare m public.network_memberships; w record;
begin
 if auth.uid() is null or p_confirm is distinct from true or p_active is null then raise exception 'lifecycle_confirmation_required' using errcode='42501'; end if;
 select * into m from public.network_memberships where user_id=auth.uid() for update;
 if not found or m.status='suspended' then raise exception 'network_membership_required' using errcode='42501'; end if;
 if p_active then
  if m.status='inactive' then update public.network_memberships set status='active',updated_at=now() where user_id=auth.uid(); end if;
  -- Returning never republishes even the profile: review it explicitly first.
  return;
 end if;
 if m.status='inactive' then return; end if;
 for w in select id from public.network_problem_workspaces where owner_user_id=auth.uid() order by id for update loop
  perform public.archive_problem_workspace(w.id);
 end loop;
 delete from public.network_problem_workspace_members where user_id=auth.uid();
 update public.network_problem_workspace_invites set status='revoked',revoked_at=now(),token_hash=null
 where status='pending' and email=(select lower(btrim(email)) from auth.users where id=auth.uid());
 update public.network_listings set status='paused' where owner_user_id=auth.uid() and status='active';
 update public.network_problems set status='withdrawn' where author_user_id=auth.uid() and status='active';
 update public.network_ventures set status='hidden' where owner_user_id=auth.uid() and status='active';
 update public.network_profiles set status='paused' where user_id=auth.uid();
 update public.network_contact_requests set status='canceled' where status='pending' and auth.uid() in(sender_user_id,recipient_user_id);
 update public.saved_searches set notify=false where user_id=auth.uid() and context='connect';
 update public.connect_suggestions set dismissed_at=coalesce(dismissed_at,now()) where recipient_user_id=auth.uid() or subject_owner_user_id=auth.uid();
 update public.network_memberships set status='inactive',updated_at=now() where user_id=auth.uid();
end $$;

create function public.transition_connect_content(p_kind text,p_id uuid,p_action text,p_expected text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
declare l public.network_listings; p public.network_problems;
begin
 if p_confirm is distinct from true or not public.is_network_member() then raise exception 'lifecycle_forbidden' using errcode='42501'; end if;
 if p_kind='listing' then
  select * into l from public.network_listings where id=p_id and owner_user_id=auth.uid() for update;
  if not found or l.status is distinct from p_expected then raise exception 'lifecycle_conflict' using errcode='40001'; end if;
  if p_action='delete' then delete from public.network_listings where id=p_id;
  elsif p_action in ('pause','complete') and l.status='active' then update public.network_listings set status=case when p_action='pause' then 'paused' else 'completed' end where id=p_id;
  elsif p_action in ('publish','renew') then update public.network_listings set status='active',published_at=now(),expires_at=now()+interval '60 days' where id=p_id;
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
create function public.restore_problem_workspace(p_workspace uuid,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_confirm is distinct from true or not public.is_network_member() then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='archived' for update;
 if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_workspaces set status='active',updated_at=now() where id=p_workspace;
 -- Revoked invitation rows and tokens are deliberately untouched.
end $$;
create function public.restore_problem_opportunity(p_workspace uuid,p_opportunity uuid,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_confirm is distinct from true or not public.is_network_member() then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
 if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_opportunities set status='active',updated_at=now() where id=p_opportunity and workspace_id=p_workspace and status='archived';
 if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
end $$;

-- Close stale suggestions at the lifecycle transition, without regenerating
-- them on reactivation. Deletion still uses the existing cascading subject FK.
create function public.connect_retire_suggestions() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from old.status and new.status<>'active' then
  if tg_table_name='network_profiles' then update public.connect_suggestions set dismissed_at=coalesce(dismissed_at,now()) where subject_owner_user_id=new.user_id or recipient_user_id=new.user_id;
  elsif tg_table_name='network_listings' then update public.connect_suggestions set dismissed_at=coalesce(dismissed_at,now()) where listing_id=new.id;
  elsif tg_table_name='network_problems' then update public.connect_suggestions set dismissed_at=coalesce(dismissed_at,now()) where problem_id=new.id;
  elsif tg_table_name='network_ventures' then update public.connect_suggestions set dismissed_at=coalesce(dismissed_at,now()) where venture_id=new.id;
  end if;
 end if;
 return new;
end $$;
create trigger connect_retire_suggestions after update of status on public.network_profiles for each row execute function public.connect_retire_suggestions();
create trigger connect_retire_suggestions after update of status on public.network_listings for each row execute function public.connect_retire_suggestions();
create trigger connect_retire_suggestions after update of status on public.network_problems for each row execute function public.connect_retire_suggestions();
create trigger connect_retire_suggestions after update of status on public.network_ventures for each row execute function public.connect_retire_suggestions();

-- Read-only histories remain available after voluntary exit; suspension is
-- not voluntary exit. FIND keeps its independent authorization contract.
create or replace function public.can_use_network_messaging(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_user_id is not null and (exists(select 1 from public.network_memberships where user_id=p_user_id and status in ('active','inactive'))
 or exists(select 1 from public.discovery_intro_requests where status='accepted' and p_user_id in(requester_user_id,recipient_user_id)));
$$;
create or replace function public.can_use_network_conversation(p_conversation_id uuid,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.network_conversations c left join public.network_contact_requests r on r.id=c.contact_request_id left join public.discovery_intro_requests i on i.id=c.discovery_intro_request_id
 where c.id=p_conversation_id and p_user_id in(c.participant_a_user_id,c.participant_b_user_id) and (
 (c.discovery_intro_request_id is not null and i.status='accepted')
 or (exists(select 1 from public.network_memberships where user_id=p_user_id and status in ('active','inactive')) and (
 (c.contact_request_id is not null and r.status='accepted') or c.problem_interest_id is not null or num_nonnulls(c.contact_request_id,c.problem_interest_id,c.discovery_intro_request_id)=0))
 or c.participant_a_user_id is null or c.participant_b_user_id is null));
$$;

CREATE OR REPLACE FUNCTION public.enforce_network_message_contract() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_conversation public.network_conversations%rowtype;
  v_request_status text;
  v_intro_status text;
begin
  -- Wiederhergestellt vom 24.09.2026: Das Trennen der Verknuepfung ist selbst
  -- ein Update auf sender_user_id und laeuft damit durch diesen Vertrag. Es
  -- gibt dann nichts zu pruefen - die Nachricht ist geschrieben, sie wird nur
  -- anonym.
  if new.sender_user_id is null then
    return new;
  end if;

  select * into v_conversation
  from public.network_conversations conversation
  where conversation.id = new.conversation_id;

  if not found or new.sender_user_id not in (
    v_conversation.participant_a_user_id,
    v_conversation.participant_b_user_id
  ) then
    raise exception 'network_message_sender_invalid' using errcode = '23514';
  end if;

  -- Ebenfalls wiederhergestellt: In eine verwaiste Unterhaltung schreibt
  -- niemand mehr, und der Grund dafuer wird beim Namen genannt.
  if v_conversation.participant_a_user_id is null
    or v_conversation.participant_b_user_id is null then
    raise exception 'network_conversation_counterpart_gone' using errcode = '42501';
  end if;

  if v_conversation.discovery_intro_request_id is null and (
    not public.is_network_member(v_conversation.participant_a_user_id) or not public.is_network_member(v_conversation.participant_b_user_id)) then
    raise exception 'network_membership_required' using errcode='42501';
  end if;
  -- Aus einem Problem: Das Interesse ist die Zustimmung. Faellt es weg, faellt
  -- das Gespraech per Fremdschluessel ohnehin mit.
  if v_conversation.problem_interest_id is not null then
    return new;
  end if;

  if v_conversation.discovery_intro_request_id is not null then
    select intro.status into v_intro_status
    from public.discovery_intro_requests intro
    where intro.id = v_conversation.discovery_intro_request_id;
    if v_intro_status is distinct from 'accepted' then
      raise exception 'network_message_intro_not_accepted' using errcode = '23514';
    end if;
    return new;
  end if;

  select request.status into v_request_status
  from public.network_contact_requests request
  where request.id = v_conversation.contact_request_id;
  if v_request_status is distinct from 'accepted' then
    raise exception 'network_message_request_not_accepted' using errcode = '23514';
  end if;

  return new;
end;
$$;



CREATE OR REPLACE FUNCTION public.enforce_problem_interest_block() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_other uuid;
begin
  if new.approach_id is null then
    select author_user_id into v_other from public.network_problems where id = new.problem_id;
  else
    select author_user_id into v_other from public.network_problem_approaches where id = new.approach_id and problem_id = new.problem_id;
  end if;
  if not public.is_network_member(new.user_id) or (v_other is not null and not public.is_network_member(v_other)) then
    raise exception 'network_membership_required' using errcode='42501';
  end if;
  if v_other is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(least(new.user_id::text, v_other::text) || greatest(new.user_id::text, v_other::text), 0));
    if public.is_network_interaction_blocked(new.user_id, v_other) then
      raise exception 'network_contact_interaction_blocked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;



CREATE OR REPLACE FUNCTION public.respond_network_contact(p_request_id uuid, p_response text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_request public.network_contact_requests%rowtype;
begin
  if not public.is_network_member() then raise exception 'network_membership_required' using errcode = '42501'; end if;
  if p_response not in ('accepted','declined') then raise exception 'network_contact_response_invalid' using errcode = '23514'; end if;
  select * into v_request from public.network_contact_requests request where request.id = p_request_id for update;
  if not found or v_request.recipient_user_id <> auth.uid() then raise exception 'network_contact_response_forbidden' using errcode = '42501'; end if;
  if public.is_network_interaction_blocked(v_request.sender_user_id, v_request.recipient_user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;
  if p_response='accepted' and (not public.is_network_member(v_request.sender_user_id) or not public.is_network_member(v_request.recipient_user_id)) then
    raise exception 'network_contact_recipient_unavailable' using errcode='42501';
  end if;
  if v_request.status = 'accepted' and p_response = 'accepted' then
    insert into public.network_conversations(contact_request_id, participant_a_user_id, participant_b_user_id, created_at)
    values(v_request.id, v_request.sender_user_id, v_request.recipient_user_id, coalesce(v_request.responded_at, v_request.updated_at, v_request.created_at))
    on conflict (contact_request_id) do nothing;
    return;
  end if;
  if v_request.status <> 'pending' then raise exception 'network_contact_not_pending' using errcode = '23514'; end if;
  update public.network_contact_requests set status = p_response, responded_at = now() where id = p_request_id;
  if p_response = 'accepted' then
    insert into public.network_conversations(contact_request_id, participant_a_user_id, participant_b_user_id)
    values(v_request.id, v_request.sender_user_id, v_request.recipient_user_id)
    on conflict (contact_request_id) do nothing;
  end if;
end;
$$;



CREATE OR REPLACE FUNCTION public.accept_network_problem_interest(p_interest_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_interest public.network_problem_interests%rowtype;
  v_problem public.network_problems%rowtype;
  v_recipient uuid;
  v_conversation_id uuid;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  select * into v_interest
  from public.network_problem_interests interest
  where interest.id = p_interest_id;
  if not found then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  select * into v_problem
  from public.network_problems problem
  where problem.id = v_interest.problem_id;
  if not found then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  -- Wem die Meldung gilt, der entscheidet ueber das Gespraech - und niemand
  -- sonst. Bei einem Ansatz ist das nicht die einstellende Person.
  if v_interest.approach_id is null then
    v_recipient := v_problem.author_user_id;
  else
    select approach.author_user_id into v_recipient
    from public.network_problem_approaches approach
    where approach.id = v_interest.approach_id
      and approach.status = 'active';
    if v_recipient is null then
      raise exception 'network_problem_interest_unavailable' using errcode = '42501';
    end if;
  end if;

  if v_recipient <> v_user_id then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  if not public.is_network_member(v_interest.user_id) then raise exception 'network_membership_required' using errcode='42501'; end if;
  if v_problem.status <> 'active' then
    raise exception 'network_problem_unavailable' using errcode = '42501';
  end if;

  if public.is_network_interaction_blocked(v_user_id, v_interest.user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.network_profiles profile
    where profile.user_id = v_interest.user_id and profile.status = 'active'
  ) or not exists (
    select 1 from public.network_profiles profile
    where profile.user_id = v_user_id and profile.status = 'active'
  ) then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;

  select conversation.id into v_conversation_id
  from public.network_conversations conversation
  where conversation.problem_interest_id = p_interest_id;
  if found then
    return v_conversation_id;
  end if;

  insert into public.network_conversations (
    problem_interest_id, participant_a_user_id, participant_b_user_id
  )
  values (p_interest_id, v_interest.user_id, v_recipient)
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;



revoke all on function public.connect_before_listing_delete(),public.connect_guard_publication_lifecycle(),public.connect_retire_suggestions(),public.get_connect_participation(),public.set_connect_participation(boolean,boolean),public.transition_connect_content(text,uuid,text,text,boolean),public.restore_problem_workspace(uuid,boolean),public.restore_problem_opportunity(uuid,uuid,boolean),public.connect_owner_visible(uuid) from public,anon,authenticated;
grant execute on function public.get_connect_participation(),public.set_connect_participation(boolean,boolean),public.transition_connect_content(text,uuid,text,text,boolean),public.restore_problem_workspace(uuid,boolean),public.restore_problem_opportunity(uuid,uuid,boolean),public.connect_owner_visible(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
