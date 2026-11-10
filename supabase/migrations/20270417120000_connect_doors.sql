-- Connect: "Tueren" statt Freitext "Wen kennst du?" (Entwurf 10.11.2026).
--
-- Eine Tuer sagt: Ich kenne diese ART von Mensch (Funktion aus einem Katalog, dazu Branche, Region und Naehe). Keine Namen.
-- Wer so jemanden sucht, findet die Tuer und fragt eine Vorstellung an - ueber die vorhandene Kontaktanfrage; die dritte Person
-- wird nie ohne Zustimmung der Tuer-Inhaberin angesprochen.
--
-- GRENZEN: Hoechstens fuenf Tueren je Person. Sichtbar fuer Connect-Mitglieder nur, solange das Connect-Profil aktiv ist
-- (connect_owner_visible), nicht bei gegenseitiger Sperre. Ein Pausenschalter (doors_open) laesst die Tueren sichtbar, aber ohne
-- Anfrage. Keine Zaehler, kein Ranking: sortiert wird nach Aktualitaet. Der Katalog liegt im Code; die Datenbank prueft nur die Form.
-- Das alte Freitextfeld network_reach wird nicht mehr angezeigt; die Spalte bleibt bis zu einer spaeteren Migration.

begin;

alter table public.network_profiles add column doors_open boolean not null default true;

create table public.network_doors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type_key text not null,
  other_label text,
  sector_key text,
  region text,
  closeness text not null,
  note text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint network_doors_type check (type_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  constraint network_doors_other check ((type_key = 'other') = (other_label is not null) and (other_label is null or char_length(btrim(other_label)) between 1 and 60)),
  constraint network_doors_sector check (sector_key is null or sector_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  constraint network_doors_region check (region is null or char_length(btrim(region)) between 1 and 60),
  constraint network_doors_closeness check (closeness in ('personal', 'introduce', 'via')),
  constraint network_doors_note check (note is null or char_length(note) <= 140)
);
create unique index network_doors_unique on public.network_doors (user_id, type_key, coalesce(sector_key, ''), lower(coalesce(region, '')), lower(coalesce(other_label, '')));
create index network_doors_search_idx on public.network_doors (type_key, sector_key);
alter table public.network_doors enable row level security;
revoke all on public.network_doors from anon, authenticated;
grant select on public.network_doors to authenticated;
create policy network_doors_own_read on public.network_doors for select to authenticated using (user_id = auth.uid());

create or replace function public.save_network_door(
  p_id uuid, p_type text, p_other_label text, p_sector text, p_region text, p_closeness text, p_note text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_network_member() then
    raise exception 'door_not_allowed' using errcode = '42501';
  end if;
  if p_id is null and (select count(*) from public.network_doors d where d.user_id = auth.uid()) >= 5 then
    raise exception 'door_limit' using errcode = '23514';
  end if;
  if p_id is null then
    insert into public.network_doors (user_id, type_key, other_label, sector_key, region, closeness, note)
    values (auth.uid(), p_type, case when p_type = 'other' then nullif(btrim(coalesce(p_other_label, '')), '') end, nullif(p_sector, ''),
            nullif(btrim(coalesce(p_region, '')), ''), p_closeness, nullif(btrim(coalesce(p_note, '')), ''))
    returning id into v_id;
  else
    update public.network_doors
    set type_key = p_type, other_label = case when p_type = 'other' then nullif(btrim(coalesce(p_other_label, '')), '') end, sector_key = nullif(p_sector, ''),
        region = nullif(btrim(coalesce(p_region, '')), ''), closeness = p_closeness, note = nullif(btrim(coalesce(p_note, '')), ''), updated_at = pg_catalog.now()
    where id = p_id and user_id = auth.uid()
    returning id into v_id;
    if v_id is null then
      raise exception 'door_not_allowed' using errcode = '42501';
    end if;
  end if;
  return v_id;
exception
  when check_violation then
    if sqlerrm like '%door_limit%' then raise; end if;
    raise exception 'door_invalid' using errcode = '22023';
  when unique_violation then
    raise exception 'door_duplicate' using errcode = '22023';
end;
$$;
revoke all on function public.save_network_door(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_network_door(uuid, text, text, text, text, text, text) to authenticated;

create or replace function public.delete_network_door(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.network_doors where id = p_id and user_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.delete_network_door(uuid) from public, anon;
grant execute on function public.delete_network_door(uuid) to authenticated;

create or replace function public.set_network_doors_open(p_open boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.network_profiles set doors_open = coalesce(p_open, true) where user_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.set_network_doors_open(boolean) from public, anon;
grant execute on function public.set_network_doors_open(boolean) to authenticated;

-- Suche: Tueren anderer Mitglieder. Nur aktive, sichtbare Profile, nicht bei gegenseitiger Sperre; nach Aktualitaet.
create or replace function public.search_network_doors(p_types text[], p_sector text, p_region text, p_offset integer)
returns table (
  door_id uuid, user_id uuid, display_name text, headline text, type_key text, other_label text, sector_key text, region text,
  closeness text, note text, doors_open boolean, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.user_id, p.display_name, p.headline, d.type_key, d.other_label, d.sector_key, d.region, d.closeness, d.note, p.doors_open, d.updated_at
  from public.network_doors d
  join public.network_profiles p on p.user_id = d.user_id and p.status = 'active'
  where auth.uid() is not null and public.is_network_member() and d.user_id <> auth.uid()
    and public.connect_owner_visible(d.user_id) and not public.is_network_interaction_blocked(auth.uid(), d.user_id)
    and (p_types is null or cardinality(p_types) = 0 or d.type_key = any (p_types))
    and (nullif(p_sector, '') is null or d.sector_key = p_sector)
    and (nullif(btrim(coalesce(p_region, '')), '') is null or strpos(lower(coalesce(d.region, '')), lower(btrim(p_region))) > 0)
  order by d.updated_at desc, d.id
  limit 25 offset greatest(0, least(coalesce(p_offset, 0), 100000));
$$;
revoke all on function public.search_network_doors(text[], text, text, integer) from public, anon;
grant execute on function public.search_network_doors(text[], text, text, integer) to authenticated;

-- Die Tueren einer sichtbaren Person (fuer ihre Profilseite) und eine einzelne Tuer (fuer die vorausgefuellte Vorstellung).
create or replace function public.list_network_doors_of(p_user_id uuid)
returns table (door_id uuid, type_key text, other_label text, sector_key text, region text, closeness text, note text, doors_open boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.type_key, d.other_label, d.sector_key, d.region, d.closeness, d.note, p.doors_open
  from public.network_doors d
  join public.network_profiles p on p.user_id = d.user_id and p.status = 'active'
  where auth.uid() is not null and public.is_network_member() and d.user_id = p_user_id and d.user_id <> auth.uid()
    and public.connect_owner_visible(d.user_id) and not public.is_network_interaction_blocked(auth.uid(), d.user_id)
  order by d.updated_at desc, d.id;
$$;
revoke all on function public.list_network_doors_of(uuid) from public, anon;
grant execute on function public.list_network_doors_of(uuid) to authenticated;

commit;
