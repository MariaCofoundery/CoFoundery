-- Lernbereich als Links: Module mit Lektionen, jede Lektion verweist auf eine Adresse
-- (Video, Folien, Canva, ...). Made2Found speichert keine Dateien und bettet nichts ein.
--
-- Grenzen:
--   - Der Lernbereich gehoert der Organisation und bleibt, wenn ein Team das Programm verlaesst.
--   - Nur Inhaber legen an, aendern, loeschen; Mitglieder lesen alles, auch Entwuerfe.
--   - Teams lesen nur veroeffentlichte Module, solange ihr Programm aktiv ist (alle zugestimmt).
--   - Nur https-Adressen; der Link wird nicht abgerufen und nicht geprueft.
--   - Keine Auswertung: nichts darueber, wer was geoeffnet hat.
--   - Der Name einer sprechenden Person ist freier Text der Organisation und fuer Teams sichtbar;
--     sie bestaetigt im Formular, dass die Person der Weitergabe zugestimmt hat.

begin;

create table public.team_program_modules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 100,
  published boolean not null default false,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_program_modules_title check (char_length(btrim(title)) between 1 and 120),
  constraint team_program_modules_description check (description is null or char_length(description) <= 500),
  constraint team_program_modules_position check (position between 0 and 9999)
);
create index team_program_modules_org_idx on public.team_program_modules (org_id, position, created_at);

create table public.team_program_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.team_program_modules (id) on delete cascade,
  title text not null,
  note text,
  url text not null,
  minutes integer,
  speaker text,
  position integer not null default 100,
  created_at timestamptz not null default now(),
  constraint team_program_lessons_title check (char_length(btrim(title)) between 1 and 160),
  constraint team_program_lessons_note check (note is null or char_length(note) <= 500),
  constraint team_program_lessons_url check (char_length(url) <= 500 and url ~* '^https://[^[:space:]]+$'),
  constraint team_program_lessons_minutes check (minutes is null or minutes between 1 and 600),
  constraint team_program_lessons_speaker check (speaker is null or char_length(speaker) <= 120),
  constraint team_program_lessons_position check (position between 0 and 9999)
);
create index team_program_lessons_module_idx on public.team_program_lessons (module_id, position, created_at);

alter table public.team_program_modules enable row level security;
alter table public.team_program_lessons enable row level security;
revoke all on public.team_program_modules, public.team_program_lessons from anon, authenticated;

create or replace function public.save_learning_module(
  p_org_id uuid, p_module_id uuid, p_title text, p_description text, p_position integer, p_published boolean
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
  if p_module_id is null then
    insert into public.team_program_modules (org_id, title, description, position, published, created_by_user_id)
    values (p_org_id, btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), coalesce(p_position, 100), coalesce(p_published, false), auth.uid())
    returning id into v_id;
  else
    update public.team_program_modules
    set title = btrim(p_title), description = nullif(btrim(coalesce(p_description, '')), ''),
        position = coalesce(p_position, position), published = coalesce(p_published, published)
    where id = p_module_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'learning_module_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_learning_module(uuid, uuid, text, text, integer, boolean) from public, anon;
grant execute on function public.save_learning_module(uuid, uuid, text, text, integer, boolean) to authenticated;

create or replace function public.delete_learning_module(p_module_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_modules where id = p_module_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_modules where id = p_module_id;
end;
$$;
revoke all on function public.delete_learning_module(uuid) from public, anon;
grant execute on function public.delete_learning_module(uuid) to authenticated;

create or replace function public.save_learning_lesson(
  p_module_id uuid, p_lesson_id uuid, p_title text, p_note text, p_url text, p_minutes integer, p_speaker text, p_position integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select org_id into v_org from public.team_program_modules where id = p_module_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_lesson_id is null then
    insert into public.team_program_lessons (module_id, title, note, url, minutes, speaker, position)
    values (p_module_id, btrim(p_title), nullif(btrim(coalesce(p_note, '')), ''), btrim(p_url), p_minutes,
            nullif(btrim(coalesce(p_speaker, '')), ''), coalesce(p_position, 100))
    returning id into v_id;
  else
    update public.team_program_lessons
    set title = btrim(p_title), note = nullif(btrim(coalesce(p_note, '')), ''), url = btrim(p_url), minutes = p_minutes,
        speaker = nullif(btrim(coalesce(p_speaker, '')), ''), position = coalesce(p_position, position)
    where id = p_lesson_id and module_id = p_module_id
    returning id into v_id;
    if v_id is null then
      raise exception 'learning_lesson_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_learning_lesson(uuid, uuid, text, text, text, integer, text, integer) from public, anon;
grant execute on function public.save_learning_lesson(uuid, uuid, text, text, text, integer, text, integer) to authenticated;

create or replace function public.delete_learning_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select m.org_id into v_org from public.team_program_lessons l join public.team_program_modules m on m.id = l.module_id where l.id = p_lesson_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_lessons where id = p_lesson_id;
end;
$$;
revoke all on function public.delete_learning_lesson(uuid) from public, anon;
grant execute on function public.delete_learning_lesson(uuid) to authenticated;

-- Fuer die Organisation: Inhaber und Mitglieder sehen alle Module (auch Entwuerfe) mit ihren Lektionen.
create or replace function public.list_learning(p_org_id uuid)
returns table (
  module_id uuid, module_title text, module_description text, module_position integer, published boolean,
  lesson_id uuid, lesson_title text, note text, url text, minutes integer, speaker text, lesson_position integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.title, m.description, m.position, m.published, l.id, l.title, l.note, l.url, l.minutes, l.speaker, l.position
  from public.team_program_modules m
  left join public.team_program_lessons l on l.module_id = m.id
  where m.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by m.position, m.created_at, m.id, l.position, l.created_at, l.id;
$$;
revoke all on function public.list_learning(uuid) from public, anon;
grant execute on function public.list_learning(uuid) to authenticated;

-- Fuer Teams: nur veroeffentlichte Module von Organisationen, in deren Programm das Team aktiv ist.
create or replace function public.get_my_learning()
returns table (
  org_name text, module_id uuid, module_title text, module_description text,
  lesson_id uuid, lesson_title text, note text, url text, minutes integer, speaker text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, m.id, m.title, m.description, l.id, l.title, l.note, l.url, l.minutes, l.speaker
  from (
    select distinct p.org_id
    from public.team_programs p
    where auth.uid() is not null
      and p.status = 'active'
      and public.team_program_is_active(p.id)
      and exists (select 1 from public.founder_team_members t where t.team_id = p.team_id and t.user_id = auth.uid())
  ) mine
  join public.advisor_orgs o on o.id = mine.org_id
  join public.team_program_modules m on m.org_id = mine.org_id and m.published
  left join public.team_program_lessons l on l.module_id = m.id
  order by o.name, m.position, m.created_at, m.id, l.position, l.created_at, l.id;
$$;
revoke all on function public.get_my_learning() from public, anon;
grant execute on function public.get_my_learning() to authenticated;

commit;
