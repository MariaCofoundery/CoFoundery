begin;

-- Direction matters: source_problem_id remains the incoming origin.
alter table public.network_problem_workspaces
  add column published_problem_id uuid references public.network_problems(id) on delete set null;

create table public.network_problem_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.network_problem_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  affected_group text not null check (char_length(btrim(affected_group)) between 1 and 500),
  opportunity_statement text not null check (char_length(btrim(opportunity_statement)) between 1 and 2000),
  possible_value text not null check (char_length(btrim(possible_value)) between 1 and 2000),
  status text not null default 'active' check (status in ('active','archived')),
  venture_id uuid references public.founder_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,workspace_id)
);
alter table public.network_problem_workspace_entries add unique (id,workspace_id);
create table public.network_problem_opportunity_entries (
  workspace_id uuid not null,
  opportunity_id uuid not null,
  entry_id uuid not null,
  primary key (opportunity_id,entry_id),
  foreign key (opportunity_id,workspace_id) references public.network_problem_opportunities(id,workspace_id) on delete cascade,
  foreign key (entry_id,workspace_id) references public.network_problem_workspace_entries(id,workspace_id) on delete cascade
);
create index problem_opportunities_workspace on public.network_problem_opportunities(workspace_id,created_at);
create index problem_opportunities_venture on public.network_problem_opportunities(venture_id) where venture_id is not null;
create index problem_opportunity_entry on public.network_problem_opportunity_entries(entry_id);

