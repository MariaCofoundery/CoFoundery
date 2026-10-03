# Problem Radar – Ist-Zustand, Phase 7.8a

## Auditbasis und Grenzen

Stand: lokaler `main` auf `2eaadfc` (Phase 7.7), einschließlich Phase 7.6; lokale Supabase-Migration zuletzt `20261106120000`. Die Arbeitskopie war zu Beginn sauber. Kein Remote-Fetch, keine Drittquellen-/Vercel-/Modellaufrufe. DB-Audit ausschließlich per `BEGIN TRANSACTION READ ONLY … ROLLBACK`, mit Schema-, Funktions- und Grant-Metadaten statt personenbezogenen Datensätzen.

Geprüft: [CONNECT Ist-Zustand](connect-v2-current-state.md), [Produktarchitektur](connect-v2-product-architecture.md), [Gap-Plan](connect-v2-gap-plan.md), [Admin/Moderation](connect-phase-7-2-admin-moderation.md), [private Workspaces](connect-phase-7-6-problem-workspace.md), [Übergänge zu Problem/Opportunity/Venture](connect-phase-7-7-problem-opportunity-venture.md). Ältere Gap-Plan-Einträge für noch fehlende Adminrolle/Workspaces sind durch den aktuellen Code überholt. Radar-Quellen, Collector, Problemsignal- und Hypothesentabellen existieren im geprüften Schema nicht.

Diese Phase erzeugt ausschließlich drei Dokumente. Alle neuen Objekte und Routen in [Produktspezifikation](problem-radar-product-spec.md) und [Umsetzungsplan](problem-radar-implementation-plan.md) sind Vorschläge, kein implementierter Vertrag. Kein Schema-, App-, Cron- oder Env-Change.

## 1. Cron und Betrieb

| Befund | Tatsächlicher Code/DB-Vertrag | Konsequenz für Radar |
| --- | --- | --- |
| Ein deklarierter Cron | [`web/vercel.json`](../web/vercel.json): `/api/cron/connect-suggestions`, `0 7 * * *`, Region `lhr1` | Zeitplan-/Route-Muster wiederverwendbar; separate Radar-Route und eigenes Budget, nicht an Suggestions anhängen |
| Geschützter GET | [`route.ts`](../web/src/app/api/cron/connect-suggestions/route.ts): `force-dynamic`, exakter Vergleich des getrimmten Authorization-Headers mit `Bearer ${CRON_SECRET}` | Ohne Secret 503, falsches Secret 401. Kein Nachweis allein über User-Agent/URL; fehlende Konfiguration führt nicht zum Lauf |
| Begrenzter Batch | Route übergibt 25; DB `prepare_suggestion_notifications(integer)` begrenzt auf 1–200 | Vorhandenes Batch-Prinzip übernehmen, aber Quellen-/Request-/Byte-Budgets separat definieren |
| DB-Selektion | Aktive CONNECT-Profile/Mitgliedschaften, älteste `suggestions_checked_at` zuerst; Aufruf `generate_connect_suggestions_for(user, 3)` | Keine Radar-Anbindung an Mitglieder, Matchterms oder Empfehlungsdaten |
| Privilegierter Zugriff | [`suggestionNotifications.ts`](../web/src/features/connect/suggestionNotifications.ts) erstellt serverseitigen Service-Role-Client; Prepare-RPC nicht für anon/authenticated freigegeben | Service-Role ist nicht automatisch ein auf Radar begrenztes Maschinenrecht |
| Zustellung | DB stempelt `notified_at` vor externem Versand; Runner behandelt Empfänger nacheinander, je Empfänger Catch; Antwort nur aggregierte Zahlen | Wiederholungsbegrenzung vorhanden, aber keine garantierte Zustellung und kein allgemeiner Retry-Jobrunner. Nicht als Collector-Idempotenz kopieren |
| Zeitgrenzen | Cron-Route exportiert kein `maxDuration`; kein globales Deadline-/Resume-Budget im Runner; `vercel.json` enthält keine Function-Limits | Tatsächliche Production-Laufzeit/Tarif/Concurrency unbekannt; vor R2/R7 prüfen, keine aktuelle Tarifzahl aus alten Kommentaren ableiten |
| Weitere Maintenance-Route | [`report-runs/backfill/route.ts`](../web/src/app/api/maintenance/report-runs/backfill/route.ts): POST, `MAINTENANCE_API_KEY`, Default-Budget 20.000 ms, Eingabe-Clamp 5.000–120.000 ms | Konzept eines Arbeitsbudgets existiert; die Eingabe ist keine Vercel-Laufzeitgarantie. Route bleibt fachlich getrennt |

