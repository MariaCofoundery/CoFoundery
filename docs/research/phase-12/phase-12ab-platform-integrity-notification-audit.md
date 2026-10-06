# Phase 12A/12B – Platform Integrity, Journey & Notification Audit

Stand: `main` @ `48de04ba` (nach Phase 11.7 und Header-Fix), 05./06.10.2026.

**Reines Audit.** Kein Code, keine Migration, keine RLS-/RPC-Änderung, nichts gelöscht, kein Commit. Einzige Änderung im Repo: dieses Dokument.

**Methode**
- Code: vollständige Route-Inventur (161 `page.tsx`, 21 `route.ts`), Link-/CTA-Inventur (~195 Ziele), Interaktions- und Journey-Analyse (Server Actions, RPCs, Migrationen, pgTAP), Notification-Infrastruktur, Orphan-/Legacy-Scan.
- Browser: lokaler Dev-Server, nur lokale Testkonten (danach gelöscht), Chrome headless über CDP.
  - Breitensuche über alle internen Links: Founder (110 Seiten), Advisor (70), neue Person mit offener Einladung (40), abgemeldet (24).
  - Gezielt: 1280 und 390 px für die Kernseiten beider Rollen, „Team verlassen“, abgemeldete Deep Links.
- **Kennzeichnung:** **[B]** = im Browser beobachtet, **[C]** = aus Code abgeleitet, nicht im Browser nachgestellt.

---

## 1. Executive Summary

**Die Plattform ist in sich weitgehend navigierbar, aber kaum kommunikativ.**

- **Routen:** 182 geprüft (161 Seiten, 21 Handler).
  - 110 aktuell, 16 Legacy, 17 reine Weiterleitungen, 16 intern/dev, 2 vermutlich tot.
  - Kein eigenes `not-found.tsx`, `error.tsx` oder `forbidden.tsx`. Jede der 61 Seiten mit `notFound()` endet in der englischen Next-Standardseite „404 – This page could not be found“, ohne Erklärung und ohne Rückweg [B].
- **CTAs:** ~195 Linkziele, davon 32 problematisch.
  - 1 toter Link, 12 falsches Ziel, 7 Legacy, 6 fehlender Redirect-Kontext, 3 Sackgassen, 3 redundant.
  - Dazu 5 leere Zustände ohne nächste Aktion.
- **Benachrichtigungen:** Die Infrastruktur ist besser als erwartet, deckt aber nur FIND, CONNECT, Nachrichten und die Paar-Labs ab.
  - Vorhanden: In-App-Hinweise („Du bist dran“) mit 8 Arten, E-Mail über Resend (17 Sendepfade), Web Push mit VAPID (Service Worker, Abos, Opt-outs), ein täglicher Cron.
  - **Team, Founder Setup, Vorhaben, Workstyle-Bereitschaft, Advisor-Zustimmungen und Einladungsannahme benachrichtigen niemanden.**
- **Wichtigste P0-Funde:**
  1. **[B]** `GET /invite/[id]/resume` (Link „Fortsetzen“ auf Dashboard und Verbindungen) nimmt eine Einladung serverseitig mit dem Service-Role-Key an. Damit wird der Beitrittsdialog aus 11.7B umgangen, und die Person ist ohne ausdrückliche Entscheidung Teammitglied. Im Audit ist das einer Testperson beim bloßen Durchklicken passiert.
  2. **[B]** Der tote Rücklink `/advisor` auf dem Teambericht für Advisors.
  3. **[B]** Nach Teamaustritt, Rosteränderung oder Widerruf landen alle Deep Links ohne Erklärung in der englischen 404.
  4. **[B]** Der Advisor verliert den Teambericht still, sobald sich der Roster ändert. Keine Seite wird informiert.
  5. **[C]** Notwendige Zustimmungen ohne sichtbaren Hinweis: Advisor-Personenzugang, Teamreview, Setup-Zugang, Founder-Setup-Bestätigung. Kein Zähler, keine Benachrichtigung.
  6. **[C]** Ein neuer Founder-Setup-Vorschlag verwirft still die Bestätigungen der anderen.
  7. **[C]** Ein Teamreview bleibt aktiv, wenn eine Person ihren Personenzugang widerruft.
- **Empfehlung:**
  - 12C behebt zuerst die P0-Integritätsfehler.
  - Danach eine Notification Foundation: Eventmodell auf bestehenden `in_app_notices` aufbauen, Action Required als abgeleiteter Zustand statt als Nachricht.
  - Danach Center, E-Mail und Preferences, später Digest und Push-Ausbau, zuletzt Legacy-Cleanup.

---

## 2. Route Inventory

### 2.1 Globale Ebenen

- **Weiterleitungen:** `next.config.mjs` kennt nur zwei, `/network` und `/network/:path*` nach `/connect…` (temporär, nicht permanent).
- **Middleware:** Sie frischt nur die Sitzung auf und schützt nichts. Jede Seite prüft die Anmeldung selbst.
- **Chrome:** `productChromePath.ts` entscheidet, wo die Produktleiste erscheint. Auffälligkeiten:
  - `/connect/pr/*` (öffentliche, anonyme Problemseite) bekommt die Produktleiste.
  - `/research/workstyle-pretest` (der aktuelle Fragebogen) bekommt keine.
  - `/admin/problem-radar/*` und `/admin/research/*` haben keine Leiste, `/admin/moderation` hat eine.

### 2.2 Zählung

| Status | Anzahl |
|---|---|
| CURRENT (davon 10 Admin, 18 öffentlich/Auth/Marketing) | 110 |
| LEGACY (historische Leser, Advisor-Brücke) | 16 |
| REDIRECT-ONLY | 17 |
| INTERNAL-DEV (`/debug/*` ×15, `/dev-login`) | 16 |
| DEAD? | 2 |
| Route Handler | 21 |
| **Gesamt** | **182** |

### 2.3 Aktuelle Produktrouten

Kürzel:
- F = Founder, A = Advisor, C = Connect-Mitglied
- Nav = in der Hauptnavigation; Sub = Unter-, Team- oder Tab-Navigation
- Auth: L = Login, M = Mitgliedschaft, G = Grant; „404“ bedeutet `notFound()` bei fehlendem Zugriff

**Founder: Start und Profil**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/dashboard` | F | Start, Aufgaben, Teams | Nav | Nav | L + Rolle (sonst Weiterleitung) | `getFounderDashboardTasks`, `report_runs` |
| `/me/profile` | F | „Das bist du“ | Nav | Nav | L | `getProfileReadModel` |
| `/me/profile/workstyle` | F | „Wie du arbeitest“ | Nav, Aufgaben | Nav | L; fremder Snapshot → 404 | `getProductWorkstyle`, `team_shares` |
| `/me/profile/print` | F | Druck/PDF | Profil | – | L | read model |
| `/research/workstyle-pretest` | F | Fragebogen v0.4 | Aufgaben, Profil | – | L | `start_workstyle_product`, `save_workstyle_pretest_v3` |
| `/profile` (+ `/direction`, `/interview`, `/interview/sort`) | F/C | „Angaben bearbeiten“ | Kopfzeile | Nav | L | `person_core`, Capability |
| `/profile/compare/[userId]` | F | Capability-Vergleich | `/profile` | – | L; fremd → 404 | capability comparison |

**Founder: Teams**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/connections` | F | Teams & Verbindungen | Nav, Teamkopf | Nav | L | `getFounderConnections` |
| `/invite/new` | F | Co-Founder einladen | Dashboard, Team | – | L | `create_founder_team_invitation` |
| `/teams/[teamId]` | F | Teamübersicht | Verbindungen | Sub | L+M (404) | homebase data |
| `/teams/[id]/workstyle` | F/A | Euer Zusammenspiel | Teamreiter, Review | Sub | L+M oder Grant (404) | `get_workstyle_product_team`, readiness |
| `/teams/[id]/roles` | F | Fähigkeiten & Verantwortung | Teamreiter | Sub | L+M | `get_team_capability` |
| `/teams/[id]/setup` (+ `[itemKey]`, `document`) | F | Founder Setup | Teamreiter, Bericht | Sub | L+M | `getFounderSetup*` |
| `/teams/[id]/founder-library` | F | Team-Glossar | Teamreiter | Sub | L+M | homebase |
| `/teams/[id]/commitment-lab/[rel]` | F | Commitment Lab (Paar) | Teamübersicht | – | L+Paar (404) | `getCommitmentLab` |
| `/teams/[id]/collaboration-lab/read-my-mind/**` (4) | F | Read My Mind | Teamkarte, Hinweis | – | L+Team | RMM |
| `/teams/[id]/collaboration-lab/founder-in-the-wild/**` (4) | F | Founder in the Wild | Teamkarte, Hinweis | – | L+Team | FitW |
| `/founder-library`, `/founder-library/[slug]` | F/beide | Glossar | Nav, Glossarlinks | Nav | L | statisch |
| `/founder-alignment/vorhaben` (+ `/antworten`, `/bestaetigen`) | F | Vorhaben (Venture) | Team, Profil | – | L | `alignment_answers`, `assessments` |

**FIND**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/discovery` | F | FIND: Vorschläge, Suche | Nav | Nav | L+founder (sonst → `/advisor/dashboard`) | discovery |
| `/discovery/suche`, `/profile`, `/searches` | F | Suche, FIND-Profil, gemerkte Suchen | Nav | Nav | L+founder | – |
| `/discovery/saved` | F | Gemerkte Profile | Tab | Sub | L+founder | – |
| `/discovery/[profileId]` | F | Profil, Intro anfragen | Karten | – | L+founder | – |
| `/discovery/intros` | F | Kennenlernen | Badge, Hinweis | – | L+founder | intro requests |
| `/discovery/intros/[id]/matching` | F | gemeinsamer Start | Intros | – | L+founder | `open_discovery_workstyle_team` |

**Nachrichten und CONNECT**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/messages`, `/messages/[id]` | F/A/C | Postfach, Gespräch | Nav, E-Mail, Push | Nav | L; Gespräch fremd → 404 | `network_*`, `in_app_notices` |
| `/connect` (+ people, listings, problems, ventures, my, profile, searches, suggestions, contacts, workspaces; ~25 Seiten) | C | Netzwerk | Nav, Tabs | Nav/Sub | `requireConnectMember` | connect RPCs |
| `/connect/l|p|pr/[slug]` | öffentlich | öffentliche Inserate/Profile/Probleme | Teilen-Links, Sitemap | – | keine | public RPCs |

**Account**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/account` | alle | Konto, Freigaben, Benachrichtigungen, Löschen | Nav | Nav | L | person access, opt-outs |

**Advisor**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/advisor/dashboard` | A | Start | Nav | Nav | L+Rolle | role views, invites |
| `/advisor/group` | A | Personen & Gruppen | Nav | Nav | L (+RPC) | org/review data |
| `/advisor/person/[userId]` | A | Person mit Grant | Gruppe | – | L+Grant (404) | `getProductWorkstyle` |
| `/advisor/review/[reviewId]` | A | Teamreview | Gruppe | – | L+Review (404) | review detail |
| `/team-intake`, `/team-intake/[roundId]`, `/advisor/intake/new` | A (auch F) | Intake | Nav (Advisor), Dashboard | Nav | nur L, Rest per RPC | intake RPCs |

