begin;

-- ---------------------------------------------------------------------------
-- Teamaustritt: Wie geht es weiter?
-- ---------------------------------------------------------------------------
--
-- Wenn eine Person das Team verlaesst und mindestens eine bleibt, entsteht ein Eintrag
-- ("Austritt"). Die Verbleibenden entscheiden gemeinsam: weitermachen, aufloesen oder
-- spaeter. Nichts wird fuer sie entschieden und nichts stillschweigend geloescht.
--
--   Entscheidung       Alle AKTUELLEN Mitglieder muessen dasselbe waehlen. Sind sie uneins, bleibt die
--                      Frage offen und das Team sieht, dass es unterschiedlich entschieden hat. Ein neues
--                      Mitglied zaehlt ab dem Beitritt mit: seine fehlende Wahl haelt die Entscheidung offen.
--   Weitermachen       Schliesst die Frage. Das Team besteht wie bisher.
--   Aufloesen          Archiviert das Team (founder_teams.archived_at - dieselbe Mechanik wie bei der
--                      letzten Person, die geht). Kein hartes Loeschen: relationships.founder_team_id
--                      steht auf "on delete restrict". Die Inhalte bleiben bis zu ihrer Loeschfrist.
--
-- KEIN NAME der gehenden Person im Eintrag: Er braucht ihn nicht, und es waere ein weiterer Ort fuer
-- personenbezogene Daten ohne Zweck. Die Verbleibenden wissen, wer gegangen ist.
--
-- Schreiben nur ueber leave_founder_team und choose_team_departure. Kein Entfernen anderer Mitglieder.
-- ---------------------------------------------------------------------------

create table public.team_departures (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  left_at timestamptz not null default now(),
  status text not null default 'open',
  decided_at timestamptz,
  constraint team_departures_status_check check (status in ('open', 'continue', 'dissolved'))
);
create index team_departures_team_idx on public.team_departures (team_id, left_at desc);

