-- Belohnungen bei Sternzahlen und das "Gespraech zum Stand".
--
-- BELOHNUNGEN: Die Organisation legt fest, was ab wie vielen Sternen passiert (zum Beispiel
-- ein Coaching oder ein Kontakt). Die Plattform vergibt nichts. Erreicht ein Team die
-- Sternzahl, wird die Belohnung freigeschaltet (bleibt freigeschaltet, auch wenn spaeter ein
-- Ergebnis zurueckgenommen wird), das Team bekommt einen Hinweis, und die Organisation
-- kann sie als eingeloest markieren. Keine Rangliste, kein Vergleich zwischen Teams.
--
-- GESPRAECH ZUM STAND: Beide Seiten schreiben zu jedem Erfolg einen kurzen Satz
-- ("Was bedeutet das fuer uns?"), jede Seite nur ihren eigenen; die andere liest ihn.
-- Ein Gespraech wird mit Datum und gemeinsamer Zusammenfassung festgehalten, optional mit
-- Datum des naechsten. Beides endet mit dem Programm.

begin;

alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'discovery_intro_request',
  'discovery_intro_accepted', 'read_my_mind_handoff', 'founder_in_the_wild_handoff',
  'collaboration_conversation_marker', 'program_update_due', 'program_invited',
  'program_review_requested', 'program_removed', 'program_reward_unlocked'
));

create table public.program_rewards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  stars_needed integer not null,
  title text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint program_rewards_stars check (stars_needed between 1 and 200),
  constraint program_rewards_title check (char_length(btrim(title)) between 1 and 120),
  constraint program_rewards_description check (description is null or char_length(description) <= 500)
);
create index program_rewards_org_idx on public.program_rewards (org_id, stars_needed);

