# Migration Steps: Invite/Relationship (Additiv + Dual-Write)

## Ziel
- Neues relationship-/invitation-basiertes Datenmodell additiv einführen.
- Bestehenden session-basierten Flow nicht brechen.
- Invite-Erstellung schreibt parallel in Legacy (`participants`) und neues Modell (`invitations`, `invitation_modules`).
- Accept läuft token-first über `public.accept_invitation(p_token)`, Session-Join bleibt Fallback.

## Ausführungsreihenfolge
1. Datenbank-Migrationen ausrollen (additiv, kein Drop):
- `supabase/migrations/20260216114000_relationship_invitation_foundation.sql`
- `supabase/migrations/20260216115000_schema_drift_alignment.sql`
- `supabase/migrations/20260218103000_report_runs_snapshot_immutability.sql`
- `supabase/migrations/20260218112000_report_run_uniqueness_and_relationship_hardening.sql`

2. App deployen mit Dual-Write + token-first accept:
- `web/src/app/(product)/dashboard/actions.ts`
- `web/src/app/join/page.tsx`
- `web/src/features/reporting/actions.ts`
- `web/src/app/report/[sessionId]/page.tsx`

3. Smoke-Test mit zwei Accounts:
- Person A erstellt Invite (mit/ohne E-Mail-Versand).
- Link enthält `inviteToken`.
- Person B öffnet Link und akzeptiert.
- B landet weiter in Session-Flow (`/session/[sessionId]/b`) ohne Regression.

4. Monitoring 24-48h im Dual-Write-Betrieb:
- Vergleiche Legacy-Invites vs neue `invitations`.
- Prüfe Accept-Status, Pair-Duplikate und RLS-Zugriffe.

5. Erst danach: schrittweiser Read-Cutover auf `relationships`/`report_runs`.

## Prüf-Queries (Post-Migration)
```sql
-- Tabellen vorhanden?
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'relationships',
    'invitations',
    'invitation_modules',
    'assessments',
    'assessment_answers',
    'report_runs',
    'report_run_modules'
  )
order by table_name;
```

```sql
-- Enum-Werte vorhanden?
select t.typname as enum_name, e.enumlabel as enum_value
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in ('invitation_status', 'relationship_status', 'assessment_instrument', 'report_run_status')
order by t.typname, e.enumsortorder;
```

```sql
-- Schema-Drift Fix wirksam?
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sessions'
  and column_name = 'participant_id';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'questions'
  and column_name in ('category', 'type')
order by column_name;
```

```sql
-- Pair-Unique-Check (soll 0 Zeilen liefern)
select pair_user_low, pair_user_high, count(*)
from public.relationships
group by pair_user_low, pair_user_high
having count(*) > 1;
```

```sql
-- Einladungslage
select status, count(*)
from public.invitations
group by status
order by status;
```

```sql
-- Dual-Write Plausibilität: neue Invites mit Modulen
select i.id, i.inviter_user_id, i.invitee_email, i.status, count(m.module_key) as module_count
from public.invitations i
left join public.invitation_modules m on m.invitation_id = i.id
group by i.id, i.inviter_user_id, i.invitee_email, i.status
order by i.created_at desc
limit 50;
```

```sql
-- Token-Hash Hygiene (soll 0 liefern)
select count(*) as invalid_hash_rows
from public.invitations
where token_hash !~ '^[0-9a-f]{64}$';
```

```sql
-- Relationship-Zählung
select count(*) as relationships_total from public.relationships;
```

```sql
-- Report-Runs pro Relationship
select relationship_id, count(*) as runs
from public.report_runs
group by relationship_id
order by runs desc
limit 20;
```

```sql
-- Snapshot-Verknüpfung zur Session
select id, relationship_id, source_session_id, version, created_at
from public.report_runs
where source_session_id is not null
order by created_at desc
limit 20;
```

```sql
-- Muss leer sein: maximal ein Run je source_session_id
select source_session_id, count(*) as cnt
from public.report_runs
where source_session_id is not null
group by source_session_id
having count(*) > 1;
```

```sql
-- Completion-Regel: Session mit beiden completed_at muss einen report_run haben
with session_completion as (
  select
    p.session_id,
    bool_and(p.completed_at is not null) as all_completed
  from public.participants p
  where p.role in ('A', 'B', 'partner')
  group by p.session_id
)
select sc.session_id
from session_completion sc
left join public.report_runs rr on rr.source_session_id = sc.session_id
where sc.all_completed = true
  and rr.id is null;
```

```sql
-- Read/Open erzeugt keinen report_run:
-- 1) Count merken
select count(*) as report_runs_before from public.report_runs;
-- 2) Report-Route im Browser öffnen
-- 3) Count erneut prüfen: muss identisch bleiben
select count(*) as report_runs_after from public.report_runs;
```

## Prüf-Queries (RLS-Sicherheitscheck)
```sql
-- Als authentifizierter User A:
-- Erwartung: nur eigene inviter invitations sichtbar
select id, inviter_user_id, invitee_email, status
from public.invitations
order by created_at desc
limit 20;
```

```sql
-- Als authentifizierter User ohne Beziehung:
-- Erwartung: 0 Zeilen bei fremden relationships/report_runs
select * from public.relationships;
select * from public.report_runs;
```

## Bekannte Übergangslogik (bewusst)
- `invitations.session_id` bleibt vorerst als Brücke gesetzt, damit alte Session-Routen weiter funktionieren.
- `join/page.tsx` nimmt zuerst per `accept_invitation(token)` an und nutzt danach weiter den Session-Join als Fallback.
- Legacy-Tabellen (`sessions`, `participants`, `responses`) bleiben bis zum Read-Cutover Source für bestehende UI.

## Noch auf Relationship-Read umzustellende UI-Routen
- `web/src/app/(product)/dashboard/page.tsx`
- `web/src/features/reporting/actions.ts`
- `web/src/features/reporting/TeamMatchingPanel.tsx`
- `web/src/app/report/[sessionId]/page.tsx`
- `web/src/app/report/[sessionId]/individual/page.tsx`
- `web/src/app/(product)/invite/[sessionId]/page.tsx`
- `web/src/app/(product)/session/[sessionId]/a/page.tsx`
- `web/src/app/(product)/session/[sessionId]/b/page.tsx`
- `web/src/app/(product)/session/[sessionId]/values/page.tsx`
- `web/src/features/questionnaire/actions.ts`
- `web/src/features/questionnaire/actionsB.ts`

## Breaking-Change Warnung (für später)
- Erst wenn alle Read-Pfade auf `relationships`/`report_runs` umgestellt sind, dürfen Session-gekoppelte Invite-Pfade de-priorisiert oder entfernt werden.

## Snapshot-Nachweis (Minimal-Script)
- Script: `scripts/report_run_snapshot_check.sql`
- Zweck: zeigt, dass `report_runs.payload` bei neuen Assessments unverändert bleibt und Update/Delete blockiert sind.
