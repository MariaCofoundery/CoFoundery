-- Werte (Entwurf 10.11.2026): drei bis fuenf Werte einer Person, in ihrer eigenen Reihenfolge und mit eigenen Worten.
--
-- ES GIBT KEINE PUNKTE. Die Reihenfolge ist die eigene Ordnung der Person (oben = am wichtigsten); das Tool rechnet nichts
-- daraus und vergleicht Plaetze nie. Ein Team sieht nebeneinander, was die geteilt haben, die es teilen wollten.
--
-- GETRENNTE FREIGABEN, nie verknuepft: (1) mit einem bestimmten Team teilen, (2) im Connect-Profil als Begriffe zeigen.
-- Standard ist: niemand. Ein Teambeitritt, ein Programm oder ein Connect-Profil gibt nichts frei; verlaesst jemand das Team,
-- endet die Freigabe fuer dieses Team. Advisoren und Organisationen sehen Werte nie.

begin;

create table public.person_values (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null,
  value_key text not null,
  label text,
  meaning text,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, slot),
  constraint person_values_position check (slot between 1 and 5),
  constraint person_values_key check (value_key in (
    'sinnhaftigkeit', 'wirkung', 'freiheit', 'verlaesslichkeit', 'ehrlichkeit', 'fairness', 'lernen', 'qualitaet', 'tempo', 'sicherheit',
    'zusammenhalt', 'nachhaltigkeit', 'verantwortung', 'mut', 'vertrauen', 'respekt', 'kreativitaet', 'unabhaengigkeit', 'balance',
    'erfolg', 'transparenz', 'neugier', 'humor', 'grosszuegigkeit', 'custom')),
  constraint person_values_label check ((value_key = 'custom' and char_length(btrim(coalesce(label, ''))) between 1 and 40) or (value_key <> 'custom' and label is null)),
  constraint person_values_meaning check (meaning is null or char_length(meaning) <= 200)
);

create table public.person_value_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  violated_note text,
  connect_show boolean not null default false,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint person_value_settings_note check (violated_note is null or char_length(violated_note) <= 300)
);

create table public.person_value_team_shares (
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, team_id)
);

alter table public.person_values enable row level security;
alter table public.person_value_settings enable row level security;
alter table public.person_value_team_shares enable row level security;
revoke all on public.person_values, public.person_value_settings, public.person_value_team_shares from anon, authenticated;
grant select on public.person_values, public.person_value_settings, public.person_value_team_shares to authenticated;
-- Lesen: nur die eigenen Zeilen. Was ein Team sieht, kommt allein aus get_team_values.
create policy person_values_own on public.person_values for select to authenticated using (user_id = auth.uid());
create policy person_value_settings_own on public.person_value_settings for select to authenticated using (user_id = auth.uid());
create policy person_value_team_shares_own on public.person_value_team_shares for select to authenticated using (user_id = auth.uid());

