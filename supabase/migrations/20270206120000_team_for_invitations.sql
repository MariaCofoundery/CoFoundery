-- Ein Team fuer mehrere Einladungen gleichzeitig.
--
-- Bisher entstand das Team erst beim Annehmen der ersten Einladung. Wer mehrere
-- Mitgruender:innen auf einmal einladen will, braucht das Team vorher: Alle
-- Einladungen zeigen auf dasselbe Team, sonst bildete die zweite Annahme ein
-- neues Paar-Team.
--
-- Wie create_solo_venture, aber mit waehlbarem Kontext (pre_founder oder
-- existing_team): Der Kontext des Teams und der Einladung muessen uebereinstimmen,
-- sonst scheitert das Annehmen (founder_team_context_mismatch).
--   - nur mit Founder-Zugang (dieselbe Frage wie beim ersten Vorhaben),
--   - IDEMPOTENT: Wer schon allein in einem solchen Team steht (derselbe Kontext,
--     an keine Beziehung gebunden), bekommt dieses zurueck, statt ein weiteres anzulegen,
--   - der Name ist freiwillig (hoechstens 60 Zeichen).

begin;

create or replace function public.create_team_for_invitations(p_team_context text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_existing uuid;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_team_context not in ('pre_founder', 'existing_team') then
    raise exception 'invalid_founder_team_context' using errcode = '22023';
  end if;
  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'team_name_too_long' using errcode = '22001';
  end if;
  if not public.has_founder_assessment_access(v_user) then
    raise exception 'not_a_founder' using errcode = '42501';
  end if;

  select team.id into v_existing
  from public.founder_teams team
  join public.founder_team_members mine on mine.team_id = team.id and mine.user_id = v_user
  where team.team_context = p_team_context
    and team.archived_at is null
    and not exists (
      select 1 from public.founder_team_members other
      where other.team_id = team.id and other.user_id <> v_user
    )
    and not exists (
      select 1 from public.relationships bound where bound.founder_team_id = team.id
    )
  order by team.created_at
  limit 1;

  if v_existing is not null then
    if v_name is not null then
      update public.founder_teams set name = v_name where id = v_existing;
    end if;
    return v_existing;
  end if;

  insert into public.founder_teams (name, team_context) values (v_name, p_team_context) returning id into v_id;
  insert into public.founder_team_members (team_id, user_id) values (v_id, v_user);
  return v_id;
end;
$$;
revoke all on function public.create_team_for_invitations(text, text) from public, anon;
grant execute on function public.create_team_for_invitations(text, text) to authenticated;

commit;
