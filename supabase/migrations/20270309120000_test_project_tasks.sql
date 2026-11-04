begin;

-- ---------------------------------------------------------------------------
-- Testprojekt: Aufgaben je Person und "Das bringe ich ein"
-- ---------------------------------------------------------------------------
--
-- Wunsch von Maria (Feedback 04.11.2026): Im Testprojekt sollen sich Aufgaben
-- aufteilen lassen - "der eine macht das, der andere das, je nach Faehigkeiten,
-- Fachgebiet und Rolle" -, und jede Person soll zeigen koennen, was sie
-- fachlich einbringt.
--
--   task_items       Liste am Entwurf: {"t": Aufgabe, "who": user_a | user_b |
--                    "both", "f": Bereich oder null}. Gehoert zum Plan, den
--                    beide zustimmen; nach dem Start eingefroren.
--   contributions    Eigene Tabelle, eine Zeile je Person: Text und bis zu
--                    sechs Bereiche aus dem Vokabular. Schreiben nur die Person
--                    selbst; lesen beide. Eigene Tabelle, damit im Kontoexport
--                    nur der eigene Text landet.
--
-- Jede Aenderung - Aufgaben wie Beitrag - setzt beide Zustimmungen zurueck:
-- Es ist ein anderer Plan.
-- ---------------------------------------------------------------------------

alter table public.relationship_test_projects
  add column task_items jsonb not null default '[]'::jsonb;
alter table public.relationship_test_projects
  add constraint relationship_test_projects_tasks_shape_check check (
    jsonb_typeof(task_items) = 'array' and jsonb_array_length(task_items) <= 20
    and octet_length(task_items::text) <= 12000
  );

