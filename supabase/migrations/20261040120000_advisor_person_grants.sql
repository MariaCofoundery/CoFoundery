begin;

-- ---------------------------------------------------------------------------
-- Ein Advisor begleitet auch einzelne Menschen
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 23.09.2026: "Ein Accelerator haette das gerne so, dass man auch
-- mit den einzelnen Foundern sprechen kann - nicht nur mit Teams. Und
-- vielleicht auch in einem gesammelten Bereich, wo die Leute drin sind, dass
-- man mit denen weiterarbeiten kann."
--
-- WAS ES BISHER GAB: einen Advisor an einer BEZIEHUNG (zwei Founder, beide
-- muessen zustimmen) und einen am TEAM-Setup (alle Founder muessen zustimmen).
-- Eine einzelne Person konnte niemanden an sich heranlassen - obwohl genau das
-- der haeufigste Fall ist, wenn ein Programm mit Gruendern arbeitet, die noch
-- kein Team haben.
--
-- DIE BAUWEISE BLEIBT, UND SIE IST DER GRUND, WARUM DAS HIER GEHT:
--
--   Zugang entsteht durch EINWILLIGUNG, nicht durch Einladung. Ein Advisor
--   kann fragen; sichtbar wird etwas erst, wenn die Person zustimmt.
--
--   Zugang ist WIDERRUFBAR, und der Widerruf ist eine Spaltenaenderung statt
--   einer Loeschung - damit nachvollziehbar bleibt, was wann galt.
--
--   Zugang hat einen UMFANG, und zwar je Bereich einen eigenen Eintrag.
--
-- JE UMFANG EINE ZEILE, kein Bitfeld und kein Array. Der Grund ist der
-- Widerruf: Wer nur die Richtung wieder verbergen will, aendert eine Zeile.
-- Bei einem Array waere derselbe Vorgang ein Schreibzugriff auf die Freigabe,
-- die bestehen bleibt - und ein Fehler dort nimmt zu viel oder zu wenig weg.
--
-- WAS HIER NOCH NICHT STEHT: Organisationen und Sitze (P4 aus
-- `founder-profile-and-advisor-access-brief.md`). Ein Accelerator ist zunaechst
-- eine Reihe einzelner Advisor-Konten. Die Organisation aendert, WER den
-- Zugang haelt - deshalb ist sie ein eigener Schritt und nicht ein Zusatz
-- hier.
-- ---------------------------------------------------------------------------

create table public.advisor_person_grants (
  id uuid primary key default gen_random_uuid(),

  /** Die Person, um die es geht. Sie entscheidet. */
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  advisor_user_id uuid not null references auth.users (id) on delete cascade,

  /**
   * Was sichtbar wird. Je Zeile ein Bereich:
   *
   *   base              - Name, Kurzbeschreibung, Schwerpunkte
   *   alignment_report  - der Selbstbericht aus dem Fragebogen
   *   capability        - Faehigkeitsbereiche, ohne Tiefe
   *   capability_depth  - zusaetzlich Stufe und Verantwortungswunsch
   *   strengths         - Arbeitsweisen samt Selbst- und Aussensicht
   *   direction         - was der Person wichtig ist
   *
   * `capability` und `capability_depth` sind getrennt, weil die vorhandene
   * Sichtbarkeitsleiter das schon so trennt (`get_disclosed_capability`). Ein
   * Advisor-Zugang darf diese Leiter nicht ueberspringen.
   *
   * ERZAEHLUNGEN SIND KEIN UMFANG. Die Antworten aus den Gespraechen gibt es
   * hier nicht und wird es hier nicht geben: Ein Advisor sieht bestaetigte
   * Ergebnisse, nie den Rohtext. Das gilt heute fuer Teams und gilt hier
   * genauso.
   */
  scope text not null,

  status text not null default 'requested',

  /** Wer gefragt hat - der Advisor, oder die Person selbst. */
  requested_by_user_id uuid not null references auth.users (id) on delete cascade,
  /** Ein Satz Begruendung, damit eine Anfrage nicht anonym hereinkommt. */
  request_note text,

  approved_at timestamptz,
  revoked_at timestamptz,
  /** Optional: ein Programm endet. Ohne Datum gilt der Zugang bis zum Widerruf. */
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint advisor_person_grants_scope_check check (scope in (
    'base', 'alignment_report', 'capability', 'capability_depth',
    'strengths', 'direction'
  )),
  constraint advisor_person_grants_status_check
    check (status in ('requested', 'active', 'declined', 'revoked')),
  -- Aktiv heisst zugestimmt. Ohne Zeitpunkt waere "aktiv" eine Behauptung
  -- ohne Beleg - derselbe Grundsatz wie bei den Gespraechen.
  constraint advisor_person_grants_approved
    check ((status = 'active') = (approved_at is not null)),
  constraint advisor_person_grants_revoked
    check ((status = 'revoked') = (revoked_at is not null)),
  -- Niemand begleitet sich selbst.
  constraint advisor_person_grants_not_self check (subject_user_id <> advisor_user_id)
);

