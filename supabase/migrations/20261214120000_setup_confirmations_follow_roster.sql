begin;

-- ---------------------------------------------------------------------------
-- Eine Setup-Bestaetigung gilt nur, solange die Person seither nicht ausgetreten ist
-- ---------------------------------------------------------------------------
-- GEFUNDEN BEI DER PRUEFUNG FUER DREI UND VIER GRUENDENDE (21.10.2026).
--
-- Die Regel hiess: Eine Vereinbarung gilt als vom Team bestaetigt, wenn fuer JEDES AKTUELLE
-- Mitglied eine Bestaetigung existiert. Bestaetigungen werden beim Austritt aber nicht geloescht
-- (Historie bleibt). Trat C aus und spaeter wieder ein, zaehlte seine alte Bestaetigung fuer
-- Vereinbarungen, die er nie erneut gesehen hat und die ein anderes Team betrafen.
--
-- JETZT: Eine Bestaetigung zaehlt nur, wenn die Person danach nicht mehr ausgetreten ist
-- (`founder_team_member_exits.exited_at` ist der letzte Austritt). Nichts wird geloescht oder umgeschrieben;
-- die Historie bleibt, sie gilt nur nicht mehr als aktuell. Wer nach dem Wiedereintritt erneut
-- bestaetigt, bekommt einen neuen Zeitpunkt und gilt wieder.
--
-- Angewendet in: dem Teambericht (`get_workstyle_product_team`), der Advisor-Sicht
-- (`get_advisor_confirmed_founder_setup`) und dem Abschluss (`confirm_founder_team_setup_revision`).
-- Die Setup-Seite liest die Austritte ueber `get_setup_confirmation_exits`.

create or replace function public.setup_confirmation_is_current(p_team_id uuid, p_user_id uuid, p_confirmed_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.founder_team_member_exits exit_row
    where exit_row.team_id = p_team_id
      and exit_row.user_id = p_user_id
      -- Strikt groesser: Innerhalb einer Transaktion (gleiches now()) zaehlt eine Bestaetigung nach dem
      -- Austritt - nur eine, die davor lag, ist veraltet.
      and exit_row.exited_at > p_confirmed_at
  );
$$;
-- Nur die aufrufenden Funktionen (SECURITY DEFINER) duerfen sie nutzen: Offen waere sie ein Orakel dafuer,
-- ob jemand ein Team verlassen hat.
revoke all on function public.setup_confirmation_is_current(uuid, uuid, timestamptz) from public, anon, authenticated;

comment on function public.setup_confirmation_is_current(uuid, uuid, timestamptz) is
  'Wahr, wenn die Person nach dieser Bestaetigung nicht (mehr) aus dem Team ausgetreten ist. Eine Bestaetigung vor dem letzten Austritt zaehlt nicht als aktuell.';

