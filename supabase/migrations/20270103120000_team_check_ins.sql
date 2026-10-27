begin;

-- ---------------------------------------------------------------------------
-- Check-in: gilt das noch so, wie ihr es bestaetigt habt?
-- ---------------------------------------------------------------------------
--
-- EBENE: Team (2 bis 4 Mitglieder). Grundlage sind NUR Vereinbarungen, die die
-- AKTUELLE Runde bestaetigt hat (wie die Beratungsliste im Setup). Eine fruehere
-- Bestaetigung ist kein aktueller Stand.
--
-- Jede Person antwortet einzeln: Ja so / Teilweise / Wir sollten sprechen, mit
-- optionaler Notiz. Erst wenn ALLE aktuellen Mitglieder abgegeben haben, sieht
-- man die Antworten der anderen - und die Seite zeigt dann nur, wo es
-- auseinandergeht. Keine Punkte, keine Gesamtbewertung, kein Teamzustand.
--
-- Der Rueckblick ist freiwillig: Eine Person bietet ihn an, die anderen sagen
-- Gern oder Nicht jetzt. Er laeuft ab zwei Personen, und nur wer dabei ist, sieht
-- die Antworten. Wer nicht mitmacht, bleibt ohne Folgen.
--
-- Der Abstand ist 30, 60 oder 90 Tage und gehoert dem Team. Ein Check-in laesst
-- sich ueberspringen. Es gibt keine Erinnerungs-Mails (noch keine Einwilligung
-- und kein Auftrag dafuer).
-- ---------------------------------------------------------------------------

create table public.team_check_in_settings (
  team_id uuid primary key references public.founder_teams(id) on delete cascade,
  interval_days smallint not null default 90,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint team_check_in_settings_interval_check check (interval_days in (30, 60, 90))
);

create table public.team_check_ins (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams(id) on delete cascade,
  started_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open',
  -- Fragen des Rueckblicks als Liste {"t","on"}; leer, solange er nicht angeboten wurde.
  retro_questions jsonb not null default '[]'::jsonb,
  retro_offered_by_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint team_check_ins_status_check check (status in ('open', 'closed', 'skipped')),
  constraint team_check_ins_retro_shape_check check (
    jsonb_typeof(retro_questions) = 'array' and jsonb_array_length(retro_questions) <= 20
    and octet_length(retro_questions::text) <= 10000
  )
);
create unique index team_check_ins_one_open_idx on public.team_check_ins (team_id) where status = 'open';
create index team_check_ins_team_idx on public.team_check_ins (team_id, started_at desc);

create table public.team_check_in_topics (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.team_check_ins(id) on delete cascade,
  position smallint not null,
  -- Entweder ein Setup-Thema mit der Fassung, die zum Start galt, oder ein eigener Punkt.
  item_key text,
  revision_id uuid references public.founder_team_setup_revisions(id) on delete set null,
  custom_text text,
  included boolean not null default true,
  constraint team_check_in_topics_kind_check check ((item_key is not null) <> (custom_text is not null)),
  constraint team_check_in_topics_custom_length_check
    check (custom_text is null or char_length(btrim(custom_text)) between 1 and 160)
);
create index team_check_in_topics_check_in_idx on public.team_check_in_topics (check_in_id, position);

create table public.team_check_in_answers (
  check_in_id uuid not null references public.team_check_ins(id) on delete cascade,
  topic_id uuid not null references public.team_check_in_topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null,
  note text not null default '',
  answered_at timestamptz not null default now(),
  primary key (topic_id, user_id),
  constraint team_check_in_answers_answer_check check (answer in ('same', 'partly', 'talk')),
  constraint team_check_in_answers_note_check check (char_length(note) <= 200)
);

create table public.team_check_in_submissions (
  check_in_id uuid not null references public.team_check_ins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (check_in_id, user_id)
);

