-- Programmcode: Neben der Einladung per Link oder Mail kann eine Organisation
-- einen Code herausgeben, den ein Team SELBST eintraegt.
--
-- Gleiche Regeln wie bei der Einladung: Der Code verraet nichts, er oeffnet nur
-- den Weg - das Team waehlt eines SEINER Teams, und das Programm ist erst aktiv,
-- wenn jedes aktuelle Mitglied zugestimmt hat. Neu ist, dass ein Code mehrfach
-- gilt. Deshalb:
--   - hoechstens N Teams je Code (Standard 10) und ein Ablaufdatum (Standard 90 Tage),
--   - der Inhaber kann ihn jederzeit sperren,
--   - hoechstens 5 aktive Codes je Organisation,
--   - Fehlversuche werden je Konto gezaehlt: nach 10 in einer Stunde antwortet die
--     Datenbank nicht mehr, ob ein Code stimmt (Schutz vor Raten).
-- Der Code selbst steht im Klartext, damit der Inhaber ihn wieder sehen kann;
-- er ist so vertraulich wie ein Link, den man weitergibt.

begin;

create table public.team_program_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  created_by_user_id uuid references auth.users (id) on delete set null,
  label text,
  code text not null,
  max_uses integer not null default 10,
  uses integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  constraint team_program_codes_format check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  constraint team_program_codes_unique unique (code),
  constraint team_program_codes_status check (status in ('active', 'revoked')),
  constraint team_program_codes_uses check (max_uses between 1 and 100 and uses between 0 and max_uses),
  constraint team_program_codes_label check (label is null or char_length(label) <= 120)
);
create index team_program_codes_org_idx on public.team_program_codes (org_id, status);

create table public.team_program_code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index team_program_code_attempts_idx on public.team_program_code_attempts (user_id, created_at);

alter table public.team_program_codes enable row level security;
alter table public.team_program_code_attempts enable row level security;
revoke all on public.team_program_codes, public.team_program_code_attempts from anon, authenticated;

-- Intern: darf diese Person noch raten? (Alte Versuche werden dabei geloescht.)
create or replace function public.team_program_code_may_try()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_program_code_attempts where created_at < pg_catalog.now() - interval '1 day';
  return (
    select count(*) from public.team_program_code_attempts a
    where a.user_id = auth.uid() and a.created_at > pg_catalog.now() - interval '1 hour'
  ) < 10;
end;
$$;
revoke all on function public.team_program_code_may_try() from public, anon, authenticated;