**Einladungen, Auth, öffentlich, Admin**

| Route | Wer | Zweck | Einstieg | Nav | Auth | Datenquelle |
|---|---|---|---|---|---|---|
| `/join`, `/join/welcome`, `/join/{prepare,continue,start}` | öffentlich/F | Einladung einlösen | E-Mail | – | Token/L | `accept_invitation_with_team_share` |
| `/team-invite/[token]`, `/invite/person-access/[token]`, `/invite/advisor-org/[token]`, `/team-intake/invite/[token]`, `/connect/workspaces/invite/[token]` | Token | Einladungen einlösen | nur E-Mail/kopierter Link | – | L + Token | claim RPCs |
| `/start`, `/login`, `/welcome`, `/auth/*` | öffentlich | Magic Link, Onboarding | Landing, Weiterleitungen | – | – | Supabase Auth |
| `/`, `/informierte-entscheidungen`, `/datenschutz`, `/impressum` | öffentlich | Marketing, Recht | Sitemap | – | – | statisch |
| `/event/[slug]/**` (5) | öffentlich | Event/QR | nur QR | – | Event-Cookie | event data |
| `/admin/**` (10) | intern | Moderation, Radar, Research-Export | nur über `/account` | – | `requirePlatformAdmin` (404) | admin RPCs |

### 2.4 Legacy, Weiterleitung, Dev

| Route | Status | Erreichbar über |
|---|---|---|
| `/founder-alignment/workbook`, `/print` | LEGACY nur lesen (seit 9.3) | Teamübersicht, eingeklappte „Frühere Auswertungen“ |
| `/workspaces/[id]`, `/matching/[id]/report` | LEGACY nur lesen | Teamübersicht, eingeklappt |
| `/report/[sessionId]`, `/me/report` | LEGACY v1 | Dashboard: eingeklappter Block **und** „Öffnen“ bei gesendeten Einladungen |
| `/founder-alignment/versionen`, `/profil/antworten`, `/pilot/report`, `/pilot/compare/[id]` | LEGACY nur lesen | Versionsarchiv auf dem Dashboard |
| `/advisor/report`, `/advisor/session` (+ `/document`), `/advisor/snapshot`, `/advisor/invite/[token]` | LEGACY-Brücke (Einladungspaare, v1-Engine), **nicht nur lesend** | Advisor-Dashboard, Nav-Override „Teams“ |
| `/me/base`, `/me/values` (+ `/complete`), `/invite/[id]` (+ `/basis-complete`), `/session/[id]/{a,b,values}`, `/report/[id]/individual`, `/founder-alignment/{pilot,pilot/discovery,suche,profil,workbook/intro,prepare-conversation}`, `/connect/messages/[id]` | REDIRECT-ONLY | gespeicherte Links, alte Mails |
| `/invite/[id]/done` | LEGACY / DEAD? | nur toter API-Handler |
| `/beispiel-auswertung` | **DEAD?**, verletzt die Produktregel („hohe Kompatibilität“) | nirgends verlinkt |
| `/founder-alignment/vergleich/[partnerId]` | **DEAD?** | nirgends verlinkt |
| `/debug/*` ×15, `/dev-login` | INTERNAL-DEV, in Produktion 404 | untereinander |

### 2.5 Route Handler (21)

- **Auth und Einladungen:** `/auth/callback`, `/auth/confirm`, `/auth/landing`, `/join/{prepare,continue,start}`, `/locale/continue`, `/advisor/invite/{prepare,continue}`.
- **`/invite/[id]/resume`:** Er schreibt mit dem Service-Role-Key. Siehe P0-1.
- **API:**
  - `/api/account/export`
  - Foto-Handler: `/api/connect/photos/[userId]`, `/api/connect/venture-logos/[id]`, `/api/profile/photo/[...path]`
  - `/api/research/track`
  - `/api/cron/connect-suggestions` (Bearer `CRON_SECRET`)
  - `/api/maintenance/report-runs/backfill` (manuell)
  - `/admin/research/workstyle-pretest/export`
- **Ohne Aufrufer (DEAD?):** `/api/invitations/[id]/ensure-report-run`, `/join-decision`, `/use-existing-profile`.

### 2.6 Markierungen

- **Existiert, aber nirgends verlinkt:**
  - `/beispiel-auswertung`, `/founder-alignment/vergleich/[id]`, `/founder-alignment/prepare-conversation`, `/founder-alignment/pilot/discovery`, `/report/[id]/individual`, `/invite/[id]/done`, `*/complete`, `/session/*`.
  - Die drei `/api/invitations/*`-Handler.
- **Nur per E-Mail oder kopiertem Link:** alle Token-Seiten (Abschnitt 2.3) und `/advisor/invite/[token]` (deren Link-Builder wird nicht mehr aufgerufen).
- **Doppelte Zwecke:**
  - Vier Profilflächen: `/me/profile`, `/profile`, `/discovery/profile`, `/connect/profile`.
  - Gemerkte Suchen zweimal: `/discovery/searches` und `/connect/searches`.
  - Glossar zweimal: `/founder-library` und `/teams/[id]/founder-library`.
  - Drei Paar-Vergleiche, einer davon tot.
  - Drei Advisor-Sichten auf dieselbe Einladung.
- **Inkonsistente Rückwege:** siehe 3.3.
- **Ohne nächsten Schritt:**
  - `/advisor/report` im Zustand `missing_report`.
  - `/team-intake/invite/[token]` und `/connect/workspaces/invite/[token]`: nur der Annehmen-Knopf.
  - Kette für Nicht-Founder: `/discovery*` → `/advisor/dashboard` → `/dashboard` → `/connect` oder `/start`, drei Sprünge ohne Erklärung.

---

## 3. CTA / Link Audit

### 3.1 Zählung

- ~195 unterschiedliche Linkziele: ~170 Routenmuster, ~20 Anker, 5 externe Hosts.
- Alle `#anker` existieren.
- 32 problematisch: 31 aus dem Code-Audit plus der GET-Annahmeweg aus dem Browser.

| Klasse | Anzahl |
|---|---|
| WRONG_DESTINATION | 12 |
| LEGACY | 7 |
| NEEDS_REDIRECT | 6 |
| DEAD_END | 4 (inkl. `/invite/[id]/resume`, siehe unten) |
| REDUNDANT | 3 |
| MISSING_CTA | 2 + 5 leere Zustände |

### 3.2 Problematische CTAs

**Tote Links und falsche Ziele**

| Quelle | Beschriftung | Ziel | Klasse | Begründung |
|---|---|---|---|---|
| `teams/[teamId]/workstyle/page.tsx:130` | „← Zum Advisor-Bereich“ | `/advisor` | DEAD_END **[B]** | Die Seite existiert nicht; im Browser 404. Ziel wäre `/advisor/dashboard`. |
| `dashboard/page.tsx:962`, `founderDashboardTasks.ts:240`, `founderConnectionsModel.ts:164` | „Fortsetzen“ / „Öffnen“ | `/invite/[id]/resume` | DEAD_END/Integrität **[B]** | Ein GET nimmt die Einladung per Service Role an (`resume/route.ts:68-97`) und umgeht Beitrittsdialog und Teilen-Entscheidung. Siehe P0-1. |
| `advisor/review/[reviewId]/page.tsx:67,84` | „{Team} · Euer Zusammenspiel“ | `/teams/{id}/workstyle` | WRONG_DESTINATION | Liest alle für den Advisor lesbaren Teams, nicht die des Reviews; Text hart auf Deutsch und in „Euer“-Form. |
| `TeamWorkstyleReport.tsx:225` | „Zum Fragebogen“ | `/founder-alignment/vorhaben?venture=` | WRONG_DESTINATION **[B]** | Wird auch Advisors gezeigt. Das Ziel zeigt „Für welches Vorhaben? Du bist in mehreren.“ |
| `connections/page.tsx:99` | „Verbindung öffnen“ | `/teams/{id}/workstyle` | WRONG_DESTINATION | Das Dashboard öffnet dasselbe Team auf `/teams/{id}`. Uneinheitlich. |
| `founderConnectionsModel.ts:162-165` | „Öffnen“ bei ausgehender Einladung | `/dashboard?invitationId=` | WRONG_DESTINATION | Ziel nur in eingeklapptem `<details>`; eine ausgehende Einladung sieht aus wie eine eingehende. |
| `discovery/intros/[id]/matching/page.tsx:475` | „Zu eurer Verbindung“ | `/connections` | WRONG_DESTINATION | Das Team ist bekannt, verlinkt wird aber die allgemeine Liste. |
| `AlignNav.tsx:79` | „← Übersicht“ (nicht übersetzt) | `/dashboard` | WRONG_DESTINATION | Vorhaben wird vom Team aus geöffnet, der Rückweg führt aber aufs Dashboard. |
| `me/profile/page.tsx:930` | Vorhaben-Chip | `/founder-alignment/vorhaben` | WRONG_DESTINATION | `?venture=` fehlt; mit mehreren Vorhaben landet man in der Auswahl. |
| 8 Discovery-Seiten (`discovery/page.tsx:151` u. a.) | Weiterleitung ohne Founder-Rolle | `/advisor/dashboard` | WRONG_DESTINATION | Drei Sprünge für Connect-only-Konten. |
| `team-invite/[token]:75`, `advisor/invite/[token]:63` | „Zur Anmeldung“ | `/login` | WRONG_DESTINATION | Wird auch angemeldeten Personen gezeigt. |
| `dashboard/page.tsx:453` → `/team-intake` | „Zum Team-Intake“ | `/advisor/intake/new` | WRONG_DESTINATION **[B]** | Founder bekommen den Advisor-Knopf „Team zum Intake einladen“; Kontextwechsel. |
| `join/start/route.ts:84-95` → Dashboard | Fehlerhinweis | `?error=<reason>` | DEAD_END | Widerrufene oder abgelaufene Einladung → „Bitte versuche es erneut.“ Der Grund wird nicht angezeigt. |
| `inAppNoticeActions.ts:51` | Hinweis „Hingehen“ | gespeicherter Pfad | DEAD_END | Nach Teamaustritt oder Rücknahme bleiben Hinweise stehen und enden in 404. |

**Legacy-Ziele**

