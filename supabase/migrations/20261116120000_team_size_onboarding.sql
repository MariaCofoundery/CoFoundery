begin;

-- Extend the existing invitation, never introduce a second team/invite store.
alter table public.invitations add column target_founder_team_id uuid
 references public.founder_teams(id) on delete restrict;

create function public.guard_invitation_target_team() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_op = 'UPDATE' and new.target_founder_team_id is distinct from old.target_founder_team_id then
  if current_user not in ('postgres','service_role','supabase_admin')
     or old.target_founder_team_id is not null or old.status::text = 'accepted' then
   raise exception 'invitation_target_immutable' using errcode='42501';
  end if;
 end if;
 if new.target_founder_team_id is not null and (tg_op = 'INSERT' or
    new.target_founder_team_id is distinct from old.target_founder_team_id or new.team_context is distinct from old.team_context) then
  if not exists(select 1 from public.founder_team_members m join public.founder_teams t on t.id=m.team_id
   where m.team_id=new.target_founder_team_id and m.user_id=new.inviter_user_id and t.team_context=new.team_context) then
   raise exception 'invitation_target_forbidden' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger trg_invitations_target_team before insert or update on public.invitations
for each row execute function public.guard_invitation_target_team();

create function public.create_founder_team_invitation(
 p_team_id uuid, p_invitee_email text, p_label text, p_inviter_display_name text,
 p_inviter_email text, p_team_context text, p_report_scope text, p_token_hash text, p_expires_at timestamptz
) returns table(invitation_id uuid, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 perform 1 from public.founder_teams where id=p_team_id for update;
 if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
  raise exception 'invitation_target_forbidden' using errcode='42501';
 end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)>=4 then
  raise exception 'founder_team_member_limit_reached' using errcode='23514';
 end if;
 if exists(select 1 from public.founder_team_members m join auth.users u on u.id=m.user_id
  where m.team_id=p_team_id and lower(btrim(u.email))=lower(btrim(p_invitee_email))) then
  raise exception 'already_team_member' using errcode='22023';
 end if;
 select i.invitation_id into v_id from public.create_founder_invitation_reliable(
  p_invitee_email,p_label,p_inviter_display_name,p_inviter_email,p_team_context,p_report_scope,p_token_hash,p_expires_at) i;
 update public.invitations set target_founder_team_id=p_team_id where id=v_id;
 return query select v_id,false;
end $$;
revoke all on function public.create_founder_team_invitation(uuid,text,text,text,text,text,text,text,timestamptz) from public,anon;
grant execute on function public.create_founder_team_invitation(uuid,text,text,text,text,text,text,text,timestamptz) to authenticated;

CREATE OR REPLACE FUNCTION public.ensure_founder_team_after_invitation_acceptance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_relationship_id uuid;
  v_solo_team_id uuid;
begin
  if new.status::text = 'accepted'
     and old.status::text is distinct from 'accepted'
     and new.invitee_user_id is not null
     and new.team_context in ('pre_founder', 'existing_team') then

    select relationship.id
      into v_relationship_id
    from public.relationships relationship
    where relationship.user_low = least(new.inviter_user_id, new.invitee_user_id)
      and relationship.user_high = greatest(new.inviter_user_id, new.invitee_user_id)
    limit 1;

    if v_relationship_id is null then
      raise exception 'accepted_invitation_relationship_missing';
    end if;

    if new.target_founder_team_id is not null then
      -- Re-check the inviter at acceptance: a pending invite is not a grant.
      perform 1 from public.founder_teams where id=new.target_founder_team_id for update;
      if not exists(select 1 from public.founder_team_members where team_id=new.target_founder_team_id and user_id=new.inviter_user_id)
       or exists(select 1 from public.relationships where id=v_relationship_id and founder_team_id is not null and founder_team_id<>new.target_founder_team_id) then
        raise exception 'invitation_target_conflict' using errcode='42501';
      end if;
      perform public.ensure_founder_team_for_relationship(v_relationship_id,new.team_context,new.target_founder_team_id);
      return new;
    end if;

    -- Genau ein Solo-Vorhaben der einladenden Person, im selben Kontext, noch
    -- an keine Beziehung gebunden. Sonst bleibt es bei null, und es entsteht
    -- ein neues Team wie bisher.
    select team.id
      into v_solo_team_id
    from public.founder_teams team
    join public.founder_team_members member on member.team_id = team.id
    where member.user_id = new.inviter_user_id
      and team.team_context = new.team_context
      and not exists (
        select 1 from public.founder_team_members other
        where other.team_id = team.id and other.user_id <> new.inviter_user_id
      )
      and not exists (
        select 1 from public.relationships bound
        where bound.founder_team_id = team.id
      )
    limit 2;

    -- `limit 2` und dann pruefen: Gibt es zwei, ist die Wahl geraten.
    if (
      select count(*)
      from public.founder_teams team
      join public.founder_team_members member on member.team_id = team.id
      where member.user_id = new.inviter_user_id
        and team.team_context = new.team_context
        and not exists (
          select 1 from public.founder_team_members other
          where other.team_id = team.id and other.user_id <> new.inviter_user_id
        )
        and not exists (
          select 1 from public.relationships bound
          where bound.founder_team_id = team.id
        )
    ) <> 1 then
      v_solo_team_id := null;
    end if;

    perform public.ensure_founder_team_for_relationship(
      v_relationship_id,
      new.team_context,
      v_solo_team_id
    );
  end if;

  return new;
