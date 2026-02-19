# Invite/Relationship Audit (Supabase Postgres + RLS)

## Ist-Zustand (kurz)
- Das aktuelle Backend ist **session-zentriert**. Kernobjekte sind `sessions` + `participants` (`supabase/migrations/20260209163848_init_schema.sql:4`, `supabase/migrations/20260209163848_init_schema.sql:11`).
- Einladungen sind kein eigenes Workflow-Objekt, sondern `participants`-Zeilen mit `role='B'`/`'partner'`, `invited_email`, optional `requested_scope` (`web/src/app/(product)/dashboard/actions.ts:510`, `supabase/migrations/20260216103000_participants_dedup_and_constraints.sql:7`).
- Accept passiert derzeit über Session-Link (`/join?sessionId=...`) und ein `participants.update({ user_id })` (`web/src/app/join/page.tsx:84`, `web/src/app/(product)/invite/[sessionId]/page.tsx:85`).
- Vergleichsreport wird zur Laufzeit aus Session-Antworten berechnet (kein persistierter Report-Run) (`web/src/features/reporting/actions.ts:96`, `web/src/features/reporting/actions.ts:107`).
- Alte Edge Functions sind noch token-basiert (`participants.token`) und modellieren weiterhin das alte Session/Token-Flow (`supabase/functions/get-session/index.ts:20`, `supabase/functions/save-progress/index.ts:31`, `supabase/functions/complete-session/index.ts:25`).

## Soll-Zustand (kurz)
- Beziehungen zwischen zwei Usern sind **profile-/user-basiert** (`relationships`), nicht session-basiert.
- Einladungen sind eigenes Objekt (`invitations`) mit Workflow-Status (`sent/opened/accepted/expired/revoked`).
- Module/Add-ons laufen über Join-Tabelle `invitation_modules`.
- Assessments sind pro User + Instrument persistiert (`assessments` + Antworttabelle), entkoppelt von Invite/Session.
- Vergleiche sind versionierte `report_runs` pro Relationship + Module-Set.
- Accept ist idempotent und pair-unique per `least()/greatest()`.
- RLS trennt klar: relationship/report_runs nur Beteiligte, invitations nur Inviter; Accept nur über serverseitige Funktion mit Token.

## Gap-Liste

### 1) Fehlende Tabellen
- `relationships` fehlt komplett.
- `invitations` fehlt komplett.
- `invitation_modules` fehlt komplett.
- `assessments` fehlt komplett.
- `assessment_answers` (oder äquivalent) fehlt komplett.
- `report_runs` fehlt komplett.
- `report_run_modules` (für reproduzierbare Modulzusammensetzung) fehlt komplett.

### 2) Falsches/ungeeignetes Datenmodell für Zielzustand
- Pairing-Quelle ist `sessions/participants`, nicht Relationship:
  - `participants.session_id` ist Pflicht-FK (`supabase/migrations/20260209163848_init_schema.sql:13`).
  - Invite erstellt neue Session + kopiert Antworten (`web/src/app/(product)/dashboard/actions.ts:415`, `web/src/app/(product)/dashboard/actions.ts:479`).
- Add-on-Modell ist skalar über `requested_scope` statt normalisiertem Join:
  - Check nur `('basis','basis_plus_values')` (`supabase/migrations/20260216103000_participants_dedup_and_constraints.sql:202`).
  - UI/Domain hängt an `requestedScope` (`web/src/features/reporting/types.ts:69`, `web/src/features/dashboard/InviteParticipantForm.tsx:22`).
- Assessments hängen an Session + Participant (`responses.session_id`, `responses.participant_id`) statt an User+Instrument (`supabase/migrations/20260209163848_init_schema.sql:40`).
- Reports werden nicht versioniert gespeichert; sie werden ad hoc berechnet (`web/src/features/reporting/actions.ts:70`).

