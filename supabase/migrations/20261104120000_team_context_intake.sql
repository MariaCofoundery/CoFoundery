begin;

-- Purpose-bound rounds. Invitations may precede accounts/team confirmation.
create table public.team_intake_rounds (
 id uuid primary key default gen_random_uuid(),
 founder_team_id uuid references public.founder_teams(id) on delete cascade,
 team_name text not null check (char_length(btrim(team_name)) between 1 and 120),
 mode text not null check (mode in ('selection','development')),
 schema_version smallint not null default 1 check(schema_version=1),
 advisor_user_id uuid references auth.users(id) on delete cascade,
 org_id uuid references public.advisor_orgs(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'inviting' check(status in ('inviting','draft','published','revoked')),
 created_at timestamptz not null default now(),
 opened_at timestamptz, published_at timestamptz, revoked_at timestamptz,
 check (num_nonnulls(advisor_user_id, org_id)=1),
 check (status <> 'published' or (published_at is not null and founder_team_id is not null)),
 check ((status='revoked')=(revoked_at is not null))
);
create table public.team_intake_reviewers (
 round_id uuid not null references public.team_intake_rounds(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(round_id,user_id)
);
create table public.team_intake_participants (
 id uuid primary key default gen_random_uuid(),
 round_id uuid not null references public.team_intake_rounds(id) on delete cascade,
 email text not null check(email=lower(btrim(email)) and position('@' in email)>1 and char_length(email)<=254),
 user_id uuid references auth.users(id) on delete cascade,
 token_hash text unique check(token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null default now()+interval '14 days',
 claimed_at timestamptz, confirmed_at timestamptz,
 unique(round_id,email), unique(round_id,user_id)
);
create table public.team_intake_answers (
 round_id uuid not null, author_user_id uuid not null,
 shared jsonb not null default '{}' check(jsonb_typeof(shared)='object'),
 updated_at timestamptz not null default now(), submitted_at timestamptz,
 primary key(round_id,author_user_id),
 foreign key(round_id,author_user_id) references public.team_intake_participants(round_id,user_id) on delete cascade
);
create table public.team_intake_pair_answers (
 round_id uuid not null, author_user_id uuid not null, target_user_id uuid not null,
 answers jsonb not null check(jsonb_typeof(answers)='object'),
 primary key(round_id,author_user_id,target_user_id),
 foreign key(round_id,author_user_id) references public.team_intake_answers(round_id,author_user_id) on delete cascade,
 foreign key(round_id,target_user_id) references public.team_intake_participants(round_id,user_id) on delete cascade,
 check(author_user_id<>target_user_id)
);
-- Separate storage: public report queries never join this table.
create table public.team_intake_private_notes (
 round_id uuid not null, author_user_id uuid not null,
 requested boolean not null default false,
 note text not null default '' check(char_length(note)<=1500),
 primary key(round_id,author_user_id),
 foreign key(round_id,author_user_id) references public.team_intake_answers(round_id,author_user_id) on delete cascade
);
create index team_intake_participant_user on public.team_intake_participants(user_id,round_id);
create index team_intake_reviewer_user on public.team_intake_reviewers(user_id,round_id);
create index team_intake_team on public.team_intake_rounds(founder_team_id);

-- Internal predicates: no caller-supplied acting user. All public entry points
-- use session identity. Tables are RPC-only, with RLS and no client table grants.
create function public.team_intake_is_reviewer(p_round uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_intake_rounds r
 join public.team_intake_reviewers v on v.round_id=r.id and v.user_id=auth.uid()
 where r.id=p_round and (r.advisor_user_id=auth.uid() or
 (exists(select 1 from public.advisor_orgs o where o.id=r.org_id and o.status='active')
 and exists(select 1 from public.advisor_org_members m where m.org_id=r.org_id and m.user_id=auth.uid() and m.status='active'))));
$$;
create function public.team_intake_roster_matches(p_round uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_intake_rounds r where r.id=p_round and r.founder_team_id is not null
 and (select count(*) from public.team_intake_participants p where p.round_id=r.id) between 2 and 3
 and not exists(select 1 from public.team_intake_participants p where p.round_id=r.id and (p.user_id is null or p.confirmed_at is null
 or not exists(select 1 from public.founder_team_members m where m.team_id=r.founder_team_id and m.user_id=p.user_id)))
 and not exists(select 1 from public.founder_team_members m where m.team_id=r.founder_team_id
 and not exists(select 1 from public.team_intake_participants p where p.round_id=r.id and p.user_id=m.user_id)));
$$;
create function public.team_intake_can_read(p_round uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.team_intake_rounds r
 where r.id=p_round and r.status='published' and public.team_intake_roster_matches(r.id)
 and (public.team_intake_is_reviewer(r.id) or exists(select 1 from public.team_intake_participants p where p.round_id=r.id and p.user_id=auth.uid())));
$$;
create function public.team_intake_existing_team_allowed(p_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.relationship_advisors a join public.relationships r on r.id=a.relationship_id
 where r.founder_team_id=p_team and a.advisor_user_id=auth.uid() and a.status='linked'
 and a.founder_a_approved and a.founder_b_approved and a.revoked_at is null
 and ((select count(*) from public.founder_team_members m where m.team_id=p_team)=2
 or exists(select 1 from public.founder_team_advisor_setup_grants g
 where g.team_id=p_team and g.advisor_user_id=auth.uid() and g.status='active' and g.revoked_at is null
 and public.is_founder_team_setup_advisor_source_eligible(g.team_id,g.source_relationship_advisor_id,auth.uid())
 and not exists(select 1 from public.founder_team_members m where m.team_id=p_team and not exists(
 select 1 from public.founder_team_advisor_setup_consents c where c.grant_id=g.id and c.founder_user_id=m.user_id)))))
 or exists(select 1 from public.team_intake_rounds r where r.founder_team_id=p_team and public.team_intake_can_read(r.id) and public.team_intake_is_reviewer(r.id));
$$;

create function public.get_team_intake_options() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'intake_forbidden' using errcode='42501'; end if;
 return jsonb_build_object('user_id',auth.uid(),'orgs',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'members',
 (select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(c.display_name,''),'Advisor'))) from public.advisor_org_members m
 left join public.person_core c on c.user_id=m.user_id where m.org_id=o.id and m.status='active')))
 from public.advisor_orgs o where o.status='active' and public.is_advisor_org_member(o.id)),'[]'::jsonb),
 'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',coalesce(t.name,'Team'))) from public.founder_teams t
 where public.team_intake_existing_team_allowed(t.id)),'[]'::jsonb));