| Quelle | Beschriftung | Ziel | Klasse | Begründung |
|---|---|---|---|---|
| `teams/[teamId]/page.tsx:442` | „Euer gemeinsamer Report“ | `/matching/{id}/report` | LEGACY | Die Beschriftung klingt nach dem aktuellen Teambericht. |
| `teams/[teamId]/page.tsx:447-506` | Frühere Workbook-/Matching-/Report-Links | Legacy-Leser | LEGACY | Eingeklappt und beschriftet, akzeptabel. |
| `dashboard/page.tsx:919` | „Öffnen“ (gesendete Einladung) | `/report/{id}` | LEGACY | Aus der aktuellen Einladungsliste direkt in den v1-Report. |
| `dashboard/page.tsx:576,580,1000` | „Frühere Auswertung …“ | `/me/report`, `/versionen`, `/report` | LEGACY | Eingeklappt, akzeptabel. |
| Advisor-Dashboard `:389-709`, Nav „Teams“ | „Sitzungsblatt“, „Report ansehen“, „Snapshot“ | `/advisor/{session,report,snapshot}` | LEGACY | Der Hauptweg des Advisors zu Teams läuft über die v1-Matching-Engine. |
| `research/workstyle-pretest:48-55` | „Frühere Teilnahme öffnen“ | `?version=8.5a-v1/v2` | LEGACY | Nur bei früherer Teilnahme. |
| `invite/[id]/done` | Abschluss-CTAs | `/report`, `/me/values` | LEGACY | Nicht erreichbar. |

**Verlorener Kontext (NEEDS_REDIRECT)**

| Quelle | Beschriftung | Ziel | Klasse | Begründung |
|---|---|---|---|---|
| `connectNotifications.ts:80`, `connectProblemActions.ts:267` | Benachrichtigung, Redirect | `/connect/messages/{id}` | NEEDS_REDIRECT | Alter Alias; funktioniert nur über eine zusätzliche Weiterleitung. |
| `vorhaben/*/page.tsx:28-29` | Login-Weiterleitung | `next=/founder-alignment/vorhaben` | NEEDS_REDIRECT **[B]** | `?venture=` geht beim Login verloren. |
| `teams/[id]/workstyle/page.tsx:34` | Login-Weiterleitung | `next=/teams/{id}/workstyle` | NEEDS_REDIRECT **[B]** | `?snapshot=` und `?ansicht=` gehen verloren. |
| `advisor/snapshot:74`, `advisor/dashboard:611`, `workstyle/actions.ts:8`, `/dashboard` | Login | `/login` ohne `next` | NEEDS_REDIRECT **[B]** | Der Deep Link geht verloren (`/dashboard` → `/login`). |
| `me/profile/print:128` | Login | `next=/me/profile` | NEEDS_REDIRECT | Sollte zurück auf `/print` führen. |

**Fehlende CTAs und redundante Ziele**

| Quelle | Beschriftung | Ziel | Klasse | Begründung |
|---|---|---|---|---|
| `TeamWorkstyleReport.tsx:96-99` | Vorhaben-Gesprächskarten | `href: null` | MISSING_CTA | Kein „Im Founder Setup festhalten“, anders als bei Arbeitsweise und Verantwortung. |
| Advisor-Dashboard (ganz) | – | aktueller Teambericht, Setup-Grants | MISSING_CTA | Kein Weg zum aktuellen Teambericht außer über das Review. |
| `founderDashboardTasks.ts:511-516` | „Werteprofil fortsetzen“ | `/me/values` | REDUNDANT | Toter Code (gefiltert); das Ziel passt nicht zur Beschriftung. |
| `founderDashboardConnections.ts:217,250` | Verbindungskarten | `/connections` | REDUNDANT | Führt zur allgemeinen Liste statt zum konkreten Eintrag. |
| `dashboard/page.tsx:259-343` | Nav-Override `matchingHref` | `/report/{id}` | REDUNDANT | In der Founder-Ansicht wirkungslos. |

### 3.3 Rückwege

- **Konsistent:**
  - Alle sieben Teamseiten: „← Verbindungen“.
  - Discovery: „Zurück zu Menschen finden“ und „Zurück zum Kennenlernen“.
  - Profil-Schritte.
  - Setup-Dokument → Setup.
- **Inkonsistent:**
  - `/advisor` (tot).
  - Vorhaben „← Übersicht“ führt aufs Dashboard.
  - `/founder-library` und `/invite/new?team=` führen aufs Dashboard statt zu Team bzw. Verbindungen.
  - `/advisor/group` und `/advisor/person/*` führen auf `#advisor-org` statt zu „Personen & Gruppen“.
  - `/connect/profile` und `/connect/searches` führen auf `/connect` statt zu „Mein“; `/connect/ventures/mine` führt auf `/connect/profile`.
  - `/discovery/searches` führt auf `?mode=search` statt auf `/discovery/suche`.
  - Founder in the Wild führt auf den Anker `#collaboration-lab`, der auf der Read-My-Mind-Karte liegt.
  - `/advisor/intake/new` führt auf `/team-intake` (Founder-Kontext).

### 3.4 Leere Zustände ohne nächste Aktion

1. `/messages` „Noch keine Gespräche.“: kein Weg zu FIND oder CONNECT.
2. `/connections`, beide leeren Abschnitte: kein „Co-Founder einladen“.
3. `/discovery` inaktiv („Veröffentliche dein Profil …“): kein Link auf `/discovery/profile`.
4. `/discovery/intros`, empfangen und gesendet leer: kein Link.
5. `/advisor/group` „Du begleitest noch niemanden.“: kein Link zur Personen-Einladung.

### 3.5 Feste Hosts

- **Fallback:** `DEFAULT_PUBLIC_APP_ORIGIN = https://cofoundery.de`. Gilt für alle E-Mail- und Push-Links, wenn `NEXT_PUBLIC_SITE_URL` fehlt. Previews ohne die Variable verschicken dann Produktionslinks.
- **Fest verdrahtet:**
  - Logo-URL und Datenschutz-Link in Mails.
  - `hello@cofoundery.de`.
  - Ein PayPal-Link (39 €) auf `/invite/new`.
- **Lokal:** Die Supabase-Redirect-Liste deckt `/auth/callback?next=` nicht ab (das ist der lokale Artefakt aus 11.7B). Die Produktionsliste steht nicht im Repo.

---

## 4. Founder Journeys

| Journey | Funktioniert? | Sackgassen / Brüche | Fehlende Information der Gegenseite | Fehlende nächste Aktion |
|---|---|---|---|---|
| **A** Neu: Signup → Profil → Workstyle → Einzelbericht | ja **[B]** | Ein später abgegebener Research-Pretest, der nicht v3 ist, könnte `workstyle_current_core_assessment` auf null setzen und die Person still aus allen Teamberichten nehmen **[C]** | Team erfährt nicht „X ist fertig“ | – |
| **B** FIND: aktivieren → finden → Intro → Zustimmung → Team | ja | „Gemeinsam prüfen“, Bestätigung und Team-Öffnen ohne Benachrichtigung. Nach beiden Bestätigungen existiert das Team erst, wenn jemand „öffnen“ klickt. Ein zurückgezogener Intro hinterlässt Hinweis und Zähler. Das Gespräch verlinkt nicht zurück auf den Matching-Schritt. | Bestätigung angefragt, bestätigt, Team erstellt: alles ohne Hinweis | Gespräch → Matching-Schritt |
| **C** Einladung: A lädt B → B tritt bei → Teamfreigabe → Bericht | ja über `/join?token`; **über „Fortsetzen“ Beitritt ohne Dialog [B]** | Statuslabel beim Einladenden basiert auf Legacy-Base/Values-Flags. Kein Ablaufstatus, kein Widerrufen-Knopf. „Link erneut zeigen“ verlängert den Ablauf still. | A erfährt nicht, dass B beigetreten ist, geteilt hat oder fertig ist; niemand erfährt „Bericht verfügbar“ | Auf der Teamseite keine offenen Einladungen; kein „Erinnern“ |
| **D** 3er/4er: neue Person | ja | Neue Person → Bericht meist für alle „nicht bereit“. Snapshots werden nicht mehr ausgeliefert. Alle Setup-Vereinbarungen brauchen erneute Bestätigung, aber Bestätigen geht erst nach neuem Vorschlag. Vorhaben-Antworten werden für die Neue sichtbar (gewollt). | Bericht verschwindet, Setup braucht euch: alles ohne Hinweis | Auf der Setup-Detailseite kein Roster-Hinweis |
| **E** Vorhaben: beantworten → abgeben → Team sieht | teilweise | Antworten erscheinen nur im Teambericht, und der braucht Workstyle und Freigabe aller. Kein Status je Mitglied, kein „alle fertig“. | „X hat abgegeben“ fehlt | Für Team ohne Bericht ist nichts sichtbar |
| **F** Founder Setup: vorschlagen → bestätigen → vollständig → Revision | ja | Ein neuer Vorschlag verwirft bestehende Bestätigungen still. Sackgasse **[C]**: Verlässt jemand bei offenem Vorschlag das Team und haben alle Übrigen schon bestätigt, wird nie finalisiert, und alle sehen nur „zurückziehen“. `TeamJourneyStatus` zeigt „bestätigt“, wenn irgendein Punkt bestätigt ist. | Bestätigung nötig, bestätigt, vollständig, Revision: alles ohne Hinweis | Der Zähler auf der Teamseite ist der einzige Hinweis |
| **H** Team verlassen | ja **[B]**: Rückmeldung „Team verlassen“ auf `/connections` | Danach führen alle Teamlinks in die englische 404 **[B]**. Vorhaben-Link nach Austritt: „Für welches Vorhaben? Du bist in mehreren.“ **[B]**. Wenn die letzte Person geht und keine Einladung auf das Team zeigt, wird das Team mit Setup und Verlauf gelöscht, entgegen dem Kommentar „Das Team bleibt bestehen“ **[C]**. Bericht kann für die Übrigen „bereit“ werden. | Übrige Mitglieder und Advisors erfahren nichts | Stehende Hinweise bleiben |
| **I** CONNECT: Profil → entdecken → Kontakt | ja | Annahme ohne Hinweis an den Absender (anders als bei FIND). Zurückziehen hinterlässt stehende Hinweise. | Kontakt angenommen | – |
| **J** Nachrichten: erhalten → öffnen → Plattformaktion | ja | Rücksprung zur Quelle nur bei Connect-Kontakten; bei Problem nur Text, bei FIND-Intro nur ein Label | – | Gespräch → Intro, Matching, Team |

---

## 5. Advisor Journeys

| Journey | Funktioniert? | Brüche | Gegenseite | Nächste Aktion |
|---|---|---|---|---|
| **G1** Personenzugang: Advisor-Einladung → Founder löst ein → genehmigt → Advisor sieht → Widerruf | ja | Die Anfrage landet auf `/account#person-access` ohne Zähler. Widerruf → `/advisor/person/*` gibt englische 404. `request_advisor_person_access` hat keine Oberfläche. | Founder erfährt nichts von der Anfrage; Advisor nichts von Genehmigung, Ablehnung, Widerruf | Founder ohne Hinweis „Zustimmung offen“ |
| **G2** Teamreview: Advisor fragt an → alle stimmen zu → aktiv | ja | Fehlende Zustimmungen sieht nur die jeweilige Person. **Rosteränderung → Advisor bekommt englische 404 auf dem Teambericht [B].** Widerruft eine Person den Personenzugang, bleibt das aktive Review bestehen **[C]**: Datenschutzrisiko. | Keine Hinweise in beide Richtungen | Kein „X wartet auf deine Zustimmung“ |
| **G3** Paar-Advisor (Beziehung) | ja | Vorschlag → zweite Person genehmigt → Einladung an Advisor (E-Mail) | Die zweite Person erfährt nichts von der Genehmigungsanfrage | Panelstatus nur auf der Teamseite |
| **G4** Setup-Zugang | ja | Anfrage als Teamkarte ohne Zähler; einstimmige Zustimmung | Keine Hinweise | – |
| **G5** Intake | ja | Einladung per E-Mail; Annahme und Abgabe ohne Hinweis an den Advisor | Advisor erfährt nicht, dass das Team geantwortet hat | – |
| **Navigation** | **[B]** | Der Hauptweg zu Teams läuft über die Legacy-Brücke. „Zum Advisor-Bereich“ ist tot. Intake-Seiten sind nur per Login geschützt (RPCs schützen die Daten). | – | Vom Advisor-Dashboard kein Weg zum aktuellen Teambericht |