Die vorhandene Vercel-Konfiguration belegt den vorgesehenen Zeitplan, nicht erfolgreiche Production-Ausführungen, gesetzte Secrets oder tatsächliche Projektlimits. Diese wurden mangels externer Requests bewusst nicht geprüft. Keine Empfehlung, den vorhandenen täglichen Cron umzuwidmen.

## 2. Adminrolle und Moderation

Code: [`features/moderation/access.ts`](../web/src/features/moderation/access.ts), [`actions.ts`](../web/src/features/moderation/actions.ts), [`AdminModerationLink.tsx`](../web/src/features/moderation/AdminModerationLink.tsx), [`/admin/moderation`](<../web/src/app/(product)/admin/moderation/page.tsx>). DB-Migration: [`20261102120000_platform_admin_moderation.sql`](../supabase/migrations/20261102120000_platform_admin_moderation.sql).

Lokal bestätigt:

- `platform_admins(user_id, created_at, created_by)`; RLS aktiv, keine anon/authenticated-Tabellenrechte oder lesende Client-Policy.
- Parameterloses `is_platform_admin()`: nur `auth.uid()`, `STABLE`, `SECURITY DEFINER`, leerer `search_path`. Execute für authenticated; kein anon/PUBLIC-Execute.
- `requirePlatformAdmin()` verwendet Session-Client und DB-Prüfung, sonst `notFound()`. Keine Ableitung aus E-Mail, `profiles.roles` oder Org-Mitgliedschaft.
- Report-Read/Mutation über `list_network_reports_for_moderation` und `moderate_network_report`, jeweils mit DB-Adminprüfung. Keine generische Admin-Lesefreigabe auf private Tabellen.
- Route: DE/EN, `noindex/nofollow`, paginierte Liste (UI 25, DB maximal 50), Statusfilter und Notiz. Kleiner Einstieg auf `/account`.

**Wiederverwenden:** Adminidentität, serverseitiger Guard, Session-Client, enge RPCs, Validierungs-/Pagination-/i18n-Muster, zurückhaltende Navigation.

**Trennen:** Radar-Signale sind keine `network_reports`. Reports betreffen Meldungen gegen Personen/Conversations mit eigenem Lebenszyklus. Keine Zweckentfremdung der Meldungskategorien, Notizen oder Moderations-RPCs. Vorgeschlagene Radar-Route später `/admin/problem-radar`, mit eigenem Schema und Tests. Bestehende Adminrolle erteilt heute keinerlei Workspace-Zugriff.

## 3. CONNECT-Objekte und Übergänge

| Bestehend | Aktueller Vertrag | Radar-Grenze |
| --- | --- | --- |
| `network_problems` | Öffentlich/members-only veröffentlichbare Problemfassung mit Titel, Beschreibung, Absicht, Orten, Themen, Branchen und Status | Ein externer Fund ist noch keine solche Fassung; nie Collector-Zieltabelle |
| `network_problem_workspaces` | Privat, Owner/Contributor/Viewer, `active`/`archived`; `create_problem_workspace()` verlangt aktive CONNECT-Mitgliedschaft | Adminrolle allein genügt nicht zum Erzeugen oder Lesen. Radar-Handoff darf diese Grenze nicht umgehen |
| Workspace-Entries | Fünf Typen; eigener Autor; optional `source_url`/`source_label` nur bei observation/perspective | Geeignet für bewusst ausgewählten Startkontext, nicht für ein Quellenregister oder Volltextarchiv |
| Workspace-Mitgliedschaft | `problem_workspace_role()` prüft aktuelle Mitglieder, Suspendierung und bestehende beidseitige Blocks; Owner kann Mitglieder verwalten | Keine impliziten Radar-/Admin-/externen Autoren-Mitgliedschaften |
| Problemrelationen | `source_problem_id` eingehend; `published_problem_id` ausgehende Problemfassung | Keine der beiden Spalten als Radar-Herkunft umdeuten |
| Private Opportunities | `network_problem_opportunities`, interne Entry-Bezüge; nur Owner mutiert | Hypothese und Radar-Signal sind keine Opportunity; keine automatische Erzeugung |
| Founder-Venture | `founder_teams`, höchstens drei Founder; expliziter Link aus Opportunity | Keine Radar-Venture-/Founder-/Matching-Automatik |

