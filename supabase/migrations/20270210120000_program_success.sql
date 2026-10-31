-- Erfolge im Programm: ein Katalog zum Anklicken, Sterne, Eintragen von beiden Seiten.
--
-- Jede Organisation hat einen Katalog von Ergebnissen (Gesellschaft gegruendet, erster
-- zahlender Kunde, ...). Sie startet mit einem Standard-Katalog und kann Punkte
-- ergaenzen, abschalten und die Sternzahl (1 bis 3) festlegen. Ein Ergebnis eines Teams ist
-- "gemeldet" (das Team hat es eingetragen) oder "bestaetigt" (die Organisation hat es
-- bestaetigt oder selbst eingetragen). Sterne zaehlen nur bestaetigte Ergebnisse.
--
-- GRENZEN, ABSICHTLICH:
--   - Sterne gehoeren einem Team. Es gibt keine Rangliste, keinen Vergleich zwischen
--     Teams und keine Gesamtzahl ueber Teams hinweg in dieser Migration.
--   - Nur Teams mit aktivem Programm; die Ergebnisse enden mit dem Programm (Trigger).
--   - Eintragen: Team (gemeldet) oder Inhaber/Bezugsperson (bestaetigt). Zuruecknehmen:
--     die Organisation immer, das Team nur Unbestaetigtes.
--   - Keine Zahlen und Betraege - nur "erreicht am ..." mit kurzer Notiz.

begin;

create table public.program_outcome_catalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  default_key text,
  title text,
  stars integer not null default 1,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint program_outcome_catalog_stars check (stars between 1 and 3),
  constraint program_outcome_catalog_named check ((default_key is null) <> (title is null)),
  constraint program_outcome_catalog_title check (title is null or char_length(btrim(title)) between 1 and 120)
);
create unique index program_outcome_catalog_default_uidx on public.program_outcome_catalog (org_id, default_key) where default_key is not null;

create table public.program_outcomes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  catalog_id uuid not null references public.program_outcome_catalog (id) on delete cascade,
  achieved_on date not null default current_date,
  note text,
  reported_by_user_id uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  confirmed_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (program_id, catalog_id),
  constraint program_outcomes_note check (note is null or char_length(note) <= 500),
  constraint program_outcomes_confirmed check ((confirmed_at is null) = (confirmed_by_user_id is null) or confirmed_by_user_id is null)
);

alter table public.program_outcome_catalog enable row level security;
alter table public.program_outcomes enable row level security;
revoke all on public.program_outcome_catalog, public.program_outcomes from anon, authenticated;

-- Intern: Standard-Katalog anlegen, wenn die Organisation noch keinen hat.
create or replace function public.seed_outcome_catalog(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.program_outcome_catalog where org_id = p_org_id) then
    return;
  end if;
  insert into public.program_outcome_catalog (org_id, default_key, stars, sort_order) values
    (p_org_id, 'team_complete', 1, 10),
    (p_org_id, 'customer_interviews', 1, 20),
    (p_org_id, 'prototype', 1, 30),
    (p_org_id, 'mvp_live', 2, 40),
    (p_org_id, 'pitch_held', 1, 50),
    (p_org_id, 'pilot_customer', 2, 60),
    (p_org_id, 'first_paying_customer', 3, 70),
    (p_org_id, 'recurring_revenue', 2, 80),
    (p_org_id, 'first_hire', 2, 90),
    (p_org_id, 'founded', 3, 100),
    (p_org_id, 'investor_meeting', 1, 110),
    (p_org_id, 'grant', 2, 120),
    (p_org_id, 'funding_round', 3, 130),
    (p_org_id, 'ip_filed', 1, 140),
    (p_org_id, 'partner', 1, 150),
    (p_org_id, 'award', 1, 160),
    (p_org_id, 'press', 1, 170),
    (p_org_id, 'follow_program', 1, 180);
end;
$$;
revoke all on function public.seed_outcome_catalog(uuid) from public, anon, authenticated;