-- Speichern: die ganze Liste auf einmal, in der Reihenfolge des Arrays [{key, label, meaning}].
create or replace function public.save_person_values(p_items jsonb, p_violated text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 5 then
    raise exception 'values_invalid' using errcode = '22023';
  end if;
  delete from public.person_values where user_id = v_user;
  insert into public.person_values (user_id, slot, value_key, label, meaning)
  select v_user, e.ord::smallint, e.item ->> 'key',
         case when e.item ->> 'key' = 'custom' then left(btrim(e.item ->> 'label'), 40) end,
         nullif(left(btrim(coalesce(e.item ->> 'meaning', '')), 200), '')
  from jsonb_array_elements(p_items) with ordinality as e(item, ord);
  insert into public.person_value_settings (user_id, violated_note, updated_at)
  values (v_user, nullif(left(btrim(coalesce(p_violated, '')), 300), ''), pg_catalog.now())
  on conflict (user_id) do update set violated_note = excluded.violated_note, updated_at = excluded.updated_at;
  -- Ohne Werte gibt es nichts zu teilen.
  select count(*) into v_count from public.person_values where user_id = v_user;
  if v_count = 0 then
    delete from public.person_value_team_shares where user_id = v_user;
    update public.person_value_settings set connect_show = false where user_id = v_user;
  end if;
exception
  when check_violation or unique_violation then
    raise exception 'values_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_person_values(jsonb, text) from public, anon;
grant execute on function public.save_person_values(jsonb, text) to authenticated;

create or replace function public.set_value_team_share(p_team_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'values_not_yours' using errcode = '42501';
  end if;
  if p_on then
    if not exists (select 1 from public.person_values v where v.user_id = auth.uid()) then
      raise exception 'values_invalid' using errcode = '22023';
    end if;
    insert into public.person_value_team_shares (user_id, team_id) values (auth.uid(), p_team_id) on conflict do nothing;
  else
    delete from public.person_value_team_shares where user_id = auth.uid() and team_id = p_team_id;
  end if;
end;
$$;
revoke all on function public.set_value_team_share(uuid, boolean) from public, anon;
grant execute on function public.set_value_team_share(uuid, boolean) to authenticated;

create or replace function public.set_value_connect_show(p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_on and not exists (select 1 from public.person_values v where v.user_id = auth.uid()) then
    raise exception 'values_invalid' using errcode = '22023';
  end if;
  insert into public.person_value_settings (user_id, connect_show) values (auth.uid(), coalesce(p_on, false))
  on conflict (user_id) do update set connect_show = excluded.connect_show, updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.set_value_connect_show(boolean) from public, anon;
grant execute on function public.set_value_connect_show(boolean) to authenticated;

-- Wer im Team hat geteilt (und wer nicht): nur Namen und ein Ja/Nein, nie Inhalte.
create or replace function public.get_team_values_sharing(p_team_id uuid)
returns table (user_id uuid, display_name text, shared boolean, is_self boolean)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(nullif(btrim(core.display_name), ''), ''),
         exists (select 1 from public.person_value_team_shares s where s.user_id = m.user_id and s.team_id = p_team_id),
         m.user_id = auth.uid()
  from public.founder_team_members m
  left join public.person_core core on core.user_id = m.user_id
  where auth.uid() is not null and public.is_current_user_founder_team_member(p_team_id) and m.team_id = p_team_id
  order by m.user_id = auth.uid() desc, m.created_at;
$$;
revoke all on function public.get_team_values_sharing(uuid) from public, anon;
grant execute on function public.get_team_values_sharing(uuid) to authenticated;

-- Die Werte der Personen, die sie mit diesem Team geteilt haben - und nur solange sie Mitglied sind.
create or replace function public.get_team_values(p_team_id uuid)
returns table (user_id uuid, slot smallint, value_key text, label text, meaning text)
language sql stable security definer set search_path = '' as $$
  select v.user_id, v.slot, v.value_key, v.label, v.meaning
  from public.person_value_team_shares s
  join public.founder_team_members m on m.team_id = s.team_id and m.user_id = s.user_id
  join public.person_values v on v.user_id = s.user_id
  where auth.uid() is not null and public.is_current_user_founder_team_member(p_team_id) and s.team_id = p_team_id
  order by v.user_id, v.slot;
$$;
revoke all on function public.get_team_values(uuid) from public, anon;
grant execute on function public.get_team_values(uuid) to authenticated;

-- Connect: die Begriffe (ohne die Saetze), wenn die Person sie dort zeigen will und ihr Profil sichtbar ist.
create or replace function public.get_connect_values(p_user_id uuid)
returns table (slot smallint, value_key text, label text)
language sql stable security definer set search_path = '' as $$
  select v.slot, v.value_key, v.label
  from public.person_values v
  join public.person_value_settings st on st.user_id = v.user_id and st.connect_show
  where auth.uid() is not null and v.user_id = p_user_id
    and (p_user_id = auth.uid()
         or (public.is_network_member() and exists (select 1 from public.network_profiles pr where pr.user_id = p_user_id and pr.status = 'active')))
  order by v.slot;
$$;
revoke all on function public.get_connect_values(uuid) from public, anon;
grant execute on function public.get_connect_values(uuid) to authenticated;

-- Wer das Team verlaesst, teilt nicht weiter.
create or replace function public.drop_value_shares_on_leave()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.person_value_team_shares where user_id = old.user_id and team_id = old.team_id;
  return old;
end;
$$;
revoke all on function public.drop_value_shares_on_leave() from public, anon, authenticated;
create trigger drop_value_shares_on_leave after delete on public.founder_team_members
  for each row execute function public.drop_value_shares_on_leave();

commit;