---

## 6. Interaction / Event Inventory

Legende „heute“: N = In-App-Hinweis, E = E-Mail, P = Push, Z = Zähler, – = nichts.

| Domain | Interaktion | Betroffene | Heute | Bewertung |
|---|---|---|---|---|
| Einladung | Co-Founder-Einladung erstellt | eingeladene Person | E | ok |
| Einladung | erstellt (Team mit ≥2) | übrige Mitglieder | – | fehlt (Info) |
| Einladung | angenommen | Einladende, alle Mitglieder | – | **fehlt** |
| Einladung | abgelaufen / läuft bald ab | beide | – (kein Job, kein Statuslabel) | fehlt |
| Einladung | widerrufen | eingeladene Person | – (kein Widerrufen-Knopf) | fehlt + Funktion fehlt |
| FIND | Intro angefragt / angenommen | Gegenseite | N+E+P (+Z) | ok |
| FIND | abgelehnt | Anfragende | – (bewusst) | ok |
| FIND | zurückgezogen | Empfänger | –, Hinweis bleibt stehen | **Bug** |
| FIND | gemeinsamer Check angefragt / bestätigt | Gegenseite | – | **fehlt (Aufgabe)** |
| FIND | Team erstellt | Gegenseite | – | fehlt |
| Team | neues Mitglied | alle | – | fehlt |
| Team | Freigabe an / aus | alle (auch künftige) | – | an: optional; aus: wichtig |
| Team | Austritt | Übrige, Advisors | – | **fehlt** |
| Team | Bericht erstmals bereit | alle, Review-Advisor | – (nur abgeleitet) | **fehlt** |
| Team | Bericht nicht mehr bereit | alle | – | fehlt |
| Team | neues Profil verändert Bericht | alle | – | Digest |
| Workstyle | eigenes Profil fertig | selbst | Seite | ok (kein Kanal nötig) |
| Workstyle | Research | niemand | – | **muss so bleiben** |
| Capability | Angaben, offene Verantwortung | Team | – | kein Kanal; höchstens Digest |
| Vorhaben | abgegeben / alle fertig | Team | – | Info / Digest |
| Setup | Vorschlag / Revision | übrige Mitglieder | – (nur Zähler auf der Teamseite) | **fehlt (Aufgabe)** |
| Setup | bestätigt / vollständig bestätigt | Vorschlagende, alle | – | fehlt |
| Setup | erneute Zustimmung nach Rosterwechsel | alle | Banner | fehlt (Aufgabe) |
| Setup | Diskussionsbeitrag | Mitglieder | – | Digest |
| Labs | RMM- und FitW-Übergabe, Markierung | Partner | N+E (FitW, RMM) / N | ok |
| Labs | beigetreten, abgelehnt, abgeschlossen; Commitment Lab | Partner | – | Info |
| Advisor | Personenzugang angefragt | Founder | – (nur `/account`) | **fehlt (Aufgabe)** |
| Advisor | genehmigt / abgelehnt / widerrufen | Advisor, Founder | – | **fehlt (Zugriffsänderung)** |
| Advisor | Teamreview angefragt / fehlende Zustimmung / aktiv / widerrufen | Subjekte, Advisor | – | **fehlt** |
| Advisor | Setup-Zugang angefragt / bestätigt | Founder, Advisor | – | fehlt |
| Advisor | Intake beantwortet | Advisor | – | fehlt |
| Advisor | Zugriff abgelaufen (`expires_at`) | Advisor, Founder | – | fehlt |
| CONNECT | Kontaktanfrage, Interesse | Empfänger | N+E+P (+Z) | ok |
| CONNECT | angenommen | Absender | – | fehlt |
| CONNECT | zurückgezogen | Empfänger | –, Hinweis bleibt stehen | **Bug** |
| CONNECT | Vorschläge (Cron) | Mitglied | P (+E per Opt-in) +Z | ok |
| Suche | gemerkte Suche trifft (CONNECT/FIND) | Suchende | E | ok |
| Nachrichten | neue Nachricht | Gegenseite | E+P (erste ungelesene) +Z | ok |
| System | Konto gelöscht | Co-Founder, Advisor | eigene Liste auf `/connections`, Advisor-Dashboard | ok, aber getrennt vom Center |

---

## 7. Existing Notification Infrastructure

| Bereich | Status | Evidenz |
|---|---|---|
| Allgemeine `notifications`-Tabelle | **gibt es nicht** | – |
| `in_app_notices` (Empfänger, Akteur, Art, Betreff, Pfad, `read_at`; ohne Text, nur interne Pfade; eindeutig je Empfänger/Art/Betreff) | **existiert** (Backend+UI) | `20261033120000_in_app_notices.sql`, `20261034120000_…marker…`, `features/notifications/*` |
| Arten | 8: `contact_request`, `problem_interest`, `approach_interest`, `discovery_intro_request`, `discovery_intro_accepted`, `read_my_mind_handoff`, `founder_in_the_wild_handoff`, `collaboration_conversation_marker` | `inAppNotice.ts:44-53` |
| Anlegen | nur über `create_in_app_notice` (SECURITY DEFINER; prüft, dass die Quellzeile Akteur → Empfänger verbindet); Rückzug nur für die Markierung | – |
| Erledigen | nur manuell („Hingehen“ / „Erledigt“); **nie automatisch, wenn die Aufgabe erledigt ist** | `inAppNoticeActions.ts` |
| Anzeige | nur oben auf `/messages`, höchstens 20 ungelesene | `WaitingNotices.tsx` |
| `account_deletion_notices` | existiert, eigene Tabelle per Trigger, eigene Listen | `20261013120000` |
| Direkte Nachrichten `network_conversations`/`network_messages` | existiert; Gespräche entstehen nur aus angenommenen Kontakten, Interessen oder Intros | `20260903220000`, `20261030120000`, `20261109130000` |
| Ungelesen-Zähler | existiert; pro Request im Root-Layout berechnet | `layout.tsx:84-112` |
| Versand höchstens einmal | `network_notification_claims` / `claim_network_notification` | `20261001120000:137` |
| E-Mail-Anbieter | Resend per `fetch`, ohne SDK; ohne Schlüssel wird still übersprungen | `web/src/lib/email/*` (12 Sender) |
| E-Mail-Vorlagen | Inline-HTML/Text, Texte in `features/email/emailMessages.ts`; kein React Email | – |
| Auth-Mails | Supabase (Magic Link, Bestätigung, E-Mail-Wechsel); Produktionsvorlagen im Supabase-Dashboard, lokale Kopien in `supabase/templates` | `config.toml:204-246` |
| Passwort-Reset | **gibt es nicht** (nur Magic Link) | – |
| Unsubscribe-Link / `List-Unsubscribe` | **gibt es nicht** | `lib/email/*` |
| Cron | ein Vercel-Cron `/api/cron/connect-suggestions`, täglich 07:00 | `web/vercel.json` |
| `pg_cron` | nur bedingte Hilfsfunktionen (Analytics, Event-Cleanup), nichts zu Benachrichtigungen | – |
| Edge Functions | 4 Session-Funktionen; schreiben in seit Feb. 2026 gelöschte Tabellen, ohne Aufrufer | `supabase/functions/*` |
| Queue | nur KI-Jobs (Laptop-Worker) | `scripts/ai-worker.ts` |
| DB-Trigger für Hinweise | nur die zwei Trigger für Kontolöschungen; alles andere läuft über Server Actions | – |
| Webhooks, Digest, Aktivitätsfeed, Outbox | **gibt es nicht** | – |
| Präferenzen | `notification_opt_outs` (fehlt = ja, 10 Arten; steuert E-Mail **und** Push, nicht In-App) und `notification_opt_ins` (nur `connect_suggestions_email`); Schalter in `/account`; Einladungen „immer“ | `notificationKinds.ts`, `AccountPreferencesSection.tsx` |
| Altes Präferenzfeld | `network_memberships.email_notifications` plus 2 RPCs, wird nicht mehr gelesen | `20261001120000:127` |
| PWA-Manifest | existiert (`standalone`, `start_url /start`) | `app/manifest.ts` |
| Service Worker | existiert, nur `push` und `notificationclick` (nur interne Pfade, Fallback `/start`), kein Cache; wird erst beim Einschalten registriert | `public/sw.js` |
| Install-Prompt | **gibt es nicht** (nur iOS-Hinweis „zum Home-Bildschirm“) | `pushSupport.ts` |
| Web Push | existiert: `push_subscriptions`, Erlaubnis nur auf Klick, Testpush, VAPID-Krypto selbst gebaut, Aufräumen bei 404/410 | `lib/push/*`, `features/notifications/push*` |
| App-Badge (`setAppBadge`), Zähler im Titel | **gibt es nicht** | – |
| Lokal | keine Resend-, VAPID- oder `CRON_SECRET`-Schlüssel; Produktionsstand aus dem Repo nicht sichtbar (Push laut früherer Notiz nur in Production konfiguriert) | `.env.local` (nur Namen geprüft) |

**Wichtig für später:** Die vorhandene Grundlage ist ein guter Kern. Vorhanden sind:
- Empfänger-Locale.
- Text erst bei der Anzeige.
- Interne Pfade.
- Eindeutigkeit je Empfänger, Art und Betreff.
- Ein gemeinsamer Claim für E-Mail und Push.

Es fehlen:
- automatisches Erledigen
- Zurückziehen bei Rücknahme
- ein Eventmodell jenseits von Netzwerkaktionen
- ein Ort außerhalb von `/messages`

---

## 8. Messages vs Notifications

**Was „Nachrichten“ heute ist:**
- **A, direkte Kommunikation:** ja. Gespräche aus Kontakt, Interesse oder Intro; Antworten, Blockieren, Melden.
- **B, Systemhinweise:** teilweise. 8 Arten im Block „Du bist dran“. Kontolöschungen stehen woanders.
- **C, Aufgaben:** teilweise, als Hinweis. Die echten Aufgabenlisten liegen auf `/connect/contacts`, `/discovery/intros`, `/account` und der Teamseite.
- **D, Statusupdates:** fast nicht. Nur „Intro angenommen“.

