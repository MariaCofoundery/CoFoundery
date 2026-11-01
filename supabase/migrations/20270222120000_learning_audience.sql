-- Lernbereich: fuer wen ein Modul sichtbar ist.
--
-- Bisher sah ein Modul, wer in einem aktiven Programm der Organisation ist und das Modul "veroeffentlicht"
-- ist. Jetzt kann der Inhaber den Kreis eingrenzen und erweitern:
--   - alle Teams im Programm (wie bisher, `published`),
--   - einzelne Programm-Teams,
--   - einzelne Personen, die die Organisation oder deren Mitglieder begleiten.
-- Ein Modul ohne jeden Kreis ist ein Entwurf.
--
-- GRENZEN, ABSICHTLICH:
--   - Eine Person kann nur freigeschaltet werden, solange sie dem Advisor oder der Organisation den Umfang
--     `base` freigegeben hat (aktiv, nicht widerrufen, nicht abgelaufen). Ihre Freigabe ist die Voraussetzung,
--     nicht die Folge: wir schalten niemanden frei, den die Advisorin nicht schon sehen darf.
--   - Der Widerruf wirkt sofort: Die Zeile bleibt, aber das Modul verschwindet beim Lesen, sobald die
--     Freigabe der Person endet. Es wird bei jedem Aufruf neu geprueft, nicht beim Freischalten.
--   - Wer ein Modul sieht, sieht nur Titel, Beschreibung und Links. Nichts ueber andere Personen oder Teams,
--     denen es auch freigeschaltet ist, und nichts darueber, wer es geoeffnet hat.
--   - Teams, die die Advisorin nur ueber eine Team-Auswertung begleitet und die in keinem Programm sind,
--     sind nicht dabei: Ihre Zustimmung gilt der Auswertung, nicht einem Lernangebot.

begin;

create table public.team_program_module_shares (
  module_id uuid not null references public.team_program_modules (id) on delete cascade,
  program_id uuid references public.team_programs (id) on delete cascade,
  subject_user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint team_program_module_shares_one_target check (num_nonnulls(program_id, subject_user_id) = 1)
);
create unique index team_program_module_shares_program_uidx on public.team_program_module_shares (module_id, program_id) where program_id is not null;
create unique index team_program_module_shares_person_uidx on public.team_program_module_shares (module_id, subject_user_id) where subject_user_id is not null;
create index team_program_module_shares_person_idx on public.team_program_module_shares (subject_user_id) where subject_user_id is not null;

alter table public.team_program_module_shares enable row level security;
revoke all on public.team_program_module_shares from anon, authenticated;

-- Intern: hat diese Person der Organisation (oder einem aktiven Mitglied) den Umfang "base" freigegeben?
create or replace function public.person_grant_covers_org(p_subject_user_id uuid, p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_person_grants g
    join public.advisor_orgs o on o.id = p_org_id and o.status = 'active'
    where g.subject_user_id = p_subject_user_id
      and g.scope = 'base'
      and g.status = 'active'
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > pg_catalog.now())
      and (
        g.org_id = p_org_id
        or exists (
          select 1 from public.advisor_org_members m
          where m.org_id = p_org_id and m.user_id = g.advisor_user_id and m.status = 'active'
        )
      )
  );
$$;
revoke all on function public.person_grant_covers_org(uuid, uuid) from public, anon, authenticated;

-- Den Kreis eines Moduls festlegen: nur der Inhaber. Ersetzt den bisherigen Kreis.
create or replace function public.set_module_audience(
  p_module_id uuid, p_all_programs boolean, p_program_ids uuid[], p_person_ids uuid[]
)
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
  if exists (
    select 1 from unnest(coalesce(p_program_ids, '{}'::uuid[])) as w(id)
    where not exists (select 1 from public.team_programs p where p.id = w.id and p.org_id = v_org and p.status <> 'ended')
  ) then
    raise exception 'program_not_in_org' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_person_ids, '{}'::uuid[])) as w(id)
    where not public.person_grant_covers_org(w.id, v_org)
  ) then
    raise exception 'person_not_accompanied' using errcode = 'P0002';
  end if;

  update public.team_program_modules set published = coalesce(p_all_programs, false) where id = p_module_id;
  delete from public.team_program_module_shares where module_id = p_module_id;
  insert into public.team_program_module_shares (module_id, program_id)
  select p_module_id, w from (select distinct unnest(coalesce(p_program_ids, '{}'::uuid[])) as w) s;
  insert into public.team_program_module_shares (module_id, subject_user_id)
  select p_module_id, w from (select distinct unnest(coalesce(p_person_ids, '{}'::uuid[])) as w) s;
end;
$$;
revoke all on function public.set_module_audience(uuid, boolean, uuid[], uuid[]) from public, anon;
grant execute on function public.set_module_audience(uuid, boolean, uuid[], uuid[]) to authenticated;

-- Fuer die Organisation: wem welches Modul freigeschaltet ist.
create or replace function public.list_module_shares(p_org_id uuid)
returns table (module_id uuid, program_id uuid, subject_user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select s.module_id, s.program_id, s.subject_user_id
  from public.team_program_module_shares s
  join public.team_program_modules m on m.id = s.module_id
  where m.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by s.module_id, s.created_at;
$$;
revoke all on function public.list_module_shares(uuid) from public, anon;
grant execute on function public.list_module_shares(uuid) to authenticated;

-- Fuer Teams und Personen: was mir freigeschaltet ist. Gleiche Spalten wie bisher.
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
    -- Teams: mein Team ist in einem aktiven Programm, und das Modul ist fuer alle oder fuer dieses Team freigegeben.
    select m.id as module_id, m.org_id
    from public.team_programs p
    join public.team_program_modules m on m.org_id = p.org_id
    where auth.uid() is not null
      and p.status = 'active'
      and public.team_program_is_active(p.id)
      and exists (select 1 from public.founder_team_members t where t.team_id = p.team_id and t.user_id = auth.uid())
      and (m.published or exists (select 1 from public.team_program_module_shares s where s.module_id = m.id and s.program_id = p.id))
    union
    -- Personen: das Modul ist mir freigeschaltet, und meine Freigabe an die Organisation gilt noch.
    select m.id, m.org_id
    from public.team_program_module_shares s
    join public.team_program_modules m on m.id = s.module_id
    where auth.uid() is not null
      and s.subject_user_id = auth.uid()
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
