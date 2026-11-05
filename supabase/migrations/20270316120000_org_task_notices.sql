-- Teamraum: Bescheid geben - wenn dir jemand eine Aufgabe zuteilt, wenn jemand eine deiner Aufgaben
-- kommentiert, und wenn eine Aufgabe heute faellig ist.
--
-- Wunsch von Maria (05.11.2026): "Wenn ich Aufgaben zuteile - kann man da mit Benachrichtigungen
-- arbeiten? iPhone, Samsung, Android."
--
-- Dieselben Regeln wie die uebrigen Benachrichtigungen:
--   - Der Hinweis in der App entsteht HIER, im selben Schritt wie die Handlung - nicht danach in der
--     Anwendung, wo er verloren gehen koennte. Je Aufgabe, Art und Person einer; ein neuer Anlass holt
--     ihn wieder nach oben (ungelesen, neues Datum).
--   - Die Mitteilung aufs Geraet schickt die Anwendung - nur, solange die Art 'org_tasks' nicht
--     abbestellt ist (wants_email_notification gilt fuer beide Wege, siehe dort).
--   - Sich selbst benachrichtigt niemand. Faellig meldet ein taeglicher Lauf, einmal je Aufgabe.
--   - Auf dem Sperrbildschirm steht nur, DASS etwas passiert ist, nie der Titel der Aufgabe.
--   - Wird eine Aufgabe geloescht, gehen ihre Hinweise mit.

begin;

alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'discovery_intro_request',
  'discovery_intro_accepted', 'read_my_mind_handoff', 'founder_in_the_wild_handoff',
  'collaboration_conversation_marker', 'program_update_due', 'program_invited',
  'program_review_requested', 'program_removed', 'program_reward_unlocked',
  'org_task_assigned', 'org_task_comment', 'org_task_due'
));

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
    'program_update',
    'org_tasks'
  ));

-- Ein Hinweis zu einer Aufgabe - nur an aktive Mitglieder der Organisation, nie an sich selbst.
create or replace function public.notify_org_task(p_task_id uuid, p_kind text, p_recipient_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_recipient_user_id is null or p_recipient_user_id = auth.uid() then
    return;
  end if;
  select t.org_id into v_org from public.advisor_org_tasks t where t.id = p_task_id;
  if v_org is null or not exists (
    select 1 from public.advisor_org_members m
    where m.org_id = v_org and m.user_id = p_recipient_user_id and m.status = 'active'
  ) then
    return;
  end if;
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  values (p_recipient_user_id, auth.uid(), p_kind, p_task_id,
          '/advisor/organisation?org=' || v_org::text || '&tab=tasks&task=' || p_task_id::text)
  on conflict (recipient_user_id, kind, subject_id) do update
  set actor_user_id = excluded.actor_user_id, created_at = pg_catalog.now(), read_at = null;
end;
$$;
revoke all on function public.notify_org_task(uuid, text, uuid) from public, anon, authenticated;

-- Zugeteilt: wer neu zustaendig ist (nicht man selbst). Gilt fuer save_org_task wie fuer jede
-- spaetere Funktion, die zuteilt - deshalb am Tisch und nicht in einer Funktion.
create or replace function public.notify_org_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_user_id is not null
     and (tg_op = 'INSERT' or new.assignee_user_id is distinct from old.assignee_user_id)
     and new.status <> 'done' then
    perform public.notify_org_task(new.id, 'org_task_assigned', new.assignee_user_id);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_org_task_assignee() from public, anon, authenticated;
create trigger notify_org_task_assignee
after insert or update of assignee_user_id on public.advisor_org_tasks
for each row execute function public.notify_org_task_assignee();

-- Kommentiert: wer zustaendig ist und wer die Aufgabe angelegt hat.
create or replace function public.notify_org_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.advisor_org_tasks%rowtype;
begin
  select * into v_task from public.advisor_org_tasks t where t.id = new.task_id;
  perform public.notify_org_task(new.task_id, 'org_task_comment', v_task.assignee_user_id);
  if v_task.created_by_user_id is distinct from v_task.assignee_user_id then
    perform public.notify_org_task(new.task_id, 'org_task_comment', v_task.created_by_user_id);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_org_task_comment() from public, anon, authenticated;
create trigger notify_org_task_comment
after insert on public.advisor_org_task_comments
for each row execute function public.notify_org_task_comment();

-- Geloescht: die Hinweise gehen mit.
create or replace function public.delete_org_task_notices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.in_app_notices
  where subject_id = old.id and kind in ('org_task_assigned', 'org_task_comment', 'org_task_due');
  return old;
end;
$$;
revoke all on function public.delete_org_task_notices() from public, anon, authenticated;
create trigger delete_org_task_notices
after delete on public.advisor_org_tasks
for each row execute function public.delete_org_task_notices();

-- Wer hat gerade einen Hinweis zu dieser Aufgabe bekommen und moechte eine Mitteilung aufs Geraet?
-- Fuer die Anwendung direkt nach der Handlung: nur Hinweise, die die aufrufende Person eben ausgeloest
-- hat. Gibt keine Inhalte heraus, nur wen.
create or replace function public.org_task_push_recipients(p_task_id uuid, p_kind text)
returns table (recipient_user_id uuid, path text)
language sql
security definer
set search_path = ''
as $$
  select n.recipient_user_id, n.path
  from public.in_app_notices n
  where n.subject_id = p_task_id
    and n.kind = p_kind
    and p_kind in ('org_task_assigned', 'org_task_comment')
    and n.actor_user_id = auth.uid()
    and n.read_at is null
    and n.created_at > pg_catalog.now() - interval '2 minutes'
    and public.wants_email_notification(n.recipient_user_id, 'org_tasks');
$$;
revoke all on function public.org_task_push_recipients(uuid, text) from public, anon;
grant execute on function public.org_task_push_recipients(uuid, text) to authenticated;

-- Taeglich: Aufgaben, die heute faellig sind - je Aufgabe einmal. Liefert, wer zusaetzlich eine
-- Mitteilung aufs Geraet bekommt.
create or replace function public.prepare_org_task_due_notices(p_limit integer default 200)
returns table (recipient_user_id uuid, task_id uuid, path text, wants_push boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := (pg_catalog.now() at time zone 'Europe/Berlin')::date;
begin
  return query
  with due as (
    select t.id, t.org_id, t.assignee_user_id
    from public.advisor_org_tasks t
    join public.advisor_orgs o on o.id = t.org_id and o.status = 'active'
    join public.advisor_org_members m on m.org_id = t.org_id and m.user_id = t.assignee_user_id and m.status = 'active'
    where t.status <> 'done' and t.due_on = v_today
    limit greatest(p_limit, 1)
  ),
  inserted as (
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    select due.assignee_user_id, null, 'org_task_due', due.id,
           '/advisor/organisation?org=' || due.org_id::text || '&tab=tasks&task=' || due.id::text
    from due
    on conflict (recipient_user_id, kind, subject_id) do nothing
    returning in_app_notices.recipient_user_id, in_app_notices.subject_id, in_app_notices.path
  )
  select inserted.recipient_user_id, inserted.subject_id, inserted.path,
         public.wants_email_notification(inserted.recipient_user_id, 'org_tasks')
  from inserted;
end;
$$;
revoke all on function public.prepare_org_task_due_notices(integer) from public, anon, authenticated;
grant execute on function public.prepare_org_task_due_notices(integer) to service_role;

commit;
