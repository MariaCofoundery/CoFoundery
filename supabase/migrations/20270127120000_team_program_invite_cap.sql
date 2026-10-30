-- Hoechstens 25 offene Programm-Einladungen je Organisation. Seit die
-- Einladung auch per Mail verschickt werden kann, ist das die Bremse gegen
-- Massenversand ueber eine Organisation.

begin;

create or replace function public.create_team_program_invite(p_org_id uuid, p_token_hash text, p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if (
    select count(*) from public.team_program_invites i
    where i.org_id = p_org_id and i.status = 'open' and i.expires_at > pg_catalog.now()
  ) >= 25 then
    raise exception 'team_program_invite_limit' using errcode = '53400';
  end if;
  insert into public.team_program_invites (org_id, created_by_user_id, token_hash, label)
  values (p_org_id, auth.uid(), p_token_hash, nullif(btrim(coalesce(p_label, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_team_program_invite(uuid, text, text) from public, anon;
grant execute on function public.create_team_program_invite(uuid, text, text) to authenticated;

commit;
