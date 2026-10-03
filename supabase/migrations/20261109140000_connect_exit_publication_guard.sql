begin;
-- Serialize active publication writes against a concurrent voluntary exit or
-- administrative suspension. Deadlocks fail one transaction, never partially exit.
create function public.connect_lock_publication_membership() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; member_status text;
begin
 if new.status<>'active' then return new; end if;
 if tg_table_name='network_profiles' then owner_id:=new.user_id;
 elsif tg_table_name='network_problems' then owner_id:=new.author_user_id;
 else owner_id:=new.owner_user_id; end if;
 if owner_id is null then return new; end if;
 select status into member_status from public.network_memberships where user_id=owner_id for share;
 if found and member_status<>'active' then raise exception 'network_membership_required' using errcode='42501'; end if;
 return new;
end $$;
create trigger ab_connect_membership before insert or update on public.network_profiles for each row execute function public.connect_lock_publication_membership();
create trigger ab_connect_membership before insert or update on public.network_listings for each row execute function public.connect_lock_publication_membership();
create trigger ab_connect_membership before insert or update on public.network_problems for each row execute function public.connect_lock_publication_membership();
create trigger ab_connect_membership before insert or update on public.network_ventures for each row execute function public.connect_lock_publication_membership();
revoke all on function public.connect_lock_publication_membership() from public,anon,authenticated;
create or replace function public.set_connect_participation(p_active boolean,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
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
 update public.network_problem_approaches set status='withdrawn' where author_user_id=auth.uid() and status='active';
 delete from public.network_problem_interests where user_id=auth.uid();
 update public.network_ventures set status='hidden' where owner_user_id=auth.uid() and status='active';
 update public.network_profiles set status='paused' where user_id=auth.uid();
 update public.network_contact_requests set status='canceled' where status='pending' and auth.uid() in(sender_user_id,recipient_user_id);
 update public.saved_searches set notify=false where user_id=auth.uid() and context='connect';
 update public.connect_suggestions set dismissed_at=coalesce(dismissed_at,now()) where recipient_user_id=auth.uid() or subject_owner_user_id=auth.uid();
 update public.network_memberships set status='inactive',updated_at=now() where user_id=auth.uid();
end $$;


notify pgrst,'reload schema';
commit;
