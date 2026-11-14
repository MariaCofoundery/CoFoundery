begin;

/*
 * Erinnerung nach dem Einstieg (14.11.2026).
 *
 * Wer sich anmeldet und den Einstieg abschliesst, bekommt nach einem und nach drei Tagen je EINE freundliche Mail - aber
 * nur, solange das Profil noch Luecken hat. Danach nichts mehr.
 *
 * DIE ZUSTIMMUNG IST EINE ENTSCHEIDUNG, KEIN HAKEN: Auf der Willkommensseite steht neben "Los geht's" der gleichwertige
 * Weg "Gerade keine Zeit? Erinnere mich morgen" (`source = 'later'`); nach dem ersten Erfolg im Fragebogen kommt die Frage
 * einmal (`'midway'`, Ja oder Nein danke). Nur ein Ja ruft `set_onboarding_reminder(true, ...)` auf; `consent_at` haelt fest,
 * seit wann. Ein Nein wird festgehalten, damit nicht noch einmal gefragt wird. Abmelden geht jederzeit, auch aus der Mail
 * ohne Anmeldung (`stopped_at`).
 *
 * KEIN DIREKTER SCHREIBZUGRIFF fuer Personen: Die Tabelle ist nur lesbar (die eigene Zeile); geschrieben wird ueber
 * die Funktion. Gestempelt wird, BEVOR gesendet wird (`prepare_onboarding_reminders`) - hoechstens eine Mail je
 * Runde und Person, auch wenn der Lauf zweimal kommt.
 */

create table public.onboarding_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wants_email boolean not null default false,
  -- Warum erinnert wird: 'later' = "gerade keine Zeit" (am Start gewaehlt), 'midway' = nach dem ersten Erfolg zugestimmt.
  source text not null default 'later' check (source in ('later', 'midway')),
  consent_at timestamptz,
  first_sent_at timestamptz,
  second_sent_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  constraint onboarding_reminders_consent check (not wants_email or consent_at is not null)
);

comment on table public.onboarding_reminders is
  'Ausdrueckliche Zustimmung zu zwei Erinnerungs-Mails nach dem Einstieg (nach 1 und nach 3 Tagen), und was davon gesendet wurde. Nur ueber set_onboarding_reminder beschreibbar.';

alter table public.onboarding_reminders enable row level security;

create policy onboarding_reminders_select_own on public.onboarding_reminders
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table public.onboarding_reminders from public, anon, authenticated;
grant select on table public.onboarding_reminders to authenticated;

-- ---------------------------------------------------------------------------
-- Anschalten und abbestellen - nur fuer die eigene Zeile
-- ---------------------------------------------------------------------------

create function public.set_onboarding_reminder(p_wants boolean, p_source text default 'later')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_wants is null or p_source is null or p_source not in ('later', 'midway') then
    raise exception 'invalid_onboarding_reminder' using errcode = '22023';
  end if;

  if p_wants then
    -- Neu angeschaltet: die Zaehlung beginnt von vorn (consent_at ist der Anfang).
    insert into public.onboarding_reminders (user_id, wants_email, source, consent_at, stopped_at)
    values (v_user, true, p_source, now(), null)
    on conflict (user_id) do update
      set wants_email = true,
          source = case when public.onboarding_reminders.wants_email then public.onboarding_reminders.source else excluded.source end,
          consent_at = case when public.onboarding_reminders.wants_email then public.onboarding_reminders.consent_at else now() end,
          stopped_at = null;
  else
    -- Auch ein "Nein danke" wird festgehalten (ohne Zustimmung), damit die Frage nicht wiederkommt.
    insert into public.onboarding_reminders (user_id, wants_email, source, stopped_at)
    values (v_user, false, p_source, now())
    on conflict (user_id) do update set wants_email = false, stopped_at = now();
  end if;
end;
$$;

comment on function public.set_onboarding_reminder(boolean, text) is
  'Schaltet die Erinnerungs-Mails nach dem Einstieg fuer die eigene Person an oder ab. Anschalten ist die ausdrueckliche Zustimmung.';

