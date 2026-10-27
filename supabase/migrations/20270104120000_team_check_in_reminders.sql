begin;

-- ---------------------------------------------------------------------------
-- Check-in-Erinnerung: Mitteilung aufs Geraet, per Mail nur mit Zustimmung
-- ---------------------------------------------------------------------------
--
-- Dasselbe Muster wie bei den Vorschlaegen in Connect (20261020120000):
--
--   MITTEILUNG AUFS GERAET: an, solange nicht abbestellt. Sie setzt eine
--   Erlaubnis im Browser voraus, die jeder Mensch selbst erteilt hat.
--
--   MAIL: aus, bis jemand ausdruecklich zustimmt. Die Erinnerung geht nicht von
--   einem Menschen aus, der sich gemeldet hat - sie kommt vom Zeitplan.
--
-- Der allgemeine Schalter `team_check_in` (notification_opt_outs) schaltet die
-- Art GANZ aus, auch die Mitteilung. Die Zustimmung `team_check_in_email`
-- (notification_opt_ins) gilt nur fuer den Mailweg.
--
-- HOECHSTENS EINE ERINNERUNG JE PERSON, TEAM UND FAELLIGKEIT. Der Stempel wird
-- in derselben Anweisung gesetzt, die die Zeile zurueckgibt (insert ...
-- returning), bevor gesendet wird: lieber eine Erinnerung zu wenig als zwei.
-- Wer sie ignoriert, bekommt keine zweite - der Check-in steht weiter auf der
-- Team-Uebersicht und im Reiter "Check-in".
-- ---------------------------------------------------------------------------


-- 1. Die Art, als Abbestellung --------------------------------------------------
alter table public.notification_opt_outs
  drop constraint notification_opt_outs_kind_check;

alter table public.notification_opt_outs
  add constraint notification_opt_outs_kind_check
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
      -- NEU: Erinnerung an einen faelligen Team-Check-in.
      'team_check_in'
    ));


-- 2. Die Zustimmung fuer den Mailweg -------------------------------------------
alter table public.notification_opt_ins
  drop constraint notification_opt_ins_kind_check;

alter table public.notification_opt_ins
  add constraint notification_opt_ins_kind_check
    check (kind in (
      'connect_suggestions_email',
      'team_check_in_email'
    ));


-- 3. Darf diese Art per Mail hinaus? --------------------------------------------
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
        where opt_in.user_id = p_user_id
          and opt_in.kind = 'connect_suggestions_email'
      )
      when p_kind = 'team_check_in' then exists (
        select 1 from public.notification_opt_ins opt_in
        where opt_in.user_id = p_user_id
          and opt_in.kind = 'team_check_in_email'
      )
      else true
    end;
$$;

comment on function public.wants_email_channel(uuid, text) is
  'Ob diese Art zusaetzlich per Mail hinausgehen darf. Fuer connect_suggestions und team_check_in braucht es dafuer eine ausdrueckliche Zustimmung in notification_opt_ins; fuer alle uebrigen Arten genuegt das Fehlen einer Abbestellung, weil sie aus der Meldung eines Menschen entstehen.';

revoke all on function public.wants_email_channel(uuid, text) from public, anon;
grant execute on function public.wants_email_channel(uuid, text) to authenticated, service_role;


-- 4. Der Stempel -----------------------------------------------------------------
-- Eine Zeile je Person, Team und Faelligkeitsdatum. Kein Inhalt, nur "war schon".
create table public.team_check_in_reminders (
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  due_on date not null,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id, due_on)
);

comment on table public.team_check_in_reminders is
  'Stempel: fuer diese Person und dieses Team wurde zu dieser Faelligkeit schon an den Check-in erinnert. Nur der Zeitplan (service_role) schreibt und liest hier.';

alter table public.team_check_in_reminders enable row level security;
revoke all on public.team_check_in_reminders from public, anon, authenticated;


