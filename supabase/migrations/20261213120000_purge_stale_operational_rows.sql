begin;

-- ---------------------------------------------------------------------------
-- Betriebsdaten, die niemand mehr braucht
-- ---------------------------------------------------------------------------
-- Zwei Tabellen sammeln Zeilen an, die nach kurzer Zeit keinen Zweck mehr haben:
--
--   ai_jobs         Aufgaben der KI-Schlange. Sie tragen keine Nutzlast (nur Verweise,
--                   Modell, Fehlerschluessel), sind aber Verhaltensspuren: wer wann
--                   welche Auswertung angestossen hat. Abgeschlossene und
--                   fehlgeschlagene Zeilen werden nach 90 Tagen geloescht, laufende
--                   und wartende nie.
--
--   in_app_notices  Hinweise in der Anwendung. Nach 180 Tagen sind sie, gelesen oder
--                   nicht, veraltet.
--
-- Die Fristen sind Vorgaben, keine Rechtsfristen. Sie stehen im Aufruf (Vercel Cron,
-- siehe `features/privacy/retentionCleanup.ts`) und sind hier begrenzt, damit ein
-- Fehlaufruf nicht alles loescht.
--
-- Rechte wie `purge_old_research_events`: ausschliesslich service_role.
create or replace function public.purge_stale_operational_rows(
  p_job_days integer default 90,
  p_notice_days integer default 180
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_days integer := coalesce(p_job_days, 90);
  v_notice_days integer := coalesce(p_notice_days, 180);
  v_jobs integer := 0;
  v_notices integer := 0;
begin
  if v_job_days < 30 or v_job_days > 365 or v_notice_days < 30 or v_notice_days > 730 then
    raise exception 'invalid_retention_days';
  end if;

  delete from public.ai_jobs
  where status in ('completed', 'failed')
    and completed_at is not null
    and completed_at < date_trunc('day', now()) - make_interval(days => v_job_days);
  get diagnostics v_jobs = row_count;

  delete from public.in_app_notices
  where created_at < date_trunc('day', now()) - make_interval(days => v_notice_days);
  get diagnostics v_notices = row_count;

  return jsonb_build_object(
    'jobDays', v_job_days,
    'noticeDays', v_notice_days,
    'deletedAiJobs', v_jobs,
    'deletedNotices', v_notices
  );
end;
$$;

comment on function public.purge_stale_operational_rows(integer, integer) is
  'Loescht abgeschlossene ai_jobs nach p_job_days (30-365) und in_app_notices nach p_notice_days (30-730). Laufende Jobs bleiben. Nur service_role.';

revoke all on function public.purge_stale_operational_rows(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_stale_operational_rows(integer, integer) to service_role;

commit;
