begin;

-- ---------------------------------------------------------------------------
-- Die Warteschlange fuer Arbeit, die ein Sprachmodell erledigt
-- ---------------------------------------------------------------------------
--
-- BESCHLOSSEN AM 20.09.2026, nachdem die Messung gezeigt hat, dass ein lokales
-- Modell die Aufgabe besser loest als die Begriffsliste (10 von 10 gefunden
-- gegen 3 von 10, bei weniger Falschem).
--
-- DAS MODELL LAEUFT AUF EINEM LAPTOP, der auch aus sein kann. Deshalb eine
-- Warteschlange und kein Aufruf: Die Anwendung legt eine Aufgabe hin, und
-- irgendwann holt sie jemand ab. Niemand wartet, nichts schlaegt fehl.
--
-- DIE RICHTUNG IST WICHTIG: Der Laptop FRAGT die Datenbank, die Datenbank ruft
-- nie den Laptop. Damit gibt es keinen offenen Port, keinen Tunnel, kein
-- Geheimnis in der Cloud und keinen Endpunkt, den ein Fremder ansprechen
-- koennte. Das Problem "wie sichere ich meinen lokalen Endpunkt ab" loest sich
-- dadurch auf, statt beantwortet zu werden.
--
-- ---------------------------------------------------------------------------
-- VIER ENTSCHEIDUNGEN GEGEN DIE UEBLICHEN FEHLER SOLCHER TABELLEN
-- ---------------------------------------------------------------------------
--
-- 1. KEINE KOPIEN VON PERSONENDATEN.
--    Die verbreitete Form waere `input_data jsonb` mit allem darin, was das
--    Modell braucht. Das erzeugt eine zweite Datenwelt, die eine Kontoloeschung
--    nicht erreicht - und wir haben gerade zwei Tage damit verbracht, Loeschung
--    sauber zu machen. Hier steht deshalb nur, WO die Nutzlast liegt
--    (source_table, source_id). Wer die Aufgabe abholt, liest die Quelle selbst
--    und findet nichts mehr, wenn sie geloescht wurde.
--
-- 2. KEIN ERGEBNIS IN DER WARTESCHLANGE.
--    Auch kein `result_data`. Ein Ergebnis gehoert in die Tabelle seines
--    Gegenstands - mit Beleg, mit Bestaetigungsstand, unter der Zeilensicherheit
--    dieses Gegenstands. Eine Warteschlange voller Ergebnisse waere ein Archiv
--    ohne Regeln.
--
-- 3. FEHLER SIND SCHLUESSEL, KEINE TEXTE.
--    `error_code` erlaubt per Constraint nur `[a-z_]`. Damit kann dort kein
--    Modelltext, kein Nutzertext und kein Ausschnitt eines Lebenslaufs landen.
--    Die Form der Spalte ist die Zusage, nicht die Sorgfalt des Aufrufers.
--
-- 4. WAS NICHT AUF DER LISTE STEHT, KOMMT NICHT IN DIE SCHLANGE.
--    `job_type` ist ein Constraint mit Aufzaehlung. Eine neue Art Arbeit
--    braucht eine Migration - und damit eine Entscheidung, keinen Tippfehler.
-- ---------------------------------------------------------------------------

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),

  -- Welche Arbeit. Erweitert wird das per Migration, nicht per Aufruf.
  job_type text not null,

  -- Wem gehoert das Ergebnis. Geht das Konto, geht die Aufgabe mit.
  subject_user_id uuid not null references auth.users (id) on delete cascade,

  -- WO die Nutzlast liegt. Nicht die Nutzlast selbst - siehe Entscheidung 1.
  source_table text,
  source_id uuid,

  status text not null default 'pending',
  attempts smallint not null default 0,

  -- Womit es gerechnet wurde. Ohne diese beiden Angaben laesst sich spaeter
  -- nicht erklaeren, warum ein altes Ergebnis anders aussieht als ein neues.
  model text,
  prompt_version smallint,

  -- Nur Schluessel, kein Text - siehe Entscheidung 3.
  error_code text,

  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,

  constraint ai_jobs_job_type_check check (job_type in (
    -- Prueft den ganzen Weg von der Anwendung bis zum Modell und zurueck, ohne
    -- eine einzige Personendatei anzufassen. Bleibt dauerhaft: Wer wissen will,
    -- ob die Kette steht, soll das nicht an echten Daten ausprobieren muessen.
    'ping'
  )),
  constraint ai_jobs_status_check check (status in ('pending', 'running', 'completed', 'failed')),
  constraint ai_jobs_attempts_check check (attempts between 0 and 5),
  constraint ai_jobs_error_code_check check (
    error_code is null or error_code ~ '^[a-z][a-z_]{1,39}$'
  ),
  constraint ai_jobs_source_check check (
    (source_table is null and source_id is null)
    or (source_table is not null and source_id is not null)
  ),
  -- Eine abgeschlossene Aufgabe ohne Zeitpunkt waere nicht auswertbar, eine
  -- offene mit Zeitpunkt eine Behauptung.
  constraint ai_jobs_completed_at_check check (
    (status in ('completed', 'failed')) = (completed_at is not null)
  )
);