revoke all on function public.set_onboarding_reminder(boolean, text) from public, anon;
grant execute on function public.set_onboarding_reminder(boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fuer den Zeitplan: wer heute erinnert wird
-- ---------------------------------------------------------------------------

/*
 * Runde 1: einen Tag nach der Zustimmung, Runde 2: nach drei Tagen (gezaehlt ab der Zustimmung). Nur, wer
 *   - zugestimmt und nicht abbestellt hat,
 *   - den Einstieg abgeschlossen hat (sonst gibt es noch kein Konto-Profil),
 *   - und noch etwas offen hat: eine der vier Profilangaben fehlt (gilt fuer jeden Bereich), oder Align war gewaehlt
 *     und der Arbeitsweise-Fragebogen (Fassung 5) ist nicht abgeschlossen.
 *
 * `next_step` sagt, wohin der Knopf in der Mail fuehrt: 'workstyle' (Align gewaehlt, Fragebogen offen) oder 'setup'.
 * `areas` sind die gewaehlten Bereiche (person_core.interests) - die Mail nennt nur diese; `source` ist der Grund
 * der Erinnerung (Anrede).
 * Der Stempel wird gesetzt, BEVOR die Zeile zurueckkommt. Wer alles erledigt hat, bekommt keine Mail - und
 * wird auch nicht gestempelt, damit eine spaetere Luecke nicht uebersprungen wird.
 */
create function public.prepare_onboarding_reminders(p_limit integer default 50)
returns table (recipient_user_id uuid, reminder_round smallint, next_step text, source text, areas text[])
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select r.user_id as user_id,
           case
             when r.first_sent_at is null and r.consent_at <= now() - interval '1 day' then 1
             when r.first_sent_at is not null and r.second_sent_at is null
                  and r.consent_at <= now() - interval '3 days' then 2
           end as rnd,
           r.source as source,
           coalesce(c.interests, '{}'::text[]) as areas,
           ('align' = any (coalesce(c.interests, '{}'::text[]))
            and not exists (
              select 1 from public.assessments a
              where a.user_id = r.user_id
                and a.instrument_id = 'founder-workstyle-pretest-8-5a-v5'
                and a.submitted_at is not null)) as workstyle_open,
           (coalesce(btrim(c.headline), '') = ''
            or coalesce(btrim(c.bio), '') = ''
            or coalesce(cardinality(c.expertise), 0) = 0
            or c.remote_mode is null) as setup_open
    from public.onboarding_reminders r
    join public.person_core c on c.user_id = r.user_id
    where r.wants_email
      and r.stopped_at is null
      and c.onboarding_completed_at is not null
    order by r.consent_at, r.user_id
  ),
  due as (
    select d.user_id as user_id, d.rnd as rnd, d.source as source, d.areas as areas,
           case when d.workstyle_open then 'workstyle' else 'setup' end as next_step
    from candidate d
    where d.rnd is not null and (d.workstyle_open or d.setup_open)
    limit greatest(coalesce(p_limit, 50), 1)
  ),
  stamped as (
    update public.onboarding_reminders r
       set first_sent_at = case when d.rnd = 1 then now() else r.first_sent_at end,
           second_sent_at = case when d.rnd = 2 then now() else r.second_sent_at end
      from due d
     where r.user_id = d.user_id
    returning r.user_id as user_id, d.rnd as rnd, d.next_step as next_step, d.source as source, d.areas as areas
  )
  select s.user_id, s.rnd::smallint, s.next_step, s.source, s.areas from stamped s;
end;
$$;

comment on function public.prepare_onboarding_reminders(integer) is
  'Fuer den Zeitplan: stempelt und liefert, wer heute eine der zwei Erinnerungs-Mails nach dem Einstieg bekommt (Runde 1: ein Tag nach der Zustimmung, Runde 2: nach drei Tagen). Nur mit Zustimmung, ohne Abmeldung und nur, solange etwas offen ist.';

revoke all on function public.prepare_onboarding_reminders(integer) from public, anon, authenticated;
grant execute on function public.prepare_onboarding_reminders(integer) to service_role;

commit;