-- No client-supplied user ID; use canonical team membership and existing blocks.
create function public.can_access_opportunity_venture(p_venture uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.is_current_user_founder_team_member(p_venture)
    and not exists (select 1 from public.founder_team_members m where m.team_id=p_venture
      and public.is_network_interaction_blocked(auth.uid(),m.user_id));
$$;

create function public.get_problem_workspace_publication_preview(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.network_problem_workspaces; p public.network_problems;
begin
  if public.problem_workspace_role(p_workspace) is distinct from 'owner' then
    raise exception 'workspace_forbidden' using errcode='42501';
  end if;
  select * into w from public.network_problem_workspaces where id=p_workspace and status='active';
  if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
  if coalesce(w.published_problem_id,w.source_problem_id) is not null then
    select * into p from public.network_problems where id=coalesce(w.published_problem_id,w.source_problem_id)
      and author_user_id=auth.uid() and status='active';
    if not found then raise exception 'workspace_publication_unavailable' using errcode='42501'; end if;
  end if;
  -- Only the existing publication can prefill the editor. Never private workspace fields.
  return jsonb_build_object('problem',case when p.id is not null then jsonb_build_object(
    'id',p.id,'title',p.title,'description',p.description,'author_intent',p.author_intent,
    'locations',p.locations,'topics',p.topics,'industries',p.industries,'geographic_scope',p.geographic_scope,
    'visibility',p.visibility,'outlives_account',p.outlives_account,'status',p.status) end,
    'can_publish',public.is_network_member() and exists(select 1 from public.network_profiles where user_id=auth.uid() and status='active'));
end; $$;

create function public.publish_problem_workspace(
  p_workspace uuid, p_fields jsonb, p_expected_problem uuid default null, p_confirm boolean default false
) returns uuid
language plpgsql security definer set search_path='' as $$
declare w public.network_problem_workspaces; v_target uuid; v_problem uuid;
begin
  select * into w from public.network_problem_workspaces where id=p_workspace for update;
  if w.id is null or w.status<>'active' or public.problem_workspace_role(p_workspace) is distinct from 'owner'
    or not public.is_network_member() or p_confirm is distinct from true then
    raise exception 'workspace_forbidden' using errcode='42501';
  end if;
  v_target:=coalesce(w.published_problem_id,w.source_problem_id);
  -- Stale preview / manipulated target cannot choose a different problem or duplicate publication.
  if v_target is distinct from p_expected_problem then
    raise exception 'workspace_publication_changed' using errcode='42501';
  end if;
  if v_target is not null then
    perform 1 from public.network_problems where id=v_target and author_user_id=auth.uid() and status='active' for update;
    if not found then raise exception 'workspace_publication_unavailable' using errcode='42501'; end if;
  end if;
  if jsonb_typeof(p_fields) is distinct from 'object' then raise exception 'invalid_publication' using errcode='23514'; end if;
  if v_target is null then
    insert into public.network_problems(author_user_id,title,description,author_intent,geographic_scope,
      locations,topics,industries,visibility,outlives_account,status,published_at)
    values(auth.uid(),btrim(p_fields->>'title'),btrim(p_fields->>'description'),p_fields->>'author_intent',p_fields->>'geographic_scope',
      array(select jsonb_array_elements_text(p_fields->'locations')),array(select jsonb_array_elements_text(p_fields->'topics')),
      array(select jsonb_array_elements_text(p_fields->'industries')),p_fields->>'visibility',coalesce((p_fields->>'outlives_account')::boolean,false),'active',now())
    returning id into v_problem;
  else
    update public.network_problems set title=btrim(p_fields->>'title'),description=btrim(p_fields->>'description'),
      author_intent=p_fields->>'author_intent',geographic_scope=p_fields->>'geographic_scope',
      locations=array(select jsonb_array_elements_text(p_fields->'locations')),topics=array(select jsonb_array_elements_text(p_fields->'topics')),
      industries=array(select jsonb_array_elements_text(p_fields->'industries')),visibility=p_fields->>'visibility',
      outlives_account=coalesce((p_fields->>'outlives_account')::boolean,false)
    where id=v_target returning id into v_problem;
  end if;
  -- network_problems constraints, publication/profile trigger and slug defaults remain authoritative.
  update public.network_problem_workspaces set published_problem_id=v_problem,updated_at=now() where id=w.id;
  return v_problem;
end; $$;

create function public.save_problem_opportunity(p_workspace uuid,p_title text,p_affected_group text,
  p_statement text,p_value text,p_entries uuid[] default '{}',p_opportunity uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
  if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then
    raise exception 'workspace_forbidden' using errcode='42501';
  end if;
  if p_entries is null or cardinality(p_entries)>50 or exists (
    select 1 from unnest(p_entries) requested(id) where not exists (
      select 1 from public.network_problem_workspace_entries e where e.id=requested.id and e.workspace_id=p_workspace
        and not public.is_network_interaction_blocked(e.author_user_id,auth.uid()))) then
    raise exception 'opportunity_entries_unavailable' using errcode='42501';
  end if;
  if p_opportunity is null then
    insert into public.network_problem_opportunities(workspace_id,created_by,title,affected_group,opportunity_statement,possible_value)
    values(p_workspace,auth.uid(),btrim(p_title),btrim(p_affected_group),btrim(p_statement),btrim(p_value)) returning id into v_id;
  else
    update public.network_problem_opportunities set title=btrim(p_title),affected_group=btrim(p_affected_group),
      opportunity_statement=btrim(p_statement),possible_value=btrim(p_value),updated_at=now()
    where id=p_opportunity and workspace_id=p_workspace and status='active' returning id into v_id;
    if v_id is null then raise exception 'workspace_forbidden' using errcode='42501'; end if;
  end if;
  delete from public.network_problem_opportunity_entries where opportunity_id=v_id;
  insert into public.network_problem_opportunity_entries(workspace_id,opportunity_id,entry_id)
    select p_workspace,v_id,id from (select distinct unnest(p_entries) id) selected;
  update public.network_problem_workspaces set updated_at=now() where id=p_workspace;
  return v_id;
end; $$;

create function public.archive_problem_opportunity(p_workspace uuid,p_opportunity uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
  if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then
    raise exception 'workspace_forbidden' using errcode='42501';
  end if;
  update public.network_problem_opportunities set status='archived',updated_at=now() where id=p_opportunity and workspace_id=p_workspace and status='active';
  if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
  update public.network_problem_workspaces set updated_at=now() where id=p_workspace;
end; $$;

create function public.list_problem_opportunity_ventures(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if public.problem_workspace_role(p_workspace) is distinct from 'owner'
    or not exists(select 1 from public.network_problem_workspaces where id=p_workspace and status='active') then
    raise exception 'workspace_forbidden' using errcode='42501';
  end if;
  return jsonb_build_object('can_create',public.has_founder_assessment_access(),
    'ventures',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name) order by t.created_at,t.id)
      from public.founder_teams t where public.can_access_opportunity_venture(t.id)),'[]'::jsonb));
end; $$;

create function public.link_problem_opportunity_venture(p_workspace uuid,p_opportunity uuid,
  p_venture uuid default null,p_name text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare o public.network_problem_opportunities; v_id uuid;
begin
  perform 1 from public.network_problem_workspaces where id=p_workspace and status='active' for update;
  if not found or public.problem_workspace_role(p_workspace) is distinct from 'owner' then
    raise exception 'workspace_forbidden' using errcode='42501';
  end if;
  select * into o from public.network_problem_opportunities where id=p_opportunity and workspace_id=p_workspace and status='active';
  if not found then raise exception 'workspace_forbidden' using errcode='42501'; end if;
  if o.venture_id is not null then
    if (p_venture is null or p_venture=o.venture_id) and public.can_access_opportunity_venture(o.venture_id) then return o.venture_id; end if;
    raise exception 'opportunity_already_linked' using errcode='42501';
  end if;
  if p_venture is not null then
    -- Membership deletion and insertion use the same canonical team lock.
    perform 1 from public.founder_teams where id=p_venture for update;
    if not found or not public.can_access_opportunity_venture(p_venture) then raise exception 'venture_forbidden' using errcode='42501'; end if;
    v_id:=p_venture;
  else
    if not public.has_founder_assessment_access() then raise exception 'not_a_founder' using errcode='42501'; end if;
    if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then raise exception 'invalid_venture_name' using errcode='23514'; end if;
    -- create_solo_venture() intentionally reuses the oldest solo venture. Here "new" means NEW.
    -- Same canonical tables, access predicate, pre_founder context and membership-limit triggers.
    insert into public.founder_teams(name,team_context) values(btrim(p_name),'pre_founder') returning id into v_id;
    insert into public.founder_team_members(team_id,user_id) values(v_id,auth.uid());
  end if;
  update public.network_problem_opportunities set venture_id=v_id,updated_at=now() where id=o.id;
  update public.network_problem_workspaces set updated_at=now() where id=p_workspace;
  return v_id;
end; $$;

create function public.get_problem_workspace_development(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.network_problem_workspaces; p public.network_problems; v_role text:=public.problem_workspace_role(p_workspace); v_publication jsonb;
begin
  if v_role is null then raise exception 'workspace_forbidden' using errcode='42501'; end if;
  select * into w from public.network_problem_workspaces where id=p_workspace;
  select * into p from public.network_problems where id=coalesce(w.published_problem_id,w.source_problem_id);
  -- A workspace invitation confers no CONNECT/problem/team rights. Reauthorize each link.
  if p.id is not null and (p.author_user_id=auth.uid() or (p.status='active'
    and not public.is_network_interaction_blocked(p.author_user_id,auth.uid())
    and ((public.is_network_member() and (p.author_user_id is null or exists(select 1 from public.network_profiles where user_id=p.author_user_id and status='active')))
      or exists(select 1 from public.get_public_network_problem(p.public_slug))))) then
    v_publication:=jsonb_build_object('id',p.id,'status',p.status,'visibility',p.visibility,
      'href',case when p.visibility='public' and exists(select 1 from public.get_public_network_problem(p.public_slug)) then '/connect/pr/'||p.public_slug else '/connect/problems/'||p.id end);
  end if;
  return jsonb_build_object('publication',v_publication,'has_publication',p.id is not null,
    'opportunities',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'title',o.title,'affected_group',o.affected_group,
      'opportunity_statement',o.opportunity_statement,'possible_value',o.possible_value,'status',o.status,'updated_at',o.updated_at,
      'entry_ids',coalesce((select jsonb_agg(r.entry_id order by r.entry_id) from public.network_problem_opportunity_entries r
        join public.network_problem_workspace_entries e on e.id=r.entry_id where r.opportunity_id=o.id
        and not public.is_network_interaction_blocked(e.author_user_id,auth.uid())),'[]'::jsonb),
      'has_venture',o.venture_id is not null,
      'venture',case when public.can_access_opportunity_venture(o.venture_id) then
        (select jsonb_build_object('id',t.id,'name',t.name) from public.founder_teams t where t.id=o.venture_id) end)
      order by o.created_at,o.id) from public.network_problem_opportunities o where o.workspace_id=w.id),'[]'::jsonb));