-- JE PERSON, ADVISOR UND UMFANG EINE ZEILE - sonst stapeln sich Anfragen zum
-- selben Bereich, und beim Widerruf entscheidet der Zufall, welche gemeint
-- war. Eine erneute Anfrage nach einer Absage aendert diese Zeile.
create unique index advisor_person_grants_once
  on public.advisor_person_grants (subject_user_id, advisor_user_id, scope);

create index advisor_person_grants_subject_idx
  on public.advisor_person_grants (subject_user_id, status);
create index advisor_person_grants_advisor_idx
  on public.advisor_person_grants (advisor_user_id, status);

comment on table public.advisor_person_grants is
  'Zugang eines Advisors zu EINER Person, je Umfang eine Zeile. Entsteht durch Einwilligung, ist jederzeit widerrufbar, und umfasst nie die Erzaehlungen aus den Gespraechen.';

alter table public.advisor_person_grants enable row level security;
revoke all on public.advisor_person_grants from anon, authenticated;
grant select on public.advisor_person_grants to authenticated;

-- BEIDE SEITEN SEHEN DIESELBE ZEILE. Die Person muss sehen koennen, wer
-- Zugang hat, seit wann und mit welchem Umfang - sonst waere die Einwilligung
-- eine einmalige Unterschrift statt einer Entscheidung, die man zuruecknehmen
-- kann.
create policy advisor_person_grants_select_involved on public.advisor_person_grants
  for select to authenticated using (
    subject_user_id = auth.uid() or advisor_user_id = auth.uid()
  );

-- GESCHRIEBEN WIRD NUR UEBER DIE FUNKTIONEN. Ein direktes Update koennte
-- `status` auf 'active' setzen, ohne dass jemand zugestimmt hat.
create trigger advisor_person_grants_updated_at
  before update on public.advisor_person_grants
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- Fragen
-- ---------------------------------------------------------------------------
/**
 * Ein Advisor fragt eine Person um Zugang.
 *
 * ES ENTSTEHT NUR EINE ANFRAGE. `status` ist 'requested', und daran kann diese
 * Funktion nichts aendern - der Uebergang auf 'active' liegt ausschliesslich
 * bei der Person. Das ist die Stelle, an der spaeter auch ein bezahlter Sitz
 * nichts anderes tun wird: Der Kauf erzeugt eine Anfrage, nie einen Zugang.
 */