### 3) Fehlende/ungeeignete Constraints & Indizes
- Kein globales Pair-Unique über zwei User via `least()/greatest()` (weil `relationships` fehlt).
- Kein idempotency-Constraint für Accept (kein `accepted_at`-Locking + kein `ON CONFLICT` auf Pair).
- Kein Lifecycle-Constraint für Einladungstatus (`invitations.status` existiert nicht).
- Kein Index-Set für Einladung-Workflow (`open by invitee_email`, `token_hash`, `expires_at`, `inviter_user_id,status`) vorhanden.
- Stattdessen session-spezifische Guardrails:
  - `participants_session_role_idx` (`supabase/migrations/20260210204153_account_backbone_auth.sql:15`)
  - `participants_session_user_uidx` (`supabase/migrations/20260216103000_participants_dedup_and_constraints.sql:217`)
  - `participants_session_secondary_uidx` (`supabase/migrations/20260216103000_participants_dedup_and_constraints.sql:225`)

### 4) Fehlende Enums (oder modulare Lookup-Modelle)
- Kein Enum `invitation_status`.
- Kein Enum/Lookup für `module` (derzeit implizit nur `basis` vs `basis_plus_values`).
- Kein Enum/Lookup für `assessment_instrument` (base, values, stress, roles, decision_architecture, ...).
- Kein Enum `relationship_status`.
- Kein Enum `report_run_status`.

### 5) RLS-/Accept-Gap
- `participants`/`sessions` RLS ist invitation-by-email + session-basiert, nicht relationship-basiert:
  - Select auf Session bei `invited_email` (`supabase/migrations/20260210215231_account_backbone_rls_fix.sql:4`).
  - `participants_update_self` erlaubt Claim via E-Mail-Match (`supabase/migrations/20260210215231_account_backbone_rls_fix.sql:66`).
- Accept läuft nicht zwingend über serverseitige Token-Funktion, sondern über Session-ID-Route (`web/src/app/join/page.tsx:10`, `web/src/app/join/page.tsx:84`).

### 6) Schema-Drift / Unklare Stellen (nicht geraten)
- Code verwendet `sessions.participant_id` (`web/src/app/(product)/dashboard/actions.ts:239`), dazu existiert in den Migrationen **kein** Add-Column-Migrationseintrag.
- Code verwendet `questions.category` und `questions.type` (`web/src/features/questionnaire/actions.ts:169`, `web/src/app/(product)/dashboard/page.tsx:112`), in den Migrationen wird `questions` ohne diese Spalten erstellt (`supabase/migrations/20260209163848_init_schema.sql:21`).
- In `supabase/config.toml` ist Seed-Datei konfiguriert, aber `supabase/seed.sql` fehlt (`supabase/config.toml:65`).

## Session-IDs als Source of Truth (Problemstellen)
Diese Stellen zeigen, dass Session-ID aktuell die primäre Identität für Invite/Pairing/Report ist:
- Schema: `participants.session_id` FK (`supabase/migrations/20260209163848_init_schema.sql:13`).
- Invite-Erstellung erzeugt immer neue Session (`web/src/app/(product)/dashboard/actions.ts:415`, `web/src/app/(product)/dashboard/actions.ts:958`).
- Join/Accept basiert auf `sessionId` in URL (`web/src/app/join/page.tsx:10`, `web/src/app/join/page.tsx:101`).
- Report-Ladepfad basiert auf `sessionId` (`web/src/features/reporting/actions.ts:70`, `web/src/app/report/[sessionId]/page.tsx:30`).
- Dashboard-Logik gruppiert Workflows über Session + `source_session_id` (`web/src/app/(product)/dashboard/page.tsx:103`, `web/src/app/(product)/dashboard/page.tsx:161`).

**Bewertung:** Für den gewünschten relationship-first Zielzustand ist das ein strukturelles Problem, weil Invite-Lifecycle, Pairing und Assessment-Zustand an volatile Session-Objekte gekoppelt bleiben.

