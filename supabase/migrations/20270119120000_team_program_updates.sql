-- Zweiwoechige Updates im Programm, mit Erinnerung im Postfach der App.
--
-- Die Fragen legen Bezugspersonen und Inhaber fest, das Team antwortet. Faellig
-- ist ein Update 14 Tage nach dem letzten (oder nach der Aktivierung des
-- Programms). Zwei Tage vorher bekommt jedes Teammitglied EINEN Hinweis im
-- Postfach. Keine Mail und keine Mitteilung aufs Geraet - die Mail kommt
-- spaeter und braucht vorher einen Satz in der Datenschutzerklaerung.
--
-- Wie bei den Meilensteinen gilt: nur bei AKTIVEM Programm (alle aktuellen
-- Mitglieder haben zugestimmt), und der Hinweis nennt nur, dass ein Update
-- ansteht - weder Teamname noch Organisation.

begin;

create table public.team_program_update_questions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  sort_order integer not null,
  question text not null,
  constraint team_program_update_questions_text check (char_length(btrim(question)) between 1 and 200),
  constraint team_program_update_questions_position check (sort_order between 1 and 5),
  constraint team_program_update_questions_unique unique (program_id, sort_order)
);

create table public.team_program_updates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  submitted_by_user_id uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  -- [{"q": "...", "a": "..."}] - die Frage wird MITGESPEICHERT, damit ein Update
  -- lesbar bleibt, auch wenn die Fragen spaeter geaendert werden.
  answers jsonb not null,
  constraint team_program_updates_answers_shape check (
    jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) between 1 and 5
  )
);
create index team_program_updates_program_idx on public.team_program_updates (program_id, submitted_at desc);

create table public.team_program_update_reminders (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  due_on date not null,
  created_at timestamptz not null default now(),
  constraint team_program_update_reminders_unique unique (program_id, due_on)
);

alter table public.team_program_update_questions enable row level security;
alter table public.team_program_updates enable row level security;
alter table public.team_program_update_reminders enable row level security;
revoke all on public.team_program_update_questions, public.team_program_updates,
  public.team_program_update_reminders from anon, authenticated;

-- Die neue Hinweisart. Die Werteliste muss mit IN_APP_NOTICE_KINDS im Code uebereinstimmen.
alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request',
  'problem_interest',
  'approach_interest',
  'discovery_intro_request',
  'discovery_intro_accepted',
  'read_my_mind_handoff',
  'founder_in_the_wild_handoff',
  'collaboration_conversation_marker',
  'program_update_due'
));

-- Intern: Bezugsperson oder Inhaber (nicht das Team) bei aktivem Programm.
create or replace function public.can_manage_team_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.team_program_is_active(p_program_id)
    and exists (
      select 1 from public.team_programs p
      where p.id = p_program_id
        and (
          exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()
                  and public.is_advisor_org_member(p.org_id))
          or public.is_advisor_org_owner_of(p.org_id)
        )
    );
$$;
revoke all on function public.can_manage_team_program(uuid) from public, anon, authenticated;

