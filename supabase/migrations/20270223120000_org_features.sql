-- Funktionen einer Organisation einzeln ein- und ausschalten.
--
-- Wer allein begleitet, braucht keine Experten-Liste; ein Accelerator mit vielen Startups braucht fast alles.
-- Die Organisation waehlt, welche Bereiche sie nutzt. Immer dabei, ohne Auswahl: Teams aufnehmen, das Programm
-- mit Teamkarten, Meilensteine und Updates, Mitglieder und Profil.
--
-- Schaltbar: plan (Programmplan und Teilnahme), materials (Unterlagen), learning (Lernbereich), experts
-- (Experten und Speaker), orgdata (Stammdaten der Startups) und success (Erfolge; bleibt in
-- program_success_enabled, damit es nur eine Quelle gibt).
--
-- AUS HEISST VERBERGEN, NICHT LOESCHEN. Die Daten bleiben; wer wieder einschaltet, hat alles zurueck. Fuer Teams
-- gilt es in der Datenbank, nicht nur in der Oberflaeche: Die Funktionen, die Teams lesen, geben bei "aus" nichts
-- zurueck.
--
-- BESTEHENDE ORGANISATIONEN behalten alles (Standardwerte), damit nichts verschwindet. Nur neu angelegte
-- Organisationen bekommen die Auswahl: weniger vorangehakt, und der Inhaber bestaetigt sie einmal.

begin;

alter table public.advisor_orgs
  add column features text[] not null default array['plan', 'materials', 'learning', 'experts', 'orgdata']::text[],
  add column features_setup_done boolean not null default true;
alter table public.advisor_orgs
  add constraint advisor_orgs_features_known check (features <@ array['plan', 'materials', 'learning', 'experts', 'orgdata']::text[]);

-- Neue Organisationen: kleine Vorbelegung, Auswahl steht noch aus.
create or replace function public.create_advisor_org(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.advisor_orgs (name, created_by_user_id, features, features_setup_done)
  values (btrim(p_name), v_user, array['plan', 'materials', 'learning']::text[], false)
  returning id into v_id;

  -- Wer sie anlegt, fuehrt sie. Eine Organisation ohne Verantwortliche waere
  -- eine Zeile, die niemand verwalten kann.
  insert into public.advisor_org_members (org_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;
revoke all on function public.create_advisor_org(text) from public, anon;
grant execute on function public.create_advisor_org(text) to authenticated;

-- Intern: ist dieser Bereich fuer die Organisation eingeschaltet?
create or replace function public.org_feature_enabled(p_org_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when p_key = 'success' then o.program_success_enabled else p_key = any (o.features) end
     from public.advisor_orgs o where o.id = p_org_id),
    false);
$$;
revoke all on function public.org_feature_enabled(uuid, text) from public, anon, authenticated;

-- Auswahl speichern: nur der Inhaber. Gilt als bestaetigt, auch wenn nichts geaendert wurde.
create or replace function public.set_org_features(p_org_id uuid, p_features text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wanted text[] := coalesce(p_features, '{}'::text[]);
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if not (v_wanted <@ array['plan', 'materials', 'learning', 'experts', 'orgdata', 'success']::text[]) then
    raise exception 'org_feature_unknown' using errcode = 'P0002';
  end if;
  update public.advisor_orgs
  set features = array(select distinct f from unnest(v_wanted) as f where f <> 'success' order by f),
      program_success_enabled = 'success' = any (v_wanted),
      features_setup_done = true
  where id = p_org_id;
end;
$$;
revoke all on function public.set_org_features(uuid, text[]) from public, anon;
grant execute on function public.set_org_features(uuid, text[]) to authenticated;

-- Teams lesen nur, was die Organisation eingeschaltet hat.
create or replace function public.get_my_program_events()
returns table (program_id uuid, org_name text, event_id uuid, title text, kind text, starts_at timestamptz,
               location text, notes text, todos text, my_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, o.name, e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, a.status
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  join public.team_program_events e on e.org_id = p.org_id
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and public.org_feature_enabled(p.org_id, 'plan')
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by e.starts_at;
$$;
revoke all on function public.get_my_program_events() from public, anon;
grant execute on function public.get_my_program_events() to authenticated;

create or replace function public.get_my_program_materials()
returns table (org_name text, material_id uuid, title text, url text, note text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (m.id) o.name, m.id, m.title, m.url, m.note
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  join public.team_program_materials m on m.org_id = p.org_id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and public.org_feature_enabled(p.org_id, 'materials')
    and exists (select 1 from public.founder_team_members t where t.team_id = p.team_id and t.user_id = auth.uid())
  order by m.id;
$$;
revoke all on function public.get_my_program_materials() from public, anon;
grant execute on function public.get_my_program_materials() to authenticated;

create or replace function public.get_team_program_org_data(p_program_id uuid)
returns table (
  company_name text, legal_form text, address text, contact_name text, contact_email text, contact_phone text,
  website text, admitted_on date, reference text, note text, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.company_name, t.legal_form, t.address, t.contact_name, t.contact_email, t.contact_phone,
         t.website, t.admitted_on, t.reference, t.note, t.updated_at
  from public.team_program_org_data t
  join public.team_programs p on p.id = t.program_id
  where t.program_id = p_program_id
    and public.can_use_team_program(p_program_id)
    and public.org_feature_enabled(p.org_id, 'orgdata');
$$;
revoke all on function public.get_team_program_org_data(uuid) from public, anon;
grant execute on function public.get_team_program_org_data(uuid) to authenticated;

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
  with visible as (
    select m.id as module_id, m.org_id
    from public.team_programs p
    join public.team_program_modules m on m.org_id = p.org_id
    where auth.uid() is not null
      and p.status = 'active'
      and public.team_program_is_active(p.id)
      and public.org_feature_enabled(m.org_id, 'learning')
      and exists (select 1 from public.founder_team_members t where t.team_id = p.team_id and t.user_id = auth.uid())
      and (m.published or exists (select 1 from public.team_program_module_shares s where s.module_id = m.id and s.program_id = p.id))
    union
    select m.id, m.org_id
    from public.team_program_module_shares s
    join public.team_program_modules m on m.id = s.module_id
    where auth.uid() is not null
      and s.subject_user_id = auth.uid()
      and public.org_feature_enabled(m.org_id, 'learning')
      and public.person_grant_covers_org(auth.uid(), m.org_id)
  )
  select o.name, m.id, m.title, m.description, l.id, l.title, l.note, l.url, l.minutes, l.speaker
  from visible v
  join public.advisor_orgs o on o.id = v.org_id
  join public.team_program_modules m on m.id = v.module_id
  left join public.team_program_lessons l on l.module_id = m.id
  order by o.name, m.position, m.created_at, m.id, l.position, l.created_at, l.id;
$$;
revoke all on function public.get_my_learning() from public, anon;
grant execute on function public.get_my_learning() to authenticated;

commit;