**Probleme:**
- **Doppelzählung:** Eine Intro- oder Kontaktanfrage zählt als Badge am Bereich **und** als Hinweis, im mobilen Menü doppelt.
- **Mögliche Fehlerseite [C]:** Ohne Netzwerk-Berechtigung (z. B. ein gesperrter Founder) könnte `/messages` werfen. Das hieße Fehlerseite statt Align-Hinweise.
- **Altlasten:** Der Kommentar im Root-Layout sagt, bei Vorschlägen gehe „nichts per Mail hinaus“. Per Opt-in ist das aber so.

**Empfehlung: trennen und einen gemeinsamen Einstieg schaffen.**
- „Nachrichten“ bleibt Mensch-zu-Mensch.
- Daneben kommt **„Aufgaben & Hinweise“** (Glocke): handlungsrelevante Punkte (C) oben, als abgeleiteter Zustand; darunter Statusupdates (B, D) als Liste.
- Gründe:
  - Aufgaben müssen verschwinden, wenn sie erledigt sind. Nachrichten bleiben.
  - Team-, Setup- und Advisor-Ereignisse haben mit dem Netzwerk-Postfach nichts zu tun, auch für Personen ohne Netzwerk-Zugang.
  - Der Block „Du bist dran“ wandert dorthin. `/messages` bleibt Postfach.
  - Zähler: Die Glocke zählt offene Aufgaben plus ungelesene Hinweise, „Nachrichten“ zählt ungelesene Nachrichten, ohne Doppelzählung.

---

## 9. Event/Recipient Matrix

Eventnamen sind Zielbild, nicht implementiert. „Muss?“: J = muss informiert werden, O = optional, N = nein.

**Einladung, FIND, Team**

| Domain | Event | Trigger | Actor | Empfänger | Muss? | Action req.? | CTA |
|---|---|---|---|---|---|---|---|
| invite | `invite.received` | Einladung erstellt | Einladende | eingeladene Person | J | ja (annehmen) | `/join?token` |
| invite | `invite.accepted` | Annahme | eingeladene Person | Einladende + Mitglieder | J | nein | `/teams/{id}` |
| invite | `invite.expiring` | 3 Tage vor Ablauf | System | Einladende | O | ja (erneuern) | Dashboard-Eintrag |
| invite | `invite.expired` | Ablauf | System | Einladende | O | nein | Dashboard |
| invite | `invite.revoked` | Widerruf | Einladende | eingeladene Person (falls Konto) | O | nein | – |
| find | `find.intro_requested` | Intro | Anfragende | Empfänger | J | ja | `/discovery/intros` |
| find | `find.intro_accepted` | Annahme | Empfänger | Anfragende | J | nein | Intro |
| find | `find.joint_check_requested` | „gemeinsam prüfen“ | A | B | J | ja (bestätigen) | `/discovery/intros/{id}/matching` |
| find | `find.joint_check_confirmed` | zweite Bestätigung | B | A | J | ja (Team öffnen) | Matching |
| find | `find.team_created` | Team geöffnet | A | B | J | nein | `/teams/{id}` |
| team | `team.member_joined` | Mitglied neu | neue Person | Mitglieder | J | nein | `/teams/{id}` |
| team | `team.member_left` | Austritt | Ausgetretene | Übrige | J | nein | `/teams/{id}` |
| team | `team.share_missing` | Bericht wartet auf Freigabe | System | fehlende Person | J | **ja** | `/teams/{id}/workstyle#teamfreigabe` |
| team | `team.workstyle_missing` | Bericht wartet auf Profil | System | fehlende Person | J | **ja** | Fragebogen |
| team | `team.report_ready` | erstmals bereit | System | Mitglieder, Review-Advisor | J | nein | `/teams/{id}/workstyle` |
| team | `team.report_unavailable` | nicht mehr bereit | System | Mitglieder | O | ggf. | Readiness-Panel |
| team | `team.share_revoked` | Freigabe aus | Mitglied | übrige Mitglieder | O | nein | Readiness |
| team | `team.report_changed` | neues aktuelles Profil | Mitglied | Mitglieder | N (Digest) | nein | Bericht |

**Vorhaben, Founder Setup, Labs**

| Domain | Event | Trigger | Actor | Empfänger | Muss? | Action req.? | CTA |
|---|---|---|---|---|---|---|---|
| venture | `venture.submitted` | Abgabe | Mitglied | Mitglieder | O | nein | Bericht |
| venture | `venture.all_submitted` | alle fertig | System | Mitglieder | O | nein | Bericht |
| setup | `setup.confirmation_required` | Vorschlag/Revision | Vorschlagende | übrige Mitglieder | J | **ja** | `/teams/{id}/setup/{item}` |
| setup | `setup.confirmations_reset` | neuer Vorschlag ersetzt alten | Vorschlagende | wer schon bestätigt hatte | J | ja | Item |
| setup | `setup.confirmed_by` | eine Bestätigung | Mitglied | Vorschlagende | N (Digest) | nein | Item |
| setup | `setup.fully_confirmed` | letzte Bestätigung | System | alle | J | nein | Setup-Dokument |
| setup | `setup.reconfirm_required` | Roster geändert | System | alle | J | ja | Setup |
| labs | `labs.handoff` (RMM/FitW, besteht) | Übergabe | Partner | Partner | J | ja | Runde |

**Advisor, CONNECT, Nachrichten, Konto**

| Domain | Event | Trigger | Actor | Empfänger | Muss? | Action req.? | CTA |
|---|---|---|---|---|---|---|---|
| advisor | `advisor.access_requested` | Personenzugang eingelöst | Advisor | Founder | J | **ja** | `/account#person-access` |
| advisor | `advisor.access_granted` | genehmigt | Founder | Advisor | J | nein | `/advisor/person/{id}` |
| advisor | `advisor.access_declined` | abgelehnt | Founder | Advisor | J | nein | Advisor-Dashboard |
| advisor | `advisor.access_revoked` | widerrufen | Founder/Advisor | Gegenseite | J | nein | Dashboard (keine Details) |
| advisor | `advisor.access_expiring` | Ablauf naht | System | Founder | O | ggf. | `/account` |
| advisor | `advisor.review_approval_requested` | Review angefragt | Advisor | jedes Subjekt | J | **ja** | `/account` |
| advisor | `advisor.review_waiting_on_others` | eine Zustimmung offen | System | Advisor | O | nein | `/advisor/group` |
| advisor | `advisor.review_active` | alle zugestimmt | System | Advisor + Subjekte | J | nein | `/advisor/review/{id}` |
| advisor | `advisor.review_ended` | Ablehnung, Widerruf, Rosterwechsel | Subjekt/System | Advisor + Subjekte | J | nein | Dashboard |
| advisor | `advisor.setup_access_requested` | Setup-Anfrage | Advisor | Founder | J | ja | Teamseite |
| advisor | `advisor.setup_access_granted` | einstimmig | Founder | Advisor | J | nein | Advisor-Session |
| advisor | `advisor.relationship_approval_requested` | Paar-Advisor vorgeschlagen | Founder A | Founder B | J | ja | `/teams/{id}#relationship-advisor-access` |
| advisor | `intake.submitted` | Team hat geantwortet | Founder | Advisor | J | nein | `/team-intake/{id}` |
| connect | `connect.contact_requested` (besteht) | Anfrage | Absender | Empfänger | J | ja | `/connect/contacts` |
| connect | `connect.contact_accepted` | Annahme | Empfänger | Absender | J | nein | Gespräch |
| connect | `connect.suggestions` (besteht) | Cron | System | Mitglied | O | nein | `/connect/suggestions` |
| message | `message.received` (besteht) | Nachricht | Gegenseite | Empfänger | J | nein | `/messages/{id}` |
| account | `account.deleted_counterpart` (besteht, eigene Tabelle) | Löschung | System | Co-Founder, Advisor | J | nein | `/connections` |

---

## 10. Channel Matrix

| Event | In-App | E-Mail sofort | Digest | Push | Priorität |
|---|---|---|---|---|---|
| `invite.received` | (bei Konto) | **ja** | – | – | ACTION_REQUIRED |
| `invite.accepted` / `team.member_joined` | ja | optional (Standard an) | ja | optional | IMPORTANT_UPDATE |
| `invite.expiring` | ja | – | ja | – | INFO |
| `find.intro_requested` | ja | ja (besteht) | – | ja (besteht) | ACTION_REQUIRED |
| `find.intro_accepted` | ja | ja | – | ja | IMPORTANT_UPDATE |
| `find.joint_check_requested` / `_confirmed` | ja | ja | – | ja | ACTION_REQUIRED |
| `find.team_created` | ja | optional | – | optional | IMPORTANT_UPDATE |
| `team.share_missing` / `team.workstyle_missing` | Aufgabe | – | ja (Erinnerung) | – | ACTION_REQUIRED |
| `team.report_ready` | ja | optional (Standard an) | ja | optional | IMPORTANT_UPDATE |
| `team.report_unavailable` | ja | – | ja | – | INFO |
| `team.member_left` | ja | optional | ja | – | IMPORTANT_UPDATE |
| `team.report_changed`, `venture.submitted` | – | – | ja | – | DIGEST_ONLY |
| `venture.all_submitted` | ja | – | ja | – | INFO |
| `setup.confirmation_required` / `setup.reconfirm_required` / `setup.confirmations_reset` | Aufgabe | optional (Standard an) | ja | optional | ACTION_REQUIRED |
| `setup.fully_confirmed` | ja | – | ja | – | IMPORTANT_UPDATE |
| `setup.confirmed_by`, Setup-Diskussion | – | – | ja | – | DIGEST_ONLY |
| `advisor.access_requested` / `review_approval_requested` / `setup_access_requested` / `relationship_approval_requested` | Aufgabe | **ja** | ja | optional | ACTION_REQUIRED |
| `advisor.access_granted` / `review_active` / `setup_access_granted` | ja | ja | – | optional | IMPORTANT_UPDATE |
| `advisor.access_revoked` / `review_ended` | ja | **ja (nicht abschaltbar)** | – | – | IMPORTANT_UPDATE |
| `intake.submitted` | ja | ja | – | – | IMPORTANT_UPDATE |
| `connect.contact_requested` | ja | ja | – | ja | ACTION_REQUIRED |
| `connect.contact_accepted` | ja | optional | – | optional | IMPORTANT_UPDATE |
| `connect.suggestions`, gemerkte Suchen | – | Opt-in | **ja** | ja (besteht) | DIGEST_ONLY |
| `message.received` | Zähler | ja (erste ungelesene, besteht) | – | ja | IMPORTANT_UPDATE |
| `labs.handoff` | ja | ja | – | optional (heute nein) | ACTION_REQUIRED |

---

## 11. Email

**Heute:**
- 17 Sendepfade: Netzwerk-Ereignisse, gemerkte Suchen, Labs, sechs Einladungsarten, Feedback an das interne Postfach, Supabase-Auth-Mails.
- Ohne Resend-Schlüssel wird still nicht gesendet.
- Keine Abmeldelinks und keine `List-Unsubscribe`-Kopfzeile.
- Logo und Datenschutz-Link fest auf `cofoundery.de`.
- Einladungen sind nicht abschaltbar.

