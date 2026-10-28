begin;

-- ---------------------------------------------------------------------------
-- Erwartungsabgleich vor einer Finanzierung
-- ---------------------------------------------------------------------------
--
-- Jede Person im Team beantwortet fuer sich, was sie von einer Finanzierung will (Tempo, Kontrolle,
-- Verwaesserung, Verkauf, Zeithorizont, Einfluss, Zeit). Erst wenn ALLE aktuellen Mitglieder
-- abgegeben haben, sieht das Team die Antworten - und zeigt dann vor allem, wo sie verschieden sind.
-- Keine richtige Antwort, kein Score, kein Vergleich mit anderen Teams, kein Freitext.
--
--   Runde            Eine offene Runde je Team. Sind alle abgegeben, ist sie abgeschlossen; danach kann das
--                    Team eine neue starten (zum Beispiel vor der naechsten Runde).
--   Antworten        Geschlossene Auswahl: a, b, c oder "unsure". Was a/b/c je Frage heisst, steht im Code.
--   Sichtbarkeit     Eigene Antworten immer; die der anderen erst, wenn alle aktuellen Mitglieder abgegeben
--                    haben. Wer neu ins Team kommt, haelt die Antworten wieder zurueck, bis auch er abgegeben hat.
--   Mindestens zwei  Mit einer Person gibt es nichts abzugleichen.
--   Loeschfrist      Abgeschlossene Runden nach p_closed_days (365), nie abgeschlossene nach p_open_days (180).
-- ---------------------------------------------------------------------------

create table public.team_financing_alignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  started_by_user_id uuid references auth.users (id) on delete set null,
  status text not null default 'open',
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint team_financing_alignments_status_check check (status in ('open', 'closed'))
);
create unique index team_financing_alignments_one_open_idx on public.team_financing_alignments (team_id) where status = 'open';
create index team_financing_alignments_team_idx on public.team_financing_alignments (team_id, started_at desc);

create table public.team_financing_alignment_answers (
  alignment_id uuid not null references public.team_financing_alignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_key text not null,
  answer text not null,
  answered_at timestamptz not null default now(),
  primary key (alignment_id, user_id, question_key),
  constraint team_financing_alignment_answers_question_check check (question_key in (
    'pace', 'control', 'dilution', 'exit', 'horizon', 'involvement', 'time'
  )),
  constraint team_financing_alignment_answers_answer_check check (answer in ('a', 'b', 'c', 'unsure'))
);

create table public.team_financing_alignment_submissions (
  alignment_id uuid not null references public.team_financing_alignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (alignment_id, user_id)
);

-- Haben ALLE aktuellen Mitglieder abgegeben (mindestens zwei)?
create function public.team_financing_alignment_complete(p_alignment_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select count(*) >= 2 and bool_and(exists (
      select 1 from public.team_financing_alignment_submissions s
      where s.alignment_id = p_alignment_id and s.user_id = m.user_id))
    from public.team_financing_alignments a
    join public.founder_team_members m on m.team_id = a.team_id
    where a.id = p_alignment_id
  ), false);
$$;