-- Rueckblick: wer eingeladen ist und was er geantwortet hat.
create table public.team_check_in_retro_invites (
  check_in_id uuid not null references public.team_check_ins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text,
  responded_at timestamptz,
  primary key (check_in_id, user_id),
  constraint team_check_in_retro_invites_response_check check (response is null or response in ('in', 'out'))
);

create table public.team_check_in_retro_answers (
  check_in_id uuid not null references public.team_check_ins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  primary key (check_in_id, user_id),
  constraint team_check_in_retro_answers_shape_check check (
    jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 20
    and octet_length(answers::text) <= 30000
  )
);

-- Hilfen -----------------------------------------------------------------------

create function public.team_check_in_team(p_check_in_id uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select c.team_id from public.team_check_ins c where c.id = p_check_in_id;
$$;

-- Haben ALLE aktuellen Mitglieder abgegeben (mindestens zwei)?
create function public.team_check_in_complete(p_check_in_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select count(*) >= 2 and bool_and(exists (
      select 1 from public.team_check_in_submissions s
      where s.check_in_id = p_check_in_id and s.user_id = m.user_id))
    from public.team_check_ins c
    join public.founder_team_members m on m.team_id = c.team_id
    where c.id = p_check_in_id
  ), false);
$$;

-- Rueckblick: mindestens zwei sind dabei, und alle, die dabei sind, haben geantwortet.
create function public.team_check_in_retro_complete(p_check_in_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select count(*) >= 2 and bool_and(exists (
      select 1 from public.team_check_in_retro_answers a
      where a.check_in_id = p_check_in_id and a.user_id = i.user_id))
    from public.team_check_in_retro_invites i
    where i.check_in_id = p_check_in_id and i.response = 'in'
  ), false);
$$;

create function public.team_check_in_is_retro_participant(p_check_in_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.team_check_in_retro_invites i
    where i.check_in_id = p_check_in_id and i.user_id = auth.uid() and i.response = 'in');
$$;

-- Zugriff ------------------------------------------------------------------------

alter table public.team_check_in_settings enable row level security;
alter table public.team_check_ins enable row level security;
alter table public.team_check_in_topics enable row level security;
alter table public.team_check_in_answers enable row level security;
alter table public.team_check_in_submissions enable row level security;
alter table public.team_check_in_retro_invites enable row level security;
alter table public.team_check_in_retro_answers enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'team_check_in_settings', 'team_check_ins', 'team_check_in_topics', 'team_check_in_answers',
    'team_check_in_submissions', 'team_check_in_retro_invites', 'team_check_in_retro_answers'
  ] loop
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

create policy team_check_in_settings_select_member on public.team_check_in_settings
for select to authenticated using (public.is_current_user_founder_team_member(team_id));

create policy team_check_ins_select_member on public.team_check_ins
for select to authenticated using (public.is_current_user_founder_team_member(team_id));

create policy team_check_in_topics_select_member on public.team_check_in_topics
for select to authenticated
using (public.is_current_user_founder_team_member(public.team_check_in_team(check_in_id)));

create policy team_check_in_submissions_select_member on public.team_check_in_submissions
for select to authenticated
using (public.is_current_user_founder_team_member(public.team_check_in_team(check_in_id)));

create policy team_check_in_retro_invites_select_member on public.team_check_in_retro_invites
for select to authenticated
using (public.is_current_user_founder_team_member(public.team_check_in_team(check_in_id)));

-- Eigene Antworten immer; die der anderen erst, wenn alle abgegeben haben.
create policy team_check_in_answers_select_own_or_complete on public.team_check_in_answers
for select to authenticated
using (
  user_id = auth.uid()
  or (public.team_check_in_complete(check_in_id)
      and public.is_current_user_founder_team_member(public.team_check_in_team(check_in_id)))
);

