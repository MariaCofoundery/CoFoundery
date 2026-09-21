begin;

-- ---------------------------------------------------------------------------
-- Was jemand mitbringt, das kein Koennen ist
-- ---------------------------------------------------------------------------
--
-- DIE LUECKE IM DATENMODELL: Es gibt Bereiche (capability_areas), Erfahrung,
-- Branchen, Anzeigen mit Richtung ('seeking'/'offering') - aber nichts fuer
-- das, was Menschen am haeufigsten wirklich mitbringen: Zugaenge. "Ich kenne
-- Investoren im Deep-Tech-Bereich", "ich habe Kontakte zu Kliniken", "ich kann
-- in die Pharmaindustrie vorstellen". Das ist keine Faehigkeit und kein
-- Angebot mit Laufzeit, sondern eine Tuer.
--
-- DREI ARTEN, NICHT SIEBEN.
--   Die Vorlage nannte sieben (KNOWS, CAN INTRODUCE, HAS ACCESS TO, CAN OFFER,
--   INDUSTRY NETWORK, TARGET GROUP ACCESS, RESOURCE). Beim Durchspielen an
--   echten Saetzen fallen sie auf drei zusammen, und die Unterschiede dazwischen
--   waren nicht mehr die Sache, sondern die Formulierung: "kennt Investoren"
--   und "Industry Network" sind dasselbe. Sieben Arten, die ein Mensch nicht
--   sicher auseinanderhalten kann, haelt auch ein Modell nicht auseinander -
--   und eine falsch einsortierte Zeile ist schlechter als eine grob
--   einsortierte. Teilen laesst sich spaeter, wenn die Daten es verlangen.
--
-- NICHTS GILT, BEVOR EIN MENSCH ZUGESTIMMT HAT.
--   Jede Zeile traegt `status`. Was ein Modell vorschlaegt, entsteht als
--   'pending' und wird erst durch Bestaetigung 'confirmed'. Vorschlaege sind
--   ausschliesslich fuer die eigene Person sichtbar - niemand sieht, was ein
--   Modell ueber jemanden vermutet hat, nicht einmal nach dem Verwerfen.
--
-- JEDE ZEILE AUS EINER MASCHINE TRAEGT IHREN BELEG.
--   `evidence_quote` ist woertlicher Text aus der Quelle, und die Datenbank
--   PRUEFT das beim Einfuegen (siehe insert_ai_resource_proposal). Eine
--   Behauptung ohne Beleg laesst sich hier nicht speichern - das ist die
--   Sicherung, die auch dann haelt, wenn ein Prompt schlecht, ein Modell
--   schwach oder eine Anwendung fehlerhaft ist.
-- ---------------------------------------------------------------------------

create table public.person_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.person_core (user_id) on delete cascade,

  kind text not null,
  label text not null,

  -- Woher es kommt. 'self' ist eingetragen, 'model' vorgeschlagen.
  origin text not null default 'self',
  status text not null default 'confirmed',

  -- Nur bei 'model': der woertliche Beleg und die Quelle, aus der er stammt.
  evidence_quote text,
  source_table text,
  source_id uuid,

  -- Womit es vorgeschlagen wurde. Ohne das ist ein altes Ergebnis spaeter
  -- nicht erklaerbar.
  model text,
  prompt_version smallint,

  created_at timestamptz not null default now(),
  decided_at timestamptz,

  constraint person_resources_kind_check check (kind in (
    -- Kennt Menschen in einem Feld: Investoren, Kliniken, Hochschulen.
    'network',
    -- Kommt an etwas heran: Raeume, Geraete, Daten, Zielgruppen.
    'access',
    -- Kann etwas konkret zur Verfuegung stellen oder herstellen.
    'offer'
  )),
  constraint person_resources_origin_check check (origin in ('self', 'model')),
  constraint person_resources_status_check check (status in ('pending', 'confirmed', 'rejected')),
  constraint person_resources_label_check check (char_length(btrim(label)) between 3 and 160),
  constraint person_resources_quote_check check (
    evidence_quote is null or char_length(btrim(evidence_quote)) between 12 and 400
  ),
  -- Ein Vorschlag OHNE Beleg gibt es nicht. Was eine Person selbst eintraegt,
  -- braucht keinen - sie ist der Beleg.
  constraint person_resources_evidence_required check (
    origin = 'self' or (evidence_quote is not null and source_table is not null and source_id is not null)
  ),
  -- Selbst eingetragen heisst bestaetigt. Ein eigener Eintrag, der auf
  -- Zustimmung wartet, waere ein Widerspruch.
  constraint person_resources_self_is_confirmed check (origin = 'model' or status = 'confirmed')
);

comment on table public.person_resources is
  'Zugaenge, Netzwerke und Angebote einer Person. Zeilen mit origin=model sind Vorschlaege mit woertlichem Beleg und gelten erst nach Bestaetigung.';

-- Derselbe Vorschlag soll nicht bei jeder Veroeffentlichung neu entstehen.
create unique index person_resources_unique_label
  on public.person_resources (user_id, kind, lower(btrim(label)));

create index person_resources_pending_idx
  on public.person_resources (user_id, created_at desc)
  where status = 'pending';

alter table public.person_resources enable row level security;

-- In dieser Phase strikt nur fuer die eigene Person - wie beim Capability
-- Snapshot. Was davon spaeter in Suche oder Profil sichtbar wird, entscheidet
-- eine eigene Freigabestufe und nicht das Anlegen hier.
create policy person_resources_select_own on public.person_resources
  for select to authenticated
  using (user_id = auth.uid());

-- Selbst eintragen und aendern: ja. Aber niemand kann sich einen VORSCHLAG
-- schreiben - `origin` muss dabei 'self' sein, und dann verlangt der
-- Constraint oben auch status 'confirmed'.
create policy person_resources_insert_own on public.person_resources
  for insert to authenticated
  with check (user_id = auth.uid() and origin = 'self');

