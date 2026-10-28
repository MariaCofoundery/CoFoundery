begin;

-- ---------------------------------------------------------------------------
-- Ein weiteres Thema: Vision und Ziele
-- ---------------------------------------------------------------------------
--
-- Die Forschung zu Konflikten unter Mitgruendern (Kozusznik & Euwema 2025,
-- docs/research/phase-13/13.5-quellen-konfliktthemen.md) fuehrt neben Geld und
-- Normen die Vision als eigenen Bereich: gemeinsame Vision, Mission, Werte und
-- Arbeitsethos. Dafuer gab es kein Setup-Thema.
--
-- DREI WERTELISTEN WIE SCHON AM 27.10.2026: an den Themen, an den
-- Diskussionsbeitraegen und in create_founder_team_setup_discussion_entry. Die
-- Funktion steht vollstaendig hier, weil `create or replace function` keinen
-- Teilersatz kennt; geaendert ist ausschliesslich die Werteliste.
-- ---------------------------------------------------------------------------

alter table public.founder_team_setup_items
  drop constraint founder_team_setup_items_key_check,
  add constraint founder_team_setup_items_key_check check (
    item_key in (
      'roles_responsibilities', 'decision_rights', 'time_commitment', 'communication',
      'conflict_deadlock', 'equity', 'vesting', 'compensation', 'contributions_expenses',
      'personal_financial_risk', 'legal_entity', 'founder_agreements',
      'intellectual_property', 'outside_activities', 'accounts_access',
      'prolonged_absence', 'changing_commitment', 'founder_exit',
      'succession', 'post_exit_competition',
      'investor_dilution', 'company_sale',
      'vision_goals'
    )
  );

alter table public.founder_team_setup_discussion_entries
  drop constraint founder_team_setup_discussion_item_key_check,
  add constraint founder_team_setup_discussion_item_key_check check (
    item_key in (
      'roles_responsibilities', 'decision_rights', 'time_commitment', 'communication',
      'conflict_deadlock', 'equity', 'vesting', 'compensation', 'contributions_expenses',
      'personal_financial_risk', 'legal_entity', 'founder_agreements',
      'intellectual_property', 'outside_activities', 'accounts_access',
      'prolonged_absence', 'changing_commitment', 'founder_exit',
      'succession', 'post_exit_competition',
      'investor_dilution', 'company_sale',
      'vision_goals'
    )
  );

create or replace function public.create_founder_team_setup_discussion_entry(
  p_team_id uuid,
  p_item_key text,
  p_body text,
  p_parent_entry_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_parent public.founder_team_setup_discussion_entries%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_discussion_auth_required' using errcode = '42501';
  end if;
  if not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'founder_team_setup_discussion_unavailable' using errcode = '42501';
  end if;
  if p_item_key not in (
    'roles_responsibilities', 'decision_rights', 'time_commitment', 'communication',
    'conflict_deadlock', 'equity', 'vesting', 'compensation', 'contributions_expenses',
    'personal_financial_risk', 'legal_entity', 'founder_agreements',
    'intellectual_property', 'outside_activities', 'accounts_access',
    'prolonged_absence', 'changing_commitment', 'founder_exit',
    'succession', 'post_exit_competition',
    'investor_dilution', 'company_sale',
    'vision_goals'
  ) then
    raise exception 'founder_team_setup_discussion_item_invalid' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 5000 then
    raise exception 'founder_team_setup_discussion_body_invalid' using errcode = '22023';
  end if;

  if p_parent_entry_id is not null then
    select * into v_parent
    from public.founder_team_setup_discussion_entries entry
    where entry.id = p_parent_entry_id;

    if not found
       or v_parent.team_id <> p_team_id
       or v_parent.item_key <> p_item_key
       or v_parent.parent_entry_id is not null then
      raise exception 'founder_team_setup_discussion_parent_invalid' using errcode = '42501';
    end if;
  end if;

  insert into public.founder_team_setup_discussion_entries (
    team_id, item_key, author_user_id, parent_entry_id, body
  ) values (
    p_team_id, p_item_key, v_user_id, p_parent_entry_id, btrim(p_body)
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.create_founder_team_setup_discussion_entry(uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_founder_team_setup_discussion_entry(uuid, text, text, uuid)
  to authenticated;

commit;