-- Rueckblick: nur wer dabei ist, und erst wenn alle Dabeien geantwortet haben.
create policy team_check_in_retro_answers_select_own_or_complete on public.team_check_in_retro_answers
for select to authenticated
using (
  user_id = auth.uid()
  or (public.team_check_in_retro_complete(check_in_id)
      and public.team_check_in_is_retro_participant(check_in_id))
);

-- Abstand ---------------------------------------------------------------------

create function public.set_team_check_in_interval(p_team_id uuid, p_days smallint)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (30, 60, 90) then
    raise exception 'team_check_in_input_invalid' using errcode = '22023';
  end if;
  insert into public.team_check_in_settings (team_id, interval_days, updated_by_user_id)
  values (p_team_id, p_days, auth.uid())
  on conflict (team_id) do update
  set interval_days = excluded.interval_days, updated_by_user_id = excluded.updated_by_user_id, updated_at = now();
end;
$$;

-- Starten: Themen sind die Vereinbarungen, die die AKTUELLE Runde bestaetigt hat ---

create function public.start_team_check_in(p_team_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_count integer;
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  -- Zeile der Gruppe sperren: zwei gleichzeitige Starts ergeben genau einen.
  perform 1 from public.founder_teams t where t.id = p_team_id for update;
  if exists (select 1 from public.team_check_ins c where c.team_id = p_team_id and c.status = 'open') then
    raise exception 'team_check_in_already_open' using errcode = '23505';
  end if;

  insert into public.team_check_ins (team_id, started_by_user_id) values (p_team_id, auth.uid())
  returning id into v_id;

  insert into public.team_check_in_topics (check_in_id, position, item_key, revision_id)
  select v_id, (row_number() over (order by r.confirmed_at, i.item_key))::smallint, i.item_key, r.id
  from public.founder_team_setup_items i
  join public.founder_team_setup_revisions r on r.id = i.current_confirmed_revision_id
  where i.team_id = p_team_id
    and r.confirmed_at is not null
    and r.resolution_status <> 'not_relevant'
    and (select count(*) from public.founder_team_members m where m.team_id = p_team_id) >= 2
    and not exists (
      select 1 from public.founder_team_members m
      where m.team_id = p_team_id
        and not exists (
          select 1 from public.founder_team_setup_confirmations c
          where c.revision_id = r.id and c.user_id = m.user_id));

  select count(*) into v_count from public.team_check_in_topics where check_in_id = v_id;
  if v_count = 0 then
    raise exception 'team_check_in_no_topics' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

-- Themen waehlen: solange noch niemand abgegeben hat ----------------------------

create function public.set_team_check_in_topic_included(p_topic_id uuid, p_included boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_check_in public.team_check_ins%rowtype;
begin
  select c.* into v_check_in
  from public.team_check_in_topics t join public.team_check_ins c on c.id = t.check_in_id
  where t.id = p_topic_id for update of c;
  if not found or not public.is_current_user_founder_team_member(v_check_in.team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if v_check_in.status <> 'open'
     or exists (select 1 from public.team_check_in_submissions s where s.check_in_id = v_check_in.id) then
    raise exception 'team_check_in_not_editable' using errcode = '22023';
  end if;
  update public.team_check_in_topics set included = coalesce(p_included, true) where id = p_topic_id;
end;
$$;

create function public.add_team_check_in_topic(p_check_in_id uuid, p_text text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_check_in public.team_check_ins%rowtype;
  v_id uuid;
  v_text text := btrim(coalesce(p_text, ''));
begin
  select * into v_check_in from public.team_check_ins c where c.id = p_check_in_id for update;
  if not found or not public.is_current_user_founder_team_member(v_check_in.team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if v_check_in.status <> 'open'
     or exists (select 1 from public.team_check_in_submissions s where s.check_in_id = v_check_in.id) then
    raise exception 'team_check_in_not_editable' using errcode = '22023';
  end if;
  if char_length(v_text) not between 1 and 160
     or (select count(*) from public.team_check_in_topics t
         where t.check_in_id = p_check_in_id and t.custom_text is not null) >= 10 then
    raise exception 'team_check_in_input_invalid' using errcode = '22023';
  end if;
  insert into public.team_check_in_topics (check_in_id, position, custom_text)
  values (p_check_in_id,
          (select coalesce(max(position), 0) + 1 from public.team_check_in_topics where check_in_id = p_check_in_id),
          v_text)
  returning id into v_id;
  return v_id;
end;
$$;

-- Abgeben: Antworten und Abschluss in einem Schritt ------------------------------

create function public.submit_team_check_in(p_check_in_id uuid, p_answers jsonb)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_check_in public.team_check_ins%rowtype;
  v_expected integer;
  v_given integer;
begin
  if v_user_id is null then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  select * into v_check_in from public.team_check_ins c where c.id = p_check_in_id for update;
  if not found or not public.is_current_user_founder_team_member(v_check_in.team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if v_check_in.status <> 'open' then
    raise exception 'team_check_in_not_editable' using errcode = '22023';
  end if;
  if exists (select 1 from public.team_check_in_submissions s
             where s.check_in_id = p_check_in_id and s.user_id = v_user_id) then
    raise exception 'team_check_in_already_submitted' using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or exists (
       select 1 from jsonb_array_elements(p_answers) e(item)
       where jsonb_typeof(e.item) <> 'object'
         or jsonb_typeof(e.item -> 'topic_id') is distinct from 'string'
         or e.item ->> 'answer' not in ('same', 'partly', 'talk')
         or char_length(coalesce(e.item ->> 'note', '')) > 200) then
    raise exception 'team_check_in_input_invalid' using errcode = '22023';
  end if;

  -- Genau eine Antwort je gewaehltem Thema, zu keinem anderen.
  select count(*) into v_expected from public.team_check_in_topics t
  where t.check_in_id = p_check_in_id and t.included;
  select count(distinct (e.item ->> 'topic_id')) into v_given
  from jsonb_array_elements(p_answers) e(item)
  where exists (select 1 from public.team_check_in_topics t
                where t.id = (e.item ->> 'topic_id')::uuid and t.check_in_id = p_check_in_id and t.included);
  if v_expected = 0 or v_given <> v_expected or jsonb_array_length(p_answers) <> v_expected then
    raise exception 'team_check_in_input_invalid' using errcode = '22023';
  end if;

  insert into public.team_check_in_answers (check_in_id, topic_id, user_id, answer, note)
  select p_check_in_id, (e.item ->> 'topic_id')::uuid, v_user_id, e.item ->> 'answer', btrim(coalesce(e.item ->> 'note', ''))
  from jsonb_array_elements(p_answers) e(item);
  insert into public.team_check_in_submissions (check_in_id, user_id) values (p_check_in_id, v_user_id);

  if public.team_check_in_complete(p_check_in_id) then
    update public.team_check_ins set status = 'closed', closed_at = now() where id = p_check_in_id;
    return 'closed';
  end if;
  return 'open';
end;
$$;

-- Ueberspringen: einen offenen Check-in beenden oder einen faelligen auslassen --------

create function public.skip_team_check_in(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  perform 1 from public.founder_teams t where t.id = p_team_id for update;
  update public.team_check_ins set status = 'skipped', closed_at = now()
  where team_id = p_team_id and status = 'open';
  if not found then
    insert into public.team_check_ins (team_id, started_by_user_id, status, closed_at)
    values (p_team_id, auth.uid(), 'skipped', now());
  end if;
end;
$$;

-- Rueckblick ---------------------------------------------------------------------

create function public.offer_team_check_in_retro(p_check_in_id uuid, p_questions jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_check_in public.team_check_ins%rowtype;
begin
  select * into v_check_in from public.team_check_ins c where c.id = p_check_in_id for update;
  if not found or v_check_in.status = 'skipped' or not public.is_current_user_founder_team_member(v_check_in.team_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if v_check_in.retro_offered_by_user_id is not null then
    raise exception 'team_check_in_retro_already_offered' using errcode = '22023';
  end if;
  if not public.valid_test_project_items(p_questions)
     or not exists (select 1 from jsonb_array_elements(p_questions) e(item)
                    where (e.item ->> 'on')::boolean and btrim(e.item ->> 't') <> '') then
    raise exception 'team_check_in_input_invalid' using errcode = '22023';
  end if;
  update public.team_check_ins
  set retro_questions = p_questions, retro_offered_by_user_id = auth.uid()
  where id = p_check_in_id;
  -- Die anbietende Person ist dabei; die anderen sind eingeladen, ohne Antwort.
  insert into public.team_check_in_retro_invites (check_in_id, user_id, response, responded_at)
  select p_check_in_id, m.user_id,
         case when m.user_id = auth.uid() then 'in' end,
         case when m.user_id = auth.uid() then now() end
  from public.founder_team_members m where m.team_id = v_check_in.team_id;
end;
$$;

create function public.respond_team_check_in_retro(p_check_in_id uuid, p_in boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null
     or not public.is_current_user_founder_team_member(public.team_check_in_team(p_check_in_id)) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if public.team_check_in_retro_complete(p_check_in_id) then
    raise exception 'team_check_in_phase_locked' using errcode = '22023';
  end if;
  update public.team_check_in_retro_invites
  set response = case when p_in then 'in' else 'out' end, responded_at = now()
  where check_in_id = p_check_in_id and user_id = auth.uid();
  if not found then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  -- Wer aussteigt, nimmt seine Antworten mit.
  if not p_in then
    delete from public.team_check_in_retro_answers where check_in_id = p_check_in_id and user_id = auth.uid();
  end if;
end;
$$;

create function public.submit_team_check_in_retro(p_check_in_id uuid, p_answers jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null
     or not public.is_current_user_founder_team_member(public.team_check_in_team(p_check_in_id))
     or not public.team_check_in_is_retro_participant(p_check_in_id) then
    raise exception 'team_check_in_unavailable' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) > 20 or octet_length(p_answers::text) > 30000
     or exists (
       select 1 from jsonb_array_elements(p_answers) e(item)
       where jsonb_typeof(e.item) <> 'object'
         or jsonb_typeof(e.item -> 'q') is distinct from 'string'
         or jsonb_typeof(e.item -> 'a') is distinct from 'string'
         or char_length(e.item ->> 'q') > 200 or char_length(e.item ->> 'a') > 3000) then
    raise exception 'team_check_in_input_invalid' using errcode = '22023';
  end if;
  if public.team_check_in_retro_complete(p_check_in_id) then
    raise exception 'team_check_in_phase_locked' using errcode = '22023';
  end if;
  insert into public.team_check_in_retro_answers (check_in_id, user_id, answers)
  values (p_check_in_id, auth.uid(), p_answers)
  on conflict (check_in_id, user_id) do update set answers = excluded.answers, submitted_at = now();
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'set_team_check_in_interval(uuid, smallint)',
    'start_team_check_in(uuid)',
    'set_team_check_in_topic_included(uuid, boolean)',
    'add_team_check_in_topic(uuid, text)',
    'submit_team_check_in(uuid, jsonb)',
    'skip_team_check_in(uuid)',
    'offer_team_check_in_retro(uuid, jsonb)',
    'respond_team_check_in_retro(uuid, boolean)',
    'submit_team_check_in_retro(uuid, jsonb)',
    'team_check_in_team(uuid)',
    'team_check_in_complete(uuid)',
    'team_check_in_retro_complete(uuid)',
    'team_check_in_is_retro_participant(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

comment on table public.team_check_ins is
  'Check-in eines Teams: gilt das noch so, wie ihr es bestaetigt habt? Antworten der anderen erst nach Abgabe aller. Kein Score, keine Gesamtbewertung.';

notify pgrst, 'reload schema';
commit;