create table public.program_reward_unlocks (
  reward_id uuid not null references public.program_rewards (id) on delete cascade,
  program_id uuid not null references public.team_programs (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users (id) on delete set null,
  primary key (reward_id, program_id)
);

create table public.program_outcome_comments (
  outcome_id uuid not null references public.program_outcomes (id) on delete cascade,
  side text not null,
  body text not null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (outcome_id, side),
  constraint program_outcome_comments_side check (side in ('team', 'org')),
  constraint program_outcome_comments_body check (char_length(btrim(body)) between 1 and 500)
);

create table public.program_check_ins (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  held_on date not null,
  summary text,
  next_on date,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint program_check_ins_summary check (summary is null or char_length(summary) <= 2000)
);
create index program_check_ins_program_idx on public.program_check_ins (program_id, held_on desc);

alter table public.program_rewards enable row level security;
alter table public.program_reward_unlocks enable row level security;
alter table public.program_outcome_comments enable row level security;
alter table public.program_check_ins enable row level security;
revoke all on public.program_rewards, public.program_reward_unlocks, public.program_outcome_comments, public.program_check_ins from anon, authenticated;

-- Intern: Auf welcher Seite steht die aufrufende Person bei diesem aktiven Programm?
create or replace function public.program_side(p_program_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_advisor_org_owner_of(p.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()) then 'org'
    when exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid()) then 'team'
  end
  from public.team_programs p
  where p.id = p_program_id and auth.uid() is not null and p.status = 'active' and public.team_program_is_active(p.id);
$$;
revoke all on function public.program_side(uuid) from public, anon, authenticated;

-- Intern: Sterne eines Teams (nur bestaetigte Ergebnisse).
create or replace function public.program_star_total(p_program_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(c.stars), 0)::integer
  from public.program_outcomes o join public.program_outcome_catalog c on c.id = o.catalog_id
  where o.program_id = p_program_id and o.confirmed_at is not null;
$$;
revoke all on function public.program_star_total(uuid) from public, anon, authenticated;

-- Wird ein Ergebnis bestaetigt, werden erreichte Belohnungen freigeschaltet und das Team erfaehrt es.
create or replace function public.unlock_program_rewards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_team uuid;
  v_total integer;
  v_reward record;
begin
  select org_id, team_id into v_org, v_team from public.team_programs where id = new.program_id;
  v_total := public.program_star_total(new.program_id);
  for v_reward in
    select r.id from public.program_rewards r
    where r.org_id = v_org and r.active and r.stars_needed <= v_total
      and not exists (select 1 from public.program_reward_unlocks u where u.reward_id = r.id and u.program_id = new.program_id)
  loop
    insert into public.program_reward_unlocks (reward_id, program_id) values (v_reward.id, new.program_id);
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    select m.user_id, null, 'program_reward_unlocked', v_reward.id, '/programm'
    from public.founder_team_members m where m.team_id = v_team
    on conflict do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function public.unlock_program_rewards() from public, anon, authenticated;
create trigger unlock_program_rewards
after insert or update of confirmed_at on public.program_outcomes
for each row when (new.confirmed_at is not null)
execute function public.unlock_program_rewards();

-- Belohnungen der Organisation: Mitglieder lesen, der Inhaber aendert.
create or replace function public.get_org_rewards(p_org_id uuid)
returns table (reward_id uuid, stars_needed integer, title text, description text, active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.stars_needed, r.title, r.description, r.active
  from public.program_rewards r
  where r.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by r.stars_needed, r.created_at;
$$;
revoke all on function public.get_org_rewards(uuid) from public, anon;
grant execute on function public.get_org_rewards(uuid) to authenticated;

create or replace function public.save_reward(p_org_id uuid, p_reward_id uuid, p_stars integer, p_title text, p_description text, p_active boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_reward_id is null then
    if (select count(*) from public.program_rewards where org_id = p_org_id) >= 30 then
      raise exception 'reward_limit' using errcode = '53400';
    end if;
    insert into public.program_rewards (org_id, stars_needed, title, description, active)
    values (p_org_id, p_stars, btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), coalesce(p_active, true))
    returning id into v_id;
  else
    update public.program_rewards
    set stars_needed = coalesce(p_stars, stars_needed),
        title = coalesce(nullif(btrim(coalesce(p_title, '')), ''), title),
        description = nullif(btrim(coalesce(p_description, '')), ''),
        active = coalesce(p_active, active)
    where id = p_reward_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'reward_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_reward(uuid, uuid, integer, text, text, boolean) from public, anon;
grant execute on function public.save_reward(uuid, uuid, integer, text, text, boolean) to authenticated;

-- Die Belohnungen EINES Teams mit Stand: Sterne, was freigeschaltet und was eingeloest ist.
create or replace function public.get_program_rewards(p_program_id uuid)
returns table (reward_id uuid, stars_needed integer, title text, description text, stars_total integer, unlocked_at timestamptz, redeemed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.stars_needed, r.title, r.description, public.program_star_total(p.id), u.unlocked_at, u.redeemed_at
  from public.team_programs p
  join public.program_rewards r on r.org_id = p.org_id and (r.active or exists (select 1 from public.program_reward_unlocks x where x.reward_id = r.id and x.program_id = p.id))
  left join public.program_reward_unlocks u on u.reward_id = r.id and u.program_id = p.id
  where p.id = p_program_id and public.program_side(p.id) is not null
  order by r.stars_needed, r.created_at;
$$;
revoke all on function public.get_program_rewards(uuid) from public, anon;
grant execute on function public.get_program_rewards(uuid) to authenticated;

create or replace function public.set_reward_redeemed(p_program_id uuid, p_reward_id uuid, p_redeemed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.program_side(p_program_id) is distinct from 'org' then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.program_reward_unlocks
  set redeemed_at = case when p_redeemed then pg_catalog.now() end,
      redeemed_by_user_id = case when p_redeemed then auth.uid() end
  where reward_id = p_reward_id and program_id = p_program_id;
end;
$$;
revoke all on function public.set_reward_redeemed(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_reward_redeemed(uuid, uuid, boolean) to authenticated;

-- Kommentare zu Erfolgen: jede Seite schreibt ihren eigenen, die andere liest ihn.
create or replace function public.save_outcome_comment(p_outcome_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program uuid;
  v_side text;
begin
  select program_id into v_program from public.program_outcomes where id = p_outcome_id;
  v_side := public.program_side(v_program);
  if v_program is null or v_side is null then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_body, '')), '') is null then
    delete from public.program_outcome_comments where outcome_id = p_outcome_id and side = v_side;
  else
    insert into public.program_outcome_comments (outcome_id, side, body, updated_by_user_id)
    values (p_outcome_id, v_side, btrim(p_body), auth.uid())
    on conflict (outcome_id, side) do update set body = excluded.body, updated_by_user_id = excluded.updated_by_user_id, updated_at = pg_catalog.now();
  end if;
end;
$$;
revoke all on function public.save_outcome_comment(uuid, text) from public, anon;
grant execute on function public.save_outcome_comment(uuid, text) to authenticated;

create or replace function public.get_outcome_comments(p_program_id uuid)
returns table (outcome_id uuid, side text, body text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.outcome_id, c.side, c.body
  from public.program_outcome_comments c
  join public.program_outcomes o on o.id = c.outcome_id
  where o.program_id = p_program_id and public.program_side(p_program_id) is not null;
$$;
revoke all on function public.get_outcome_comments(uuid) from public, anon;
grant execute on function public.get_outcome_comments(uuid) to authenticated;

-- Gespraeche zum Stand: beide Seiten halten eines fest und lesen alle.
create or replace function public.save_check_in(p_program_id uuid, p_held_on date, p_summary text, p_next_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if public.program_side(p_program_id) is null then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if p_held_on is null or p_held_on > current_date + 1 then
    raise exception 'check_in_date_invalid' using errcode = '22023';
  end if;
  if p_next_on is not null and p_next_on < p_held_on then
    raise exception 'check_in_date_invalid' using errcode = '22023';
  end if;
  insert into public.program_check_ins (program_id, held_on, summary, next_on, created_by_user_id)
  values (p_program_id, p_held_on, nullif(btrim(coalesce(p_summary, '')), ''), p_next_on, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.save_check_in(uuid, date, text, date) from public, anon;
grant execute on function public.save_check_in(uuid, date, text, date) to authenticated;

create or replace function public.get_check_ins(p_program_id uuid)
returns table (check_in_id uuid, held_on date, summary text, next_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.held_on, c.summary, c.next_on
  from public.program_check_ins c
  where c.program_id = p_program_id and public.program_side(p_program_id) is not null
  order by c.held_on desc, c.created_at desc
  limit 20;
$$;
revoke all on function public.get_check_ins(uuid) from public, anon;
grant execute on function public.get_check_ins(uuid) to authenticated;

-- Mit dem Ende des Programms sind Freischaltungen und Gespraeche weg (Kommentare gehen mit den Ergebnissen).
create or replace function public.delete_rewards_checkins_when_program_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from public.program_reward_unlocks where program_id = new.id;
    delete from public.program_check_ins where program_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.delete_rewards_checkins_when_program_ends() from public, anon, authenticated;
create trigger delete_rewards_checkins_when_program_ends
after update of status on public.team_programs
for each row execute function public.delete_rewards_checkins_when_program_ends();

commit;