**Empfohlene Kategorien:**

| Kategorie | Beispiele | Regel |
|---|---|---|
| **Sofort, nicht abschaltbar** | persönliche Einladung, Zugriffsänderungen (Advisor-Zugang widerrufen/beendet, Review beendet), sicherheitsrelevante Kontoaktionen | transaktional; ohne Inhalte aus Antworten |
| **Sofort, Standard an, abschaltbar** | Zustimmung nötig (Advisor, Setup, FIND-Bestätigung), direkte Nachricht (erste ungelesene), Intro/Kontakt angefragt | Action Required |
| **In-App sofort, E-Mail optional** | Teamreport verfügbar, Teammitglied beigetreten/ausgetreten, Setup vollständig, Vorhaben vollständig | Standard: E-Mail an für `team.report_ready`, sonst Digest |
| **Digest** | Vorschläge, gemerkte Suchen, Setup-Diskussionen, geänderter Bericht, offene Punkte | wöchentlich, nur bei Inhalt |

**Zusätzlich nötig:**
- Abmeldelink je Kategorie, `List-Unsubscribe`.
- Rate-Limit je Empfänger (z. B. höchstens eine Sofort-Mail je Ereignisart, Betreff und Stunde).
- Origin ohne stillen Fallback auf Produktion.

---

## 12. Digest

**Sinnvoll: ja,** weil viele Ereignisse wichtig, aber nicht dringend sind (Team, Setup, Vorhaben, CONNECT).

**Inhalt (nur reale Zustände, keine erfundenen Inhalte):**
- Offene Aufgaben, aus der Source of Truth berechnet (siehe 15): „2 Punkte im Founder Setup warten auf deine Bestätigung“, „Euer Teambericht wartet auf deine Teamfreigabe“, „1 Advisor-Anfrage offen“.
- Neue Ereignisse seit dem letzten Digest: Teamreport verfügbar, neues Mitglied, Vorhaben vollständig, neue Verbindung, Vorschläge und gemerkte Suchen.

**Keine Mail**, wenn beide Listen leer sind.

**Datenbasis, die fehlt:**
- Persistentes Eventlog (wer, was, wann, Betreff, Team).
- `last_digest_sent_at` je Person.
- Abgeleitete Aufgaben-Abfrage je Person.
- Präferenz „wöchentlich/aus“.
- Cron (Vercel-Cron oder `pg_cron`).

Heute gibt es nur `in_app_notices` (ohne Teamereignisse) und den Vorschlags-Cron.

---

## 13. Push/PWA

**Status:**

| Komponente | Status |
|---|---|
| Manifest | ja |
| Service Worker | ja, nur Push |
| Installierbar | ja, Standard-Browserverhalten; kein eigener Install-Prompt |
| Abos | ja, Tabelle `push_subscriptions` |
| Erlaubnis | nur auf Klick in `/account` |
| VAPID | eigene Implementierung; Schlüssel nur in Produktion |
| Hintergrund-Push | ja |
| Klick | öffnet internen Pfad bzw. fokussiert ein offenes Fenster |
| Push-Ereignisse heute | Netzwerk (6 Arten), Vorschläge, Test |
| Kein Push bei | Labs, Einladungen, Team, Setup, Advisor |

**Zielbild:**
- Push nur für ACTION_REQUIRED und wenige IMPORTANT_UPDATE: „Deine Zustimmung fehlt noch.“, „Du hast eine neue Einladung.“, „Euer Teambericht ist bereit.“
- Höchstens 1 Push je Ereignisart und Betreff; Sammelpush bei mehreren in kurzer Zeit (`tag` je Art/Team).
- Diskreter Sperrbildschirm-Text: keine Namen, keine Inhalte. Statt „Maria hat …“ also „Neue Anfrage in deinem Team“.
- Optional App-Badge mit der Zahl offener Aufgaben.
- Klick führt immer auf einen erklärenden Zielzustand (siehe 17).

---

## 14. Preferences

**Zielmodell:**

| Kanal | Steuerung | Standard |
|---|---|---|
| In-App | immer für handlungsrelevante Ereignisse; Statushinweise abschaltbar nur als Kategorie | an |
| E-Mail | je Kategorie: Zustimmungen, Team & Setup, FIND, CONNECT, Nachrichten, wöchentliche Zusammenfassung | Zustimmungen an, Nachrichten an, Team an, Digest an, CONNECT-Vorschläge aus |
| Push | global an/aus je Gerät plus Kategorien (Zustimmungen, Nachrichten, Team) | aus, bis aktiviert |
| Digest | wöchentlich / aus | wöchentlich |

**Nicht vollständig abschaltbar:**
- persönliche Einladungen
- Zugriffsänderungen an den eigenen Daten (Advisor-Zugang erteilt, widerrufen, abgelaufen; Review beendet)
- Kontolöschung der Gegenseite
- Sicherheits- und Kontoaktionen

In-App-Aufgaben sind ohnehin nicht abschaltbar: Sie sind Zustand, keine Nachricht.

**Migration:** Die bestehenden `notification_opt_outs` und `notification_opt_ins` lassen sich auf Kategorien abbilden. Heute steuert ein Schalter E-Mail und Push gemeinsam; künftig getrennt.

---

## 15. Action Required

**Keine News, sondern offene Aufgaben:**
- Teamfreigabe fehlt.
- Eigenes Arbeitsprofil fehlt für den Teambericht.
- Founder-Setup-Bestätigung offen (auch nach Rosterwechsel).
- Advisor-Personenzugang, Teamreview, Setup-Zugang oder Paar-Advisor wartet auf deine Zustimmung.
- FIND: gemeinsamer Check wartet auf deine Bestätigung bzw. Team kann geöffnet werden.
- Intro- und Kontaktanfrage offen.
- Einladung wartet auf Annahme (für die eingeladene Person mit Konto).
- Labs-Übergabe.

**Empfehlung:** Aufgaben **nicht als gespeicherte Notification mit Status**, sondern als **abgeleitete Abfrage** aus der Source of Truth. Dann verschwindet eine erledigte Aufgabe automatisch. Das Event („jemand hat angefragt“) erzeugt nur den Anstoß, also In-App-Hinweis oder Mail.

**Source of Truth je Aufgabe:**

| Aufgabe | Source of Truth |
|---|---|
| Teamfreigabe / Profil fehlt | `get_workstyle_team_share_readiness` |
| Setup-Bestätigung | offene Revision ohne eigene Bestätigung, gegen den aktuellen Roster (`founderSetupModel`) |
| Advisor-Zugang | `advisor_person_grants.status='requested'` |
| Teamreview | eigene `advisor_team_review_members.decision` ist offen |
| Setup-Zugang | ausstehende Zustimmung |
| FIND | Status von `discovery_intro_requests` und `discovery_matching_starts` |
| CONNECT | `network_contact_requests` pending |

Falls doch gespeicherte Hinweise: `resolved_at` muss beim Erledigen, beim Rückziehen der Anfrage und beim Zugriffsverlust gesetzt werden. Heute fehlt das.

---

## 16. Reminders

| Reminder | nach | max. | automatisch erledigt wenn | nie erinnern wenn | Kanal |
|---|---|---|---|---|---|
| Advisor-Zustimmung offen (Person/Review/Setup) | 3 Tage | 2× (3 und 10 Tage) | entschieden, Anfrage zurückgezogen, Advisor gelöscht | abgelehnt, Team verlassen | E-Mail + Digest |
| Founder-Setup-Bestätigung offen | 5 Tage | 1× + Digest | bestätigt, Revision ersetzt, Person ausgetreten | Punkt bereits vollständig | Digest (E-Mail optional) |
| Teamfreigabe / Profil fehlt (Team wartet) | 4 Tage nach Teambildung | 2× | Freigabe aktiv, Profil fertig, Person ausgetreten | Person hat ausdrücklich „nicht teilen“ gewählt (aus), bis sie es ändert | In-App + Digest |
| FIND gemeinsamer Check offen | 3 Tage | 1× | bestätigt, Intro beendet | abgelehnt | E-Mail + In-App |
| Einladung läuft ab (an Einladende) | 3 Tage vor Ablauf | 1× | angenommen, widerrufen, neu verlängert | – | E-Mail/Digest |
| Intro/Kontakt unbeantwortet | 7 Tage | 1× (Digest) | beantwortet, zurückgezogen | – | Digest |
| Labs-Runde offen | 5 Tage | 1× | Runde abgeschlossen oder verworfen | abgelehnt | In-App + Digest |

**Regeln:**
- Keine täglichen Schleifen.
- Höchstens ein Reminder je Person und Tag über alle Arten (sammeln).
- Jeder Reminder prüft beim Versand neu, ob die Aufgabe noch offen ist und der Zugriff noch besteht.

---

## 17. Deep Links

| Event | Ziel | Berechtigungsprüfung | Wenn erledigt | Wenn Zugriff widerrufen | Wenn Team verlassen |
|---|---|---|---|---|---|
| Teamereignisse | `/teams/{id}/…` | Mitgliedschaft → sonst `notFound()` | Seite zeigt den aktuellen Zustand (ok) | **englische 404 [B]** | **englische 404 [B]** |
| Setup | `/teams/{id}/setup/{item}` | dto. | ok | 404 | 404 |
| Bericht-Snapshot | `?snapshot=` | eigener Snapshot, unveränderter Input | – | 404 | 404; **der Login-Weg verliert `snapshot` [B]** |
| Vorhaben | `/founder-alignment/vorhaben?venture=` | Mitgliedschaft | ok | „Für welches Vorhaben? Du bist in mehreren.“ **[B]** | dto. |
| Advisor Person/Review | `/advisor/person/{id}`, `/advisor/review/{id}` | Grant/Review → `notFound()` | – | **404** | – |
| Advisor Teambericht | `/teams/{id}/workstyle` | `can_read_workstyle_team` | – | **404 bei Rosterwechsel [B]** | – |
| Advisor-Brücke | `/advisor/report` u. a. | Beziehung | – | stille Weiterleitung zum Dashboard | – |
| Einladungen | `/join?token` | Token | „bereits angenommen“ (ok) | widerrufen → Erklärung in `JoinClient` (ok), über `/join/start` aber nur „bitte erneut versuchen“ | – |
| FIND-Intro | `/discovery/intros/{id}/matching` | Beteiligung | `UnavailableState` mit Erklärung (**vorbildlich**) | dto. | – |
| Nachrichten | `/messages/{id}` (Push/Mail: `/connect/messages/{id}`) | Teilnahme | ok | 404 | – |
| In-App-Hinweise | gespeicherter Pfad | keine erneute Prüfung beim Anzeigen | **stehen bleibend** | **404** | **404** |

**Anforderung für 12C/12D:**
- Ein gemeinsames, übersetztes `not-found.tsx` und `error.tsx` mit Rückweg.
- Für Team- und Advisor-Ziele eine erklärende „nicht mehr verfügbar“-Seite statt `notFound()`. Ohne Inhalte, sinngemäß: „Du bist nicht mehr Mitglied dieses Teams“ bzw. „Der Zugang wurde beendet“, nur gegenüber den Personen, die vorher Zugriff hatten.
- `next=` immer vollständig inklusive Query.

