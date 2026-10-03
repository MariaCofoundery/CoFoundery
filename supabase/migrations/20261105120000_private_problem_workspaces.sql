begin;

create table public.network_problem_workspaces (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 160),
 description text not null default '' check(char_length(description)<=3000),
 status text not null default 'active' check(status in ('active','archived')),
 source_problem_id uuid references public.network_problems(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Owner is derived exclusively from the workspace, never a mutable membership role.
create table public.network_problem_workspace_members (
 workspace_id uuid not null references public.network_problem_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('contributor','viewer')),
 created_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create table public.network_problem_workspace_entries (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.network_problem_workspaces(id) on delete cascade,
 author_user_id uuid not null references auth.users(id) on delete cascade,
 type text not null check(type in ('observation','perspective','assumption','approach','test')),
 content text not null check(char_length(btrim(content)) between 1 and 6000),
 source_url text check(source_url is null or (char_length(source_url)<=2048 and source_url ~ '^https?://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$')),
 source_label text check(source_label is null or char_length(btrim(source_label)) between 1 and 200),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(type in ('observation','perspective') or (source_url is null and source_label is null))
);
create table public.network_problem_workspace_invites (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.network_problem_workspaces(id) on delete cascade,
 email text not null check(email=lower(btrim(email)) and position('@' in email)>1 and char_length(email)<=254),
 role text not null check(role in ('contributor','viewer')),
 token_hash text unique check(token_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'pending' check(status in ('pending','claimed','revoked')),
 expires_at timestamptz not null default now()+interval '14 days',
 created_at timestamptz not null default now(), rotated_at timestamptz,
 claimed_by uuid references auth.users(id) on delete cascade,
 claimed_at timestamptz, revoked_at timestamptz,
 check((status='pending')=(token_hash is not null))
);
create unique index problem_workspace_pending_email on public.network_problem_workspace_invites(workspace_id,email) where status='pending';
create index problem_workspace_owner on public.network_problem_workspaces(owner_user_id);
create index problem_workspace_member on public.network_problem_workspace_members(user_id,workspace_id);
create index problem_workspace_entries_order on public.network_problem_workspace_entries(workspace_id,created_at);

create function public.problem_workspace_role(p_workspace uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when w.owner_user_id=auth.uid() then 'owner' else m.role end
 from public.network_problem_workspaces w
 left join public.network_problem_workspace_members m on m.workspace_id=w.id and m.user_id=auth.uid()
 where w.id=p_workspace and auth.uid() is not null
 and not exists(select 1 from public.network_memberships n where n.user_id=auth.uid() and n.status<>'active')
 and (w.owner_user_id=auth.uid() or (m.user_id is not null
 and not public.is_network_interaction_blocked(w.owner_user_id,auth.uid())
 and not exists(select 1 from public.network_problem_workspace_members other where other.workspace_id=w.id
 and public.is_network_interaction_blocked(other.user_id,auth.uid()))));
$$;
create function public.create_problem_workspace(p_title text,p_description text default '',p_problem uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.is_network_member() then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 if p_problem is not null and not exists(select 1 from public.network_problems where id=p_problem and author_user_id=auth.uid() and status='active') then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 insert into public.network_problem_workspaces(owner_user_id,title,description,source_problem_id) values(auth.uid(),btrim(p_title),btrim(p_description),p_problem) returning id into v_id;
 return v_id;
end; $$;
create function public.update_problem_workspace(p_workspace uuid,p_title text,p_description text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
 if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_workspaces set title=btrim(p_title),description=btrim(p_description),updated_at=now() where id=p_workspace;
end; $$;
create function public.archive_problem_workspace(p_workspace uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace for update;
 if public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_workspaces set status='archived',updated_at=now() where id=p_workspace;
 update public.network_problem_workspace_invites set status='revoked',revoked_at=now(),token_hash=null where workspace_id=p_workspace and status='pending';
end; $$;
create function public.save_problem_workspace_entry(p_workspace uuid,p_type text,p_content text,p_source_url text default null,p_source_label text default null,p_entry uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
 if not found or coalesce(public.problem_workspace_role(p_workspace),'') not in ('owner','contributor') then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 if p_entry is null then
  insert into public.network_problem_workspace_entries(workspace_id,author_user_id,type,content,source_url,source_label)
  values(p_workspace,auth.uid(),p_type,btrim(p_content),nullif(btrim(p_source_url),''),nullif(btrim(p_source_label),'')) returning id into v_id;
 else
  -- Even the owner cannot silently rewrite someone else's statement.
  update public.network_problem_workspace_entries set type=p_type,content=btrim(p_content),source_url=nullif(btrim(p_source_url),''),source_label=nullif(btrim(p_source_label),''),updated_at=now()
  where id=p_entry and workspace_id=p_workspace and author_user_id=auth.uid() returning id into v_id;
  if v_id is null then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 end if;
 update public.network_problem_workspaces set updated_at=now() where id=p_workspace;
 return v_id;
end; $$;
create function public.delete_problem_workspace_entry(p_workspace uuid,p_entry uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
 v_role:=public.problem_workspace_role(p_workspace);
 if not found or coalesce(v_role,'') not in ('owner','contributor') then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 delete from public.network_problem_workspace_entries where id=p_entry and workspace_id=p_workspace and (author_user_id=auth.uid() or v_role='owner');
 if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_workspaces set updated_at=now() where id=p_workspace;
end; $$;
create function public.set_problem_workspace_member(p_workspace uuid,p_user uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace for update;
 if public.problem_workspace_role(p_workspace) is distinct from 'owner' or p_role is null or p_role not in ('contributor','viewer','remove') then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 if p_role='remove' then
  delete from public.network_problem_workspace_members where workspace_id=p_workspace and user_id=p_user;
  if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
  update public.network_problem_workspace_invites set status='revoked',revoked_at=now(),token_hash=null
  where workspace_id=p_workspace and status='pending' and email=(select lower(btrim(email)) from auth.users where id=p_user);
 else
  update public.network_problem_workspace_members set role=p_role where workspace_id=p_workspace and user_id=p_user;
  if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 end if;
 update public.network_problem_workspaces set updated_at=now() where id=p_workspace;
end; $$;
create function public.invite_problem_workspace_member(p_workspace uuid,p_email text,p_role text,p_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_email text:=lower(btrim(p_email)); v_target uuid; v_id uuid;
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
 if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 select id into v_target from auth.users where lower(btrim(email))=v_email;
 if v_target=auth.uid() or exists(select 1 from public.network_problem_workspace_members where workspace_id=p_workspace and user_id=v_target)
 or public.is_network_interaction_blocked(auth.uid(),v_target)
 or exists(select 1 from public.network_problem_workspace_members where workspace_id=p_workspace and public.is_network_interaction_blocked(user_id,v_target)) then raise exception 'workspace_invite_unavailable' using errcode='42501'; end if;
 if (select count(*) from public.network_problem_workspace_invites where workspace_id=p_workspace and created_at>now()-interval '1 day')>=30 then raise exception 'workspace_invite_limit' using errcode='54000'; end if;
 insert into public.network_problem_workspace_invites(workspace_id,email,role,token_hash) values(p_workspace,v_email,p_role,p_hash) returning id into v_id;
 return v_id;
end; $$;
create function public.rotate_problem_workspace_invite(p_workspace uuid,p_invite uuid,p_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare v_email text;
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
 if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_workspace_invites set token_hash=p_hash,expires_at=now()+interval '14 days',rotated_at=now()
 where id=p_invite and workspace_id=p_workspace and status='pending' and (rotated_at is null or rotated_at<now()-interval '1 minute') returning email into v_email;
 if v_email is null then raise exception 'workspace_invite_unavailable' using errcode='42501'; end if;
 return v_email;
end; $$;
create function public.revoke_problem_workspace_invite(p_workspace uuid,p_invite uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.network_problem_workspaces where id=p_workspace for update;
 if public.problem_workspace_role(p_workspace) is distinct from 'owner' then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 update public.network_problem_workspace_invites set status='revoked',revoked_at=now(),token_hash=null where id=p_invite and workspace_id=p_workspace and status='pending';
 if not found then raise exception 'workspace_invite_unavailable' using errcode='42501'; end if;
end; $$;
create function public.claim_problem_workspace_invite(p_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_workspace uuid; v_email text; i public.network_problem_workspace_invites; w public.network_problem_workspaces;
begin
 select lower(btrim(email)) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null or exists(select 1 from public.network_memberships where user_id=auth.uid() and status<>'active') then raise exception 'workspace_invite_unavailable' using errcode='42501'; end if;
 select workspace_id into v_workspace from public.network_problem_workspace_invites where token_hash=p_hash;
 select * into w from public.network_problem_workspaces where id=v_workspace for update;
 select * into i from public.network_problem_workspace_invites where token_hash=p_hash and status='pending' and expires_at>now() and email=v_email;
 if w.id is null or w.status<>'active' or i.id is null or w.owner_user_id=auth.uid()
 or public.is_network_interaction_blocked(w.owner_user_id,auth.uid())
 or exists(select 1 from public.network_problem_workspace_members where workspace_id=w.id and public.is_network_interaction_blocked(user_id,auth.uid())) then raise exception 'workspace_invite_unavailable' using errcode='42501'; end if;
 insert into public.network_problem_workspace_members(workspace_id,user_id,role) values(w.id,auth.uid(),i.role);
 update public.network_problem_workspace_invites set status='claimed',claimed_by=auth.uid(),claimed_at=now(),token_hash=null where id=i.id;
 update public.network_problem_workspaces set updated_at=now() where id=w.id;
 return w.id;
end; $$;
create function public.get_problem_workspace(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.network_problem_workspaces; v_role text:=public.problem_workspace_role(p_workspace);
begin
 if v_role is null then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 select * into w from public.network_problem_workspaces where id=p_workspace;
 return jsonb_build_object('id',w.id,'title',w.title,'description',w.description,'status',w.status,'role',v_role,'updated_at',w.updated_at,
 -- Only its original author gets a source link; no rights to the source are conferred.
 'source_problem_id',case when v_role='owner' then w.source_problem_id end,
 'members',(select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',coalesce(nullif(c.display_name,''),'Member')) order by m.role,m.user_id)
 from (select w.owner_user_id user_id,'owner'::text role union all select user_id,role from public.network_problem_workspace_members where workspace_id=w.id) m left join public.person_core c on c.user_id=m.user_id),
 'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'author_user_id',e.author_user_id,'author_name',coalesce(nullif(c.display_name,''),'Member'),'type',e.type,'content',e.content,'source_url',e.source_url,'source_label',e.source_label,'created_at',e.created_at,'updated_at',e.updated_at) order by e.created_at,e.id)
 from public.network_problem_workspace_entries e left join public.person_core c on c.user_id=e.author_user_id where e.workspace_id=w.id and not public.is_network_interaction_blocked(e.author_user_id,auth.uid())),'[]'::jsonb),
 'invites',case when v_role='owner' then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,'expires_at',i.expires_at) order by i.created_at desc) from public.network_problem_workspace_invites i where i.workspace_id=w.id),'[]'::jsonb) else '[]'::jsonb end);
end; $$;
create function public.list_problem_workspaces() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'workspace_forbidden' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'title',w.title,'status',w.status,'updated_at',w.updated_at,'role',public.problem_workspace_role(w.id)) order by w.updated_at desc,w.id)
 from public.network_problem_workspaces w where public.problem_workspace_role(w.id) is not null),'[]'::jsonb);
end; $$;
-- An invitation email can outlive an unclaimed account: remove it on deletion too.
create function public.delete_problem_workspace_invites_for_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from public.network_problem_workspace_invites where email=lower(btrim(old.email));
 return old;
end; $$;
create trigger problem_workspace_account_deleted before delete on auth.users for each row execute function public.delete_problem_workspace_invites_for_account();

do $$ declare t text; f record; begin
 foreach t in array array['network_problem_workspaces','network_problem_workspace_members','network_problem_workspace_entries','network_problem_workspace_invites'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%problem_workspace%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.proname not in ('problem_workspace_role','delete_problem_workspace_invites_for_account') then execute format('grant execute on function %s to authenticated',f.signature); end if;
 end loop;
end; $$;
notify pgrst,'reload schema';
commit;