-- Die Austritte der aktuellen Mitglieder - fuer die Setup-Seite. Nur fuer Mitglieder des Teams.
create or replace function public.get_setup_confirmation_exits(p_team_id uuid)
returns table (user_id uuid, exited_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select exit_row.user_id, exit_row.exited_at
  from public.founder_team_member_exits exit_row
  join public.founder_team_members member
    on member.team_id = exit_row.team_id and member.user_id = exit_row.user_id
  where exit_row.team_id = p_team_id
    and public.is_current_user_founder_team_member(p_team_id);
$$;
revoke all on function public.get_setup_confirmation_exits(uuid) from public, anon;
grant execute on function public.get_setup_confirmation_exits(uuid) to authenticated, service_role;

create or replace function public.get_workstyle_product_team(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare team public.founder_teams; member record; profile jsonb; people jsonb:='[]'; caps jsonb; alignment jsonb; setup jsonb:='[]'; a public.assessments; rel record; allowed_setup boolean:=false; viewer_member boolean;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 select * into team from public.founder_teams where id=p_team_id;
 if not found then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 viewer_member:=public.is_current_user_founder_team_member(p_team_id);
 -- Phase 11.7B: Der gemeinsame Bericht ist bereit, wenn JEDES aktuelle Mitglied
 -- ein aktuelles Arbeitsprofil hat und fuer dieses Team geteilt hat - sonst fuer
 -- niemanden, auch fuer Advisors nicht. Advisors brauchen zusaetzlich weiterhin
 -- ihre eigenen Freigaben (unten ueber get_workstyle_product_profile).
 if exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not public.team_member_shares_with_team(p_team_id,m.user_id)) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select m.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members m left join public.profiles p on p.user_id=m.user_id where m.team_id=p_team_id order by m.created_at,m.user_id loop
  profile:=public.get_workstyle_product_profile(member.user_id);
  if profile is null or jsonb_array_length(profile->'answers')<>29 then return jsonb_build_object('status','not_ready'); end if;
  caps:='[]';
  if member.user_id=auth.uid() then
   select coalesce(jsonb_agg(jsonb_build_object('area_id',area_id,'application_level',application_level,'ownership_wish',ownership_wish) order by area_id),'[]') into caps from public.person_capability_entries where user_id=member.user_id;
  elsif viewer_member then
   -- Phase 11.7B.1: teamgenau - nur die Teamfreigabe fuer GENAU dieses Team zaehlt.
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_team_capability(p_team_id,member.user_id) c;
  elsif public.has_advisor_person_access(member.user_id,'capability') then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_advisor_person_capability(member.user_id) c;
  end if;
  alignment:=null;
  select * into a from public.assessments where user_id=member.user_id and instrument_id='venture-alignment-v1' and venture_id=p_team_id and submitted_at is not null order by created_at desc,id limit 1;
  if a.id is not null and (member.user_id=auth.uid() or public.venture_visible_in_team(a.id,auth.uid())) then
   -- Eigene Antworten oder Teamkontext: vollstaendig, keine Ausblendung.
   select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'value',r.value,'missing_reason',r.missing_code) order by r.block_id),'[]') into alignment from public.alignment_answers r where r.assessment_id=a.id;
  elsif a.id is not null and public.alignment_share_is_effective(a.id,auth.uid()) then
   -- Advisor: nur ueber die eigene gerichtete Freigabe, mit Ausblendungen.
   select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'value',r.value,'missing_reason',r.missing_code) order by r.block_id),'[]') into alignment from public.alignment_answers r where r.assessment_id=a.id
   and not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id);
  end if;
  people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'name',member.name,'workstyle',profile,'capabilities',caps,'alignment',alignment));
 end loop;
 if viewer_member then
  allowed_setup:=true;
  select coalesce(jsonb_agg(jsonb_build_object('item_key',i.item_key,'resolution_status',r.resolution_status,'note',r.note,'confirmed_at',r.confirmed_at) order by i.item_key),'[]') into setup
  from public.founder_team_setup_items i join public.founder_team_setup_revisions r on r.id=i.current_confirmed_revision_id and r.setup_item_id=i.id
  where i.team_id=p_team_id and r.confirmed_at is not null and r.superseded_at is null
  and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.founder_team_setup_confirmations c where c.revision_id=r.id and c.user_id=m.user_id and public.setup_confirmation_is_current(p_team_id,c.user_id,c.confirmed_at)));
 else
  for rel in select id from public.relationships where founder_team_id=p_team_id order by id loop
   select coalesce(jsonb_agg(to_jsonb(s) order by s.item_key),'[]') into setup from public.get_advisor_confirmed_founder_setup(rel.id) s
   where exists(select 1 from public.founder_team_setup_items i where i.team_id=p_team_id and i.item_key=s.item_key
    and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.founder_team_setup_confirmations c where c.revision_id=i.current_confirmed_revision_id and c.user_id=m.user_id and public.setup_confirmation_is_current(p_team_id,c.user_id,c.confirmed_at))));
   if jsonb_array_length(setup)>0 then allowed_setup:=true; exit; end if;
  end loop;
 end if;
 return jsonb_build_object('status','ready','alignment_instrument_id','venture-alignment-v1','alignment_manifest_version','1.0.0','team_id',team.id,'team_name',team.name,'team_context',team.team_context,'people',people,'setup',setup,'setup_available',allowed_setup,
 'taxonomy',jsonb_build_object('areas',(select jsonb_agg(jsonb_build_object('area_id',area_id,'family_id',family_id,'sourcing',sourcing,'sort_order',sort_order) order by sort_order,area_id) from public.capability_areas),'families',(select jsonb_agg(to_jsonb(f) order by f.sort_order,f.family_id) from public.capability_families f)));
end $$;