---

## 18. Duplicate Risks

**Hoch:**
1. **`accept_invitation_with_team_share`:** Ein Aufruf erzeugt Einladung angenommen → Beziehung → Mitgliedschaft (Trigger) → Teamfreigabe → ggf. Bericht bereit → Setup-Roster geändert. Ein tabellenbasierter Notifier feuert 3–5 Events.
2. **„Bericht bereit“** ist abgeleitet und kann flattern: Freigabe an/aus, Beitritt (nicht bereit), Austritt (bereit), neues Profil, Research-Pretest. Nötig sind ein gespeicherter letzter Zustand je Team und Entprellung (z. B. erst nach 10 Minuten stabil).
3. **Austritt:** Mitgliedschaft gelöscht + Freigabe widerrufen + Einladungen widerrufen + N Grant-Neubewertungen + ggf. Team-Löschkaskade.
4. **Setup:** Der Vorschlag ersetzt den offenen (Bestätigungen weg) und bestätigt automatisch die vorschlagende Person. Bei der letzten Bestätigung fallen „bestätigt durch“ und „vollständig“ zusammen.
5. **Person-Invite-Einlösung:** eine Grant-Zeile **je Scope**. Benachrichtigung je Zeile vervielfacht sich.
6. **FIND „Team öffnen“:** Beide Seiten können es auslösen. Beziehung, Team und zwei Mitglieder entstehen in einem Schritt.

**Mittel:**
- Doppelte Zählung von Intro-/Kontaktanfragen (Bereichs-Badge plus Hinweis).
- `in_app_notices` eindeutig mit `do nothing`: Ein legitimes zweites Ereignis zum selben Betreff nach dem Lesen kommt nie an (z. B. eine erneute Übergabe).
- RMM erzeugt einen Hinweis je Runde in einer Schleife.
- „Link erneut zeigen“ rotiert das Token und verlängert den Ablauf. Ein Ablauf-Reminder muss `expires_at` beim Versand neu lesen.
- `createInvitation` legt an und widerruft ausgleichend (Geisterpaar „eingeladen/widerrufen“).

**Architekturregel:**
- Idempotenzschlüssel = (Eventtyp, Betreff-ID, Empfänger, Zustandsversion).
- Events aus der fachlichen Aktion (Server Action/RPC) emittieren, nicht aus Tabellen-Triggern.
- Abgeleitete Ereignisse (Bericht bereit) über Zustandsvergleich mit Entprellung.

---

## 19. Privacy

| Sensibel | Regel |
|---|---|
| Research (Antworten, Einwilligung, Rückzug) | **nie** Anlass oder Inhalt einer Benachrichtigung; heute eingehalten |
| Assessment-Antworten, Vorhaben-Antworten | nie in Mail/Push; nur „Bericht verfügbar“. „X hat abgegeben“ verrät neuen Mitgliedern Zeitpunkte, deshalb höchstens als Digest |
| Capability-Tiefe | nur nach Freigabestufe bzw. Teamfreigabe; keine Werte in Benachrichtigungen |
| Teamdaten | nur an aktuelle Mitglieder; Empfängerliste beim Versand neu berechnen |
| Advisor nach Widerruf | keine Details mehr. Heute bleibt ein **aktives Teamreview trotz widerrufenem Personenzugang** bestehen **[C]**: P0 |
| Austritt | „Mitglied ausgetreten“ an Übrige ja, ohne Gründe; Advisors: „Zugang beendet“ ohne Namen der ausgetretenen Person, falls nicht ohnehin bekannt |
| Snapshots | speichern den vollständigen Input (auch Antworten anderer) dauerhaft; nach Widerruf nicht ausgeliefert, aber nicht gelöscht. Später klären |
| Teamreview-Anfrage | verrät den Subjekten bewusst die anderen Subjekte; im Text sagen |
| Sperrbildschirm | Push ohne Namen und Inhalte |
| FIND | Hinweise sind schon heute namenlos; Mails nutzen nur den Discovery-Anzeigenamen; beibehalten |
| E-Mail-Links | Produktionsorigin als stiller Fallback; Preview-Mails mit Produktionslinks vermeiden |

Sensible Events: alle `advisor.*`, `team.member_left`, `team.share_revoked`, `venture.submitted`, `account.deleted_counterpart`.

---

## 20. Orphan/Legacy Inventory

**SAFE_TO_DROP** (nur Code; vorher Produktionslogs prüfen):
- **Routen:** `/beispiel-auswertung` (verletzt die Produktregel).
- **Dashboard-Reste:** `DailyQuote`, `dailyQuotes`, `CopyLinkButton`, `StartSessionButton`, `DashboardComparisonWorkspace`.
- **Marketing:** `Kpi`, `StepCard`, `Signal`.
- **Onboarding/Teilnahme:** `OnboardingCard`, `participants/selection.ts`.
- **Fragebogen:** die `questionnaire`-DisplayName-Kette (spricht mit gelöschten Tabellen), `ValuesQuestionnaire`, `QuestionnaireCompletionShell`.
- **Reporting-Komponenten ohne Import:** u. a. `AlignmentRadarChart` und `FounderReportRadar` (Radar verletzt die Produktregel), `TeamMatchingPanel`, `SelfValuesProfileSection`, `KeyInsights`, `MatchNarratives`, `ConversationGuide`.
- **Server Actions:** die vier `matchingCore/*Actions.ts`, `v2/alignmentShareActions.ts`.
- **Pilot-/Übergangs-UI:** v2.1-Waisen (`QuestionnaireV21`, `DiscoveryVerdictsV21`, …), Align-Übergangshinweise (`AlignAnnounce`, `InviteVersionNote`, `PreviousVersionNote`).
- **FIND-Legacy-UI:** `MatchPointsView`, `SearchPreferencesForm`, `DiscoveryAlignmentPreferencesEditor`.
- **Edge Functions:** die vier, sie schreiben in gelöschte Tabellen. Remote-Deployment prüfen.
- **Altes Präferenz-API:** `get_network_email_notifications` und `set_network_email_notifications`.
- **Helfer:** `getNotificationRecipientEmail`.
- **API-Handler:** die drei `/api/invitations/*` (NEEDS_MORE_EVIDENCE: Logs).

**HISTORICAL_READ_ONLY** (behalten):
- Workbook und Druck, `/workspaces/[id]`, `/matching/[id]/report`, `/report/[id]`, `/me/report`.
- Versionsarchiv, `profil/antworten`, Pilot-Report und -Vergleich (inkl. `ShareFormV21`).
- Alle REDIRECT-ONLY-Stubs (gespeicherte URLs).
- Tabellen `founder_alignment_workbooks` und `matching_*`.

**MIGRATE_FIRST:**
- `FounderAlignmentWorkbookClient` (~7.300 Zeilen; nur die zwei in Produktion abgeschalteten Debug-Seiten; ~21 Tests).
- v2-Instrument-UI (nur Debug), deren RPCs `discovery_topic_verdicts*` und `invitation_uses_previous_version` (pgTAP).
- `start_workspace_from_matching_session`, `create_or_get_matching_workspace_agreement`, `handoff_workbook_deep_dive_note_if_empty` (EXECUTE schon entzogen; pgTAP).
- Tabelle `founder_alignment_workbook_advisors`: steuert `hasAdvisor` und das Advisor-Dashboard.
- Abfrage auf die gelöschte Tabelle `participants` in `account/page.tsx:83-93`: Fehler wird verschluckt, Zähler immer 0, also ein Bug.

**KEEP:**
- `founderAlignmentWorkbookActions.ts`: die aktuelle Paar-Advisor-Funktion und die Advisor-Einladungsmail hängen daran.
- `alignment_shares` und gerichtete Freigaben (Fallback, Einzel- und Advisor-Sichten).
- `report_runs`, `invitation_matching_inputs`, `delete_founder_account_data` samt Scrub-Helfern.
- Lösch-Trigger.
- Advisor-Brückenseiten.
- Vercel-Cron.

**NEEDS_MORE_EVIDENCE:**
- `/founder-alignment/vergleich/[id]`.
- `delete_user_operational_data`.
- `pg_cron`-Wrapper (Analytics, Research-Purge = Aufbewahrungspflicht!; Event-Cleanup).
- `discovery_theme_distances` (wird noch aufgerufen, liefert nichts).
- `claim_collaboration_round_handoff_email`.
- `get_workstyle_research_dataset`.
- `ui/clientBoundary.ts`.

**Datenbefund nebenbei:** In der lokalen DB stehen 2 `advisor_team_reviews` vom 01.10. mit `advisor_user_id = null`, eines davon `active`. Reviews überleben die Löschung des Advisors. In Produktion prüfen.

**pgTAP-Suiten, die bei einem Cleanup angepasst werden müssen:**
- **Workbook/Matching:** `workbook_historical_read_only`, `workbook_deep_dive_handoff`, `founder_team_foundation`, `discovery_journey_continuity`.
- **Kontolöschung:** `account_deletion_has_no_blockers`, `account_deletion_integrity`, `privileged_function_grants`.
- **Advisor-Brücke:** `invite_authorization_security`, `founder_alignment_raw_answer_access`.
- **v2/v2.1/v1:** `discovery_alignment_topics`, `discovery_profile_topics`, `discovery_topics_v2_1`, `alignment_answers_v2*`, `instrument_alignment_v2_1`, `advisor_alignment_v2_1`, `alignment_shares_v2_1`, `alignment_item_views`, `instrument_transitions`, `transition_remind_later`, `invitation_version`, `assessment_scope`, `instrument_scopes`, `hidden_blocks_match_answers`.
- **FIND:** `discovery_theme_distances`, `discovery_preferences`, `discovery_workstyle_contract`.
- **Unit-Tests:** ~21 Workbook-Tests, `test:founder-compat`, Routen-Tests (`ownReportReachable`, `historicalWorkbook`, `advisorDebugRemoval`, `pilotPagesSayWhatTheyAre`, `wegeInDerNeuenFassung`, …).

---

## 21. Cleanup Blockers

Leitfrage: „Kann gelöscht werden, ohne geplante Notifications, Deep Links oder historische Ansichten zu beschädigen?“

