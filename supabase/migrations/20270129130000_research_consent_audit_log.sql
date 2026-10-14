begin;

-- ---------------------------------------------------------------------------
-- Nachweis der Research-Einwilligung: welche Entscheidung, wann, in welcher
-- Sprache, mit welchem Wortlaut
-- ---------------------------------------------------------------------------
--
-- AUSGANGSLAGE (Prüfung 14.10.2026): `research_consent_preferences` hält nur den
-- aktuellen Zustand und überschreibt jede Entscheidung. Sprache und Wortlaut
-- wurden nie gespeichert; unter derselben fachlichen Version
-- `research_consent_v1` gab es mehrere Textfassungen, darunter eine Erweiterung
-- des Umfangs am 28.09.2026 (docs/research-consent-copy-history.md).
--
-- WAS SICH ÄNDERT:
--   - Neue Referenztabelle `research_consent_copy_revisions`: jede zulässige
--     Kombination aus Textrevision, Sprache und Stelle (Dialog / Kontoeinstellung)
--     mit dem SHA-256 des Wortlauts. Die Hashes berechnet
--     web/src/features/research/consentVersion.ts aus der Quelle der Oberfläche;
--     ein Test hält beide Seiten gleich.
--   - Neue Tabelle `research_consent_audit_log`: eine Zeile je Entscheidung, nur
--     anhängen, nie ändern.
--   - `set_my_research_consent` verlangt Textrevision, Sprache und Stelle und
--     schreibt Zustand und Audit-Zeile in derselben Transaktion.
--
-- WAS SICH NICHT ÄNDERT:
--   - Die fachliche Version bleibt `research_consent_v1` - an den Ereignissen,
--     im Trigger, beim Widerruf, beim Aufräumen.
--   - `research_consent_preferences` hält weiterhin nur den aktuellen Zustand.
--   - Bestehende Einwilligungen bleiben gültig und bekommen KEINEN rückwirkenden
--     Audit-Eintrag. Eine Entscheidung ohne Audit-Eintrag heißt ehrlich:
--     Entscheidung vor dem 14.10.2026, Wortlaut nicht belegt.
--
-- SCHUTZREGEL (kein Codepfad betroffen, Stand 14.10.2026): Forschungsdaten aus
-- Einwilligungen ohne belegte Textrevision gelten NICHT als freigegeben für
-- Veröffentlichungen oder Nutzung außerhalb von Made2Found. Heute gibt es keinen
-- Export- oder Veröffentlichungsweg für research_events; die Regel steht in
-- docs/research-consent-copy-history.md und ein Test (researchConsentAudit.test.ts)
-- meldet jeden neuen Lesezugriff.

-- 1. Zulässige Textfassungen ------------------------------------------------
create table public.research_consent_copy_revisions (
  copy_revision text not null check (copy_revision ~ '^research_consent_copy_[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  locale text not null check (locale in ('de', 'en')),
  surface text not null check (surface in ('notice', 'settings')),
  copy_sha256 text not null check (copy_sha256 ~ '^[0-9a-f]{64}$'),
  registered_at timestamptz not null default now(),
  primary key (copy_revision, locale, surface)
);

comment on table public.research_consent_copy_revisions is
  'Zulässige Fassungen der Research-Einwilligung je Sprache und Stelle mit SHA-256 des Wortlauts. Wird nur per Migration befüllt.';

alter table public.research_consent_copy_revisions enable row level security;
revoke all on table public.research_consent_copy_revisions from public, anon, authenticated;
grant select on table public.research_consent_copy_revisions to service_role;

insert into public.research_consent_copy_revisions (copy_revision, locale, surface, copy_sha256) values
  ('research_consent_copy_2026-10-14', 'de', 'notice',   '233b638f8a785fd530ed0ac4b633d04fc134b765d0a3df3f8d079f3ccc1090f9'),
  ('research_consent_copy_2026-10-14', 'de', 'settings', '32ba54a39f0f10a0c6d04dbdcfe3d51c2aa5f28a4b70b3e5429efc10e652241b'),
  ('research_consent_copy_2026-10-14', 'en', 'notice',   '94998241e6dcc7db508d2801f3b34215f3bd21b3980d6b8d865d79a5e1ff33b2'),
  ('research_consent_copy_2026-10-14', 'en', 'settings', 'b0b21f5c2c4d0a054af122fad8069cdc491c239db5d29ca1ec146ad07e2e1ed8');

-- 2. Audit-Log --------------------------------------------------------------
-- user_id statt research_subject_id: Der Nachweis gehört zur Person, nicht zum
-- Pseudonym. Das Pseudonym hier mitzuführen würde den Nachweis mit den
-- pseudonymen Forschungsdaten verknüpfen, ohne dass der Nachweis es braucht.
--
-- Löschen mit dem Konto (on delete cascade): Bei der Kontolöschung verschwinden
-- auch die Forschungsdaten (Trigger an research_consent_preferences); ein
-- Nachweis für eine Verarbeitung, die es nicht mehr gibt, wäre ein Rest
-- personenbezogener Daten ohne Zweck. (LEGAL REVIEW REQUIRED: ob ein Nachweis
-- nach Kontolöschung aufbewahrt werden muss.)
create table public.research_consent_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('accepted', 'declined', 'withdrawn')),
  semantic_consent_version text not null check (semantic_consent_version ~ '^research_consent_v[0-9]+$'),
  copy_revision text not null,
  locale text not null,
  surface text not null,
  copy_sha256 text not null,
  occurred_at timestamptz not null default now(),
  foreign key (copy_revision, locale, surface)
    references public.research_consent_copy_revisions (copy_revision, locale, surface)
);