-- Katalog der Organisation (Inhaber und Mitglieder lesen, Inhaber aendert).
create or replace function public.get_outcome_catalog(p_org_id uuid)
returns table (catalog_id uuid, default_key text, title text, stars integer, active boolean, sort_order integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_advisor_org_member(p_org_id) then
    return;
  end if;
  perform public.seed_outcome_catalog(p_org_id);
  return query
  select c.id, c.default_key, c.title, c.stars, c.active, c.sort_order
  from public.program_outcome_catalog c where c.org_id = p_org_id order by c.sort_order, c.created_at;
end;
$$;
revoke all on function public.get_outcome_catalog(uuid) from public, anon;
grant execute on function public.get_outcome_catalog(uuid) to authenticated;

create or replace function public.save_outcome_catalog_item(
  p_org_id uuid, p_catalog_id uuid, p_title text, p_stars integer, p_active boolean
)
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
  perform public.seed_outcome_catalog(p_org_id);
  if p_catalog_id is null then
    if nullif(btrim(coalesce(p_title, '')), '') is null then
      raise exception 'outcome_title_required' using errcode = '22023';
    end if;
    if (select count(*) from public.program_outcome_catalog where org_id = p_org_id) >= 60 then
      raise exception 'outcome_catalog_limit' using errcode = '53400';
    end if;
    insert into public.program_outcome_catalog (org_id, title, stars, active, sort_order)
    values (p_org_id, btrim(p_title), least(greatest(coalesce(p_stars, 1), 1), 3), coalesce(p_active, true), 1000)
    returning id into v_id;
  else
    update public.program_outcome_catalog
    set stars = least(greatest(coalesce(p_stars, stars), 1), 3),
        active = coalesce(p_active, active),
        title = case when default_key is null then coalesce(nullif(btrim(coalesce(p_title, '')), ''), title) else null end
    where id = p_catalog_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'outcome_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_outcome_catalog_item(uuid, uuid, text, integer, boolean) from public, anon;
grant execute on function public.save_outcome_catalog_item(uuid, uuid, text, integer, boolean) to authenticated;

-- Die Ergebnisse EINES Programm-Teams: fuer das Team selbst (Mitglied) und fuer Inhaber/Bezugspersonen.
-- Eine Zeile je aktivem Katalogpunkt, mit dem Stand des Teams.
create or replace function public.get_program_outcomes(p_program_id uuid)
returns table (
  catalog_id uuid, default_key text, title text, stars integer,
  outcome_id uuid, achieved_on date, note text, confirmed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_team uuid;
begin
  select org_id, team_id into v_org, v_team from public.team_programs p
  where p.id = p_program_id and p.status = 'active' and public.team_program_is_active(p.id);
  if v_org is null or auth.uid() is null then
    return;
  end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
    or public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) then
    return;
  end if;
  perform public.seed_outcome_catalog(v_org);
  return query
  select c.id, c.default_key, c.title, c.stars, o.id, o.achieved_on, o.note, (o.confirmed_at is not null)
  from public.program_outcome_catalog c
  left join public.program_outcomes o on o.catalog_id = c.id and o.program_id = p_program_id
  where c.org_id = v_org and (c.active or o.id is not null)
  order by c.sort_order, c.created_at;
end;
$$;
revoke all on function public.get_program_outcomes(uuid) from public, anon;
grant execute on function public.get_program_outcomes(uuid) to authenticated;

-- Eintragen: das Team meldet, die Organisation bestaetigt (Inhaber oder Bezugsperson tragen direkt bestaetigt ein).
create or replace function public.report_program_outcome(p_program_id uuid, p_catalog_id uuid, p_achieved_on date, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_team uuid;
  v_by_org boolean;
begin
  select org_id, team_id into v_org, v_team from public.team_programs p
  where p.id = p_program_id and p.status = 'active' and public.team_program_is_active(p.id);
  if v_org is null or auth.uid() is null then
    raise exception 'team_program_not_active' using errcode = '55000';
  end if;
  v_by_org := public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid());
  if not v_by_org and not exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid()) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if not exists (select 1 from public.program_outcome_catalog c where c.id = p_catalog_id and c.org_id = v_org and c.active) then
    raise exception 'outcome_not_found' using errcode = 'P0002';
  end if;
  if p_achieved_on is null or p_achieved_on > current_date + 1 then
    raise exception 'outcome_date_invalid' using errcode = '22023';
  end if;
  insert into public.program_outcomes (program_id, catalog_id, achieved_on, note, reported_by_user_id, confirmed_at, confirmed_by_user_id)
  values (p_program_id, p_catalog_id, p_achieved_on, nullif(btrim(coalesce(p_note, '')), ''), auth.uid(),
          case when v_by_org then pg_catalog.now() end, case when v_by_org then auth.uid() end)
  on conflict (program_id, catalog_id) do update
  set achieved_on = excluded.achieved_on,
      note = excluded.note,
      -- Aendert das Team einen bestaetigten Eintrag, muss die Organisation ihn neu bestaetigen.
      confirmed_at = case when v_by_org then pg_catalog.now() else null end,
      confirmed_by_user_id = case when v_by_org then auth.uid() else null end;
end;
$$;
revoke all on function public.report_program_outcome(uuid, uuid, date, text) from public, anon;
grant execute on function public.report_program_outcome(uuid, uuid, date, text) to authenticated;

create or replace function public.confirm_program_outcome(p_outcome_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program uuid;
  v_org uuid;
begin
  select o.program_id, p.org_id into v_program, v_org
  from public.program_outcomes o join public.team_programs p on p.id = o.program_id
  where o.id = p_outcome_id;
  if v_program is null or auth.uid() is null or not (
    public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = v_program and c.advisor_user_id = auth.uid())
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.program_outcomes set confirmed_at = pg_catalog.now(), confirmed_by_user_id = auth.uid() where id = p_outcome_id;
end;
$$;
revoke all on function public.confirm_program_outcome(uuid) from public, anon;
grant execute on function public.confirm_program_outcome(uuid) to authenticated;

-- Zuruecknehmen: die Organisation immer, das Team nur Unbestaetigtes.
create or replace function public.remove_program_outcome(p_outcome_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program uuid;
  v_org uuid;
  v_team uuid;
  v_confirmed timestamptz;
  v_by_org boolean;
begin
  select o.program_id, p.org_id, p.team_id, o.confirmed_at into v_program, v_org, v_team, v_confirmed
  from public.program_outcomes o join public.team_programs p on p.id = o.program_id
  where o.id = p_outcome_id;
  if v_program is null or auth.uid() is null then
    raise exception 'outcome_not_found' using errcode = 'P0002';
  end if;
  v_by_org := public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = v_program and c.advisor_user_id = auth.uid());
  if not v_by_org and not (
    v_confirmed is null and exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  delete from public.program_outcomes where id = p_outcome_id;
end;
$$;
revoke all on function public.remove_program_outcome(uuid) from public, anon;
grant execute on function public.remove_program_outcome(uuid) to authenticated;

-- Mit dem Ende des Programms sind die Ergebnisse weg (die Zeilen haengen am Programm, nicht am Team).
create or replace function public.delete_outcomes_when_program_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from public.program_outcomes where program_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.delete_outcomes_when_program_ends() from public, anon, authenticated;
create trigger delete_outcomes_when_program_ends
after update of status on public.team_programs
for each row execute function public.delete_outcomes_when_program_ends();

commit;