## Konkrete To-do Liste (Reihenfolge, Risiko, Aufwand)

1. Zielschema additiv einführen (`relationships`, `invitations`, `invitation_modules`, `assessments`, `assessment_answers`, `report_runs`, `report_run_modules`).
- Risiko: Mittel (additiv, wenig breaking)
- Aufwand: Mittel

2. Enums/Lookups + Kernconstraints einführen (Pair-Unique, Status-Checks, Modul/Instrument-Checks).
- Risiko: Mittel
- Aufwand: Mittel

3. Sicherheitskritische Accept-RPC bauen (security definer, token_hash, row lock, idempotent upsert relationship).
- Risiko: Hoch (Auth/RLS/Token)
- Aufwand: Mittel

4. RLS für neue Tabellen vollständig setzen (least privilege), direkte Client-Updates auf Invite-Accept verhindern.
- Risiko: Hoch
- Aufwand: Mittel

5. Dual-Write im Backend einführen (bestehender Flow schreibt zusätzlich neues Modell), Read-Path noch unverändert.
- Risiko: Mittel
- Aufwand: Mittel

6. Historische Daten migrieren (Sessions/Participants/Responses -> Relationships/Invitations/Assessments/ReportRuns), mit Dry-Run + Prüfqueries.
- Risiko: Hoch (Datenverlust/Fehlmapping)
- Aufwand: Hoch

7. Read-Pfade auf neues Modell umstellen (Dashboard/Join/Reports/Status).
- Risiko: Hoch (Verhaltensänderung)
- Aufwand: Hoch

8. Legacy-Felder/-Tabellen entkoppeln und später entfernen (`sessions`, `participants` als Invite-Source-of-Truth, alte Edge Functions mit Token).
- Risiko: Mittel bis Hoch
- Aufwand: Mittel

## Migrationsplan (bleibt / ersetzt / Mapping)

### Bleibt
- `public.profiles` (Onboarding-Profil) (`supabase/migrations/20260214235000_add_profiles_table.sql:3`)
- `public.questions`, `public.choices` als Instrument-Katalog (ggf. ergänzen um saubere Instrument-Klassifizierung)
- `auth.users`

### Ersetzt (als Source of Truth)
- `public.sessions` (für Invite/Pairing/Status)
- `public.participants` (für Invite + Relationship + Rollenmodell)

### Umgestellt
- `public.responses`, `public.free_text` -> in `assessments` + `assessment_answers` (ggf. `assessment_notes`) überführen.

### Daten-Mapping (Backfill)
- **Invitations**
  - Quelle: `participants`-Zeilen mit `role in ('B','partner')` und `invited_email is not null`.
  - `inviter_user_id`: aus zugehörigem `A`-Participant der Session.
  - `created_at`: `participants.created_at`.
  - `module set`: aus `requested_scope` (`basis` -> nur base, `basis_plus_values` -> base+values).
  - `status` heuristisch:
    - `accepted`, wenn `user_id` auf B-Row gesetzt.
    - sonst `sent`/`opened` anhand verfügbarer Events (heute nur eingeschränkt rekonstruierbar).

- **Relationships**
  - Quelle: Sessions mit A-User + B-User gesetzt.
  - Upsert per `(least(a_user_id,b_user_id), greatest(...))`.

- **Assessments**
  - Quelle: `responses` + `free_text`.
  - `user_id`: über `participants.user_id`.
  - `instrument`: aus `questions.category` (falls vorhanden) oder deterministische Mapping-Regeln.
  - Snapshot/Version: aus `session_id` ableiten (z. B. `source_ref`).

- **Report Runs**
  - Quelle: Sessions mit beiden Seiten abgeschlossen / vergleichbar.
  - `relationship_id`: via Pair-Mapping.
  - `modules`: aus invitation/requested scope + vorhandenen Antworten.

## SQL Snippets (Kernteile)