comment on table public.ai_jobs is
  'Warteschlange fuer Arbeit, die ein Sprachmodell erledigt. Enthaelt bewusst weder Eingabedaten noch Ergebnisse - nur Verweise darauf.';

create index ai_jobs_pending_idx on public.ai_jobs (created_at)
  where status = 'pending';
create index ai_jobs_subject_idx on public.ai_jobs (subject_user_id, created_at desc);

alter table public.ai_jobs enable row level security;

-- Jede Person sieht ihre eigenen Aufgaben. Sonst waere der Zustand "wird
-- gerechnet" eine Blackbox, und genau das soll es nicht sein.
create policy ai_jobs_select_own on public.ai_jobs
  for select to authenticated
  using (subject_user_id = auth.uid());

-- Kein insert, kein update, kein delete ueber die Tabelle: Aufgaben entstehen
-- ueber enqueue_ai_job, und abgeholt wird ueber claim_ai_job.

-- ---------------------------------------------------------------------------
-- Wer darf abholen
-- ---------------------------------------------------------------------------
-- Eine ausdrueckliche Liste, KEIN Service-Role-Schluessel auf dem Laptop.
--
-- Der Unterschied ist der Schaden im Verlustfall: Mit dem Service-Role-
-- Schluessel liest ein Fund alles. Ein Eintrag hier darf genau dreierlei -
-- eine Aufgabe abholen, sie abschliessen, ein Lebenszeichen setzen.
create table public.ai_workers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  constraint ai_workers_label_check check (label is null or char_length(label) <= 60)
);

comment on table public.ai_workers is
  'Konten, die Aufgaben aus ai_jobs abholen duerfen. Wird von Hand gepflegt; ein Eintrag ersetzt einen Service-Role-Schluessel auf einem Laptop.';

alter table public.ai_workers enable row level security;
revoke all on public.ai_workers from anon, authenticated;

create or replace function public.is_ai_worker()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ai_workers worker where worker.user_id = auth.uid());
$$;

revoke all on function public.is_ai_worker() from public, anon;
grant execute on function public.is_ai_worker() to authenticated;

-- ---------------------------------------------------------------------------
-- Lebenszeichen
-- ---------------------------------------------------------------------------
-- Daraus entsteht die Anzeige "KI gerade verfuegbar". Ein Gesundheitsaufruf von
-- der Cloud zum Laptop waere der umgekehrte Weg - mit Port, Tunnel und
-- Wartezeit. Ein Lebenszeichen ist eine Zeile, die aeltern kann.
create table public.ai_worker_heartbeats (
  worker_user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  model text,
  constraint ai_worker_heartbeats_model_check check (model is null or char_length(model) <= 60)
);

alter table public.ai_worker_heartbeats enable row level security;
revoke all on public.ai_worker_heartbeats from anon, authenticated;

create or replace function public.record_ai_worker_heartbeat(p_model text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  insert into public.ai_worker_heartbeats (worker_user_id, last_seen_at, model)
  values (auth.uid(), now(), left(nullif(btrim(coalesce(p_model, '')), ''), 60))
  on conflict (worker_user_id) do update
    set last_seen_at = now(), model = excluded.model;
end;
$$;

revoke all on function public.record_ai_worker_heartbeat(text) from public, anon;
grant execute on function public.record_ai_worker_heartbeat(text) to authenticated;

/**
 * Ist gerade ein Modell erreichbar?
 *
 * Zwei Minuten Nachlauf bei einem Lebenszeichen alle dreissig Sekunden: Ein
 * ausgelassener Durchgang soll die Anzeige nicht flackern lassen, ein
 * ausgeschalteter Laptop aber innerhalb einer Minute sichtbar werden.
 *
 * Gibt ausdruecklich NICHT heraus, WER der Arbeiter ist. Die Frage lautet "geht
 * es gerade", nicht "wessen Rechner laeuft".
 */
create or replace function public.get_ai_availability()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ai_worker_heartbeats heartbeat
    where heartbeat.last_seen_at > now() - interval '2 minutes'
  );
$$;

revoke all on function public.get_ai_availability() from public, anon;
grant execute on function public.get_ai_availability() to authenticated;