Belege: [`20261105120000_private_problem_workspaces.sql`](../supabase/migrations/20261105120000_private_problem_workspaces.sql), [`20261106120000_problem_workspace_transitions.sql`](../supabase/migrations/20261106120000_problem_workspace_transitions.sql), [`developmentActions.ts`](../web/src/features/connect/workspaces/developmentActions.ts).

Der Publish-Flow 7.7 beginnt für neue Fassungen leer, bietet explizite Vorschau/Bestätigung und schreibt ausschließlich freigegebene Problemfelder. Er kopiert keine privaten Quellen, Entries oder Teilnehmer. Bestehende Public-RPC-/Sitemap-Regeln gelten anschließend unverändert. Eine manuell veröffentlichte Fassung kann den bereits bestehenden Saved-Search-Benachrichtigungsweg auslösen: Das ist der bestehende Publish-Effekt, keine Radar-Empfehlung. Radar selbst ruft diesen Weg nicht auf.

## 4. URLs und Fetch

[`workspaces/model.ts`](../web/src/features/connect/workspaces/model.ts) validiert **Darstellungslinks** per `URL`, HTTP(S), ohne Zugangsdaten. DB-Constraints begrenzen Quellen-URL auf 2.048, Quellenlabel auf 200 Zeichen und schließen Whitespace/Zugangsdaten aus. Linkdarstellung nutzt `noopener noreferrer nofollow`; Workspaces setzen `no-referrer`.

Das ist **kein SSRF-sicherer Fetch-Helfer**: weder DNS-/IP-/Redirect-Prüfung noch Source-Allowlist, Antwortgrößenbegrenzung, robots-/Policy-Prüfung oder Parser-Sandbox. Kein allgemeiner Collector/Feedparser mit diesen Eigenschaften gefunden. Neue Radar-Abrufe dürfen diesen Darstellungsvalidator nicht als Abruffreigabe interpretieren.

Vorhandene `fetch()`-Aufrufe betreffen überwiegend konfigurierte Resend-, Push- oder Ollama-Endpunkte. Beispielsweise Feedback-/Workspace-/Intake-Mailhelper begrenzen per `AbortSignal.timeout(5000)`. [`lib/ai/ollama.ts`](../web/src/lib/ai/ollama.ts) verwendet AbortController mit standardmäßig 60 Sekunden, `finally`-Cleanup und neutralem Fehlerergebnis. Diese Timeout-Prinzipien sind wiederverwendbar; Mail-/Modellhelper selbst sind keine Web-Collector.

## 5. AI-/Job-Infrastruktur

Vorhanden: [`web/scripts/ai-worker.ts`](../web/scripts/ai-worker.ts), [`lib/ai/ollama.ts`](../web/src/lib/ai/ollama.ts), [`features/ai/resourceExtraction.ts`](../web/src/features/ai/resourceExtraction.ts), `ai_workers`, `ai_jobs`, Claim-/Complete-/Fail-RPCs.

