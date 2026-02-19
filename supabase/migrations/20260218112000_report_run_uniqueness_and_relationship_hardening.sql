-- Security hardening:
-- 1) exactly one immutable report_run per source_session_id
-- 2) ensure_relationship_for_users restricted to session-bound pairs

-- Deduplicate historical race duplicates first; keep earliest snapshot per source_session_id.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'report_runs'
      and column_name = 'source_session_id'
  ) then
    with ranked as (
      select
        id,
        source_session_id,
        row_number() over (
          partition by source_session_id
          order by created_at asc, id asc
        ) as rn
      from public.report_runs
      where source_session_id is not null
    )
    delete from public.report_runs rr
    using ranked r
    where rr.id = r.id
      and r.rn > 1;
  end if;
end $$;

create unique index if not exists report_runs_source_session_uidx
  on public.report_runs(source_session_id)
  where source_session_id is not null;

create or replace function public.ensure_relationship_for_users(
  p_user_a_id uuid,
  p_user_b_id uuid,
  p_source_session_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_relationship_id uuid;
  v_pair_in_session boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_user_a_id is null or p_user_b_id is null or p_source_session_id is null then
    raise exception 'invalid_pair';
  end if;

  if p_user_a_id = p_user_b_id then
    raise exception 'invalid_pair';
  end if;

  -- Caller must be one of the two users in the requested relationship.
  if v_uid not in (p_user_a_id, p_user_b_id) then
    raise exception 'forbidden';
  end if;

  -- Harden against arbitrary pair creation: both users must belong to the same source session.
  select exists (
    select 1
    from public.participants pa
    join public.participants pb
      on pb.session_id = pa.session_id
    where pa.session_id = p_source_session_id
      and pa.user_id = p_user_a_id
      and pb.user_id = p_user_b_id
  ) into v_pair_in_session;

  if not v_pair_in_session then
    raise exception 'pair_not_in_session';
  end if;

  insert into public.relationships (user_a_id, user_b_id, status)
  values (p_user_a_id, p_user_b_id, 'active')
  on conflict (pair_user_low, pair_user_high)
  do update set updated_at = now()
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;

grant execute on function public.ensure_relationship_for_users(uuid, uuid, uuid) to authenticated;
revoke execute on function public.ensure_relationship_for_users(uuid, uuid) from authenticated;
drop function if exists public.ensure_relationship_for_users(uuid, uuid);