-- 5. Wer wird heute erinnert? ---------------------------------------------------
/**
 * Nur fuer den Zeitplan (`service_role`).
 *
 * Faellig ist ein Check-in, wenn
 *   - das Team mindestens zwei Mitglieder hat,
 *   - kein Check-in offen ist,
 *   - mindestens ein Thema in der aktuellen Runde von ALLEN bestaetigt ist und
 *     nicht "nicht relevant" (dieselbe Regel wie `start_team_check_in`),
 *   - und der Abstand (30/60/90 Tage, Standard 90) seit dem letzten
 *     abgeschlossenen oder uebersprungenen Check-in - gab es noch keinen: seit
 *     der aeltesten solchen Bestaetigung - abgelaufen ist.
 * Das ist dieselbe Rechnung wie `nextCheckInDue` in der Anwendung.
 *
 * Gemeldet wird je Person, die die Art nicht abbestellt hat. `wants_email` sagt,
 * ob zusaetzlich die Mail erlaubt ist. Der Stempel wird gesetzt, BEVOR die
 * Zeile zurueckkommt.
 */
create function public.prepare_team_check_in_reminders(p_limit integer default 50)
returns table (recipient_user_id uuid, team_id uuid, wants_email boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with eligible as (
    select i.team_id as team_id, r.confirmed_at as confirmed_at
    from public.founder_team_setup_items i
    join public.founder_team_setup_revisions r on r.id = i.current_confirmed_revision_id
    where r.confirmed_at is not null
      and r.resolution_status <> 'not_relevant'
      and not exists (
        select 1 from public.founder_team_members m
        where m.team_id = i.team_id
          and not exists (
            select 1 from public.founder_team_setup_confirmations c
            where c.revision_id = r.id and c.user_id = m.user_id))
  ),
  base as (
    select t.id as team_id,
           coalesce(s.interval_days, 90) as interval_days,
           coalesce(
             (select max(c.closed_at) from public.team_check_ins c
               where c.team_id = t.id and c.status <> 'open' and c.closed_at is not null),
             (select min(e.confirmed_at) from eligible e where e.team_id = t.id)
           ) as base_at
    from public.founder_teams t
    left join public.team_check_in_settings s on s.team_id = t.id
    where (select count(*) from public.founder_team_members m where m.team_id = t.id) >= 2
      and exists (select 1 from eligible e where e.team_id = t.id)
      and not exists (select 1 from public.team_check_ins c where c.team_id = t.id and c.status = 'open')
  ),
  due as (
    select b.team_id as team_id,
           (b.base_at + make_interval(days => b.interval_days))::date as due_on
    from base b
    where b.base_at is not null
      and b.base_at + make_interval(days => b.interval_days) <= now()
  ),
  candidate as (
    select m.user_id as user_id, d.team_id as team_id, d.due_on as due_on
    from due d
    join public.founder_team_members m on m.team_id = d.team_id
    where public.wants_email_notification(m.user_id, 'team_check_in')
      and not exists (
        select 1 from public.team_check_in_reminders x
        where x.team_id = d.team_id and x.user_id = m.user_id and x.due_on = d.due_on)
    order by d.due_on, d.team_id, m.user_id
    limit greatest(coalesce(p_limit, 50), 1)
  ),
  stamped as (
    insert into public.team_check_in_reminders (team_id, user_id, due_on)
    select c.team_id, c.user_id, c.due_on from candidate c
    on conflict do nothing
    returning team_check_in_reminders.team_id as team_id, team_check_in_reminders.user_id as user_id
  )
  select s.user_id, s.team_id, public.wants_email_channel(s.user_id, 'team_check_in')
  from stamped s;
end;
$$;

comment on function public.prepare_team_check_in_reminders(integer) is
  'Fuer den Zeitplan: stempelt und liefert, wer heute an einen faelligen Team-Check-in erinnert wird. Hoechstens einmal je Person, Team und Faelligkeit; wer die Art abbestellt hat, kommt nicht vor. wants_email sagt, ob zusaetzlich die Mail erlaubt ist (ausdrueckliche Zustimmung).';

revoke all on function public.prepare_team_check_in_reminders(integer) from public, anon, authenticated;
grant execute on function public.prepare_team_check_in_reminders(integer) to service_role;

commit;