create or replace function public.get_advisor_confirmed_founder_setup(p_relationship_id uuid)
returns table (
  item_key text,
  resolution_status text,
  note text,
  documentation_reference text,
  confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    item.item_key,
    revision.resolution_status,
    revision.note,
    revision.documentation_reference,
    revision.confirmed_at
  from public.founder_team_advisor_setup_grants grant_row
  join public.relationship_advisors source_access
    on source_access.id = grant_row.source_relationship_advisor_id
  join public.relationships source_relationship
    on source_relationship.id = source_access.relationship_id
   and source_relationship.founder_team_id = grant_row.team_id
  join public.founder_team_setup_items item
    on item.team_id = grant_row.team_id
  join public.founder_team_setup_revisions revision
    on revision.id = item.current_confirmed_revision_id
   and revision.setup_item_id = item.id
  where auth.uid() is not null
    and grant_row.advisor_user_id = auth.uid()
    and grant_row.scope = 'confirmed_only'
    and grant_row.status = 'active'
    and grant_row.revoked_at is null
    and revision.confirmed_at is not null
    and revision.superseded_at is null
    -- Phase 12C.1B: nur Vereinbarungen, die JEDES aktuelle Mitglied bestaetigt
    -- hat (wie im Teambericht) - auch fuer die Legacy-Seiten. Kein archiviertes Team.
    and not exists (
      select 1 from public.founder_team_members current_member
      where current_member.team_id = grant_row.team_id
        and not exists (
          select 1 from public.founder_team_setup_confirmations confirmation
          where confirmation.revision_id = revision.id
            and confirmation.user_id = current_member.user_id
            and public.setup_confirmation_is_current(grant_row.team_id, confirmation.user_id, confirmation.confirmed_at)))
    and not exists (select 1 from public.founder_teams archived where archived.id = grant_row.team_id and archived.archived_at is not null)
    and source_access.advisor_user_id = auth.uid()
    and source_access.status = 'linked'
    and source_access.founder_a_approved = true
    and source_access.founder_b_approved = true
    and source_access.revoked_at is null
    and exists (
      select 1
      from public.relationship_advisors request_access
      join public.relationships request_relationship
        on request_relationship.id = request_access.relationship_id
      where request_access.relationship_id = p_relationship_id
        and request_access.advisor_user_id = auth.uid()
        and request_access.status = 'linked'
        and request_access.founder_a_approved = true
        and request_access.founder_b_approved = true
        and request_access.revoked_at is null
        and request_relationship.founder_team_id = grant_row.team_id
    )
    and (select count(*) from public.founder_team_members member where member.team_id = grant_row.team_id) >= 2
    and not exists (
      select 1
      from public.founder_team_members missing_member
      where missing_member.team_id = grant_row.team_id
        and not exists (
          select 1
          from public.founder_team_advisor_setup_consents consent
          where consent.grant_id = grant_row.id
            and consent.founder_user_id = missing_member.user_id
        )
    )
  order by item.item_key;
$$;

create or replace function public.confirm_founder_team_setup_revision(p_revision_id uuid)
returns table (
  setup_item_id uuid,
  revision_id uuid,
  confirmation_count integer,
  member_count integer,
  finalized boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_setup_item_id uuid;
  v_item public.founder_team_setup_items%rowtype;
  v_revision public.founder_team_setup_revisions%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_auth_required' using errcode = '42501';
  end if;

  select revision.* into v_revision
  from public.founder_team_setup_revisions revision
  where revision.id = p_revision_id;
  if not found then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  v_setup_item_id := v_revision.setup_item_id;

  select * into v_item
  from public.founder_team_setup_items item
  where item.id = v_setup_item_id;
  if not found then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = v_item.team_id for update;
  if not public.is_current_user_founder_team_member(v_item.team_id) then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  select revision.* into v_revision
  from public.founder_team_setup_revisions revision
  where revision.id = p_revision_id
  for update;

  select * into v_item
  from public.founder_team_setup_items item
  where item.id = v_setup_item_id
  for update;

  if v_revision.confirmed_at is not null
     and v_item.current_confirmed_revision_id = v_revision.id
     and exists (
       select 1 from public.founder_team_setup_confirmations confirmation
       where confirmation.revision_id = v_revision.id and confirmation.user_id = v_user_id
     ) then
    select count(*)::integer into member_count
    from public.founder_team_members member where member.team_id = v_item.team_id;
    select count(*)::integer into confirmation_count
    from public.founder_team_setup_confirmations confirmation
    where confirmation.revision_id = v_revision.id;
    setup_item_id := v_item.id;
    revision_id := v_revision.id;
    finalized := true;
    return next;
    return;
  end if;

  if v_item.pending_revision_id is distinct from v_revision.id
     or v_revision.confirmed_at is not null
     or v_revision.superseded_at is not null then
    raise exception 'founder_team_setup_revision_not_pending' using errcode = '42501';
  end if;

  -- Eine Bestaetigung, die VOR dem letzten Austritt dieser Person entstand, gilt nicht mehr (sie
  -- betraf ein anderes Team). Bestaetigt die Person erneut, wird der Zeitpunkt erneuert.
  insert into public.founder_team_setup_confirmations(revision_id, user_id)
  values (v_revision.id, v_user_id)
  on conflict on constraint founder_team_setup_confirmations_pkey do update
    set confirmed_at = now()
    where not public.setup_confirmation_is_current(v_item.team_id, public.founder_team_setup_confirmations.user_id, public.founder_team_setup_confirmations.confirmed_at);

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = v_item.team_id;

  select count(*)::integer into confirmation_count
  from public.founder_team_setup_confirmations confirmation
  join public.founder_team_members member
    on member.team_id = v_item.team_id and member.user_id = confirmation.user_id
  where confirmation.revision_id = v_revision.id
    and public.setup_confirmation_is_current(v_item.team_id, confirmation.user_id, confirmation.confirmed_at);

  finalized := member_count >= 2 and confirmation_count = member_count;
  if finalized then
    update public.founder_team_setup_revisions
    set confirmed_at = now()
    where id = v_revision.id and confirmed_at is null and superseded_at is null;

    update public.founder_team_setup_items
    set current_confirmed_revision_id = v_revision.id,
        pending_revision_id = null,
        work_status = 'open',
        updated_by_user_id = v_user_id
    where id = v_item.id and pending_revision_id = v_revision.id;
  end if;

  setup_item_id := v_item.id;
  revision_id := v_revision.id;
  return next;
end;
$$;

commit;