- Worker meldet sich mit eigenem Auth-Account und Anon-Key an, kein Service-Role-Key. Zweckgebundene Worker-Allowlist, keine Plattform-Adminrolle.
- Jobs gehören zwingend zu `subject_user_id → auth.users`; vier erlaubte Jobtypen: `ping`, `connect_resource_extraction`, `capability_area_proposal`, `direction_statement_proposal`. Kein Radar-Typ.
- Claim: `FOR UPDATE SKIP LOCKED`, Attempts < 5, übernommener Running-Job nach zehn Minuten erneut claimbar. `fail_ai_job()` setzt pending/failed anhand der Versuchszahl. Kein verzögertes Backoff-/`next_attempt_at`-Feld, keine Lease-Token-Bindung von Complete/Fail an den konkreten Versuch.
- Bei Absturz im letzten erlaubten Versuch ergibt sich aus dem Claim-Prädikat keine weitere automatische Übernahme. Das Schema ist daher keine unverändert wiederverwendbare allgemeine Collector-Queue.
- Lokaler Grant-Befund: `ai_jobs` besitzt breite anon/authenticated-Tabellengrants einschließlich TRUNCATE; RLS-Policy ist ausschließlich `SELECT subject_user_id = auth.uid()`. Das ist nicht gleichbedeutend mit normalem API-Vollzugriff, aber auch kein Vorbild für explizit entzogene Radar-Tabellenrechte. RLS ersetzt insbesondere keine Prüfung von Tabellenprivilegien. Kein Fix außerhalb dieses Audit-Scopes vorgenommen.
- Modellhelper: Schemaformat, getrennte Instruktion/Input, keine Tools, nicht-streamend, fehlgeschlagener Call ergibt `null`. Ressourcenextraktion validiert Vorschläge und kurze Originalbelege gegen den gegebenen Text.

**Übernehmen als Muster:** feste Fehlercodes statt Inhaltlogs, Claim/Lease-Idee, Schema-/Outputvalidierung, Modell-/Prompt-Versionen, menschliche Bestätigung.

**Nicht übernehmen:** nutzerbezogene Jobtabelle, Profil-/Ressourcenprompts und deren Belegpflicht, AI-Worker-Allowlist als Radarrolle, wörtliche Zitate als allgemeine Speicherstrategie. Kein Modell gestartet, kein Modell-Ping oder AI-Call ausgeführt. Lokaler Ollama-Code belegt keine Production-Verfügbarkeit.

## 6. Wiederverwendung und echte Lücken

| Bereich | Entscheidung |
| --- | --- |
| Menschliche Adminberechtigung | Vorhandene Rolle/Guard/RPC-Muster nutzen; kein allgemeines Berechtigungssystem neu bauen |
| Review-UI | Komponenten-/Pagination-Muster nutzen, eigene Radar-Liste und fachliche Status |
| Source-, Signal-, Hypothesen-/Evidence-Modell | Neu, intern, unabhängig von Personen-/Assessment-/Recommendation-Daten |
| Abruf | Später eigener begrenzter Source-Adapter und SSRF-Schutz; keine Erweiterung bestehender beliebiger URL-Links zu Fetch |
| Idempotenz/Run-Zustände | Später Radar-spezifischer Run-/Source-Run-Vertrag; Suggestions-Stempel und AI-Jobs passen fachlich nicht |
| Workspace-Handoff | Enger atomarer Übergang mit expliziter Auswahl, normaler Session-Owner und aktiver CONNECT-Mitgliedschaft; keine Admin-Override-Mitgliedschaft |
| Publish | Bestehender 7.7-Flow unverändert, keine Radar-Abkürzung |
| AI/Clustering | Optional später; zunächst manuelles Review und exakte Deduplizierung |
| Löschung/Retention | Für externe Quellen/Derivate noch nicht vorhanden; vor erstem Speichern definieren |

## Verifikation dieser Phase

Repo-/Dokumentensuche, gezielte Code-Reads, read-only DB-Metadaten/Definitionen/Grants und Dokumenten-Link-/Diff-Prüfung. Keine Migration, Tabelle, Testfixture, neue Route oder aktive Automatisierung. Keine externe Recherche zu Quellen, Tarifen oder Recht; solche offenen Freigaben sind im Plan als spätere Release-Gates benannt. Ein App-Build oder schreibende pgTAP-Testläufe sind für diese Dokumentenänderung nicht erforderlich und werden nicht als durchgeführt behauptet.
