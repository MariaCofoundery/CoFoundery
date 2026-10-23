begin;

-- ---------------------------------------------------------------------------
-- Staerken und Antrieb im Team: eigene Freigabe
-- ---------------------------------------------------------------------------
--
-- Eine EIGENE Freigabe, getrennt von `team_shares` (Arbeitsprofil + Faehigkeiten),
-- von der Werte-Freigabe (`assessment_team_shares`) und von allem, was Advisors,
-- FIND oder Forschung betrifft. Ein Schalter je Person und Team: an oder aus.
--
--   WAS FREIGEGEBEN WIRD: die bestaetigten Saetze zu Staerken (`person_strengths`)
--   und die bestaetigten Aussagen zum Antrieb (`direction_statements`) - so, wie
--   die Person sie selbst bestaetigt hat. Keine offenen Vorschlaege, keine
--   Interview-Texte, keine Herkunft, keine Zuversicht.
--
--   WER SIEHT: aktuelle Mitglieder dieses Teams, und nur, was Mitglieder
--   freigegeben haben. Wer nicht teilt, erscheint nicht - es gibt keine Liste
--   fehlender Personen und keine Zaehlung. Die eigene Sicht braucht keine
--   Gegenseitigkeit: Die eigene Freigabe ist keine Bedingung dafuer, die
--   Freigaben anderer zu lesen.
--
--   ZURUECKNEHMEN wirkt sofort. Verlaesst eine Person das Team, endet ihre
--   Freigabe mit der Mitgliedschaft; ein spaeterer Wiedereintritt teilt nichts.
--
--   KEIN BESTEHENDER VERTRAG WIRD ANGEFASST.
-- ---------------------------------------------------------------------------

create table public.team_profile_shares (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'strengths_direction' check (scope in ('strengths_direction')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, owner_user_id, scope),
  check (revoked_at is null or revoked_at >= granted_at)
);
create index team_profile_shares_owner_idx on public.team_profile_shares (owner_user_id) where revoked_at is null;
comment on table public.team_profile_shares is
  'Eine Freigabe je Person und Team fuer bestaetigte Staerken und Antrieb. Eigener Vertrag, getrennt von team_shares und assessment_team_shares. Schreiben nur ueber set_team_strengths_share; Lesen ueber get_team_strengths_overview.';
alter table public.team_profile_shares enable row level security;
revoke all on public.team_profile_shares from public, anon, authenticated;
grant select on public.team_profile_shares to authenticated;
-- Nur die eigene Freigabe: Niemand sonst sieht, ob und wer geteilt oder zurueckgenommen hat.
create policy team_profile_shares_select_owner on public.team_profile_shares
  for select to authenticated using (owner_user_id = auth.uid());

-- Freigeben / Zuruecknehmen.
create function public.set_team_strengths_share(p_team_id uuid, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.team_profile_shares;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_team_id is null or p_enabled is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'not_team_member' using errcode = '42501';
  end if;
  if p_enabled then
    insert into public.team_profile_shares as existing (team_id, owner_user_id)
      values (p_team_id, auth.uid())
    on conflict (team_id, owner_user_id, scope) do update set
      granted_at = case when existing.revoked_at is null then existing.granted_at else now() end,
      revoked_at = null, updated_at = now()
    returning * into s;
  else
    update public.team_profile_shares set revoked_at = now(), updated_at = now()
      where team_id = p_team_id and owner_user_id = auth.uid() and revoked_at is null
    returning * into s;
  end if;
  return jsonb_build_object('team_id', p_team_id, 'enabled', coalesce(s.revoked_at is null and s.id is not null, false));
end $$;
revoke all on function public.set_team_strengths_share(uuid, boolean) from public, anon;
grant execute on function public.set_team_strengths_share(uuid, boolean) to authenticated;

-- Die Sicht eines aktuellen Mitglieds: die eigene Freigabe und die Inhalte aller, die geteilt haben.
create function public.get_team_strengths_overview(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare people jsonb := '[]'; m record; own_shared boolean;
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then return null; end if;
  select exists (
    select 1 from public.team_profile_shares s
    where s.team_id = p_team_id and s.owner_user_id = auth.uid() and s.revoked_at is null
  ) into own_shared;

  for m in
    select tm.user_id, coalesce(nullif(btrim(p.display_name), ''), 'Founder') as name
    from public.founder_team_members tm
    left join public.profiles p on p.user_id = tm.user_id
    where tm.team_id = p_team_id
      and exists (
        select 1 from public.team_profile_shares s
        where s.team_id = p_team_id and s.owner_user_id = tm.user_id and s.revoked_at is null
      )
    order by tm.created_at, tm.user_id
  loop
    people := people || jsonb_build_array(jsonb_build_object(
      'person_id', m.user_id,
      'name', m.name,
      'is_viewer', m.user_id = auth.uid(),
      'strengths', coalesce((
        select jsonb_agg(jsonb_build_object('label', st.label, 'statement', st.statement) order by st.created_at, st.id)
        from public.person_strengths st where st.user_id = m.user_id
      ), '[]'::jsonb),
      'direction', coalesce((
        select jsonb_agg(jsonb_build_object('facet', d.facet, 'statement', d.statement) order by d.facet, d.created_at, d.id)
        from public.direction_statements d where d.user_id = m.user_id
      ), '[]'::jsonb)
    ));
  end loop;

  return jsonb_build_object('team_id', p_team_id, 'own_shared', own_shared, 'people', people);
end $$;
revoke all on function public.get_team_strengths_overview(uuid) from public, anon;
grant execute on function public.get_team_strengths_overview(uuid) to authenticated;

-- Austritt beendet die Freigabe - auch ein spaeterer Wiedereintritt teilt nichts.
create function public.end_team_profile_shares_on_member_removal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.team_profile_shares set revoked_at = now(), updated_at = now()
    where team_id = old.team_id and owner_user_id = old.user_id and revoked_at is null;
  return old;
end $$;
revoke all on function public.end_team_profile_shares_on_member_removal() from public, anon, authenticated;
create trigger end_team_profile_shares_on_member_removal
  after delete on public.founder_team_members
  for each row execute function public.end_team_profile_shares_on_member_removal();

notify pgrst, 'reload schema';
commit;