create policy person_resources_update_own on public.person_resources
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy person_resources_delete_own on public.person_resources
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Die neue Art Arbeit
-- ---------------------------------------------------------------------------
alter table public.ai_jobs drop constraint ai_jobs_job_type_check;

alter table public.ai_jobs
  add constraint ai_jobs_job_type_check check (job_type in (
    'ping',
    -- Liest einen VEROEFFENTLICHTEN eigenen Text und schlaegt daraus Zugaenge
    -- vor. Nur veroeffentlichte: Ein Entwurf ist fuer niemanden sichtbar, auch
    -- nicht fuer ein Modell.
    'connect_resource_extraction'
  ));

-- ---------------------------------------------------------------------------
-- Der Text zur Aufgabe
-- ---------------------------------------------------------------------------
/**
 * Gibt den Text heraus, auf den sich eine laufende Aufgabe bezieht.
 *
 * WARUM DER ARBEITER NICHT SELBST LIEST: Er kann es nicht - er hat kein Recht
 * auf `network_listings` oder `network_problems` und soll keines bekommen. Er
 * bekommt genau den einen Text, zu dem er eine Aufgabe in der Hand hat, und
 * nur solange sie laeuft.
 *
 * Nur veroeffentlichte Inhalte. Ist etwas inzwischen zurueckgezogen oder
 * geloescht, kommt nichts zurueck, und die Aufgabe scheitert mit
 * 'source_missing' - richtig so: Was niemand mehr sehen darf, wertet auch
 * niemand mehr aus.
 */
create or replace function public.get_ai_job_source_text(p_job_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
  v_text text;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id and job.status = 'running';
  if not found then return null; end if;

  if v_job.source_table = 'network_listings' then
    select concat_ws(E'\n', listing.title, listing.summary) into v_text
    from public.network_listings listing
    where listing.id = v_job.source_id
      and listing.owner_user_id = v_job.subject_user_id
      and listing.status = 'active';
  elsif v_job.source_table = 'network_problems' then
    select concat_ws(E'\n', problem.title, problem.description) into v_text
    from public.network_problems problem
    where problem.id = v_job.source_id
      and problem.author_user_id = v_job.subject_user_id
      and problem.status = 'active';
  else
    return null;
  end if;

  return v_text;
end;
$$;

revoke all on function public.get_ai_job_source_text(uuid) from public, anon;
grant execute on function public.get_ai_job_source_text(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Einen Vorschlag ablegen
-- ---------------------------------------------------------------------------
/**
 * DIE DATENBANK PRUEFT DEN BELEG.
 *
 * Das ist die wichtigste Funktion dieser Migration. Ein Vorschlag wird nur
 * gespeichert, wenn sein Zitat WOERTLICH in der Quelle vorkommt - unabhaengig
 * von Gross- und Kleinschreibung und von Leerraum, sonst aber genau.
 *
 * Damit haelt die Sicherung auch dann, wenn der Prompt schlecht formuliert ist,
 * das Modell schwach antwortet oder die Anwendung einen Fehler hat. Ein Modell,
 * das etwas hinzudichtet, kann es nicht belegen - und was es nicht belegen
 * kann, kommt hier nicht hinein.
 *
 * Und die Zeile gehoert immer der Person, deren Text gelesen wurde
 * (`subject_user_id` der Aufgabe). Der Arbeiter kann nicht bestimmen, WEM er
 * etwas zuschreibt.
 *
 * Gibt false zurueck, wenn der Beleg nicht traegt. Kein Fehler: Der Arbeiter
 * soll die uebrigen Vorschlaege derselben Antwort trotzdem ablegen koennen.
 */
create or replace function public.insert_ai_resource_proposal(
  p_job_id uuid,
  p_kind text,
  p_label text,
  p_quote text,
  p_model text,
  p_prompt_version smallint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
  v_source text;
  v_normalized_source text;
  v_normalized_quote text;
begin
  if not public.is_ai_worker() then
    raise exception 'not an ai worker' using errcode = '42501';
  end if;

  select * into v_job from public.ai_jobs job
  where job.id = p_job_id and job.status = 'running';
  if not found then return false; end if;

  v_source := public.get_ai_job_source_text(p_job_id);
  if v_source is null then return false; end if;

  v_normalized_source := regexp_replace(lower(v_source), '\s+', ' ', 'g');
  v_normalized_quote := btrim(regexp_replace(lower(coalesce(p_quote, '')), '\s+', ' ', 'g'));

  -- Zu kurz ist kein Beleg: Ein einzelnes Wort findet sich in jedem Text.
  if char_length(v_normalized_quote) < 12 then return false; end if;
  if position(v_normalized_quote in v_normalized_source) = 0 then return false; end if;

  insert into public.person_resources (
    user_id, kind, label, origin, status,
    evidence_quote, source_table, source_id, model, prompt_version
  )
  values (
    v_job.subject_user_id, p_kind, btrim(p_label), 'model', 'pending',
    btrim(p_quote), v_job.source_table, v_job.source_id,
    left(nullif(btrim(coalesce(p_model, '')), ''), 60), p_prompt_version
  )
  -- Denselben Vorschlag nicht bei jeder Veroeffentlichung neu: Wer ihn schon
  -- verworfen hat, soll ihn nicht wiederbekommen.
  on conflict (user_id, kind, lower(btrim(label))) do nothing;

  return true;
end;
$$;

revoke all on function public.insert_ai_resource_proposal(uuid, text, text, text, text, smallint)
  from public, anon;
grant execute on function public.insert_ai_resource_proposal(uuid, text, text, text, text, smallint)
  to authenticated;

commit;
