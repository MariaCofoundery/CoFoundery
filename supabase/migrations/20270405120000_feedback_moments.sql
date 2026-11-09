-- Schneller Moment: eine kleine Frage im Fluss, nach einem Schluesselmoment (Entwurf vom 09.11.2026, freigegeben).
--
-- Drei Momente - "Einrichten fertig" (Arbeitsbereich), "eigenes Arbeitsprofil gelesen", "Teamvergleich gelesen". Jede Frage
-- erscheint je Konto HOECHSTENS EINMAL: beim Antworten (Ja / Nicht so), beim Wegklicken oder beim Wechsel zu "Mehr sagen" wird
-- vermerkt, dass gefragt wurde. Nichts wird erzwungen; ohne Antwort passiert nichts.
--
-- Die Antworten sind Zaehler fuer die Gruenderin ("7 Ja, 2 Nicht so") - der Admin-Bereich bekommt NIE Namen daraus.
-- Wer mehr sagt, schreibt ein normales Feedback (product_feedback.moment merkt, wozu).

begin;

create table public.feedback_moments (
  user_id uuid not null references auth.users (id) on delete cascade,
  moment text not null check (moment in ('setup_done', 'workstyle_report', 'team_workstyle')),
  answer text not null check (answer in ('yes', 'no', 'more', 'dismissed')),
  created_at timestamptz not null default now(),
  primary key (user_id, moment)
);

alter table public.feedback_moments enable row level security;
revoke all on public.feedback_moments from anon, authenticated;
grant select on public.feedback_moments to authenticated;
create policy feedback_moments_own_read on public.feedback_moments
  for select to authenticated using (user_id = auth.uid());

comment on table public.feedback_moments is
  'Welche kleine Frage (schneller Moment) diese Person schon gesehen hat und wie sie darauf reagiert hat. Je Person und Moment eine Zeile; die erste Reaktion gilt.';

create function public.answer_feedback_moment(p_moment text, p_answer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_moment not in ('setup_done', 'workstyle_report', 'team_workstyle') or p_answer not in ('yes', 'no', 'more', 'dismissed') then
    raise exception 'feedback_moment_invalid' using errcode = '22023';
  end if;
  -- Die erste Reaktion gilt: wer "Ja" gesagt hat und danach wegklickt, bleibt bei "Ja".
  insert into public.feedback_moments (user_id, moment, answer) values (auth.uid(), p_moment, p_answer)
  on conflict (user_id, moment) do nothing;
end;
$$;
revoke all on function public.answer_feedback_moment(text, text) from public, anon;
grant execute on function public.answer_feedback_moment(text, text) to authenticated;

-- Nur Zaehler je Moment, nie Namen oder Kennungen.
create function public.admin_feedback_moments()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return coalesce((
    select jsonb_object_agg(t.moment, jsonb_build_object('yes', t.yes, 'no', t.no, 'more', t.more, 'dismissed', t.dismissed))
    from (
      select m.moment,
             count(*) filter (where m.answer = 'yes') as yes,
             count(*) filter (where m.answer = 'no') as no,
             count(*) filter (where m.answer = 'more') as more,
             count(*) filter (where m.answer = 'dismissed') as dismissed
      from public.feedback_moments m
      group by m.moment
    ) t
  ), '{}'::jsonb);
end $$;
revoke all on function public.admin_feedback_moments() from public, anon;
grant execute on function public.admin_feedback_moments() to authenticated;

-- Wer mehr sagt, schreibt ein normales Feedback; der Anlass steht dabei.
alter table public.product_feedback
  add column moment text check (moment in ('setup_done', 'workstyle_report', 'team_workstyle'));

create or replace function public.admin_list_feedback(p_tab text, p_offset integer, p_kind text default null, p_area text default null)
returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return query
    select jsonb_build_object(
      'id', f.id, 'created_at', f.created_at, 'source', f.source,
      'sender_name', pc.display_name, 'account_since', pc.created_at,
      'q1', f.q1_value, 'q2', f.q2_value, 'q3', f.q3_value,
      'q4_choice', f.q4_choice, 'q4_other_text', f.q4_other_text, 'q5', f.q5_text,
      'kind', f.kind, 'message', f.message, 'importance', f.importance,
      'area', f.area, 'page_path', f.page_path, 'device', f.device,
      'moment', f.moment,
      'may_contact', f.may_contact,
      'contact_email', case when f.may_contact then (select u.email from auth.users u where u.id = f.user_id) else null end,
      'is_new', r.feedback_id is null)
    from public.product_feedback f
    left join public.person_core pc on pc.user_id = f.user_id
    left join public.admin_feedback_reads r on r.feedback_id = f.id and r.admin_user_id = auth.uid()
    where case coalesce(p_tab, 'new') when 'new' then r.feedback_id is null when 'read' then r.feedback_id is not null else true end
      and (p_kind is null or f.kind = p_kind)
      and (p_area is null or f.area = p_area or f.area like p_area || '.%')
    order by f.created_at desc, f.id
    limit 26 offset greatest(0, least(coalesce(p_offset, 0), 100000));
end $$;

notify pgrst, 'reload schema';

commit;
