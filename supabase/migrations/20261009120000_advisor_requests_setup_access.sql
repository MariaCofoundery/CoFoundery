begin;

-- ---------------------------------------------------------------------------
-- Der Advisor darf fragen
-- ---------------------------------------------------------------------------
--
-- DIE LUECKE: Eine Freigabe fuer das Founder Setup konnte bisher nur ein
-- FOUNDER vorschlagen - `propose_founder_team_advisor_setup_grant` verlangt
-- `is_current_user_founder_team_member`. Der Advisor hatte keinen Weg, darum zu
-- bitten. Er musste es ausserhalb des Produkts sagen ("geht mal in euer Team
-- und gebt mir das frei"), und die Founder mussten den Pfad selbst finden.
--
-- WAS SICH NICHT AENDERT, und das ist der Punkt: Die Freigabe selbst. Sie
-- verlangt weiterhin die Zustimmung JEDES Teammitglieds ueber
-- `confirm_founder_team_advisor_setup_grant`, und die prueft
-- `is_current_user_founder_team_member` - ein Advisor kann fuer niemanden
-- zustimmen. Er legt hier eine ANFRAGE an, keine Berechtigung: Die Zeile
-- entsteht mit Status 'pending' und OHNE eine einzige Zustimmung.
--
-- Im Unterschied dazu traegt ein Founder, der vorschlaegt, seine eigene
-- Zustimmung gleich mit ein - er hat ja zugestimmt, indem er vorschlug. Beim
-- Advisor gibt es nichts mitzutragen.
-- ---------------------------------------------------------------------------

alter table public.founder_team_advisor_setup_grants
  add column requested_by_advisor_at timestamptz;

comment on column public.founder_team_advisor_setup_grants.requested_by_advisor_at is
  'Gesetzt, wenn die begleitende Person selbst um die Freigabe gebeten hat. Die Founder sollen wissen, ob sie es selbst vorgeschlagen haben oder gefragt wurden - das ist ein Unterschied in der Sache.';

-- Der Parameter ist die BEZIEHUNG und nicht das Team: Das ist der Anker, den
-- die begleitende Person hat. Das Team wird daraus abgeleitet - so kann niemand
-- eine fremde Team-Kennung einsetzen und darauf hoffen, dass die Pruefung
-- danebengreift.
create or replace function public.request_founder_team_advisor_setup_grant(p_relationship_id uuid)
returns table (
  grant_id uuid,
  consent_count integer,
  member_count integer,
  active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_source_id uuid;
  v_grant public.founder_team_advisor_setup_grants%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_advisor_setup_auth_required' using errcode = '42501';
  end if;

  -- Die Quelle wird NICHT uebergeben, sondern gesucht: Sonst koennte jemand
  -- eine fremde Freigabe-Zeile als Quelle angeben. Gesucht wird ausschliesslich
  -- unter den Beziehungen dieses Teams, in denen die aufrufende Person selbst
  -- die begleitende ist - mit beiden Founder-Freigaben und ohne Widerruf.
  select advisor_access.id, relationship.founder_team_id
    into v_source_id, v_team_id
  from public.relationship_advisors advisor_access
  join public.relationships relationship
    on relationship.id = advisor_access.relationship_id
  where advisor_access.relationship_id = p_relationship_id
    and relationship.founder_team_id is not null
    and advisor_access.advisor_user_id = v_user_id
    and advisor_access.status = 'linked'
    and advisor_access.founder_a_approved = true
    and advisor_access.founder_b_approved = true
    and advisor_access.revoked_at is null
  order by advisor_access.updated_at desc, advisor_access.id
  limit 1;

  if v_source_id is null or v_team_id is null then
    raise exception 'founder_team_advisor_setup_advisor_ineligible' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = v_team_id for update;
  if not found then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  select * into v_grant
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.team_id = v_team_id
    and grant_row.advisor_user_id = v_user_id
    and grant_row.revoked_at is null
  for update;

  -- Zweimal fragen legt keine zweite Anfrage an. Eine bestehende Anfrage wird
  -- zurueckgegeben, eine bereits aktive Freigabe bleibt unberuehrt - ein
  -- erneutes Fragen darf nichts zuruecksetzen.
  if not found then
    insert into public.founder_team_advisor_setup_grants (
      team_id,
      advisor_user_id,
      source_relationship_advisor_id,
      scope,
      status,
      created_by_user_id,
      requested_by_advisor_at
    ) values (
      v_team_id,
      v_user_id,
      v_source_id,
      'confirmed_only',
      'pending',
      v_user_id,
      now()
    )
    returning * into v_grant;
  elsif v_grant.requested_by_advisor_at is null then
    -- Es gab schon einen Vorschlag der Founder. Die Anfrage wird vermerkt,
    -- damit die Founder sehen, dass die begleitende Person darauf wartet -
    -- aber nichts am Zustand veraendert.
    update public.founder_team_advisor_setup_grants
    set requested_by_advisor_at = now()
    where id = v_grant.id
    returning * into v_grant;
  end if;

  -- KEINE Zustimmung. Der Advisor kann fuer niemanden zustimmen, und diese
  -- Funktion versucht es auch nicht.
  active := public.refresh_founder_team_advisor_setup_grant(v_grant.id);
  grant_id := v_grant.id;

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = v_team_id;
  select count(*)::integer into consent_count
  from public.founder_team_advisor_setup_consents consent
  join public.founder_team_members member
    on member.team_id = v_team_id and member.user_id = consent.founder_user_id
  where consent.grant_id = v_grant.id;
  return next;
end;
$$;

revoke all on function public.request_founder_team_advisor_setup_grant(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.request_founder_team_advisor_setup_grant(uuid) to authenticated;

comment on function public.request_founder_team_advisor_setup_grant(uuid) is
  'Die begleitende Person bittet um Freigabe des Founder Setup. Legt eine Anfrage mit Status pending und OHNE Zustimmung an; jedes Teammitglied muss weiterhin selbst zustimmen.';

-- ---------------------------------------------------------------------------
-- Die Founder sehen, dass gefragt wurde
-- ---------------------------------------------------------------------------
-- Die Ansicht der Founder bekommt ein Feld dazu. Ob man selbst vorgeschlagen
-- hat oder gefragt wurde, ist ein Unterschied in der Sache - und ohne diese
-- Angabe stuende in beiden Faellen dasselbe da.
drop function if exists public.get_founder_team_advisor_setup_access(uuid);

create function public.get_founder_team_advisor_setup_access(p_team_id uuid)
returns table (
  source_relationship_advisor_id uuid,
  advisor_name text,
  grant_id uuid,
  grant_status text,
  consented_founder_user_ids uuid[],
  access_active boolean,
  requested_by_advisor boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with eligible_sources as (
    select distinct on (advisor_access.advisor_user_id)
      advisor_access.id,
      advisor_access.advisor_user_id,
      advisor_access.advisor_name,
      advisor_access.updated_at
    from public.relationship_advisors advisor_access
    join public.relationships relationship
      on relationship.id = advisor_access.relationship_id
    where relationship.founder_team_id = p_team_id
      and advisor_access.advisor_user_id is not null
      and advisor_access.status = 'linked'
      and advisor_access.founder_a_approved = true
      and advisor_access.founder_b_approved = true
      and advisor_access.revoked_at is null
    order by advisor_access.advisor_user_id, advisor_access.updated_at desc, advisor_access.id
  )
  select
    source.id as source_relationship_advisor_id,
    nullif(btrim(coalesce(source.advisor_name, '')), '') as advisor_name,
    grant_row.id as grant_id,
    case
      when grant_row.id is null then 'not_granted'
      when grant_row.status = 'active'
        and public.is_founder_team_setup_advisor_source_eligible(
          grant_row.team_id,
          grant_row.source_relationship_advisor_id,
          grant_row.advisor_user_id
        )
        and not exists (
          select 1
          from public.founder_team_members missing_member
          where missing_member.team_id = p_team_id
            and not exists (
              select 1
              from public.founder_team_advisor_setup_consents consent
              where consent.grant_id = grant_row.id
                and consent.founder_user_id = missing_member.user_id
            )
        )
      then 'active'
      else 'pending'
    end as grant_status,
    coalesce(
      (
        select array_agg(consent.founder_user_id order by consent.approved_at)
        from public.founder_team_advisor_setup_consents consent
        join public.founder_team_members member
          on member.team_id = p_team_id
         and member.user_id = consent.founder_user_id
        where consent.grant_id = grant_row.id
      ),
      '{}'::uuid[]
    ) as consented_founder_user_ids,
    coalesce(
      grant_row.status = 'active'
      and public.is_founder_team_setup_advisor_source_eligible(
        grant_row.team_id,
        grant_row.source_relationship_advisor_id,
        grant_row.advisor_user_id
      )
      and not exists (
        select 1
        from public.founder_team_members missing_member
        where missing_member.team_id = p_team_id
          and not exists (
            select 1
            from public.founder_team_advisor_setup_consents consent
            where consent.grant_id = grant_row.id
              and consent.founder_user_id = missing_member.user_id
          )
      ),
      false
    ) as access_active,
    grant_row.requested_by_advisor_at is not null as requested_by_advisor
  from eligible_sources source
  left join lateral (
    select grant_candidate.*
    from public.founder_team_advisor_setup_grants grant_candidate
    where grant_candidate.team_id = p_team_id
      and grant_candidate.advisor_user_id = source.advisor_user_id
      and grant_candidate.revoked_at is null
    order by grant_candidate.created_at desc
    limit 1
  ) grant_row on true
  where auth.uid() is not null
    and public.is_current_user_founder_team_member(p_team_id)
  order by source.updated_at desc, source.id;
$$;

revoke all on function public.get_founder_team_advisor_setup_access(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.get_founder_team_advisor_setup_access(uuid) to authenticated;

commit;