| Kandidat | Antwort | Klasse |
|---|---|---|
| REDIRECT-ONLY-Stubs (`/me/base`, `/me/values`, `/session/*`, `/invite/[id]`, `/connect/messages/[id]`, …) | **nein**: alte Mails und noch aktive Builder zeigen darauf. `/connect/messages/{id}` steht in **aktuellen** Mails und Pushes | MIGRATE_FIRST (erst Builder umstellen, dann Stubs halten, bis alte Mails veraltet sind) |
| `/invite/[id]/resume` | **nein**, live verlinkt; muss erst ohne Seiteneffekt umgebaut werden (P0) | MIGRATE_FIRST |
| `founder_alignment_workbook_advisors` | nein: `hasAdvisor`, Advisor-Dashboard, Kontolöschung | MIGRATE_FIRST |
| Advisor-Brückenseiten | nein: Hauptweg der Advisors zu Teams | MIGRATE_FIRST (erst aktueller Advisor-Teamweg) |
| `alignment_shares` / Directed-Share-UI | nein: Fallback, Einzel- und Advisor-Sichten | KEEP |
| Workbook-/Matching-Tabellen | nein: historische Ansicht, Kontolöschung | HISTORICAL_READ_ONLY |
| `in_app_notices`, `notification_opt_outs`/`_opt_ins`, `push_subscriptions`, `network_notification_claims` | nein: Fundament für 12C | KEEP |
| `network_memberships.email_notifications` | Spalte ja nach Rollback-Entscheid; die 2 RPCs ja | SAFE_TO_DROP (RPCs) |
| `account_deletion_notices` | nein: in das Center überführen, dann ggf. vereinheitlichen | MIGRATE_FIRST |
| Edge Functions | ja (Repo); Remote prüfen | SAFE_TO_DROP |
| `FounderAlignmentWorkbookClient` und v2-UI | ja für UI/Deep Links (in Produktion unerreichbar); Tests anpassen | MIGRATE_FIRST |
| Waisen-Komponenten (Abschnitt 20) | ja | SAFE_TO_DROP |

---

## 22. Browser Audit

**Umfang:**
- 1280 px: Founder 110 Seiten, Advisor 70, neue Person 40, abgemeldet 24.
- Kernseiten zusätzlich bei 390 px: Founder 15, Advisor 7.
- Alle Testkonten danach gelöscht; lokale DB wieder mit den 4 ursprünglichen Nutzern.

| Befund | Wo | Art |
|---|---|---|
| Ein GET auf „Fortsetzen“ hat die Einladung der Testperson angenommen: Status `accepted`, Teammitglied, ohne Dialog | `/invite/{id}/resume` (vom Dashboard verlinkt) | **Integrität, P0** |
| Toter Link „← Zum Advisor-Bereich“ → 404 | `/teams/{id}/workstyle` als Advisor | dead link |
| Nach dem (ungewollten) Beitritt einer dritten Person: Advisor bekommt auf dem Teambericht die englische Standard-404, ohne Erklärung | `/teams/{id}/workstyle` | fehlende Information, revoked access |
| Nach Teamaustritt: Teamübersicht, Bericht, Setup → englische 404 mitten in der deutschen Produktleiste | `/teams/{id}/**` | fehlende Rückwege / Error State |
| Vorhaben-Link nach Austritt: „Für welches Vorhaben? Du bist in mehreren.“ | `/founder-alignment/vorhaben?venture=` | falscher Zustandstext |
| Abgemeldet: `/dashboard` und `/advisor/dashboard` → `/login` ohne `next` | Login | Deep Link verloren |
| Abgemeldet: `vorhaben?venture=` und `workstyle?snapshot=` verlieren ihre Parameter | Login | Deep Link verloren |
| Founder erreichen „Team zum Intake einladen“ (Advisor-Funktion) | `/team-intake` → `/advisor/intake/new` | inkonsistente Navigation |
| Advisor erreicht „Zum Fragebogen“ (Vorhaben) aus dem Teambericht | Teambericht | falscher Link |
| Hydration-Warnung (Attribute) | `/discovery/profile` | technisch, kosmetisch |
| Rückwege: siehe 3.3, im Crawl bestätigt | – | inkonsistent |
| Kein horizontaler Überlauf; keine Laufzeitfehler auf aktuellen Seiten (außer den 404) | 1280 und 390 px | ok |
| Teamseiten mit Teamkopf und einheitlichem Rückweg; Erfolgshinweis „Team verlassen“; FIND-„nicht mehr verfügbar“-Zustand | – | ok, vorbildlich |

**Nicht im Browser nachgestellt** (aus Code, bei Umsetzung verifizieren):
- Teamreview überlebt den Widerruf des Personenzugangs.
- Setup-Sackgasse nach Austritt.
- Team-Löschkaskade beim letzten Austritt.
- `/messages` ohne Netzwerk-Berechtigung.
- Stehende Hinweise nach Rückzug.

---

## 23. P0/P1/P2/P3

### P0 – Funktions- und Integritätsfehler

1. **Einladungsannahme per GET** (`/invite/[id]/resume`, Service Role): ohne Dialog, ohne Teilen-Entscheidung, durch Link-Klick, Crawler oder ggf. Prefetch. **[B]** → behoben in Phase 12C.0 ([phase-12c0-invitation-integrity.md](phase-12c0-invitation-integrity.md)), einschließlich `/join/welcome?token=`.
2. **Toter Link `/advisor`** im Teambericht. **[B]**
3. **Keine erklärenden Fehler- und Entzugsseiten:** englische 404 nach Austritt, Widerruf oder Rosterwechsel; generischer Einladungsfehler. **[B]**
4. **Teamreview überlebt Widerruf des Personenzugangs** (Datenschutz). **[C, verifizieren]**
5. **Notwendige Zustimmungen ohne sichtbaren Hinweis:** Advisor-Personenzugang, Teamreview, Setup-Zugang, Paar-Advisor (nur `/account` bzw. Teamseite, kein Zähler); Founder-Setup-Bestätigung (nur Zähler auf der Teamseite). **[C]**
6. **Setup:** Ein neuer Vorschlag verwirft Bestätigungen still; nach einem Austritt wird nie finalisiert (Sackgasse). **[C]**
7. **Advisor verliert den Teambericht still** bei Rosteränderung (keine Seite informiert, 404). **[B]**
8. **Stehende Hinweise** nach Rückzug, Austritt oder Widerruf führen in 404. **[C]**
9. **Letzter Austritt löscht das Team samt Setup und Verlauf**, entgegen Kommentar und Produktaussage. Entscheidung nötig. **[C]**

### P1 – Notification Foundation

- Eventmodell mit Idempotenz, emittiert aus Actions/RPCs.
- Abgeleitete Aufgaben (Action Required).
- „Aufgaben & Hinweise“ getrennt von Nachrichten; Doppelzählung beheben.
- Fehlende Kernereignisse: Einladung angenommen, Mitglied beigetreten/ausgetreten, Bericht bereit, Setup-Bestätigung nötig/vollständig, Advisor-Zugang angefragt/erteilt/beendet, FIND-Bestätigung, CONNECT angenommen.
- Deep-Link-Vertrag (vollständiges `next=`, erklärende Zielzustände).
- Sofort-Mails mit Kategorien und Abmeldelink.
- Preferences getrennt nach Kanal.
- Hinweise erledigen bzw. zurückziehen.
- Weitere Link-Funde aus Abschnitt 3: falsche Ziele, Rückwege, leere Zustände.
- Einladung: Ablaufstatus, Widerrufen-Knopf, Statuslabel ohne Legacy-Flags.

### P2 – Digest, Push, Reminder

Wöchentlicher Digest, Push-Ausbau für ACTION_REQUIRED, Reminder Engine, App-Badge, Install-Hinweis.

### P3 – Komfort

- Feinere Kategorien, ruhige Zeiten, zusätzliche Zusammenfassungen.
- Rückwege angleichen; Hydration-Warnung.
- Feste Hosts und Logo bei der Umbenennung.
- Legacy-CTAs im eingeklappten Bereich.

---

## 24. Recommended Next Phases

| Phase | Inhalt | Abhängigkeit |
|---|---|---|
| **12C – Integrity Fixes** | P0 1–9: Annahme nur per POST mit Dialog; `/advisor`-Link; übersetztes `not-found`/`error` plus „nicht mehr verfügbar“-Zustände für Team/Advisor; vollständiges `next=`; Teamreview bei Grant-Widerruf schließen; Setup-Finalisierung nach Austritt; Entscheidung Team-Löschung; Hinweise beim Rückzug zurückziehen | keine |
| **12D – Notification Foundation** | Eventtabelle/Outbox mit Idempotenzschlüssel; Emission aus Actions/RPCs; abgeleitete Aufgaben-Abfrage je Person; Erweiterung der `in_app_notices` (`resolved_at`, neue Arten); Entprellung für `team.report_ready` | 12C |
| **12E – In-App Center & Action Required** | „Aufgaben & Hinweise“ mit Glocke; Zähler neu ordnen; Kontolöschungshinweise integrieren; CTAs mit erklärenden Zielen | 12D |
| **12F – E-Mail & Preferences** | Sofort-Kategorien; Abmeldelink/`List-Unsubscribe`; Kanal-getrennte Präferenzen (Migration der Opt-outs); Origin ohne stillen Fallback; Advisor- und Team-Mails | 12D |
| **12G – Digest & Reminder** | Wöchentlicher Digest (nur bei Inhalt), Reminder-Regeln aus Abschnitt 16, Cron | 12D–12F |
| **12H – Push/PWA** | Push für ACTION_REQUIRED, diskrete Texte, Sammel-Tags, Badge, Install-Hinweis | 12F |
| **12I – Legacy/DB Cleanup** | SAFE_TO_DROP-Liste; MIGRATE_FIRST in Reihenfolge: Link-Builder (`/connect/messages`, `/me/values`), aktueller Advisor-Teamweg, dann Advisor-Brücke und `founder_alignment_workbook_advisors`, Workbook-Client und v2-UI mit Tests | 12C (resume), 12E (Advisor-Weg) |

---

## 25. Open Decisions

1. **Team-Löschung beim letzten Austritt:** Soll das Team mit Setup und Verlauf erhalten bleiben (Produktaussage und Kommentar) oder gelöscht werden (heutiges Verhalten)?
2. **Glocke:** Getrennte „Aufgaben & Hinweise“ neben „Nachrichten“ (Empfehlung) oder ein gemeinsames Center?
3. **Aufgaben** abgeleitet (Empfehlung) oder als gespeicherte Notifications mit Status?
4. **Rosterwechsel und Advisor-Review:** Soll ein Review bei neuem Mitglied enden (heute faktisch) oder auf die bisherigen Subjekte eingeschränkt weiterlaufen? Wer wird informiert?
5. **Setup-Vorschlag:** Darf ein neuer Vorschlag bestehende Bestätigungen verwerfen? Wenn ja, sichtbar und mit Hinweis.
6. **Standard-E-Mail für `team.report_ready`** und `team.member_joined`: an oder nur Digest?
7. **Nicht abschaltbare Kategorien:** Liste aus Abschnitt 14 bestätigen.
8. **Einladungen:** Widerrufen-Funktion, Ablauf-Reminder und Verhalten von „Link erneut zeigen“ (verlängert heute still).
9. **„Ausgetreten“ an Advisors:** mit oder ohne Namen?
10. **Snapshots** mit fremden Antworten: Aufbewahrung nach Widerruf oder Austritt?
11. **`/beispiel-auswertung`:** löschen oder auf `/` umleiten (externe Links)?
12. **Produktions-Prüfungen vor dem Cleanup:** Zeilen in `founder_alignment_workbook_advisors`, Logs für Stubs und `/api/invitations/*`, deployte Edge Functions, `cron.job`, Supabase-Redirect-Liste, gesetzte Resend-/VAPID-Variablen.
