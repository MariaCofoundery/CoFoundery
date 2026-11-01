-- Speaker einer Veranstaltung zuordnen.
--
-- Die Organisation kann zu einer Veranstaltung im Programmplan Personen aus ihrer Experten-Liste
-- eintragen (wer spricht). GRENZEN, ABSICHTLICH:
--   - Nur Inhaber tragen ein; Mitglieder der Organisation lesen. Teams sehen die Zuordnung nie, die
--     Veranstaltung selbst bleibt fuer sie wie bisher ohne Namen Dritter.
--   - Nur Personen derselben Organisation wie die Veranstaltung.
--   - Wird die Veranstaltung oder die Person geloescht, faellt die Zuordnung mit (on delete cascade).
--     Eine als "nicht aktiv" markierte Person bleibt bei vergangenen Veranstaltungen stehen.

begin;

create table public.team_program_event_experts (
  event_id uuid not null references public.team_program_events (id) on delete cascade,
  expert_id uuid not null references public.team_program_experts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, expert_id)
);
create index team_program_event_experts_expert_idx on public.team_program_event_experts (expert_id);

alter table public.team_program_event_experts enable row level security;
revoke all on public.team_program_event_experts from anon, authenticated;

-- Ersetzt die Zuordnung der Veranstaltung durch die genannten Personen.
create or replace function public.set_event_experts(p_event_id uuid, p_expert_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_events where id = p_event_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_expert_ids, '{}'::uuid[])) as wanted(id)
    where not exists (select 1 from public.team_program_experts e where e.id = wanted.id and e.org_id = v_org)
  ) then
    raise exception 'expert_not_in_org' using errcode = 'P0002';
  end if;
  delete from public.team_program_event_experts where event_id = p_event_id;
  insert into public.team_program_event_experts (event_id, expert_id)
  select p_event_id, w from (select distinct unnest(coalesce(p_expert_ids, '{}'::uuid[])) as w) s;
end;
$$;
revoke all on function public.set_event_experts(uuid, uuid[]) from public, anon;
grant execute on function public.set_event_experts(uuid, uuid[]) to authenticated;

-- Wer spricht wo: fuer Inhaber und Mitglieder der Organisation.
create or replace function public.list_event_experts(p_org_id uuid)
returns table (event_id uuid, expert_id uuid, name text, topic text, archived boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select ee.event_id, x.id, x.name, x.topic, x.archived
  from public.team_program_event_experts ee
  join public.team_program_events e on e.id = ee.event_id
  join public.team_program_experts x on x.id = ee.expert_id
  where e.org_id = p_org_id and x.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by lower(x.name), x.id;
$$;
revoke all on function public.list_event_experts(uuid) from public, anon;
grant execute on function public.list_event_experts(uuid) to authenticated;

commit;
