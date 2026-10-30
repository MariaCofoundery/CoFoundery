-- Erinnerung an ein faelliges Programm-Update: jetzt auch als Mail und als
-- Mitteilung aufs Geraet - neben dem Hinweis im Postfach der App.
--
-- Dieselben Regeln wie beim Team-Check-in:
--   Mitteilung aufs Geraet: an, solange die Art nicht abbestellt ist.
--   Mail: nur mit ausdruecklicher Zustimmung im Konto - die Erinnerung kommt
--         vom Zeitplan, nicht von einem Menschen.
--   Der Hinweis im Postfach haengt an keinem der beiden Schalter.
-- Ein Stempel je Programm und Faelligkeit, gesetzt BEVOR gesendet wird.

begin;

alter table public.notification_opt_outs drop constraint notification_opt_outs_kind_check;
alter table public.notification_opt_outs add constraint notification_opt_outs_kind_check
  check (kind in (
    'contact_request',
    'message',
    'problem_interest',
    'connect_saved_search',
    'discovery_saved_search',
    'read_my_mind',
    'founder_in_the_wild',
    'discovery_intro_request',
    'discovery_intro_accepted',
    'connect_suggestions',
    'team_check_in',
    'program_update'
  ));

alter table public.notification_opt_ins drop constraint notification_opt_ins_kind_check;
alter table public.notification_opt_ins add constraint notification_opt_ins_kind_check
  check (kind in (
    'connect_suggestions_email',
    'team_check_in_email',
    'program_update_email'
  ));

create or replace function public.wants_email_channel(p_user_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.wants_email_notification(p_user_id, p_kind)
    and case
      when p_kind = 'connect_suggestions' then exists (
        select 1 from public.notification_opt_ins opt_in
        where opt_in.user_id = p_user_id and opt_in.kind = 'connect_suggestions_email'
      )
      when p_kind = 'team_check_in' then exists (
        select 1 from public.notification_opt_ins opt_in
        where opt_in.user_id = p_user_id and opt_in.kind = 'team_check_in_email'
      )
      when p_kind = 'program_update' then exists (
        select 1 from public.notification_opt_ins opt_in
        where opt_in.user_id = p_user_id and opt_in.kind = 'program_update_email'
      )
      else true
    end;
$$;
revoke all on function public.wants_email_channel(uuid, text) from public, anon;
grant execute on function public.wants_email_channel(uuid, text) to authenticated, service_role;

-- Der Lauf liefert jetzt, WER zusaetzlich Mitteilung und Mail bekommt.
drop function public.prepare_program_update_reminders(integer);

create function public.prepare_program_update_reminders(p_limit integer default 100)
returns table (recipient_user_id uuid, program_id uuid, wants_email boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_reminder uuid;
begin
  for v_row in
    select p.id as pid,
           (coalesce((select max(u.submitted_at) from public.team_program_updates u where u.program_id = p.id), p.activated_at, p.created_at))::date + 14 as due_on
    from public.team_programs p
    where public.team_program_is_active(p.id)
    limit greatest(p_limit, 1)
  loop
    if v_row.due_on > current_date + 2 then
      continue;
    end if;
    v_reminder := null;
    insert into public.team_program_update_reminders as r (program_id, due_on)
    values (v_row.pid, v_row.due_on)
    on conflict on constraint team_program_update_reminders_unique do nothing
    returning r.id into v_reminder;
    if v_reminder is null then
      continue;
    end if;

    -- Der Hinweis im Postfach: fuer jedes aktuelle Teammitglied.
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    select m.user_id, null, 'program_update_due', v_reminder, '/programm'
    from public.team_programs p
    join public.founder_team_members m on m.team_id = p.team_id
    where p.id = v_row.pid
    on conflict do nothing;

    -- Mitteilung und Mail: nur, wer die Art nicht abbestellt hat.
    return query
    select m.user_id, v_row.pid, public.wants_email_channel(m.user_id, 'program_update')
    from public.team_programs p
    join public.founder_team_members m on m.team_id = p.team_id
    where p.id = v_row.pid
      and public.wants_email_notification(m.user_id, 'program_update');
  end loop;
end;
$$;
revoke all on function public.prepare_program_update_reminders(integer) from public, anon, authenticated;
grant execute on function public.prepare_program_update_reminders(integer) to service_role;

commit;