end; $$;

create function public.create_team_intake(p_mode text,p_name text,p_emails text[],p_hashes text[],p_team uuid default null,p_org uuid default null,p_reviewers uuid[] default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_emails text[]; v_reviewers uuid[]; v_uid uuid:=auth.uid(); v_n integer; i integer;
begin
 if v_uid is null then raise exception 'intake_forbidden' using errcode='42501'; end if;
 select array_agg(lower(btrim(e)) order by ord) into v_emails from unnest(p_emails) with ordinality x(e,ord);
 v_n:=coalesce(cardinality(v_emails),0);
 if v_n not between 2 and 3 or cardinality(p_hashes) is distinct from v_n or p_mode is null or p_mode not in ('selection','development')
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
end; $$;

-- No unauthenticated bearer preview; email must match a verified auth account.
create function public.claim_team_intake(p_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_round uuid; v_email text; v_user uuid:=auth.uid(); v_team uuid;
begin
 select lower(btrim(email)) into v_email from auth.users where id=v_user and email_confirmed_at is not null;
 if v_email is null then raise exception 'intake_forbidden' using errcode='42501'; end if;
 select round_id into v_round from public.team_intake_participants where token_hash=p_hash and email=v_email and expires_at>now() and user_id is null;
 if v_round is null then raise exception 'intake_invite_invalid' using errcode='42501'; end if;
 select founder_team_id into v_team from public.team_intake_rounds where id=v_round;
 perform 1 from public.founder_teams where id=v_team for update;
 perform 1 from public.team_intake_rounds where id=v_round and status='inviting' for update;
 if not found or exists(select 1 from public.team_intake_reviewers where round_id=v_round and user_id=v_user) then raise exception 'intake_invite_invalid' using errcode='42501'; end if;
 update public.team_intake_participants set user_id=v_user,claimed_at=now(),token_hash=null
 where round_id=v_round and token_hash=p_hash and email=v_email and user_id is null and expires_at>now();
 if not found then raise exception 'intake_invite_invalid' using errcode='42501'; end if;
 return v_round;
end; $$;

create function public.confirm_team_intake(p_round uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.team_intake_rounds; v_team uuid;
begin
 select founder_team_id into v_team from public.team_intake_rounds where id=p_round;
 perform 1 from public.founder_teams where id=v_team for update;
 select * into r from public.team_intake_rounds where id=p_round for update;
 if r.id is null or r.status<>'inviting' or not exists(select 1 from public.team_intake_participants where round_id=p_round and user_id=auth.uid())
 or exists(select 1 from public.team_intake_participants where round_id=p_round and user_id is null) then
 raise exception 'intake_not_ready' using errcode='42501'; end if;
 update public.team_intake_participants set confirmed_at=coalesce(confirmed_at,now()) where round_id=p_round and user_id=auth.uid();
 if not exists(select 1 from public.team_intake_participants where round_id=p_round and confirmed_at is null) then
  if r.founder_team_id is null then
   insert into public.founder_teams(name,team_context) values(r.team_name,'pre_founder') returning id into v_team;
   insert into public.founder_team_members(team_id,user_id) select v_team,user_id from public.team_intake_participants where round_id=p_round;
   update public.team_intake_rounds set founder_team_id=v_team where id=p_round;
  end if;
  if not public.team_intake_roster_matches(p_round) then raise exception 'intake_team_mismatch' using errcode='42501'; end if;
  update public.team_intake_rounds set status='draft',opened_at=now() where id=p_round;
 end if;
end; $$;

-- Bounded JSON with a closed field vocabulary, not an arbitrary answers engine.
create function public.team_intake_validate(p_data jsonb,p_pair boolean,p_mode text,p_complete boolean) returns void
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; allowed text[];
begin
 allowed:=case when p_pair then array['origin','since','worked','work_context','appreciation','complement']||
 (case when p_mode='selection' then array['contribution'] else array['clarity','unused_strength'] end)
 else array['formation','formation_other','venture_since','existed','existing_context']||
 (case when p_mode='selection' then array['motivation','open_topics','open_text'] else array['works_well','team_clarity'] end) end;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>25000 then raise exception 'intake_invalid' using errcode='22023'; end if;
 for k,v in select * from jsonb_each(p_data) loop
  if not(k=any(allowed)) then raise exception 'intake_invalid_field' using errcode='22023'; end if;
  if k='worked' then
   if jsonb_typeof(v)<>'boolean' then raise exception 'intake_invalid' using errcode='22023'; end if;
  elsif k='open_topics' then
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>11 then raise exception 'intake_invalid' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements_text(v) t where t is null or t not in ('roles','responsibility','time','decisions','equity','money','goals','collaboration','other','none','conversation')) then raise exception 'intake_invalid' using errcode='22023'; end if;
   if (v ? 'none' or v ? 'conversation') and jsonb_array_length(v)>1 then raise exception 'intake_topics_exclusive' using errcode='22023'; end if;
  else
   if jsonb_typeof(v)<>'string' or char_length(p_data->>k)>1500 then raise exception 'intake_invalid' using errcode='22023'; end if;
  end if;
 end loop;
 if p_data ? 'origin' and p_data->>'origin' not in ('','education','workplace','project','private','accelerator','matching','community','other') then raise exception 'intake_invalid' using errcode='22023'; end if;
 if p_data ? 'formation' and p_data->>'formation' not in ('','together','joined','cofounder_search','network','prior_work','other') then raise exception 'intake_invalid' using errcode='22023'; end if;
 if p_data ? 'existed' and p_data->>'existed' not in ('','yes','no','partly') then raise exception 'intake_invalid' using errcode='22023'; end if;
 if p_complete then
  if p_pair and (nullif(btrim(p_data->>'origin'),'') is null or nullif(btrim(p_data->>'since'),'') is null or not(p_data ? 'worked')
    or (p_data->>'worked'='true' and nullif(btrim(p_data->>'work_context'),'') is null)) then raise exception 'intake_incomplete' using errcode='23514'; end if;
  if not p_pair and (nullif(btrim(p_data->>'formation'),'') is null or nullif(btrim(p_data->>'venture_since'),'') is null or nullif(btrim(p_data->>'existed'),'') is null
    or (p_data->>'formation'='other' and nullif(btrim(p_data->>'formation_other'),'') is null)) then raise exception 'intake_incomplete' using errcode='23514'; end if;
 end if;
end; $$;

create function public.save_team_intake(p_round uuid,p_shared jsonb,p_pairs jsonb,p_private_requested boolean default false,p_private_note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare r public.team_intake_rounds; x jsonb; v_target uuid; v_team uuid;
begin
 select founder_team_id into v_team from public.team_intake_rounds where id=p_round;
 perform 1 from public.founder_teams where id=v_team for update;
 select * into r from public.team_intake_rounds where id=p_round for update;
 if r.id is null or r.status<>'draft' or not public.team_intake_roster_matches(p_round)
 or not exists(select 1 from public.team_intake_participants where round_id=p_round and user_id=auth.uid())
 or exists(select 1 from public.team_intake_answers where round_id=p_round and author_user_id=auth.uid() and submitted_at is not null) then
 raise exception 'intake_forbidden' using errcode='42501'; end if;
 perform public.team_intake_validate(p_shared,false,r.mode,false);
 if p_pairs is null or jsonb_typeof(p_pairs)<>'array' or jsonb_array_length(p_pairs)<> (select count(*)-1 from public.team_intake_participants where round_id=p_round)
 or p_private_requested is null or p_private_note is null or char_length(p_private_note)>1500 then raise exception 'intake_invalid' using errcode='22023'; end if;
 if (select count(distinct entry.value->>'target_user_id') from jsonb_array_elements(p_pairs) entry(value))<>jsonb_array_length(p_pairs) then raise exception 'intake_invalid' using errcode='22023'; end if;
 insert into public.team_intake_answers(round_id,author_user_id,shared) values(p_round,auth.uid(),p_shared)
 on conflict(round_id,author_user_id) do update set shared=excluded.shared,updated_at=now();
 for x in select * from jsonb_array_elements(p_pairs) loop
  v_target:=(x->>'target_user_id')::uuid;
  if v_target is null or v_target=auth.uid() or not exists(select 1 from public.team_intake_participants where round_id=p_round and user_id=v_target) then raise exception 'intake_target_forbidden' using errcode='42501'; end if;
  perform public.team_intake_validate(x->'data',true,r.mode,false);
  insert into public.team_intake_pair_answers values(p_round,auth.uid(),v_target,x->'data')
  on conflict(round_id,author_user_id,target_user_id) do update set answers=excluded.answers;
 end loop;
 insert into public.team_intake_private_notes values(p_round,auth.uid(),p_private_requested,btrim(p_private_note))
 on conflict(round_id,author_user_id) do update set requested=excluded.requested,note=excluded.note;
end; $$;

create function public.submit_team_intake(p_round uuid,p_release boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.team_intake_rounds; a public.team_intake_answers; x record; v_team uuid;
begin
 -- Team then round is the same lock order as membership mutations. Last submit
 -- and withdrawal serialize on this round: neither can resurrect a revocation.
 select founder_team_id into v_team from public.team_intake_rounds where id=p_round;
 perform 1 from public.founder_teams where id=v_team for update;
 select * into r from public.team_intake_rounds where id=p_round for update;
 if r.id is null or r.status<>'draft' or not public.team_intake_roster_matches(p_round) or p_release is distinct from true then raise exception 'intake_forbidden' using errcode='42501'; end if;
 select * into a from public.team_intake_answers where round_id=p_round and author_user_id=auth.uid();
 if a.author_user_id is null or a.submitted_at is not null then raise exception 'intake_not_ready' using errcode='42501'; end if;
 perform public.team_intake_validate(a.shared,false,r.mode,true);
 if (select count(*) from public.team_intake_pair_answers where round_id=p_round and author_user_id=auth.uid())<>(select count(*)-1 from public.team_intake_participants where round_id=p_round) then raise exception 'intake_incomplete' using errcode='23514'; end if;
 for x in select answers from public.team_intake_pair_answers where round_id=p_round and author_user_id=auth.uid() loop
  perform public.team_intake_validate(x.answers,true,r.mode,true);
 end loop;
 update public.team_intake_answers set submitted_at=now() where round_id=p_round and author_user_id=auth.uid();
 if not exists(select 1 from public.team_intake_participants p where p.round_id=p_round and not exists(
 select 1 from public.team_intake_answers released where released.round_id=p_round and released.author_user_id=p.user_id and released.submitted_at is not null)) then
  update public.team_intake_rounds set status='published',published_at=now() where id=p_round;
 end if;
end; $$;

create function public.revoke_team_intake(p_round uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.team_intake_is_reviewer(p_round) and not exists(select 1 from public.team_intake_participants where round_id=p_round and user_id=auth.uid()) then raise exception 'intake_forbidden' using errcode='42501'; end if;
 update public.team_intake_rounds set status='revoked',revoked_at=coalesce(revoked_at,now()) where id=p_round;
 update public.team_intake_participants set token_hash=null where round_id=p_round;
end; $$;

create function public.get_team_intake(p_round uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.team_intake_rounds;
begin
 select * into r from public.team_intake_rounds where id=p_round;
 if r.id is null or (not public.team_intake_is_reviewer(p_round) and not exists(select 1 from public.team_intake_participants where round_id=p_round and user_id=auth.uid())) then raise exception 'intake_forbidden' using errcode='42501'; end if;
 return jsonb_build_object('id',r.id,'team_id',r.founder_team_id,'name',r.team_name,'mode',r.mode,'status',r.status,
 'created_at',r.created_at,'published_at',r.published_at,'is_reviewer',public.team_intake_is_reviewer(r.id),'is_creator',r.created_by=auth.uid(),
 'org_name',(select name from public.advisor_orgs where id=r.org_id),
 'reviewers',(select jsonb_agg(jsonb_build_object('id',v.user_id,'name',coalesce(nullif(c.display_name,''),'Advisor'))) from public.team_intake_reviewers v left join public.person_core c on c.user_id=v.user_id where v.round_id=r.id),
 'participants',(select jsonb_agg(jsonb_build_object('id',p.id,'user_id',p.user_id,'email',p.email,'name',coalesce(nullif(c.display_name,''),p.email),
 'claimed',p.claimed_at is not null,'confirmed',p.confirmed_at is not null,'submitted',a.submitted_at is not null) order by p.email)
 from public.team_intake_participants p left join public.person_core c on c.user_id=p.user_id
 left join public.team_intake_answers a on a.round_id=p.round_id and a.author_user_id=p.user_id where p.round_id=r.id));
end; $$;
create function public.list_team_intakes() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'intake_forbidden' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(public.get_team_intake(r.id) order by r.created_at desc) from public.team_intake_rounds r
 where public.team_intake_is_reviewer(r.id) or exists(select 1 from public.team_intake_participants p where p.round_id=r.id and p.user_id=auth.uid())),'[]'::jsonb);
end; $$;
create function public.get_team_intake_own_answers(p_round uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.team_intake_rounds r join public.team_intake_participants p on p.round_id=r.id
 where r.id=p_round and p.user_id=auth.uid() and r.status in ('draft','published') and public.team_intake_roster_matches(r.id)) then raise exception 'intake_forbidden' using errcode='42501'; end if;
 return jsonb_build_object('shared',coalesce((select shared from public.team_intake_answers where round_id=p_round and author_user_id=auth.uid()),'{}'::jsonb),
 'pairs',coalesce((select jsonb_agg(jsonb_build_object('target_user_id',target_user_id,'data',answers)) from public.team_intake_pair_answers where round_id=p_round and author_user_id=auth.uid()),'[]'::jsonb),
 'private_requested',coalesce((select requested from public.team_intake_private_notes where round_id=p_round and author_user_id=auth.uid()),false),
 'private_note',coalesce((select note from public.team_intake_private_notes where round_id=p_round and author_user_id=auth.uid()),''));
end; $$;
create function public.get_team_intake_report(p_round uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.team_intake_can_read(p_round) then raise exception 'intake_forbidden' using errcode='42501'; end if;
 return jsonb_build_object('common',(select jsonb_agg(jsonb_build_object('author_user_id',author_user_id,'data',shared)) from public.team_intake_answers where round_id=p_round),
 'pairs',(select jsonb_agg(jsonb_build_object('author_user_id',author_user_id,'target_user_id',target_user_id,'data',answers)) from public.team_intake_pair_answers where round_id=p_round));
end; $$;
create function public.get_team_intake_private_notes(p_round uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.team_intake_can_read(p_round) or not public.team_intake_is_reviewer(p_round) then raise exception 'intake_forbidden' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('author_user_id',author_user_id,'requested',requested,'note',note)) from public.team_intake_private_notes where round_id=p_round and (requested or note<>'')),'[]'::jsonb);
end; $$;

create function public.rotate_team_intake_invite(p_round uuid,p_participant uuid,p_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare v_email text;
begin
 perform 1 from public.team_intake_rounds where id=p_round and status='inviting' and created_by=auth.uid() for update;
 if not found or not public.team_intake_is_reviewer(p_round) then raise exception 'intake_forbidden' using errcode='42501'; end if;
 if p_hash is null or p_hash!~'^[0-9a-f]{64}$' then raise exception 'intake_invalid' using errcode='22023'; end if;
 update public.team_intake_participants set token_hash=p_hash,expires_at=now()+interval '14 days'
 where round_id=p_round and id=p_participant and user_id is null returning email into v_email;
 if v_email is null then raise exception 'intake_not_ready' using errcode='42501'; end if;
 return v_email;
end; $$;

-- A changed membership invalidates access immediately. A different roster is a
-- different round; no additions to an old answer set or to its recipients.
create function public.invalidate_team_intake_membership() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.team_intake_rounds set status='revoked',revoked_at=coalesce(revoked_at,now())
 where founder_team_id=case when tg_op='DELETE' then old.team_id else new.team_id end and status<>'revoked';
 return null;
end; $$;
create trigger team_intake_membership_changed after insert or delete on public.founder_team_members for each row execute function public.invalidate_team_intake_membership();
create function public.invalidate_team_intake_reviewer() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' or new.status<>'active' then
  update public.team_intake_rounds r set status='revoked',revoked_at=coalesce(revoked_at,now())
  where r.org_id=old.org_id and exists(select 1 from public.team_intake_reviewers v where v.round_id=r.id and v.user_id=old.user_id);
 end if;
 return null;
end; $$;
create trigger team_intake_reviewer_changed after update of status or delete on public.advisor_org_members for each row execute function public.invalidate_team_intake_reviewer();
create function public.delete_team_intakes_for_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Conservative MVP lifecycle: remove the entire context, including statements
 -- about the deleted person. No orphaned private text or frozen email remains.
 delete from public.team_intake_rounds r where r.created_by=old.id or r.advisor_user_id=old.id
 or exists(select 1 from public.team_intake_participants p where p.round_id=r.id and (p.user_id=old.id or p.email=lower(btrim(old.email))))
 or exists(select 1 from public.team_intake_reviewers v where v.round_id=r.id and v.user_id=old.id);
 return old;
end; $$;
create trigger team_intake_account_deleted before delete on auth.users for each row execute function public.delete_team_intakes_for_account();

-- Copy only the author's factual history, intentionally and only within the
-- same confirmed roster. No appraisal, private note or submitted state copied.
create function public.copy_team_intake_history(p_round uuid,p_source uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.team_intake_rounds; s public.team_intake_rounds; v_shared jsonb; v_pairs jsonb;
begin
 select * into r from public.team_intake_rounds where id=p_round;
 select * into s from public.team_intake_rounds where id=p_source;
 if r.mode is distinct from 'development' or s.founder_team_id is distinct from r.founder_team_id or s.created_at>=r.created_at
 or not public.team_intake_can_read(p_source) or not exists(select 1 from public.team_intake_participants where round_id=p_source and user_id=auth.uid()) then
 raise exception 'intake_forbidden' using errcode='42501'; end if;
 select coalesce((select shared from public.team_intake_answers where round_id=p_round and author_user_id=auth.uid()),'{}')||
 coalesce((select jsonb_object_agg(key,value) from public.team_intake_answers a,jsonb_each(a.shared) where a.round_id=p_source and a.author_user_id=auth.uid()
 and key in ('formation','formation_other','venture_since','existed','existing_context')),'{}') into v_shared;
 select jsonb_agg(jsonb_build_object('target_user_id',a.target_user_id,'data',
 coalesce((select answers from public.team_intake_pair_answers b where b.round_id=p_round and b.author_user_id=auth.uid() and b.target_user_id=a.target_user_id),'{}')||
 (select jsonb_object_agg(key,value) from jsonb_each(a.answers) where key in ('origin','since','worked','work_context')))) into v_pairs
 from public.team_intake_pair_answers a where a.round_id=p_source and a.author_user_id=auth.uid();
 perform public.save_team_intake(p_round,v_shared,v_pairs,
 coalesce((select requested from public.team_intake_private_notes where round_id=p_round and author_user_id=auth.uid()),false),
 coalesce((select note from public.team_intake_private_notes where round_id=p_round and author_user_id=auth.uid()),''));
end; $$;

do $$ declare t text; f record; begin
 foreach t in array array['team_intake_rounds','team_intake_reviewers','team_intake_participants','team_intake_answers','team_intake_pair_answers','team_intake_private_notes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and (p.proname like '%team_intake%' or p.proname='delete_team_intakes_for_account') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.proname in ('get_team_intake_options','create_team_intake','claim_team_intake','confirm_team_intake','save_team_intake','submit_team_intake','revoke_team_intake',
   'get_team_intake','list_team_intakes','get_team_intake_own_answers','get_team_intake_report','get_team_intake_private_notes','rotate_team_intake_invite','copy_team_intake_history') then
   execute format('grant execute on function %s to authenticated',f.signature);
  end if;
 end loop;
end; $$;
notify pgrst,'reload schema';
commit;