end;
$function$;


-- Existing roster/consent and directed-pair semantics also apply to four people.
CREATE OR REPLACE FUNCTION public.create_team_intake(p_mode text, p_name text, p_emails text[], p_hashes text[], p_team uuid DEFAULT NULL::uuid, p_org uuid DEFAULT NULL::uuid, p_reviewers uuid[] DEFAULT NULL::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_emails text[]; v_reviewers uuid[]; v_uid uuid:=auth.uid(); v_n integer; i integer;
begin
 if v_uid is null then raise exception 'intake_forbidden' using errcode='42501'; end if;
 select array_agg(lower(btrim(e)) order by ord) into v_emails from unnest(p_emails) with ordinality x(e,ord);
 v_n:=coalesce(cardinality(v_emails),0);
 if v_n not between 2 and 4 or cardinality(p_hashes) is distinct from v_n or p_mode is null or p_mode not in ('selection','development')
 or p_name is null or char_length(btrim(p_name)) not between 1 and 120
 or (select count(distinct e) from unnest(v_emails) e)<>v_n
 or exists(select 1 from unnest(v_emails) e where e is null or position('@' in e)<=1 or char_length(e)>254)
 or exists(select 1 from unnest(p_hashes) h where h is null or h!~'^[0-9a-f]{64}$')
 or (select count(distinct h) from unnest(p_hashes) h)<>v_n then
 raise exception 'intake_invalid' using errcode='22023'; end if;
 if p_org is null then v_reviewers:=array[v_uid];
 else
  select array_agg(distinct id) into v_reviewers from unnest(coalesce(p_reviewers,'{}')||array[v_uid]) id;
  if not exists(select 1 from public.advisor_orgs where id=p_org and status='active')
  or not public.is_advisor_org_member(p_org) or cardinality(v_reviewers)>10
  or exists(select 1 from unnest(v_reviewers) id where id is null or not public.is_advisor_org_member(p_org,id)) then
   raise exception 'intake_forbidden' using errcode='42501'; end if;
 end if;
 if exists(select 1 from auth.users u where u.id=any(v_reviewers) and lower(btrim(u.email))=any(v_emails)) then
  raise exception 'intake_reviewer_is_founder' using errcode='22023'; end if;
 if p_team is not null then
  perform 1 from public.founder_teams where id=p_team for update;
  if not public.team_intake_existing_team_allowed(p_team) or
   (select count(*) from public.founder_team_members where team_id=p_team)<>v_n or
   exists(select 1 from public.founder_team_members m join auth.users u on u.id=m.user_id where m.team_id=p_team and not(lower(btrim(u.email))=any(v_emails))) then
   raise exception 'intake_team_mismatch' using errcode='42501'; end if;
 end if;
 -- Bounded use, without creating a generic notification/rate-limit platform.
 if (select count(*) from public.team_intake_rounds where created_by=v_uid and created_at>now()-interval '1 day')>=30 then
  raise exception 'intake_daily_limit' using errcode='54000'; end if;
 insert into public.team_intake_rounds(founder_team_id,team_name,mode,advisor_user_id,org_id,created_by)
 values(p_team,btrim(p_name),p_mode,case when p_org is null then v_uid end,p_org,v_uid) returning id into v_id;
 insert into public.team_intake_reviewers select v_id,id from unnest(v_reviewers) id;
 for i in 1..v_n loop
  insert into public.team_intake_participants(round_id,email,token_hash) values(v_id,v_emails[i],p_hashes[i]);
 end loop;
 return v_id;
end; $function$;


-- Existing roster/consent and directed-pair semantics also apply to four people.
CREATE OR REPLACE FUNCTION public.team_intake_roster_matches(p_round uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.team_intake_rounds r where r.id=p_round and r.founder_team_id is not null
 and (select count(*) from public.team_intake_participants p where p.round_id=r.id) between 2 and 4
 and not exists(select 1 from public.team_intake_participants p where p.round_id=r.id and (p.user_id is null or p.confirmed_at is null
 or not exists(select 1 from public.founder_team_members m where m.team_id=r.founder_team_id and m.user_id=p.user_id)))
 and not exists(select 1 from public.founder_team_members m where m.team_id=r.founder_team_id
 and not exists(select 1 from public.team_intake_participants p where p.round_id=r.id and p.user_id=m.user_id)));
$function$;


commit;
