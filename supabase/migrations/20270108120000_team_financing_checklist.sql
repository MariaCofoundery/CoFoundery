begin;

-- ---------------------------------------------------------------------------
-- Finanzierungs-Wegweiser: Status je Punkt, geteilt im Team
-- ---------------------------------------------------------------------------
--
-- Eine Checkliste OHNE Wertung: Jeder Punkt hat einen Status, den das Team selbst setzt
-- (offen, in Arbeit, geklaert, nicht relevant). Es gibt keine Summe, keinen Prozentwert und
-- keine Empfehlung von Investoren oder Finanzierungsformen (Recherche 13.7).
--
--   Die Punkte stehen FEST im Code (und hier als CHECK-Liste). Neue Punkte brauchen eine Migration.
--   Alle aktuellen Mitglieder duerfen aendern; es steht dabei, wer es zuletzt war.
--   Ein Solo-Vorhaben ist ein Team mit einer Person - dieselbe Tabelle, dieselben Rechte.
--   Lesen nur fuer aktuelle Mitglieder. Schreiben nur ueber set_team_financing_item.
-- ---------------------------------------------------------------------------

create table public.team_financing_items (
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  item_key text not null,
  status text not null default 'open',
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, item_key),
  constraint team_financing_items_key_check check (item_key in (
    'roles_defined', 'time_stated', 'tie_break', 'exit_discussed',
    'split_written', 'dilution_discussed', 'contributions_listed',
    'ip_clarified', 'side_activities_disclosed', 'accounts_access',
    'short_intro', 'financial_plan', 'contracts_sorted',
    'purpose_one_sentence', 'say_in_governance', 'sale_stance'
  )),
  constraint team_financing_items_status_check check (status in ('open', 'progress', 'done', 'na'))
);

alter table public.team_financing_items enable row level security;
revoke all on public.team_financing_items from public, anon, authenticated;
grant select on public.team_financing_items to authenticated;
create policy team_financing_items_select_member on public.team_financing_items
  for select to authenticated using (public.is_current_user_founder_team_member(team_id));

comment on table public.team_financing_items is
  'Status je Punkt des Finanzierungs-Wegweisers, vom Team selbst gesetzt. Keine Summe, keine Wertung. Alle aktuellen Mitglieder duerfen aendern (set_team_financing_item).';

create function public.set_team_financing_item(p_team_id uuid, p_item_key text, p_status text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_financing_unavailable' using errcode = '42501';
  end if;
  if p_status not in ('open', 'progress', 'done', 'na') then
    raise exception 'team_financing_status_invalid' using errcode = '22023';
  end if;
  insert into public.team_financing_items (team_id, item_key, status, updated_by_user_id, updated_at)
  values (p_team_id, p_item_key, p_status, auth.uid(), now())
  on conflict (team_id, item_key) do update
    set status = excluded.status, updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at;
exception when check_violation then
  -- Unbekannter Punkt: dieselbe Fehlerart wie ein ungueltiger Status.
  raise exception 'team_financing_item_invalid' using errcode = '22023';
end;
$$;

revoke all on function public.set_team_financing_item(uuid, text, text) from public, anon;
grant execute on function public.set_team_financing_item(uuid, text, text) to authenticated;

commit;
