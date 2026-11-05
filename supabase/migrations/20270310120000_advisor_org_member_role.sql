-- Organisation: die Rolle eines Mitglieds aendern (Inhaberin <-> Advisor).
--
-- Gefunden in der Durchsicht vom 05.11.2026: Die letzte Inhaberin sah "Uebertrage zuerst die
-- Fuehrung", aber dafuer gab es keinen Weg - nur eine neue Einladung als Inhaberin. Jetzt kann
-- eine Inhaberin ein aktives Mitglied zur Mitinhaberin machen oder eine andere Inhaberin wieder
-- zum Advisor. Dieselben Regeln wie beim Entfernen (`set_advisor_org_membership`):
--   - nur aktive Inhaberinnen, nur fuer aktive Mitglieder dieser Organisation;
--   - es bleibt immer mindestens eine aktive Inhaberin.
-- Sich selbst herabstufen geht, solange eine andere Inhaberin bleibt - so wird die Fuehrung
-- uebergeben: erst die andere zur Inhaberin machen, dann selbst Advisor werden oder gehen.

begin;

create or replace function public.set_advisor_org_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_owners integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'advisor') then
    return false;
  end if;
  if not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = v_user
      and member.role = 'owner' and member.status = 'active'
  ) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;

  -- Zwei Inhaberinnen, die sich gleichzeitig herabstufen, duerfen nicht beide durchkommen.
  perform 1 from public.advisor_orgs org where org.id = p_org_id for update;

  if p_role = 'advisor' then
    select count(*) into v_owners from public.advisor_org_members member
    where member.org_id = p_org_id and member.role = 'owner' and member.status = 'active';
    if v_owners <= 1 and exists (
      select 1 from public.advisor_org_members member
      where member.org_id = p_org_id and member.user_id = p_user_id and member.role = 'owner'
    ) then
      raise exception 'advisor_org_needs_an_owner' using errcode = '42501';
    end if;
  end if;

  update public.advisor_org_members
  set role = p_role
  where org_id = p_org_id and user_id = p_user_id and status = 'active';

  return found;
end;
$$;
revoke all on function public.set_advisor_org_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_advisor_org_member_role(uuid, uuid, text) to authenticated;

commit;
