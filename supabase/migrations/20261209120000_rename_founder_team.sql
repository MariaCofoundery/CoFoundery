begin;

-- ---------------------------------------------------------------------------
-- Teamnamen aendern (20.10.2026)
-- ---------------------------------------------------------------------------
--
-- Bisher hatte `founder_teams.name` keinen Schreibweg: Teams hiessen "A + B", solange
-- niemand einen Namen setzte - und niemand konnte es. Jetzt kann jedes aktuelle
-- Mitglied den Namen setzen oder zuruecknehmen. Es gibt keine Rollenhierarchie im
-- Team (siehe Kommentar an `founder_team_members`), also auch hier keine.
--
-- NUR DER NAME. Keine andere Spalte wird beruehrt, und die Funktion gibt kein Team
-- preis: Wer nicht Mitglied ist, bekommt denselben Fehler wie bei einem Team, das
-- es nicht gibt. Ein leerer Name nimmt ihn zurueck (Anzeige wieder "A + B").
-- Archivierte Teams (letzter Austritt) werden nicht umbenannt.
-- ---------------------------------------------------------------------------

create or replace function public.rename_founder_team(p_team_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'team_name_too_long' using errcode = '22001';
  end if;

  update public.founder_teams team
  set name = v_name
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

revoke all on function public.rename_founder_team(uuid, text) from public, anon;
grant execute on function public.rename_founder_team(uuid, text) to authenticated;

commit;
