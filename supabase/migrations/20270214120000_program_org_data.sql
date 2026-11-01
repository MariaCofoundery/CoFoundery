-- Stammdaten der Organisation zu einem Programm-Team: die Liste, die eine
-- Organisation ohnehin ueber ihre Startups fuehrt (Name, Rechtsform, Adresse,
-- Ansprechperson, Kontakt, Aufnahmedatum, interne Nummer, Notiz).
--
-- Die ORGANISATION traegt ein (Inhaber und Bezugspersonen des Teams). Das Team
-- LIEST es - schreibgeschuetzt, damit es sieht, was ueber es gefuehrt wird.
-- Das ist etwas anderes als das Programmprofil (team_program_profiles): dort
-- schreibt das Team ueber sich selbst. Beides bleibt getrennt, nichts wird
-- automatisch uebernommen und nichts davon kommt aus dem Profil einer Person.
--
-- Nur solange das Programm AKTIV ist. Mit dem Ende (Team geht oder wird
-- entfernt) loescht ein Trigger die Zeile; on delete cascade deckt das
-- Loeschen des Programms ab.

begin;

create table public.team_program_org_data (
  program_id uuid primary key references public.team_programs (id) on delete cascade,
  company_name text,
  legal_form text,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  admitted_on date,
  reference text,
  note text,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint team_program_org_data_company check (company_name is null or char_length(company_name) <= 120),
  constraint team_program_org_data_form check (legal_form is null or char_length(legal_form) <= 60),
  constraint team_program_org_data_address check (address is null or char_length(address) <= 300),
  constraint team_program_org_data_contact_name check (contact_name is null or char_length(contact_name) <= 120),
  constraint team_program_org_data_email check (contact_email is null or (char_length(contact_email) <= 200 and position('@' in contact_email) > 1)),
  constraint team_program_org_data_phone check (contact_phone is null or char_length(contact_phone) <= 50),
  constraint team_program_org_data_website check (website is null or char_length(website) <= 200),
  constraint team_program_org_data_reference check (reference is null or char_length(reference) <= 60),
  constraint team_program_org_data_note check (note is null or char_length(note) <= 1000)
);

alter table public.team_program_org_data enable row level security;
revoke all on public.team_program_org_data from anon, authenticated;

create or replace function public.save_team_program_org_data(
  p_program_id uuid,
  p_company_name text,
  p_legal_form text,
  p_address text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_website text,
  p_admitted_on date,
  p_reference text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nur die Organisation (Inhaber, Bezugsperson dieses Teams) schreibt.
  if not public.can_manage_team_program(p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  insert into public.team_program_org_data as t (
    program_id, company_name, legal_form, address, contact_name, contact_email, contact_phone,
    website, admitted_on, reference, note, updated_by_user_id
  )
  values (
    p_program_id,
    nullif(btrim(coalesce(p_company_name, '')), ''),
    nullif(btrim(coalesce(p_legal_form, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_contact_name, '')), ''),
    nullif(lower(btrim(coalesce(p_contact_email, ''))), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    p_admitted_on,
    nullif(btrim(coalesce(p_reference, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  on conflict (program_id) do update
  set company_name = excluded.company_name, legal_form = excluded.legal_form, address = excluded.address,
      contact_name = excluded.contact_name, contact_email = excluded.contact_email,
      contact_phone = excluded.contact_phone, website = excluded.website,
      admitted_on = excluded.admitted_on, reference = excluded.reference, note = excluded.note,
      updated_by_user_id = auth.uid(), updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.save_team_program_org_data(uuid, text, text, text, text, text, text, text, date, text, text) from public, anon;
grant execute on function public.save_team_program_org_data(uuid, text, text, text, text, text, text, text, date, text, text) to authenticated;

-- Lesen: das Team (alle Mitglieder), die Bezugspersonen dieses Teams und der
-- Inhaber. Andere Mitglieder der Organisation sehen nichts.
create or replace function public.get_team_program_org_data(p_program_id uuid)
returns table (
  company_name text,
  legal_form text,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  admitted_on date,
  reference text,
  note text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.company_name, t.legal_form, t.address, t.contact_name, t.contact_email, t.contact_phone,
         t.website, t.admitted_on, t.reference, t.note, t.updated_at
  from public.team_program_org_data t
  where t.program_id = p_program_id and public.can_use_team_program(p_program_id);
$$;
revoke all on function public.get_team_program_org_data(uuid) from public, anon;
grant execute on function public.get_team_program_org_data(uuid) to authenticated;

-- Mit dem Ende des Programms sind die Stammdaten weg.
create or replace function public.delete_org_data_when_program_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from public.team_program_org_data where program_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.delete_org_data_when_program_ends() from public, anon, authenticated;

create trigger team_programs_delete_org_data
  after update of status on public.team_programs
  for each row execute function public.delete_org_data_when_program_ends();

-- Datenexport: was die Person als Organisation eingetragen hat. Die Funktion
-- wird vollstaendig neu gesetzt (Stand 20270122) und um diese Tabelle ergaenzt.
create or replace function public.export_my_restricted_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'network_messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at, m.id)
      from public.network_messages m where m.sender_user_id = uid), '[]'::jsonb),
    'network_blocks', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.created_at)
      from public.network_blocks b where b.blocker_user_id = uid), '[]'::jsonb),
    'workstyle_pretest_sessions', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.started_at)
      from public.workstyle_pretest_sessions s
      where s.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb),
    'workstyle_research_responses', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.answered_at, r.item_key)
      from public.workstyle_research_responses r
      where r.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb),
    'team_program_consents', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.approved_at)
      from public.team_program_consents c where c.founder_user_id = uid), '[]'::jsonb),
    'team_program_updates', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.submitted_at)
      from public.team_program_updates u where u.submitted_by_user_id = uid), '[]'::jsonb),
    'team_program_milestones', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.team_program_milestones m where m.created_by_user_id = uid), '[]'::jsonb),
    'team_program_profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.updated_at)
      from public.team_program_profiles p where p.updated_by_user_id = uid), '[]'::jsonb),
    'team_program_org_data', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.updated_at)
      from public.team_program_org_data d where d.updated_by_user_id = uid), '[]'::jsonb)
  );
end $$;

commit;
