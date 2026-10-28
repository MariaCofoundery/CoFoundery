begin;

-- ---------------------------------------------------------------------------
-- Finanzierungs-Wegweiser: Notizen zur Gespraechsvorbereitung
-- ---------------------------------------------------------------------------
--
-- Eine kurze Teamnotiz je Frage ("Was wollen wir mit dem Geld erreichen?"). Alle aktuellen
-- Mitglieder lesen und aendern, es steht dabei, wer zuletzt. Freitext, deshalb mit Loeschfrist:
-- Notizen, die seit p_days (Vorgabe 365) nicht mehr geaendert wurden, werden geloescht
-- (purge_stale_financing_notes, im taeglichen Loeschlauf). Leere Notiz = Zeile weg.
--
-- Die Fragen stehen fest im Code und hier als CHECK-Liste. Schreiben nur ueber
-- set_team_financing_note.
-- ---------------------------------------------------------------------------

create table public.team_financing_notes (
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  question_key text not null,
  note text not null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, question_key),
  constraint team_financing_notes_key_check check (question_key in (
    'purpose', 'governance', 'reporting', 'sale', 'beyondMoney'
  )),
  constraint team_financing_notes_length_check check (char_length(btrim(note)) between 1 and 600)
);

alter table public.team_financing_notes enable row level security;
revoke all on public.team_financing_notes from public, anon, authenticated;
grant select on public.team_financing_notes to authenticated;
create policy team_financing_notes_select_member on public.team_financing_notes
  for select to authenticated using (public.is_current_user_founder_team_member(team_id));

comment on table public.team_financing_notes is
  'Teamnotiz je Frage der Gespraechsvorbereitung (Freitext, hoechstens 600 Zeichen). Alle aktuellen Mitglieder lesen und aendern. Wird nach p_days ohne Aenderung geloescht.';

create function public.set_team_financing_note(p_team_id uuid, p_question_key text, p_note text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_note text := btrim(coalesce(p_note, ''));
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_financing_unavailable' using errcode = '42501';
  end if;
  if p_question_key not in ('purpose', 'governance', 'reporting', 'sale', 'beyondMoney') then
    raise exception 'team_financing_question_invalid' using errcode = '22023';
  end if;
  if char_length(v_note) > 600 then
    raise exception 'team_financing_note_too_long' using errcode = '22023';
  end if;
  if v_note = '' then
    delete from public.team_financing_notes where team_id = p_team_id and question_key = p_question_key;
    return;
  end if;
  insert into public.team_financing_notes (team_id, question_key, note, updated_by_user_id, updated_at)
  values (p_team_id, p_question_key, v_note, auth.uid(), now())
  on conflict (team_id, question_key) do update
    set note = excluded.note, updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.set_team_financing_note(uuid, text, text) from public, anon;
grant execute on function public.set_team_financing_note(uuid, text, text) to authenticated;

-- Loeschfrist: nur der Zeitplan (service_role).
create function public.purge_stale_financing_notes(p_days integer default 365)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_days integer := coalesce(p_days, 365);
  v_deleted integer := 0;
begin
  if v_days < 30 or v_days > 1825 then
    raise exception 'invalid_retention_days';
  end if;
  delete from public.team_financing_notes
  where updated_at < date_trunc('day', now()) - make_interval(days => v_days);
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('financingNoteDays', v_days, 'deletedFinancingNotes', v_deleted);
end;
$$;

revoke all on function public.purge_stale_financing_notes(integer) from public, anon, authenticated;
grant execute on function public.purge_stale_financing_notes(integer) to service_role;

commit;
