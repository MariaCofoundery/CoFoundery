begin;

/*
 * Erinnerung nach dem Einstieg: "offen" je Bereich (15.11.2026).
 *
 * Die erste Fassung (20270421120000) kannte nur "Profilangaben fehlen" und "Align gewaehlt, Fragebogen offen". Jetzt
 * kennt sie die Bereiche, die die Person gewaehlt hat (`person_core.interests`), und fragt je Bereich, ob dort noch
 * etwas aussteht:
 *
 *   Align    gewaehlt und der Arbeitsweise-Fragebogen (Fassung 5) ist nicht abgeschlossen
 *   Find     gewaehlt und es gibt noch kein aktives Find-Profil (draft oder keins; "paused" gilt als entschieden)
 *   Connect  gewaehlt und das Connect-Profil ist noch nicht aktiv
 *   Advisor  hat keinen eigenen Fortschritt, der sich hier sicher ablesen laesst - zaehlt nur ueber die Profilangaben
 *
 * Der Knopf in der Mail fuehrt zum ersten offenen Schritt in dieser Reihenfolge: workstyle, find, connect, dann setup
 * (Profilangaben); fuer Advisor ohne Angaben steht 'advise'. Dieselbe Signatur wie zuvor: `create or replace` genuegt.
 * Alles andere bleibt: nur mit Zustimmung, ohne Abmeldung, hoechstens zwei, gestempelt vor der Rueckgabe.
 */
create or replace function public.prepare_onboarding_reminders(p_limit integer default 50)
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
           ('find' = any (coalesce(c.interests, '{}'::text[]))
            and not exists (
              select 1 from public.founder_discovery_profiles f
              where f.user_id = r.user_id and f.status in ('active', 'paused'))) as find_open,
           ('connect' = any (coalesce(c.interests, '{}'::text[]))
            and not exists (
              select 1 from public.network_profiles n
              where n.user_id = r.user_id and n.status = 'active')) as connect_open,
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
           case
             when d.workstyle_open then 'workstyle'
             when d.find_open then 'find'
             when d.connect_open then 'connect'
             when d.setup_open and d.areas = array['advise']::text[] then 'advise'
             else 'setup'
           end as next_step
    from candidate d
    where d.rnd is not null and (d.workstyle_open or d.find_open or d.connect_open or d.setup_open)
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
  'Fuer den Zeitplan: stempelt und liefert, wer heute eine der zwei Erinnerungs-Mails nach dem Einstieg bekommt. Bereichsbewusst: offen ist, was in den gewaehlten Bereichen aussteht (Fragebogen, Find-Profil, Connect-Profil) oder die Profilangaben. Nur mit Zustimmung, ohne Abmeldung, hoechstens zwei.';

revoke all on function public.prepare_onboarding_reminders(integer) from public, anon, authenticated;
grant execute on function public.prepare_onboarding_reminders(integer) to service_role;

commit;