```sql
-- 1) Status-Enums
create type invitation_status as enum ('sent', 'opened', 'accepted', 'expired', 'revoked');
create type relationship_status as enum ('active', 'paused', 'ended');
create type assessment_instrument as enum ('base', 'values', 'stress', 'roles', 'decision_architecture');
```

```sql
-- 2) Relationships mit pair-unique via least/greatest
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  pair_user_low uuid generated always as (least(user_a_id, user_b_id)) stored,
  pair_user_high uuid generated always as (greatest(user_a_id, user_b_id)) stored,
  status relationship_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (pair_user_low, pair_user_high)
);
```

```sql
-- 3) Invitations + Module-Join
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  token_hash text not null unique,
  status invitation_status not null default 'sent',
  relationship_id uuid references public.relationships(id) on delete set null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (invitee_email = lower(btrim(invitee_email)))
);

create table public.invitation_modules (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  module_key assessment_instrument not null,
  primary key (invitation_id, module_key)
);

create index invitations_inviter_status_idx on public.invitations(inviter_user_id, status);
create index invitations_invitee_open_idx on public.invitations(lower(invitee_email), status);
create index invitations_expires_idx on public.invitations(expires_at) where status in ('sent', 'opened');
```

```sql
-- 4) Assessments + Answers
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument assessment_instrument not null,
  source_invitation_id uuid references public.invitations(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index assessments_user_instrument_active_uidx
  on public.assessments(user_id, instrument)
  where submitted_at is null;

create table public.assessment_answers (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id text not null references public.questions(id) on delete restrict,
  choice_value text not null,
  updated_at timestamptz not null default now(),
  primary key (assessment_id, question_id)
);
```

```sql
-- 5) Report Runs
create table public.report_runs (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  version int not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (relationship_id, version)
);
```

```sql
-- 6) Idempotentes Accept (Kernlogik-Skelett)
create or replace function public.accept_invitation(p_token text)
returns table (invitation_id uuid, relationship_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
  v_rel_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_inv
  from public.invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  if v_inv.status in ('accepted','revoked','expired') then
    return query select v_inv.id, v_inv.relationship_id;
    return;
  end if;

  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired', updated_at = now() where id = v_inv.id;
    raise exception 'expired';
  end if;

  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_uid)
  on conflict (pair_user_low, pair_user_high)
  do update set updated_at = now()
  returning id into v_rel_id;

  update public.invitations
  set status = 'accepted', accepted_at = now(), relationship_id = v_rel_id, updated_at = now()
  where id = v_inv.id;

  return query select v_inv.id, v_rel_id;
end;
$$;
```

```sql
-- 7) RLS-Kern
alter table public.relationships enable row level security;
create policy relationships_select_members
on public.relationships
for select to authenticated
using (auth.uid() in (user_a_id, user_b_id));

alter table public.invitations enable row level security;
create policy invitations_select_inviter
on public.invitations
for select to authenticated
using (inviter_user_id = auth.uid());

-- accept_invitation() läuft als security definer; keine direkte update-policy für invitee nötig.
```

## Top 5 Risiken
1. **RLS-Fehlkonfiguration beim Übergang**: Daten können ungewollt sichtbar/änderbar werden (insb. Accept-Flow und Report-Runs).
2. **Datenverlust bei Backfill**: Session-basierte historische Daten lassen sich nicht 1:1 in relationship-basierte Historie überführen, wenn Metadaten fehlen.
3. **Duplikat-Beziehungen ohne harte Pair-Unique-Strategie**: Race Conditions bei Accept führen zu Mehrfacheinträgen.
4. **Token-Handling-Schwächen**: Klartext-Token, fehlende Expiry/Revocation-Checks oder fehlendes Hashing erhöhen Missbrauchsrisiko.
5. **Schema-Drift zwischen Code und Migrationen**: Felder wie `sessions.participant_id`, `questions.category/type` sind im Code referenziert, aber migrationsseitig nicht nachvollziehbar; das macht Deployments fragil.