create table public.team_departure_choices (
  departure_id uuid not null references public.team_departures (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  choice text not null,
  chosen_at timestamptz not null default now(),
  primary key (departure_id, user_id),
  constraint team_departure_choices_choice_check check (choice in ('continue', 'dissolve', 'later'))
);

alter table public.team_departures enable row level security;
alter table public.team_departure_choices enable row level security;
revoke all on public.team_departures, public.team_departure_choices from public, anon, authenticated;
grant select on public.team_departures, public.team_departure_choices to authenticated;

create policy team_departures_select_member on public.team_departures
  for select to authenticated using (public.is_current_user_founder_team_member(team_id));
create policy team_departure_choices_select_member on public.team_departure_choices
  for select to authenticated using (
    exists (select 1 from public.team_departures d
            where d.id = departure_id and public.is_current_user_founder_team_member(d.team_id)));

comment on table public.team_departures is
  'Ein Austritt aus einem Team, in dem mindestens eine Person bleibt. Die Verbleibenden entscheiden gemeinsam (weitermachen/aufloesen). Kein Name der gehenden Person.';

-- Austritt: wie bisher, dazu der Eintrag fuer die Verbleibenden. Gleiche Signatur wie vorher.
create or replace function public.leave_founder_team(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare remaining integer; g record;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 perform 1 from public.founder_teams where id=p_team_id for update;
 if not found or not exists(select 1 from public.founder_team_members where team_id=p_team_id and user_id=auth.uid()) then
  raise exception 'not_team_member' using errcode='42501'; end if;
 update public.team_shares set revoked_at=now(),updated_at=now()
  where team_id=p_team_id and owner_user_id=auth.uid() and revoked_at is null;
 delete from public.founder_team_members where team_id=p_team_id and user_id=auth.uid();
 -- Offene Einladungen dieser Person in dieses Team enden mit dem Austritt.
 update public.invitations set status='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
  where inviter_user_id=auth.uid() and target_founder_team_id=p_team_id and status::text in('sent','opened');
 -- Setup-Advisor-Freigaben neu bewerten (einstimmig unter den verbleibenden).
 for g in select id from public.founder_team_advisor_setup_grants where team_id=p_team_id and revoked_at is null loop
  perform public.refresh_founder_team_advisor_setup_grant(g.id);
 end loop;
 select count(*) into remaining from public.founder_team_members where team_id=p_team_id;
 -- NEU: Bleibt jemand, entscheiden die Verbleibenden, wie es weitergeht. Frueher offene Fragen
 -- werden durch den neuen Austritt nicht ersetzt, sondern bleiben daneben stehen.
 if remaining > 0 then
  insert into public.team_departures(team_id) values (p_team_id);
 end if;
 return jsonb_build_object('team_id',p_team_id,'left',true,'remaining_members',remaining);
end $$;
revoke all on function public.leave_founder_team(uuid) from public,anon;
grant execute on function public.leave_founder_team(uuid) to authenticated;

-- Wahl treffen oder aendern, solange die Frage offen ist.
create function public.choose_team_departure(p_departure_id uuid, p_choice text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_departure public.team_departures%rowtype;
  v_members integer;
  v_continue integer;
  v_dissolve integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_choice not in ('continue', 'dissolve', 'later') then
    raise exception 'team_departure_choice_invalid' using errcode = '22023';
  end if;
  select * into v_departure from public.team_departures where id = p_departure_id for update;
  if not found or not public.is_current_user_founder_team_member(v_departure.team_id) then
    raise exception 'team_departure_unavailable' using errcode = '42501';
  end if;
  if v_departure.status <> 'open' then
    raise exception 'team_departure_closed' using errcode = '22023';
  end if;

  insert into public.team_departure_choices(departure_id, user_id, choice)
  values (p_departure_id, auth.uid(), p_choice)
  on conflict (departure_id, user_id) do update set choice = excluded.choice, chosen_at = now();

  -- Nur die Wahlen AKTUELLER Mitglieder zaehlen; wer inzwischen gegangen ist, zaehlt nicht mehr mit.
  select count(*) into v_members from public.founder_team_members where team_id = v_departure.team_id;
  select count(*) filter (where c.choice = 'continue'), count(*) filter (where c.choice = 'dissolve')
    into v_continue, v_dissolve
  from public.team_departure_choices c
  join public.founder_team_members m on m.team_id = v_departure.team_id and m.user_id = c.user_id
  where c.departure_id = p_departure_id;

  if v_members > 0 and v_continue = v_members then
    update public.team_departures set status = 'continue', decided_at = now() where id = p_departure_id;
    return 'continue';
  end if;
  if v_members > 0 and v_dissolve = v_members then
    update public.team_departures set status = 'dissolved', decided_at = now() where id = p_departure_id;
    -- Archivieren wie bei der letzten Person, die geht: Archivzeitpunkt, Einladungen und Freigaben enden.
    update public.founder_teams set archived_at = coalesce(archived_at, pg_catalog.now()) where id = v_departure.team_id;
    update public.invitations
      set status = 'revoked', revoked_at = coalesce(revoked_at, pg_catalog.now()), updated_at = pg_catalog.now()
      where target_founder_team_id = v_departure.team_id and status::text in ('sent', 'opened');
    update public.team_shares set revoked_at = pg_catalog.now(), updated_at = pg_catalog.now()
      where team_id = v_departure.team_id and revoked_at is null;
    update public.founder_team_advisor_setup_grants
      set status = 'revoked', revoked_at = coalesce(revoked_at, pg_catalog.now())
      where team_id = v_departure.team_id and status <> 'revoked';
    return 'dissolved';
  end if;
  return 'open';
end;
$$;

revoke all on function public.choose_team_departure(uuid, text) from public, anon;
grant execute on function public.choose_team_departure(uuid, text) to authenticated;

commit;
