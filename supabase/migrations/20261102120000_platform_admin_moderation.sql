begin;

-- Explicit operational privilege, independent of self-managed product roles.
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;
grant select, insert, update, delete on public.platform_admins to service_role;

create function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;
revoke all on function public.is_platform_admin() from public, anon, authenticated;
grant execute on function public.is_platform_admin() to authenticated, service_role;

alter table public.network_reports
  add column status text not null default 'open'
    check (status in ('open', 'reviewed', 'closed')),
  add column admin_note text check (admin_note is null or char_length(admin_note) between 1 and 2000),
  add column moderated_at timestamptz,
  add column moderated_by uuid references auth.users(id) on delete set null;
create index network_reports_moderation_idx on public.network_reports
  ((case status when 'open' then 0 when 'reviewed' then 1 else 2 end), created_at desc, id);

-- Re-submitting changed content must not disappear in an already closed case.
-- Preserve the internal note, but the changed report needs a fresh review.
create function public.reopen_changed_network_report()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.category is distinct from old.category or new.comment is distinct from old.comment then
    new.status := 'open';
    new.moderated_at := null;
    new.moderated_by := null;
  end if;
  return new;
end;
$$;
revoke all on function public.reopen_changed_network_report() from public, anon, authenticated;
create trigger network_reports_reopen_changed
  before update of category, comment on public.network_reports
  for each row execute function public.reopen_changed_network_report();

-- No raw table access, including for admins. Only this bounded projection is
-- exposed; no arbitrary person/conversation lookup and no message history.
create function public.list_network_reports_for_moderation(
  p_status text default null, p_limit integer default 25, p_offset integer default 0
)
returns table (
  id uuid, created_at timestamptz, category text, comment text, status text,
  admin_note text, moderated_at timestamptz, moderated_by uuid,
  reporter_user_id uuid, reporter_name text, reported_user_id uuid, reported_name text,
  conversation_id uuid, contact_request_id uuid,
  participant_a_user_id uuid, participant_b_user_id uuid,
  origin text, context_title text, problem_id uuid, approach_id uuid, discovery_intro_request_id uuid
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  if (p_status is not null and p_status not in ('open', 'reviewed', 'closed'))
    or p_limit is null or p_limit < 1 or p_limit > 50
    or p_offset is null or p_offset < 0 then
    raise exception 'moderation_filter_invalid' using errcode = '23514';
  end if;
  return query
  select r.id, r.created_at, r.category, r.comment, r.status, r.admin_note, r.moderated_at, r.moderated_by,
    r.reporter_user_id, reporter.display_name, r.reported_user_id, reported.display_name,
    r.conversation_id, r.contact_request_id, c.participant_a_user_id, c.participant_b_user_id,
    case when r.contact_request_id is not null then 'contact_request'
      when c.problem_interest_id is not null then 'problem_interest'
      when c.discovery_intro_request_id is not null then 'find_intro' else 'unavailable' end,
    coalesce(problem.title, request.listing_title_snapshot), interest.problem_id, interest.approach_id,
    c.discovery_intro_request_id
  from public.network_reports r
  left join public.person_core reporter on reporter.user_id = r.reporter_user_id
  left join public.person_core reported on reported.user_id = r.reported_user_id
  left join public.network_conversations c on c.id = r.conversation_id
  left join public.network_contact_requests request on request.id = r.contact_request_id
  left join public.network_problem_interests interest on interest.id = c.problem_interest_id
  left join public.network_problems problem on problem.id = interest.problem_id
  where p_status is null or r.status = p_status
  order by case r.status when 'open' then 0 when 'reviewed' then 1 else 2 end, r.created_at desc, r.id
  limit p_limit offset p_offset;
end;
$$;

create function public.moderate_network_report(p_report_id uuid, p_status text, p_admin_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_note text := nullif(btrim(coalesce(p_admin_note, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('open', 'reviewed', 'closed') or char_length(v_note) > 2000 then
    raise exception 'moderation_input_invalid' using errcode = '23514';
  end if;
  update public.network_reports set status = p_status, admin_note = v_note,
    moderated_at = now(), moderated_by = auth.uid()
  where id = p_report_id;
  if not found then raise exception 'moderation_report_not_found' using errcode = 'P0002'; end if;
end;
$$;

alter table public.network_reports enable row level security;
revoke all on public.network_reports from public, anon, authenticated;
revoke all on function public.list_network_reports_for_moderation(text, integer, integer) from public, anon, authenticated;
revoke all on function public.moderate_network_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.list_network_reports_for_moderation(text, integer, integer) to authenticated, service_role;
grant execute on function public.moderate_network_report(uuid, text, text) to authenticated, service_role;

comment on table public.platform_admins is 'Explicit platform moderation access. Provision only through trusted administration, never via user profile roles.';
comment on column public.network_reports.admin_note is 'Internal moderation note; never returned by participant reporting RPCs.';
notify pgrst, 'reload schema';
commit;
