-- Stufe 2 der Programmseite: Teams, die es noch nicht gibt.
--
-- 1. Ein Team braucht mindestens zwei Personen, damit die Organisation es als
--    aktiv sieht. Wer allein anfaengt, darf dem Programm beitreten (das Team
--    "wartet auf Mitgruender:innen"), die Organisation sieht aber nichts, bis
--    eine zweite Person im Team ist UND zugestimmt hat. Das gilt am Roster, wie
--    die Zustimmung auch: es wird nicht gespeichert, sondern jedes Mal gelesen.
-- 2. Ein Code kann Konten anlegen, bevor ein Team gezaehlt wird. Deshalb zaehlt
--    jetzt jeder Code auch, wie viele Konten ueber ihn angekommen sind
--    (hoechstens 5 je Team-Platz). Ein Konto wird gezaehlt, sobald die Person
--    angemeldet auf der Code-Seite steht - nicht vorher; vorher kennt die
--    Datenbank sie nicht. Wer schon ein Konto hat, wird nie ausgesperrt.
-- 3. Team anlegen und beitreten in einem Schritt, fuer Personen ohne Team.
-- 4. Wer spaeter in ein Team kommt, das schon im Programm ist, bekommt einen
--    Hinweis - bisher erfuhren das nur die, die schon drin waren.

begin;

-- 1. aktiv erst ab zwei Personen
create or replace function public.team_program_is_active(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_programs program
    join public.founder_teams team on team.id = program.team_id and team.archived_at is null
    where program.id = p_program_id
      and program.status = 'active'
      and (select count(*) from public.founder_team_members m where m.team_id = program.team_id) >= 2
      and not exists (
        select 1 from public.founder_team_members m
        where m.team_id = program.team_id
          and not exists (
            select 1 from public.team_program_consents c
            where c.program_id = program.id and c.founder_user_id = m.user_id
          )
      )
  );
$$;
revoke all on function public.team_program_is_active(uuid) from public, anon, authenticated;

-- 2. Konten je Code
create table public.team_program_code_arrivals (
  code_id uuid not null references public.team_program_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code_id, user_id)
);
alter table public.team_program_code_arrivals enable row level security;
revoke all on public.team_program_code_arrivals from anon, authenticated;

create or replace function public.record_team_program_code_arrival(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  insert into public.team_program_code_arrivals (code_id, user_id)
  select c.id, auth.uid()
  from public.team_program_codes c
  join public.advisor_orgs o on o.id = c.org_id and o.status = 'active'
  where c.code = upper(btrim(coalesce(p_code, '')))
    and c.status = 'active' and c.expires_at > pg_catalog.now()
  on conflict do nothing;
end;
$$;
revoke all on function public.record_team_program_code_arrival(text) from public, anon;
grant execute on function public.record_team_program_code_arrival(text) to authenticated;

create or replace function public.is_valid_team_program_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_program_codes c
    join public.advisor_orgs o on o.id = c.org_id and o.status = 'active'
    where c.code = upper(btrim(coalesce(p_code, '')))
      and c.status = 'active' and c.expires_at > pg_catalog.now() and c.uses < c.max_uses
      and (select count(*) from public.team_program_code_arrivals a where a.code_id = c.id) < c.max_uses * 5
  );
$$;
revoke all on function public.is_valid_team_program_code(text) from public;
grant execute on function public.is_valid_team_program_code(text) to anon, authenticated;

-- Fuer die Code-Liste der Organisation: wie viele Konten sind angekommen?
drop function if exists public.list_team_program_codes(uuid);
create or replace function public.list_team_program_codes(p_org_id uuid)
returns table (code_id uuid, label text, code text, uses integer, max_uses integer, expires_at timestamptz, status text, accounts integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.label, c.code, c.uses, c.max_uses, c.expires_at,
         case when c.status = 'active' and c.expires_at <= pg_catalog.now() then 'expired' else c.status end,
         (select count(*)::integer from public.team_program_code_arrivals a where a.code_id = c.id)
  from public.team_program_codes c
  where c.org_id = p_org_id and public.is_advisor_org_owner_of(p_org_id)
  order by c.created_at desc;
$$;
revoke all on function public.list_team_program_codes(uuid) from public, anon;
grant execute on function public.list_team_program_codes(uuid) to authenticated;

-- 3. Team anlegen und beitreten
create or replace function public.create_team_for_program_code(p_code text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_program uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- Zuerst pruefen, ob der Code stimmt - sonst entstuende fuer einen falschen Code ein Team.
  if not public.team_program_code_may_try() or not exists (
    select 1 from public.team_program_codes c
    join public.advisor_orgs o on o.id = c.org_id and o.status = 'active'
    where c.code = upper(btrim(coalesce(p_code, '')))
      and c.status = 'active' and c.expires_at > pg_catalog.now() and c.uses < c.max_uses
  ) then
    insert into public.team_program_code_attempts (user_id) values (auth.uid());
    return null;
  end if;

  v_team := public.create_solo_venture();
  if nullif(btrim(coalesce(p_name, '')), '') is not null then
    perform public.rename_founder_team(v_team, p_name);
  end if;
  v_program := public.start_team_program_by_code(p_code, v_team);
  return v_program;
end;
$$;
revoke all on function public.create_team_for_program_code(text, text) from public, anon;
grant execute on function public.create_team_for_program_code(text, text) to authenticated;

-- 4. Wer spaeter ins Team kommt, erfaehrt vom Programm
create or replace function public.notify_new_member_about_team_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select new.user_id, null, 'program_invited', p.id, '/programm'
  from public.team_programs p
  where p.team_id = new.team_id and p.status <> 'ended'
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.notify_new_member_about_team_program() from public, anon, authenticated;

create trigger notify_new_member_about_team_program
after insert on public.founder_team_members
for each row execute function public.notify_new_member_about_team_program();

commit;