create or replace function public.request_advisor_person_access(
  p_subject_user_id uuid,
  p_scope text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
  v_id uuid;
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_advisor = p_subject_user_id then
    raise exception 'advisor_cannot_accompany_self' using errcode = '42501';
  end if;

  -- Eine Blockierung gilt auch hier: Wer jemanden blockiert hat, soll von ihm
  -- keine Anfrage bekommen.
  if public.is_network_interaction_blocked(v_advisor, p_subject_user_id) then
    return null;
  end if;

  insert into public.advisor_person_grants (
    subject_user_id, advisor_user_id, scope, requested_by_user_id, request_note
  )
  values (
    p_subject_user_id, v_advisor, p_scope, v_advisor,
    left(nullif(btrim(coalesce(p_note, '')), ''), 400)
  )
  on conflict (subject_user_id, advisor_user_id, scope) do update
    -- Eine erneute Anfrage nach einer Absage ist erlaubt - aber sie macht
    -- aus einem Widerruf keinen Zugang: Sie setzt wieder auf 'requested'.
    set status = 'requested',
        requested_by_user_id = v_advisor,
        request_note = left(nullif(btrim(coalesce(p_note, '')), ''), 400),
        approved_at = null,
        revoked_at = null
    where public.advisor_person_grants.status in ('declined', 'revoked')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.request_advisor_person_access(uuid, text, text) from public, anon;
grant execute on function public.request_advisor_person_access(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Entscheiden
-- ---------------------------------------------------------------------------
/**
 * Die Person entscheidet - und nur sie.
 *
 * Zustimmen, ablehnen, widerrufen: drei Wege, eine Funktion, damit es nicht
 * drei Stellen gibt, an denen `status` gesetzt wird.
 */
create or replace function public.decide_advisor_person_access(
  p_grant_id uuid,
  p_decision text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_grant public.advisor_person_grants;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'decline', 'revoke') then
    return false;
  end if;

  select * into v_grant from public.advisor_person_grants
  where id = p_grant_id for update;
  if not found then return false; end if;

  -- WIDERRUFEN DARF AUCH DER ADVISOR: Eine Begleitung endet manchmal von
  -- seiner Seite, und dann soll er sie beenden koennen, ohne die Person zu
  -- bitten. Zustimmen kann nur die Person.
  if p_decision = 'revoke' then
    if v_user <> v_grant.subject_user_id and v_user <> v_grant.advisor_user_id then
      raise exception 'advisor_grant_not_yours' using errcode = '42501';
    end if;
    update public.advisor_person_grants
    set status = 'revoked', revoked_at = pg_catalog.now(), approved_at = null
    where id = p_grant_id;
    return true;
  end if;

  if v_user <> v_grant.subject_user_id then
    raise exception 'advisor_grant_not_yours' using errcode = '42501';
  end if;
  if v_grant.status <> 'requested' then
    return false;
  end if;

  if p_decision = 'approve' then
    update public.advisor_person_grants
    set status = 'active', approved_at = pg_catalog.now(), revoked_at = null
    where id = p_grant_id;
  else
    update public.advisor_person_grants
    set status = 'declined', approved_at = null
    where id = p_grant_id;
  end if;

  return true;
end;
$$;

revoke all on function public.decide_advisor_person_access(uuid, text) from public, anon;
grant execute on function public.decide_advisor_person_access(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Was ein Advisor sehen darf
-- ---------------------------------------------------------------------------
/**
 * Die eine Stelle, an der die Frage beantwortet wird.
 *
 * Jede Anzeige fragt hier nach, statt die Bedingung selbst zu formulieren:
 * aktiv, nicht widerrufen, nicht abgelaufen. Eine zweite Kopie dieser
 * Bedingung waere sofort die naechste, die auseinanderlaeuft - und
 * auseinanderlaufen hiesse hier, dass jemand etwas sieht, wozu er nicht mehr
 * berechtigt ist.
 */
create or replace function public.has_advisor_person_access(
  p_subject_user_id uuid,
  p_scope text,
  p_advisor_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_person_grants grant_row
    where grant_row.subject_user_id = p_subject_user_id
      and grant_row.advisor_user_id = p_advisor_user_id
      and grant_row.scope = p_scope
      and grant_row.status = 'active'
      and grant_row.revoked_at is null
      and (grant_row.expires_at is null or grant_row.expires_at > pg_catalog.now())
  );
$$;

revoke all on function public.has_advisor_person_access(uuid, text, uuid) from public, anon;
grant execute on function public.has_advisor_person_access(uuid, text, uuid) to authenticated;

commit;