create or replace function public.create_team_program_code(
  p_org_id uuid, p_code text, p_label text default null, p_max_uses integer default 10, p_valid_days integer default 90
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if (select count(*) from public.team_program_codes c
      where c.org_id = p_org_id and c.status = 'active' and c.expires_at > pg_catalog.now()) >= 5 then
    raise exception 'team_program_code_limit' using errcode = '53400';
  end if;
  insert into public.team_program_codes (org_id, created_by_user_id, label, code, max_uses, expires_at)
  values (
    p_org_id, auth.uid(), nullif(btrim(coalesce(p_label, '')), ''), p_code,
    least(greatest(coalesce(p_max_uses, 10), 1), 100),
    pg_catalog.now() + make_interval(days => least(greatest(coalesce(p_valid_days, 90), 1), 365))
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_team_program_code(uuid, text, text, integer, integer) from public, anon;
grant execute on function public.create_team_program_code(uuid, text, text, integer, integer) to authenticated;

create or replace function public.revoke_team_program_code(p_code_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_codes where id = p_code_id;
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_codes set status = 'revoked' where id = p_code_id;
end;
$$;
revoke all on function public.revoke_team_program_code(uuid) from public, anon;
grant execute on function public.revoke_team_program_code(uuid) to authenticated;

create or replace function public.list_team_program_codes(p_org_id uuid)
returns table (code_id uuid, label text, code text, uses integer, max_uses integer, expires_at timestamptz, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.label, c.code, c.uses, c.max_uses, c.expires_at,
         case when c.status = 'active' and c.expires_at <= pg_catalog.now() then 'expired' else c.status end
  from public.team_program_codes c
  where c.org_id = p_org_id and public.is_advisor_org_owner_of(p_org_id)
  order by c.created_at desc;
$$;
revoke all on function public.list_team_program_codes(uuid) from public, anon;
grant execute on function public.list_team_program_codes(uuid) to authenticated;

-- Welche eigenen Teams koennten mit diesem Code beitreten? Bei falschem Code:
-- keine Zeilen und ein Fehlversuch.
create or replace function public.get_team_program_code_options(p_code text)
returns table (org_name text, team_id uuid, team_name text, member_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.team_program_codes%rowtype;
begin
  if auth.uid() is null or not public.team_program_code_may_try() then
    return;
  end if;
  select * into v_code from public.team_program_codes c
  where c.code = upper(btrim(coalesce(p_code, '')))
    and c.status = 'active' and c.expires_at > pg_catalog.now() and c.uses < c.max_uses
    and exists (select 1 from public.advisor_orgs o where o.id = c.org_id and o.status = 'active');
  if not found then
    insert into public.team_program_code_attempts (user_id) values (auth.uid());
    return;
  end if;
  return query
  select o.name, t.id, t.name, (select count(*)::integer from public.founder_team_members m2 where m2.team_id = t.id)
  from public.advisor_orgs o
  join public.founder_team_members m on m.user_id = auth.uid()
  join public.founder_teams t on t.id = m.team_id and t.archived_at is null
  where o.id = v_code.org_id
    and not exists (select 1 from public.team_programs p where p.org_id = o.id and p.team_id = t.id and p.status <> 'ended')
  order by t.created_at;
end;
$$;
revoke all on function public.get_team_program_code_options(text) from public, anon;
grant execute on function public.get_team_program_code_options(text) to authenticated;

-- Beitreten: gibt die Programm-ID zurueck, bei falschem Code null (und zaehlt
-- einen Fehlversuch - eine Ausnahme wuerde ihn zurueckrollen).
create or replace function public.start_team_program_by_code(p_code text, p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_code public.team_program_codes%rowtype;
  v_program uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.team_program_code_may_try() then
    return null;
  end if;
  if not exists (
    select 1 from public.founder_team_members m
    join public.founder_teams t on t.id = m.team_id and t.archived_at is null
    where m.team_id = p_team_id and m.user_id = v_user
  ) then
    raise exception 'team_program_not_your_team' using errcode = '42501';
  end if;

  select * into v_code from public.team_program_codes c
  where c.code = upper(btrim(coalesce(p_code, '')))
    and c.status = 'active' and c.expires_at > pg_catalog.now() and c.uses < c.max_uses
    and exists (select 1 from public.advisor_orgs o where o.id = c.org_id and o.status = 'active')
  for update;
  if not found then
    insert into public.team_program_code_attempts (user_id) values (v_user);
    return null;
  end if;
  if exists (select 1 from public.team_programs p where p.org_id = v_code.org_id and p.team_id = p_team_id and p.status <> 'ended') then
    raise exception 'team_program_already_in' using errcode = '23505';
  end if;

  insert into public.team_programs (org_id, team_id, started_by_user_id)
  values (v_code.org_id, p_team_id, v_user)
  returning id into v_program;
  insert into public.team_program_consents (program_id, founder_user_id) values (v_program, v_user);
  update public.team_program_codes set uses = uses + 1 where id = v_code.id;

  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select m.user_id, v_user, 'program_invited', v_program, '/programm'
  from public.founder_team_members m
  where m.team_id = p_team_id and m.user_id <> v_user
  on conflict do nothing;

  perform public.team_program_try_activate(v_program);
  return v_program;
end;
$$;
revoke all on function public.start_team_program_by_code(text, uuid) from public, anon;
grant execute on function public.start_team_program_by_code(text, uuid) to authenticated;

commit;