create index research_consent_audit_log_user_idx
  on public.research_consent_audit_log (user_id, occurred_at desc);

comment on table public.research_consent_audit_log is
  'Jede Entscheidung zur Research-Einwilligung ab 14.10.2026, nur anhängen. Entscheidungen davor haben keinen Eintrag und werden nicht rückwirkend zugeordnet.';

alter table public.research_consent_audit_log enable row level security;

create policy research_consent_audit_log_select_owner
on public.research_consent_audit_log
for select to authenticated
using (user_id = auth.uid());

revoke all on table public.research_consent_audit_log from public, anon, authenticated;
grant select on table public.research_consent_audit_log to authenticated;
grant select on table public.research_consent_audit_log to service_role;

-- Nur anhängen: Ändern nie, Löschen nur, wenn das Konto schon weg ist (Kaskade
-- aus auth.users). Bewusst NICHT über `app.allow_account_cleanup`: Diese
-- Einstellung setzt auch der Widerruf in set_my_research_consent, und sie gilt
-- bis zum Ende der Transaktion - danach wären einzelne Nachweise löschbar.
create or replace function public.block_research_consent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from auth.users account where account.id = old.user_id) then
    return old;
  end if;
  raise exception 'research_consent_audit_log_is_append_only' using errcode = '42501';
end;
$$;

revoke all on function public.block_research_consent_audit_mutation() from public, anon, authenticated, service_role;

create trigger research_consent_audit_log_append_only
before update or delete on public.research_consent_audit_log
for each row execute function public.block_research_consent_audit_mutation();

-- 3. Entscheidung + Nachweis in einer Transaktion ---------------------------
-- Die alte Signatur verschwindet: Bliebe sie stehen, ließe sich ein Zustand
-- ohne Nachweis setzen.
drop function if exists public.set_my_research_consent(text);

create or replace function public.set_my_research_consent(
  p_state text,
  p_copy_revision text,
  p_locale text,
  p_surface text
)
returns table (
  state text,
  accepted_at timestamptz,
  declined_at timestamptz,
  withdrawn_at timestamptz,
  deleted_raw_events integer
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_previous_state text;
  v_subject_id uuid;
  v_subject_hash text;
  v_deleted integer := 0;
  v_copy_sha256 text;
  v_action text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_state not in ('accepted', 'declined') then
    raise exception 'invalid_research_consent_state' using errcode = '22023';
  end if;

  -- Nur registrierte Fassungen; der Hash kommt aus der Datenbank, nicht vom Aufrufer.
  select revision.copy_sha256
    into v_copy_sha256
  from public.research_consent_copy_revisions revision
  where revision.copy_revision = p_copy_revision
    and revision.locale = p_locale
    and revision.surface = p_surface;
  if v_copy_sha256 is null then
    raise exception 'unknown_research_consent_copy' using errcode = '22023';
  end if;

  select rcp.state, rcp.research_subject_id
    into v_previous_state, v_subject_id
  from public.research_consent_preferences rcp
  where rcp.user_id = v_uid
  for update;

  if v_subject_id is null then
    v_subject_id := gen_random_uuid();
  end if;

  insert into public.research_consent_preferences (
    user_id, state, research_subject_id, accepted_at, declined_at, withdrawn_at, updated_at
  ) values (
    v_uid,
    p_state,
    v_subject_id,
    case when p_state = 'accepted' then now() else null end,
    case when p_state = 'declined' then now() else null end,
    null,
    now()
  )
  on conflict (user_id) do update
  set state = excluded.state,
      accepted_at = case
        when excluded.state = 'accepted' then coalesce(public.research_consent_preferences.accepted_at, now())
        else null
      end,
      declined_at = case when excluded.state = 'declined' then now() else public.research_consent_preferences.declined_at end,
      withdrawn_at = case
        when excluded.state = 'declined' and public.research_consent_preferences.state = 'accepted' then now()
        when excluded.state = 'accepted' then null
        else public.research_consent_preferences.withdrawn_at
      end,
      updated_at = now();

  if p_state = 'declined' then
    v_subject_hash := encode(digest(v_subject_id::text, 'sha256'), 'hex');
    perform set_config('app.allow_account_cleanup', 'on', true);
    delete from public.research_events re
    where re.subject_hash = v_subject_hash
      and re.research_consent_version = 'research_consent_v1';
    get diagnostics v_deleted = row_count;
  end if;

  v_action := case
    when p_state = 'accepted' then 'accepted'
    when v_previous_state = 'accepted' then 'withdrawn'
    else 'declined'
  end;

  insert into public.research_consent_audit_log (
    user_id, action, semantic_consent_version, copy_revision, locale, surface, copy_sha256
  ) values (
    v_uid, v_action, 'research_consent_v1', p_copy_revision, p_locale, p_surface, v_copy_sha256
  );

  return query
  select rcp.state, rcp.accepted_at, rcp.declined_at, rcp.withdrawn_at, v_deleted
  from public.research_consent_preferences rcp
  where rcp.user_id = v_uid;
end;
$$;

revoke all on function public.set_my_research_consent(text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_my_research_consent(text, text, text, text) to authenticated;

comment on function public.set_my_research_consent(text, text, text, text) is
  'Setzt die Research-Einwilligung (fachlich research_consent_v1) und schreibt in derselben Transaktion einen Nachweis mit Textrevision, Sprache, Stelle und Hash.';

commit;