-- ---------------------------------------------------------------------------
-- Aufgabe hinlegen
-- ---------------------------------------------------------------------------
/**
 * Legt eine Aufgabe fuer die aufrufende Person in die Schlange.
 *
 * Nur fuer sich selbst: `subject_user_id` ist immer auth.uid(). Eine Aufgabe
 * fuer jemand anderen einzustellen gibt es nicht - damit kann niemand die
 * Rechenzeit eines Fremden verbrauchen oder eine Auswertung ueber ihn anstossen.
 *
 * HOECHSTENS EINE OFFENE JE ART UND QUELLE. Ohne diese Bedingung fuellt ein
 * doppelter Klick die Schlange, und dasselbe wird mehrfach gerechnet.
 */
create or replace function public.enqueue_ai_job(
  p_job_type text,
  p_source_table text default null,
  p_source_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select job.id into v_id
  from public.ai_jobs job
  where job.subject_user_id = v_user
    and job.job_type = p_job_type
    and job.status in ('pending', 'running')
    and job.source_id is not distinct from p_source_id
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.ai_jobs (job_type, subject_user_id, source_table, source_id)
  values (p_job_type, v_user, p_source_table, p_source_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_ai_job(text, text, uuid) from public, anon;
grant execute on function public.enqueue_ai_job(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Aufgabe abholen
-- ---------------------------------------------------------------------------
/**
 * Holt die aelteste offene Aufgabe und markiert sie als laufend.
 *
 * `for update skip locked` ist der Grund, warum zwei Arbeiter sich nicht in die
 * Quere kommen: Wer eine Zeile gesperrt hat, behaelt sie; der zweite Aufruf
 * ueberspringt sie und nimmt die naechste.
 *
 * LIEGENGEBLIEBENE AUFGABEN: Faellt ein Arbeiter mitten in einer Aufgabe aus
 * (Laptop zugeklappt), bliebe sie fuer immer auf "laufend" stehen. Nach zehn
 * Minuten gilt sie deshalb wieder als offen. `attempts` begrenzt das - nach
 * fuenf Anlaeufen gibt es einen Grund, der nicht durch einen sechsten verschwindet.
 */
create or replace function public.claim_ai_job()
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  update public.ai_jobs job
  set status = 'running', attempts = job.attempts + 1, claimed_at = now()
  where job.id = (
    select candidate.id
    from public.ai_jobs candidate
    where candidate.attempts < 5
      and (
        candidate.status = 'pending'
        or (candidate.status = 'running' and candidate.claimed_at < now() - interval '10 minutes')
      )
    order by candidate.created_at
    limit 1
    for update skip locked
  )
  returning job.* into v_job;

  return v_job;
end;
$$;

revoke all on function public.claim_ai_job() from public, anon;
grant execute on function public.claim_ai_job() to authenticated;

-- ---------------------------------------------------------------------------
-- Aufgabe abschliessen
-- ---------------------------------------------------------------------------
/**
 * Erfolg. Das ERGEBNIS steht nicht hier - es liegt in der Tabelle seines
 * Gegenstands, geschrieben von derselben Transaktion des Arbeiters.
 *
 * `model` und `prompt_version` werden hier festgehalten, weil sonst spaeter
 * niemand erklaeren kann, warum ein altes Ergebnis anders aussieht.
 */
create or replace function public.complete_ai_job(
  p_job_id uuid,
  p_model text,
  p_prompt_version smallint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  update public.ai_jobs job
  set status = 'completed',
      completed_at = now(),
      error_code = null,
      model = left(nullif(btrim(coalesce(p_model, '')), ''), 60),
      prompt_version = p_prompt_version
  where job.id = p_job_id and job.status = 'running';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.complete_ai_job(uuid, text, smallint) from public, anon;
grant execute on function public.complete_ai_job(uuid, text, smallint) to authenticated;

/**
 * Fehlschlag.
 *
 * Bei weniger als fuenf Anlaeufen geht die Aufgabe zurueck in die Schlange -
 * ein abgeschalteter Laptop oder ein Zeitablauf ist kein dauerhafter Zustand.
 * Beim fuenften bleibt sie auf 'failed' liegen, damit eine kaputte Aufgabe nicht
 * ewig Rechenzeit verbraucht.
 *
 * `p_error_code` MUSS ein Schluessel sein. Der Constraint auf der Spalte laesst
 * nichts anderes zu - dort kann also kein Modelltext und kein Ausschnitt eines
 * Lebenslaufs landen, auch nicht aus Versehen.
 */
create or replace function public.fail_ai_job(p_job_id uuid, p_error_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  update public.ai_jobs job
  set status = case when job.attempts >= 5 then 'failed' else 'pending' end,
      completed_at = case when job.attempts >= 5 then now() else null end,
      error_code = p_error_code
  where job.id = p_job_id and job.status = 'running';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.fail_ai_job(uuid, text) from public, anon;
grant execute on function public.fail_ai_job(uuid, text) to authenticated;

commit;