-- Aufgaben pruefen: Text 1-160 Zeichen, "who" eine der beiden Personen des Paares oder "both",
-- "f" leer oder hoechstens 60 Zeichen.
create function public.valid_test_project_tasks(p_items jsonb, p_relationship_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_items is not null
    and jsonb_typeof(p_items) = 'array'
    and jsonb_array_length(p_items) <= 20
    and not exists (
      select 1 from jsonb_array_elements(p_items) e(item)
      where jsonb_typeof(e.item) <> 'object'
        or jsonb_typeof(e.item -> 't') is distinct from 'string'
        or char_length(btrim(e.item ->> 't')) not between 1 and 160
        or jsonb_typeof(e.item -> 'who') is distinct from 'string'
        or not (
          e.item ->> 'who' = 'both'
          or exists (
            select 1 from public.relationships r
            where r.id = p_relationship_id
              and e.item ->> 'who' in (r.user_a_id::text, r.user_b_id::text)
          )
        )
        or (e.item ? 'f' and jsonb_typeof(e.item -> 'f') not in ('string', 'null'))
        or char_length(coalesce(e.item ->> 'f', '')) > 60
    );
$$;
revoke all on function public.valid_test_project_tasks(jsonb, uuid) from public, anon;
grant execute on function public.valid_test_project_tasks(jsonb, uuid) to authenticated;

-- Die alte Fassung (ohne Aufgaben) weicht der neuen; aeltere Aufrufe mit elf
-- Werten treffen die neue, weil p_tasks einen Standardwert hat.
drop function public.save_test_project_draft(uuid, uuid, text, text, text, smallint, text, text, jsonb, jsonb, jsonb);

create function public.save_test_project_draft(
  p_relationship_id uuid,
  p_project_id uuid,
  p_template_key text,
  p_title text,
  p_task text,
  p_weeks smallint,
  p_roles text,
  p_note text,
  p_done jsonb,
  p_rights jsonb,
  p_closing jsonb,
  p_tasks jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  if not public.test_project_pair_active(p_relationship_id) then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  if p_weeks is null or p_weeks not between 1 and 4
     or char_length(coalesce(p_title, '')) > 80
     or char_length(coalesce(p_task, '')) > 400
     or char_length(coalesce(p_roles, '')) > 300
     or char_length(coalesce(p_note, '')) > 600
     or (p_template_key is not null and p_template_key not in (
       'interviews', 'landing', 'market', 'pitch', 'prototype', 'offer'))
     or not public.valid_test_project_items(p_done)
     or not public.valid_test_project_items(p_rights)
     or not public.valid_test_project_items(p_closing)
     or (p_tasks is not null and not public.valid_test_project_tasks(p_tasks, p_relationship_id)) then
    raise exception 'test_project_input_invalid' using errcode = '22023';
  end if;

  if p_project_id is null then
    if exists (
      select 1 from public.relationship_test_projects p
      where p.relationship_id = p_relationship_id and p.status in ('draft', 'active')
    ) then
      raise exception 'test_project_already_open' using errcode = '23505';
    end if;
    insert into public.relationship_test_projects (
      relationship_id, created_by_user_id, template_key, title, task, weeks, roles, note,
      done_items, rights_items, closing_items, task_items
    ) values (
      p_relationship_id, v_user_id, p_template_key, btrim(coalesce(p_title, '')),
      btrim(coalesce(p_task, '')), p_weeks, btrim(coalesce(p_roles, '')),
      btrim(coalesce(p_note, '')), p_done, p_rights, p_closing, coalesce(p_tasks, '[]'::jsonb)
    ) returning id into v_id;
    return v_id;
  end if;

  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id and p.relationship_id = p_relationship_id
  for update;
  if not found then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  -- Nach dem Start ist der Inhalt eingefroren.
  if v_project.status <> 'draft' then
    raise exception 'test_project_not_editable' using errcode = '22023';
  end if;

  update public.relationship_test_projects set
    template_key = p_template_key,
    title = btrim(coalesce(p_title, '')),
    task = btrim(coalesce(p_task, '')),
    weeks = p_weeks,
    roles = btrim(coalesce(p_roles, '')),
    note = btrim(coalesce(p_note, '')),
    done_items = p_done,
    rights_items = p_rights,
    closing_items = p_closing,
    -- Ohne Aufgabenliste (aeltere Aufrufe) bleibt die vorhandene stehen.
    task_items = coalesce(p_tasks, task_items),
    draft_version = draft_version + 1
  where id = p_project_id;
  -- Eine Aenderung gilt fuer beide neu.
  delete from public.relationship_test_project_agreements where project_id = p_project_id;
  return p_project_id;
end;
$$;

revoke all on function public.save_test_project_draft(uuid, uuid, text, text, text, smallint, text, text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_test_project_draft(uuid, uuid, text, text, text, smallint, text, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- "Das bringe ich ein" ---------------------------------------------------------

create table public.relationship_test_project_contributions (
  project_id uuid not null references public.relationship_test_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '',
  area_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id),
  constraint relationship_test_project_contributions_text_check check (char_length(text) <= 400),
  constraint relationship_test_project_contributions_areas_check check (cardinality(area_ids) <= 6)
);

alter table public.relationship_test_project_contributions enable row level security;
revoke all on public.relationship_test_project_contributions from public, anon, authenticated;
grant select on public.relationship_test_project_contributions to authenticated;
grant all on public.relationship_test_project_contributions to service_role;

create policy relationship_test_project_contributions_select_pair
on public.relationship_test_project_contributions for select to authenticated
using (exists (
  select 1 from public.relationship_test_projects p
  join public.relationships r on r.id = p.relationship_id
  where p.id = relationship_test_project_contributions.project_id
    and auth.uid() in (r.user_a_id, r.user_b_id)
));

-- Nur der eigene Beitrag, nur im Entwurf. Leerer Text und keine Bereiche nehmen ihn zurueck.
create function public.save_test_project_contribution(p_project_id uuid, p_text text, p_area_ids text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
  v_text text := btrim(coalesce(p_text, ''));
  v_areas text[] := coalesce((select array_agg(distinct a) from unnest(coalesce(p_area_ids, '{}')) a), '{}');
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id for update;
  if not found or not public.test_project_pair_active(v_project.relationship_id) then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  if v_project.status <> 'draft' then
    raise exception 'test_project_not_editable' using errcode = '22023';
  end if;
  if char_length(v_text) > 400 or cardinality(v_areas) > 6
     or exists (select 1 from unnest(v_areas) a where not exists (
       select 1 from public.capability_areas ca where ca.area_id = a)) then
    raise exception 'test_project_input_invalid' using errcode = '22023';
  end if;

  if v_text = '' and cardinality(v_areas) = 0 then
    delete from public.relationship_test_project_contributions
    where project_id = p_project_id and user_id = v_user_id;
  else
    insert into public.relationship_test_project_contributions (project_id, user_id, text, area_ids)
    values (p_project_id, v_user_id, v_text, v_areas)
    on conflict (project_id, user_id) do update
    set text = excluded.text, area_ids = excluded.area_ids, updated_at = now();
  end if;

  -- Ein anderer Beitrag ist ein anderer Plan: beide stimmen neu zu.
  update public.relationship_test_projects set draft_version = draft_version + 1 where id = p_project_id;
  delete from public.relationship_test_project_agreements where project_id = p_project_id;
end;
$$;
revoke all on function public.save_test_project_contribution(uuid, text, text[]) from public, anon;
grant execute on function public.save_test_project_contribution(uuid, text, text[]) to authenticated;

notify pgrst, 'reload schema';
commit;