create or replace function public.set_program_update_questions(p_program_id uuid, p_questions text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean text[];
  v_i integer;
begin
  if not public.can_manage_team_program(p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  select coalesce(array_agg(btrim(q)), '{}') into v_clean
  from unnest(coalesce(p_questions, '{}'::text[])) as q where btrim(q) <> '';
  if coalesce(array_length(v_clean, 1), 0) > 5 then
    raise exception 'team_program_too_many_questions' using errcode = '22023';
  end if;
  delete from public.team_program_update_questions where program_id = p_program_id;
  for v_i in 1 .. coalesce(array_length(v_clean, 1), 0) loop
    insert into public.team_program_update_questions (program_id, sort_order, question)
    values (p_program_id, v_i, v_clean[v_i]);
  end loop;
end;
$$;
revoke all on function public.set_program_update_questions(uuid, text[]) from public, anon;
grant execute on function public.set_program_update_questions(uuid, text[]) to authenticated;

create or replace function public.list_program_update_questions(p_program_id uuid)
returns table (sort_order integer, question text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.sort_order, q.question from public.team_program_update_questions q
  where q.program_id = p_program_id and public.can_use_team_program(p_program_id)
  order by q.sort_order;
$$;
revoke all on function public.list_program_update_questions(uuid) from public, anon;
grant execute on function public.list_program_update_questions(uuid) to authenticated;

-- Nur das Team antwortet.
create or replace function public.submit_program_update(p_program_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_item jsonb;
begin
  if not public.can_use_team_program(p_program_id)
     or not exists (
       select 1 from public.team_programs p
       join public.founder_team_members m on m.team_id = p.team_id and m.user_id = auth.uid()
       where p.id = p_program_id
     ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) not between 1 and 5 then
    raise exception 'team_program_update_invalid' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'q') <> 'string' or char_length(v_item ->> 'q') > 200
       or jsonb_typeof(v_item -> 'a') <> 'string' or char_length(v_item ->> 'a') > 2000 then
      raise exception 'team_program_update_invalid' using errcode = '22023';
    end if;
  end loop;
  insert into public.team_program_updates (program_id, submitted_by_user_id, answers)
  values (p_program_id, auth.uid(), p_answers)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_program_update(uuid, jsonb) from public, anon;
grant execute on function public.submit_program_update(uuid, jsonb) to authenticated;

create or replace function public.list_program_updates(p_program_id uuid)
returns table (update_id uuid, submitted_at timestamptz, answers jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.submitted_at, u.answers
  from public.team_program_updates u
  where u.program_id = p_program_id and public.can_use_team_program(p_program_id)
  order by u.submitted_at desc
  limit 20;
$$;
revoke all on function public.list_program_updates(uuid) from public, anon;
grant execute on function public.list_program_updates(uuid) to authenticated;

-- Faellig: 14 Tage nach dem letzten Update, sonst nach der Aktivierung.
create or replace function public.get_program_update_due(p_program_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (coalesce(
    (select max(u.submitted_at) from public.team_program_updates u where u.program_id = p_program_id),
    p.activated_at,
    p.created_at
  ))::date + 14
  from public.team_programs p
  where p.id = p_program_id and public.can_use_team_program(p_program_id);
$$;
revoke all on function public.get_program_update_due(uuid) from public, anon;
grant execute on function public.get_program_update_due(uuid) to authenticated;

-- Der taegliche Lauf (Service-Rolle): je Programm und Faelligkeit EIN Stempel,
-- und ein Hinweis je aktuellem Teammitglied. Stempel zuerst: Ein Fehlschlag
-- danach laesst die Erinnerung entfallen, statt sie zu wiederholen.
create or replace function public.prepare_program_update_reminders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_reminder uuid;
  v_count integer := 0;
begin
  for v_row in
    select p.id as program_id,
           (coalesce((select max(u.submitted_at) from public.team_program_updates u where u.program_id = p.id), p.activated_at, p.created_at))::date + 14 as due_on
    from public.team_programs p
    where public.team_program_is_active(p.id)
    limit greatest(p_limit, 1)
  loop
    if v_row.due_on > current_date + 2 then
      continue;
    end if;
    insert into public.team_program_update_reminders (program_id, due_on)
    values (v_row.program_id, v_row.due_on)
    on conflict (program_id, due_on) do nothing
    returning id into v_reminder;
    if v_reminder is null then
      continue;
    end if;
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    select m.user_id, null, 'program_update_due', v_reminder, '/programm'
    from public.team_programs p
    join public.founder_team_members m on m.team_id = p.team_id
    where p.id = v_row.program_id
    on conflict do nothing;
    v_count := v_count + 1;
    v_reminder := null;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.prepare_program_update_reminders(integer) from public, anon, authenticated;
grant execute on function public.prepare_program_update_reminders(integer) to service_role;

commit;