end; $$;

alter table public.network_problem_opportunities enable row level security;
alter table public.network_problem_opportunity_entries enable row level security;
revoke all on public.network_problem_opportunities,public.network_problem_opportunity_entries from public,anon,authenticated;
revoke all on function public.can_access_opportunity_venture(uuid) from public,anon,authenticated;
revoke all on function public.get_problem_workspace_publication_preview(uuid),public.publish_problem_workspace(uuid,jsonb,uuid,boolean),
  public.save_problem_opportunity(uuid,text,text,text,text,uuid[],uuid),public.archive_problem_opportunity(uuid,uuid),
  public.list_problem_opportunity_ventures(uuid),public.link_problem_opportunity_venture(uuid,uuid,uuid,text),public.get_problem_workspace_development(uuid)
  from public,anon,authenticated;
grant execute on function public.get_problem_workspace_publication_preview(uuid),public.publish_problem_workspace(uuid,jsonb,uuid,boolean),
  public.save_problem_opportunity(uuid,text,text,text,text,uuid[],uuid),public.archive_problem_opportunity(uuid,uuid),
  public.list_problem_opportunity_ventures(uuid),public.link_problem_opportunity_venture(uuid,uuid,uuid,text),public.get_problem_workspace_development(uuid)
  to authenticated;
notify pgrst,'reload schema';
commit;