create function public.team_financing_alignment_team(p_alignment_id uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select a.team_id from public.team_financing_alignments a where a.id = p_alignment_id;
$$;

alter table public.team_financing_alignments enable row level security;
alter table public.team_financing_alignment_answers enable row level security;
alter table public.team_financing_alignment_submissions enable row level security;
revoke all on public.team_financing_alignments, public.team_financing_alignment_answers, public.team_financing_alignment_submissions
  from public, anon, authenticated;
grant select on public.team_financing_alignments, public.team_financing_alignment_answers, public.team_financing_alignment_submissions to authenticated;
grant all on public.team_financing_alignments, public.team_financing_alignment_answers, public.team_financing_alignment_submissions to service_role;

create policy team_financing_alignments_select_member on public.team_financing_alignments
  for select to authenticated using (public.is_current_user_founder_team_member(team_id));
create policy team_financing_alignment_submissions_select_member on public.team_financing_alignment_submissions
  for select to authenticated using (public.is_current_user_founder_team_member(public.team_financing_alignment_team(alignment_id)));
create policy team_financing_alignment_answers_select_own_or_complete on public.team_financing_alignment_answers
  for select to authenticated using (
    user_id = auth.uid()
    or (public.is_current_user_founder_team_member(public.team_financing_alignment_team(alignment_id))
        and public.team_financing_alignment_complete(alignment_id)));

comment on table public.team_financing_alignment_answers is
  'Antworten im Erwartungsabgleich (a/b/c/unsure). Eigene immer sichtbar; die der anderen erst, wenn alle aktuellen Mitglieder abgegeben haben. Kein Freitext.';

-- Runde starten: eine offene je Team, mindestens zwei Mitglieder.
create function public.start_financing_alignment(p_team_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'financing_alignment_unavailable' using errcode = '42501';
  end if;
  perform 1 from public.founder_teams t where t.id = p_team_id for update;
  if (select count(*) from public.founder_team_members m where m.team_id = p_team_id) < 2 then
    raise exception 'financing_alignment_needs_two' using errcode = '22023';
  end if;
  if exists (select 1 from public.team_financing_alignments a where a.team_id = p_team_id and a.status = 'open') then
    raise exception 'financing_alignment_already_open' using errcode = '23505';
  end if;
  insert into public.team_financing_alignments (team_id, started_by_user_id) values (p_team_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Abgeben: alle sieben Fragen auf einmal, einmal je Person. Sind alle da, schliesst die Runde.
-- p_answers: {"pace":"a", "control":"unsure", ...}
create function public.submit_financing_alignment(p_alignment_id uuid, p_answers jsonb)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_alignment public.team_financing_alignments%rowtype;
  v_key text;
  v_questions text[] := array['pace', 'control', 'dilution', 'exit', 'horizon', 'involvement', 'time'];
  v_answer text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into v_alignment from public.team_financing_alignments where id = p_alignment_id for update;
  if not found or not public.is_current_user_founder_team_member(v_alignment.team_id) then
    raise exception 'financing_alignment_unavailable' using errcode = '42501';
  end if;
  if v_alignment.status <> 'open'
     or exists (select 1 from public.team_financing_alignment_submissions s
                where s.alignment_id = p_alignment_id and s.user_id = auth.uid()) then
    raise exception 'financing_alignment_not_open' using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'financing_alignment_answers_invalid' using errcode = '22023';
  end if;
  foreach v_key in array v_questions loop
    v_answer := p_answers ->> v_key;
    if v_answer is null or v_answer not in ('a', 'b', 'c', 'unsure') then
      raise exception 'financing_alignment_answers_invalid' using errcode = '22023';
    end if;
    insert into public.team_financing_alignment_answers (alignment_id, user_id, question_key, answer)
    values (p_alignment_id, auth.uid(), v_key, v_answer);
  end loop;
  insert into public.team_financing_alignment_submissions (alignment_id, user_id) values (p_alignment_id, auth.uid());

  if public.team_financing_alignment_complete(p_alignment_id) then
    update public.team_financing_alignments set status = 'closed', closed_at = now() where id = p_alignment_id;
    return 'closed';
  end if;
  return 'open';
end;
$$;

revoke all on function public.start_financing_alignment(uuid) from public, anon;
revoke all on function public.submit_financing_alignment(uuid, jsonb) from public, anon;
grant execute on function public.start_financing_alignment(uuid) to authenticated;
grant execute on function public.submit_financing_alignment(uuid, jsonb) to authenticated;
revoke all on function public.team_financing_alignment_complete(uuid) from public, anon;
revoke all on function public.team_financing_alignment_team(uuid) from public, anon;
grant execute on function public.team_financing_alignment_complete(uuid) to authenticated;
grant execute on function public.team_financing_alignment_team(uuid) to authenticated;

-- Loeschfrist: nur der Zeitplan (service_role).
create function public.purge_stale_financing_alignments(p_closed_days integer default 365, p_open_days integer default 180)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_closed integer := coalesce(p_closed_days, 365);
  v_open integer := coalesce(p_open_days, 180);
  v_closed_deleted integer := 0;
  v_open_deleted integer := 0;
begin
  if v_closed < 30 or v_closed > 1825 or v_open < 30 or v_open > 1825 then
    raise exception 'invalid_retention_days';
  end if;
  delete from public.team_financing_alignments
  where status = 'closed' and coalesce(closed_at, started_at) < date_trunc('day', now()) - make_interval(days => v_closed);
  get diagnostics v_closed_deleted = row_count;
  delete from public.team_financing_alignments
  where status = 'open' and started_at < date_trunc('day', now()) - make_interval(days => v_open);
  get diagnostics v_open_deleted = row_count;
  return jsonb_build_object('deletedClosedAlignments', v_closed_deleted, 'deletedOpenAlignments', v_open_deleted);
end;
$$;

revoke all on function public.purge_stale_financing_alignments(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_stale_financing_alignments(integer, integer) to service_role;

commit;
