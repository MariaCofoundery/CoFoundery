begin;

-- Keep the first activation timestamp as a minimal lifecycle signal. The
-- original V1 constraint required it to be cleared when membership paused a
-- grant, which made "pending consent" and "paused after activation"
-- indistinguishable to the advisor projection.
alter table public.founder_team_advisor_setup_grants
  drop constraint founder_team_advisor_setup_grants_lifecycle_check;

alter table public.founder_team_advisor_setup_grants
  add constraint founder_team_advisor_setup_grants_lifecycle_check
  check (
    (status = 'pending' and revoked_at is null)
    or (status = 'active' and activated_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  );

create or replace function public.pause_founder_team_advisor_setup_grants_for_new_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.founder_team_advisor_setup_grants grant_row
  set status = 'pending'
  where grant_row.team_id = new.team_id
    and grant_row.status = 'active'
    and grant_row.revoked_at is null
    and not exists (
      select 1
      from public.founder_team_advisor_setup_consents consent
      where consent.grant_id = grant_row.id
        and consent.founder_user_id = new.user_id
    );
  return new;
end;
$$;

revoke all on function public.pause_founder_team_advisor_setup_grants_for_new_member()
from public, anon, authenticated, service_role;

create or replace function public.get_advisor_founder_setup_access_status(
  p_relationship_id uuid
)
returns table (
  access_status text,
  consent_count integer,
  member_count integer,
  confirmed_item_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with request_context as (
    select relationship.founder_team_id as team_id
    from public.relationship_advisors request_access
    join public.relationships relationship
      on relationship.id = request_access.relationship_id
    where request_access.relationship_id = p_relationship_id
      and request_access.advisor_user_id = auth.uid()
      and request_access.status = 'linked'
      and request_access.founder_a_approved = true
      and request_access.founder_b_approved = true
      and request_access.revoked_at is null
      and relationship.founder_team_id is not null
    limit 1
  ), latest_grant as (
    select grant_row.*
    from request_context context
    join public.founder_team_advisor_setup_grants grant_row
      on grant_row.team_id = context.team_id
     and grant_row.advisor_user_id = auth.uid()
    order by grant_row.created_at desc, grant_row.id desc
    limit 1
  ), counts as (
    select
      context.team_id,
      grant_row.id as grant_id,
      coalesce((
        select count(*)::integer
        from public.founder_team_members member
        where member.team_id = context.team_id
      ), 0) as member_count,
      coalesce((
        select count(*)::integer
        from public.founder_team_advisor_setup_consents consent
        join public.founder_team_members member
          on member.team_id = context.team_id
         and member.user_id = consent.founder_user_id
        where consent.grant_id = grant_row.id
      ), 0) as consent_count,
      coalesce((
        select count(*)::integer
        from public.founder_team_setup_items item
        join public.founder_team_setup_revisions revision
          on revision.id = item.current_confirmed_revision_id
         and revision.setup_item_id = item.id
        where item.team_id = context.team_id
          and revision.confirmed_at is not null
          and revision.superseded_at is null
      ), 0) as confirmed_item_count,
      exists (
        select 1
        from public.founder_team_members member
        where member.team_id = context.team_id
          and member.created_at > grant_row.created_at
          and not exists (
            select 1
            from public.founder_team_advisor_setup_consents consent
            where consent.grant_id = grant_row.id
              and consent.founder_user_id = member.user_id
          )
      ) as membership_changed
    from request_context context
    left join latest_grant grant_row on true
  )
  select
    case
      when grant_row.id is null then 'not_granted'
      when grant_row.status = 'revoked' or grant_row.revoked_at is not null then 'revoked'
      when grant_row.status = 'active'
        and counts.member_count >= 2
        and counts.consent_count = counts.member_count
        and public.is_founder_team_setup_advisor_source_eligible(
          grant_row.team_id,
          grant_row.source_relationship_advisor_id,
          grant_row.advisor_user_id
        )
      then 'active'
      when grant_row.activated_at is not null
        or counts.membership_changed
        or not public.is_founder_team_setup_advisor_source_eligible(
          grant_row.team_id,
          grant_row.source_relationship_advisor_id,
          grant_row.advisor_user_id
        )
      then 'paused'
      else 'pending'
    end as access_status,
    counts.consent_count,
    counts.member_count,
    case
      when grant_row.status = 'active'
        and counts.member_count >= 2
        and counts.consent_count = counts.member_count
        and public.is_founder_team_setup_advisor_source_eligible(
          grant_row.team_id,
          grant_row.source_relationship_advisor_id,
          grant_row.advisor_user_id
        )
      then counts.confirmed_item_count
      else 0
    end as confirmed_item_count
  from counts
  left join latest_grant grant_row on true;
$$;

revoke all on function public.get_advisor_founder_setup_access_status(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_advisor_founder_setup_access_status(uuid)
to authenticated;

comment on function public.get_advisor_founder_setup_access_status(uuid) is
  'Projects the current advisor-visible Founder Setup grant state without exposing grants, consents, working notes, pending revisions, or member identities.';

commit;
