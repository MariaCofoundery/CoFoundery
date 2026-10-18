-- Staerken-Interview: Rollout-Pruefung (nur lesend, nur Zaehler - keine Inhalte)
--
-- Vor der Aufraeum-Migration `supabase/pending/20261206120000_strength_interview_cleanup.sql`
-- ausfuehren. Gibt nur Anzahlen und Zeitpunkte aus, keine Antworten, keine
-- Saetze, keine Personen.

-- 1) Laufen noch Capability-Jobs, die ein ALTER Arbeiter gerade bearbeitet?
--    Erwartet vor dem Aufraeumen: 0 bei 'running'.
select status, count(*) as jobs
from public.ai_jobs
where job_type = 'capability_area_proposal'
  and status in ('pending', 'running')
group by status;

-- 2) Schreibt noch jemand ueber den alten Weg? Alte Vorschlaege (ohne
--    Bezeichnung), die nach dem Einspielen von 20261205120000 entstanden sind.
--    Erwartet nach dem Neustart des Arbeiters: keine neuen mehr.
select count(*) as legacy_proposals_last_24h,
       max(created_at) as latest_legacy_proposal
from public.person_strength_proposals
where label is null
  and created_at > now() - interval '24 hours';

-- 3) Laeuft der neue Weg? Staerken-Jobs nach Status, und neue Vorschlaege.
select status, count(*) as jobs
from public.ai_jobs
where job_type = 'strength_proposal'
group by status;

select count(*) as new_proposals, max(created_at) as latest_new_proposal
from public.person_strength_proposals
where label is not null;

-- 4) Welcher Arbeiter meldet sich zuletzt?
select last_seen_at, model
from public.ai_worker_heartbeats
order by last_seen_at desc
limit 3;
