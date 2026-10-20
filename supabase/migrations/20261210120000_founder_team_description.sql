begin;

-- ---------------------------------------------------------------------------
-- Teambeschreibung (20.10.2026)
-- ---------------------------------------------------------------------------
--
-- Ein Satz zum gemeinsamen Vorhaben, sichtbar auf der Team-Karte der Startseite.
-- Frei geschrieben von den Mitgliedern, nicht erzeugt und nicht ausgewertet.
-- Wie der Name: jedes aktuelle Mitglied darf ihn setzen, leer nimmt ihn zurueck,
-- archivierte Teams werden nicht veraendert.
-- ---------------------------------------------------------------------------

alter table public.founder_teams
  add column description text;

alter table public.founder_teams
  add constraint founder_teams_description_length
    check (description is null or char_length(btrim(description)) between 1 and 200);

comment on column public.founder_teams.description is
  'Freier Satz der Mitglieder zum gemeinsamen Vorhaben (max. 200 Zeichen). Wird nicht ausgewertet.';

create or replace function public.set_founder_team_details(
  p_team_id uuid,
  p_name text,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'team_name_too_long' using errcode = '22001';
  end if;
  if v_description is not null and char_length(v_description) > 200 then
    raise exception 'team_description_too_long' using errcode = '22001';
  end if;

  update public.founder_teams team
  set name = v_name, description = v_description
  where team.id = p_team_id
    and team.archived_at is null
    and exists (
      select 1
      from public.founder_team_members member
      where member.team_id = team.id and member.user_id = auth.uid()
    );

  if not found then
    raise exception 'team_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_founder_team_details(uuid, text, text) from public, anon;
grant execute on function public.set_founder_team_details(uuid, text, text) to authenticated;

commit;
