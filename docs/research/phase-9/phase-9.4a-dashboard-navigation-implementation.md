# Phase 9.4A – Navigation, Founder/Advisor-Kontext und Dashboard

Stand: 04.10.2026. Branch: `feat/workstyle-reporting-v04`. Ausgangscommit: `2319a918` (`docs: update Claude project guidance`, darunter `4b448993`). Änderungen dieser Phase sind lokal und **nicht committed**.

Grundlage: [Systemaudit 9.0](phase-9.0-align-system-audit.md), [9.1](phase-9.1-align-journey-implementation.md), [9.2](phase-9.2-team-size-onboarding-implementation.md), [9.3](phase-9.3-workbook-consolidation-implementation.md) und die abgestimmten Entscheidungen zu Cookie, Team-Intake, Teamkarten und Profil-Navigation.

Reine Darstellungs- und IA-Arbeit. Keine neue Rollen-, Auth-, Team-, Agreement- oder Datenarchitektur.

## 1. Navigation vorher / nachher

| | Vorher | Nachher |
|---|---|---|
| Founder-Leiste | **Align** (Sammelbereich, aktiv auf Dashboard, Profil, Teams, Library, `/founder-alignment*`) · Find · Connect; rechts „Über dich“ | **Start** · **Profil** · **Teams & Verbindungen** · Find · Connect; kein „Über dich“-Textlink mehr |
| Advisor-Leiste | **Align** (nur `/advisor/dashboard`, keine Unterpunkte) · Connect · Extra-Link „Founder-Verbindungen“ | **Start** · **Personen & Gruppen** · **Teams** · **Intake** · Connect |
| Ansicht bei Doppelrolle | aus Pfad (`/advisor/*`) oder Seiten-Override, nirgends gespeichert; gemeinsame Seiten fielen immer auf Founder zurück | zusätzlich zuletzt genutzter Arbeitskontext per UI-Cookie (Abschnitt 4) |
| Reine Advisor auf gemeinsamen Seiten | Founder-Baum, dessen Align-Link auf `/dashboard` sofort umleitete | Advisor-Baum |
| Advisor-Unterseiten | kein aktiver Bereich, keine Ortsangabe | aktiver Bereich und Breadcrumb |
| Umschalter | hartkodiert „Founder“/„Advisor“, `aria-label="Ansicht wechseln"` | DE/EN aus `navigation.json`, merkt sich die Wahl |

Keine Route wurde gelöscht, umbenannt oder verschoben. `isProductChromePath`, `productEntry.ts` und `postAuthRedirect.ts` sind unverändert.

Quellen: `web/src/features/navigation/ProductShell.tsx`, `web/src/features/navigation/workContext.ts`, `web/src/features/dashboard/DashboardViewSwitch.tsx`, `web/src/app/layout.tsx`.

## 2. Founder-Navigation

| Bereich | Ziel | aktiv auf | Unterpunkte | sichtbar |
|---|---|---|---|---|
| Start | `/dashboard` | `/dashboard` | – | nicht bei Connect-only |
| Profil | `/me/profile` | `/me/*`, `/profile*`, `/research/workstyle-pretest*`, `/founder-alignment/profil*`, `/pilot*`, `/versionen` | Das bist du · Wie du arbeitest · Angaben bearbeiten (`/profile`) | `hasFounder` |
| Teams & Verbindungen | `/connections` | `/connections`, `/teams/*`, `/invite/new`, `/report/*`, `/founder-library*`, übrige `/founder-alignment/*` (Vorhaben, Vergleich, frühere Workbookstände) | Verbindungen · Founder Library (nur `hasFounder`) | nicht bei Connect-only |
| Find | unverändert | unverändert | unverändert | `hasFounder` |
| Connect | unverändert | unverändert | unverändert | `hasConnect` |

- **„Über dich“ (rechter Textlink auf `/profile`)** wurde geprüft: In der Founder-Ansicht dupliziert er ausschließlich „Profil › Angaben bearbeiten“ und entfällt dort (Desktop und Mobilmenü). Für alle, die den Founder-Bereich „Profil“ nicht sehen (Advisor-Ansicht, Connect-only), ist er der einzige sichtbare Profilweg und bleibt. Das Konto-/Avatar-Menü ist unverändert.
- Founder Library ist sekundär unter „Teams & Verbindungen“; im Team bleibt sie zusätzlich in der Teamnavigation.
- Team Alignment steht nicht global, sondern im Team (Homebase/Teamnavigation, Phase 9.4B).

## 3. Advisor-Navigation

| Bereich | Ziel (bestehende Route) | aktiv auf |
|---|---|---|
| Start | `/advisor/dashboard` | `/advisor/dashboard` |
| Personen & Gruppen | `/advisor/group` | `/advisor/group`, `/advisor/person/*`, `/advisor/review/*` (Teamreviews stehen auf `/advisor/group`) |
| Teams | `/advisor/dashboard#advisor-teams` bzw. Seiten-Override wie bisher | `/advisor/report*`, `/advisor/snapshot*`, `/advisor/session*` |
| Intake | `/team-intake` | `/team-intake*`, `/advisor/intake/*` |
| Connect | unverändert | nur `hasConnect` |

Jede Advisor-Seite behält ihre eigene serverseitige Prüfung (Redirect, `notFound`, Grant-RPCs, RLS). Der Advisor-Baum erscheint nur bei `hasAdvisor` in der Advisor-Ansicht.

## 4. Work-Context-Cookie

- Name `ui_work_context`, Werte `founder` | `advisor`, `path=/`, ein Jahr, `samesite=lax`, clientseitig geschrieben wie die Sprachwahl. Bewusst ohne Markennamen; ursprünglich als `work_context` geplant, umbenannt, weil das Team-Intake ein gleichnamiges Antwortfeld hat.
- Gelesen im Root-Layout (`cookies()`), an `ProductShell` übergeben und dort als Client-Zustand gehalten – das Root-Layout rendert bei Client-Navigation nicht neu.
- **Auflösung** (`resolveActiveView`): 1. `/advisor/*` → advisor (immer). 2. Nur eine Rolle → diese Rolle, Cookie ignoriert. 3. Seiten-Override wie bisher. 4. Eindeutige Founder-Seite → founder. 5. Gemeinsame Seite → gespeicherter Wert. 6. Standard founder.
- **Schreiben** (`workContextToStore`), nur bei Doppelrolle: Klick auf den Umschalter; Besuch einer eindeutigen Advisor-Seite (`/advisor/*`) setzt advisor; Besuch einer eindeutigen Founder-Seite (`/dashboard`, `/connections`, `/teams/*`, `/me/*`, `/discovery*`, `/founder-alignment/*`, `/founder-library*`, `/report/*`, `/invite/new`, `/research/workstyle-pretest*`) setzt founder. Gemeinsame Seiten (`/messages`, `/profile`, `/account`, `/connect*`, `/team-intake*`, `/start`, …) schreiben nicht.
- `/team-intake` ist ausdrücklich gemeinsam: `list_team_intakes` liefert Runden, in denen man Reviewer **oder Teilnehmer** ist.
- Nach dem Login gilt unverändert `resolveProductEntryPath`.

## 5. Berechtigungsgrenze des Cookies

Das Cookie beeinflusst ausschließlich Menübaum, Ziel von Logo/„Start“ und den Zustand des Umschalters. Es wird in keinem Datenleser, keiner Action, keiner Seite und keiner Berechtigungsprüfung gelesen. Ein neuer Test (`workContext.test.ts`) erzwingt, dass die Cookie-Konstante und die Auflösungsfunktionen nur in `workContext.ts`, `ProductShell.tsx`, `DashboardViewSwitch.tsx` und `app/layout.tsx` vorkommen. Browserprüfung: Ein Advisor-Deep-Link mit Founder-Cookie zeigt den Advisor-Baum, aber der Zugriff auf Inhalte entsteht weiterhin nur aus den bestehenden Grants.

`hasFounder`/`hasAdvisor` werden unverändert von `getDashboardRoleViews` berechnet (Abschnitt 14).

## 6. Dashboard vorher / nachher

**Vorher** (13 Abschnitte): Abschnittsleiste · Kopfbereich mit „Team Context“-Link, drei Pills und Tageszitat · Netzwerk-Box · Aktuelle Aufgaben · große Align-Karte (Arbeitsweise, Vorhaben, Teamreport-Links) · Discovery-Foundation · Verbindungen/Teams mit Einladungs- und Report-Details · Legacy-Fläche · Explore-Karussell · Profil- und Account-Bereich · Ausblick · Dev-Bereich.

**Nachher**:

1. **Begrüßung** – Avatar, Begrüßung, höchstens eine Hauptaktion (`resolveDashboardPrimaryAction`): Profil vervollständigen → Wie du arbeitest starten/fortsetzen → sonst keine.
2. **Was gerade ansteht** (`#dashboard-block-tasks`) – unverändertes Aufgabenmodell, höchstens drei Aufgaben.
3. **Deine Teams & Verbindungen** (`#dashboard-block-connections`) – unveränderte Team-/Verbindungskarten mit genau einer Aktion („Team öffnen“ bzw. „Verbindung öffnen“), „Alle Verbindungen“, Vorhaben nur mit tatsächlich offener Aktion (begonnen und nicht abgegeben, oder Bestätigung nach Rosteränderung; ohne jedes Vorhaben der Einstieg „Was du aufbauen willst“), „Co-Founder einladen“, leiser Link „Zum Team-Intake“, offene Einladungen eingeklappt (nur wenn vorhanden).
4. **Über dich** (`#dashboard-block-profile`) – Das bist du · Wie du arbeitest (Status + eine Aktion) · Dein FIND-Profil · Angaben bearbeiten; `ProfileBasicsForm` nur bei unvollständigem Basisprofil (`#dashboard-block-profile-data`).

Danach eingeklappt: **Frühere Auswertungen** (nur wenn Inhalte existieren) und **Account & Einstellungen**. Dev-Bereich außerhalb Production unverändert.

## 7. Entfernte und sekundäre Elemente

| Element | Entscheidung |
|---|---|
| Tageszitat | entfernt (Komponente/Helfer, Messages `hero.quoteEyebrow`, `quotes.*`) |
| Ausblick „In Entwicklung“ | entfernt (`outlook.*`) |
| Explore-Karussell | entfernt (`DashboardSpotlight.tsx`, `explore.*`); Library über die Leiste |
| Netzwerk-Box | entfernt (`connect.*` im Dashboard-Namespace, Aufruf `getActiveOwnConnectCounts` auf dieser Seite); Connect behält Zähler und Bereich in der Leiste |
| Abschnittsleiste | entfernt (`DashboardJourneyLine.tsx`, `sectionNavigation.*`) |
| Dekorative Konstellation | entfernt (`DashboardHeroConstellation.tsx`) |
| Drei Pills im Kopfbereich | entfernt (`hero.heroConnections*`, `heroFind`, `heroOwnProfile`); Ziele stehen in Block 3/4 und in der Leiste |
| „Team Context“ im Kopfbereich | entfernt; Founder: leiser Link in Block 3; Advisor: Menüpunkt „Intake“ |
| Große Align-Karte | aufgeteilt in `AlignWorkstyleStatus` (Über dich) und `AlignVentureActions` (Teams), gleiche Statuslogik |
| Legacy-/Versionsfläche, alte Paarreports | zusammengeführt im eingeklappten Bereich „Frühere Auswertungen“ |
| Account-Bereich | **beibehalten**, eingeklappt am Ende: `/account` bietet Support und „Alle Sitzungen abmelden“ nicht an |

Entfernte Message-Schlüssel wurden je Schlüssel auf Verwendung geprüft (Dashboard-Namespace und Unterbereiche); nur durch diesen Umbau ungenutzte Schlüssel wurden entfernt. Bereits vorher ungenutzte Gruppen (`heroPanel`, `profileSnapshot`, `team.incomingHero`, `foundation.alignment/values`) bleiben unangetastet.

## 8. Erhaltene Legacy-Funktionen

- **Abschlusslogik unverändert**: `getInvitationDashboardRows`, `bootstrapInvitationLatestSubmittedBindings`, `finalizeInvitationIfReady`, die Reparaturschleife und `reporting/actions.ts` sind nicht verändert. Der Diff der Dashboard-Seite enthält keine hinzugefügte oder entfernte Zeile mit `finalize`, `bootstrap`, `getInvitationDashboardRows`, `ensureReportRun`, `currentTeamForInvitation`, `debug_invitation_readiness` oder `report_runs`.
- Eingehende/verschickte Einladungszeilen samt bisherigen Zielen (`/report/{id}` ohne Teamzuordnung, `/teams/{id}/workstyle` mit Teamzuordnung, Link-Kopie) bleiben, jetzt eingeklappt.
- Frühere Paarreports, `/me/report`, Values-Hinweis, `/founder-alignment/versionen`, `VersionArchiveCard` bleiben erreichbar.
- `getDashboardRoleViews`, `getAlignDashboardState`, `getDashboardVersionState`, Aufgaben- und Verbindungsmodelle unverändert.

## 9. Deep Links und Anker

Geprüft: `#dashboard-block-*` wird außerhalb der Dashboard-Seite nirgends verlinkt (Aufgaben, E-Mail-Code, Edge Functions, Messages, andere Seiten) – nur Tests referenzierten sie. Erhalten: `dashboard-block-tasks`, `dashboard-block-connections`, `dashboard-block-profile`, `dashboard-block-profile-data`, `dashboard-block-account`, `dashboard-legacy-title`. Entfallen: `dashboard-block-align`, `-foundation`, `-explore`, `-outlook` (ohne externe Verweise). Advisor-Anker (`/advisor/dashboard#advisor-teams`, `#advisor-org`) und Team-Anker (`#relationship-advisor-access`, `/setup#advisor-setup-access`, `#team-alignment`, `#collaboration-lab`) sind unberührt.

## 10. I18n

- Neu in `navigation.json` (DE/EN): `areaStart`, `areaProfile`, `areaTeams`, `profileEdit`, `advisorPeople`, `advisorTeams`, `advisorIntake`, `viewSwitchLabel`, `viewFounder`, `viewAdvisor`. Entfernt nach Verwendungsprüfung: `areaAlign`, `advisorConnections`.
- Neu in `dashboard.json` (DE/EN): `hero.primary.*`, `hero.primaryText.*`, `workProfile.notStarted`, `team.invitationsSummary(Text)`, `team.teamIntakeText/Link`, `team.incomingActions.openTeamReport`, `aboutYou.*`; geändert: `team.title` → „Deine Teams & Verbindungen“ / „Your teams & connections“.
- Ersetzt waren hartkodierte Texte: „Team Context“, „Euer Zusammenspiel“ (Einladungszeile, Align-Karte), „Noch nicht begonnen“, „Teamreport öffnen“, der Beschreibungstext der Teamreport-Box sowie Label und Beschriftungen des Umschalters.
- Parität DE/EN ist durch bestehende Tests abgesichert.

## 11. Tests

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 2.785 / 2.785 erfolgreich |
| `npm run db:test` | 143 Dateien, 2.262 pgTAP-Prüfungen, PASS (lokales Supabase lief, nicht übersprungen) |
| `npx tsc --noEmit` | erfolgreich |
| `npm run lint` | 0 Fehler, 43 Warnungen (unverändert gegenüber vorher) |
| `npm run build` | erfolgreich |
| `npm run ci:check` | erfolgreich (gesamt) |
| `git diff --check` | erfolgreich |

**Neu**: `navigation/__tests__/workContext.test.ts` (Werte, Pfadzuordnung, Vorrang `/advisor/*`, Doppelrolle, eine Rolle, Schreibregeln, Cookie-Grenze); in `founderDashboardV2.test.ts` Tests für die eine Hauptaktion, die feste Reihenfolge der vier Bereiche, entfernte Elemente, Team-Intake-Link und eingeklappte frühere Auswertungen.

**Angepasst** (positive Strukturzusagen auf die neue IA): `alignMenuOrder` (unverändert grün), `areaNavigation`, `areaSubNavigation`, `ownReportReachable`, `founderConnections`, `connectOnlySignup`, `connectSlice1`, `founderDashboardTasks`, `founderDashboardV2`, `founderWorkProfile`, `nurEineFassung`.

**Unverändert erhalten** (Negativ-Garantien): kein Roadmap-/Prozent-/Workbook-Bezug auf dem Dashboard, Aufgabenloader schreibt nicht und liest keine Inhalte, keine Kompatibilitäts-/Score-Sprache in Aufgaben, `finalizeInvitationIfReady` bleibt im Dashboard, keine Research-Einstellungen auf dem Dashboard, DE/EN-Parität, `aria-current` und `flex-wrap`/Mobilmenü-Zusagen der Leiste.

## 12. Browserprüfung

Eigener Dev-Server (Port 3194), Chrome headless über das DevTools-Protokoll (kein zusätzliches Paket), angemeldet über lokale Sitzungs-Cookies. Desktop 1280×900, Mobil 390×844. Gemessen: Leiste, aktiver Bereich, Unterpunkte, Breadcrumb, Umschalter, Cookie, horizontaler Überlauf, Konsolenfehler; Screenshots visuell geprüft.

| Fall | Ergebnis |
|---|---|
| Nur Founder (`dev@`) | Start/Profil/Teams & Verbindungen/Find/Connect; Profil aktiv auf `/me/profile` und `/profile` mit drei Unterpunkten; Teams aktiv auf `/teams/…`; kein „Über dich“-Link; Mobilmenü vollständig; Dashboard in vier Bereichen, kein Zitat/Ausblick/„Team Context“, eine Aktion je Teamkarte; Überlauf 0 |
| Nur Advisor (`advisor@`) | Start/Personen & Gruppen/Teams/Intake/Connect; aktiver Bereich auf `/advisor/group` und `/team-intake`; Advisor-Baum auch auf `/messages` und `/profile`; „Über dich“ bleibt; Überlauf 0 |
| Founder + Advisor (Testkonto) | Founder → `/messages`: Founder-Baum, Cookie `founder`. Advisor → `/messages`: Advisor-Baum, Cookie `advisor`. Advisor-Deep-Link mit Founder-Cookie: Advisor-Baum, Cookie → `advisor`. Founder-Deep-Link mit Advisor-Cookie: Founder-Baum, Cookie → `founder`. `/team-intake` mit Advisor-Cookie: Advisor-Baum, Cookie unverändert. Klick „Advisor“ auf `/messages`: Advisor-Dashboard, Cookie `advisor`. Desktop und Mobil, Überlauf 0 |
| Connect only (Testkonto) | nur Connect; „Über dich“/„Das bist du“/Account erreichbar; Überlauf 0 |
| Legacy-Einladung (zwei Testkonten, echte RPCs `create_founder_invitation_reliable`/`accept_invitation`, beide Basis-Assessments abgegeben) | `/dashboard?invitationId=…` band beide Eingaben (2 `invitation_matching_inputs`) und erzeugte einen `report_runs`-Eintrag (`{base}`); offene Einladung eingeklappt sichtbar |

Konsole: keine Client-Exceptions durch diese Änderung. Gemeldet wurde ein **vorbestehender** Serverfehler (Abschnitt 14, Punkt 1).

Testdaten: vier Konten `p94a-*@cofoundery.local` samt Team, Relationship, Einladung, Assessments und Report-Run lokal angelegt und anschließend entfernt (Löschung mit dem bestehenden transaktionalen Wartungsschalter `app.allow_account_cleanup`; kein Trigger geändert). Endstand identisch zum Ausgangsstand: 4 Seed-Konten, 1 Team, 0 Relationships/Einladungen/Report-Runs/Löschhinweise. Ein Zwischenfehler meines Fixture-Skripts (falsche Fragenkategorie, zwei leere Basis-Assessments) wurde sofort für genau diese Testkonten bereinigt. Seed-Konten wurden nicht verändert. Screenshots, Logs, Chrome-Profil und Skripte liegen nur im Session-Scratchpad, nicht im Repository. Dev-Server und Chrome sind beendet.

## 13. Restpunkte für Phase 9.4B (Team-Homebase)

- Homebase-Struktur (Teamkopf, Verstehen/Vertiefen/Vereinbaren, historische Inhalte eingeklappt) – unverändert in dieser Phase.
- Hartkodierte Texte in `TeamJourneyStatus`, Homebase-Abschnitt „Euer Zusammenspiel“, `FounderTeamNavigation` („Euer Zusammenspiel“, „Frühere Auswertungen“), `teams/[teamId]/workstyle/page.tsx`.
- Veralteter Hinweis `groups.whereToStart`, ungerendertes `groups.understand`.
- Offene Einladungen (`invitations.target_founder_team_id`) werden auf der Homebase nicht angezeigt.
- Paar-Advisor-Verwaltung erscheint nur für Paare mit Legacy-`report_runs` (`FounderRelationshipAdvisorPanel`).
- Fehlende Relationship zwischen später beigetretenen Mitgliedern (z. B. B–C) → kein Commitment-Lab-Eintrag für dieses Paar. Kein UI-Fix; bewusste Grenze aus 9.2.

## 14. Weitere echte technische Folgepunkte

1. **Vorbestehender Fehler im Verbindungsstatus-Loader** (`features/dashboard/founderDashboardConnectionData.ts`, unverändert seit `bbfc1b68`): Die Abfrage `report_runs … .eq("status", "completed")` scheitert, weil `report_runs` keine Spalte `status` hat. Für jeden Founder mit mindestens einer Relationship wirft der Loader `dashboard_connection_statuses_unavailable`; das Dashboard fällt auf Karten **ohne Statuszeilen** zurück. In dieser UX-Phase bewusst nicht korrigiert (Reader-Semantik). Kleine, eigene Korrektur mit Test empfohlen.
2. **Legacy-Abschlusslogik beim Dashboard-Aufruf** (Schreiben und privilegierte Reparatur beim Laden) – eigener Refactoring-Punkt, unverändert.
3. **Rollenquellen**: `getDashboardRoleViews` zählt `founder_alignment_workbook_advisors` (Legacy) und `relationship_advisors`, aber keine Person-Grants/Orgs/Teamreviews; `postAuthRedirect` liest nur `profiles.roles`. Reine Person-Grant-Advisor sehen den Umschalter nicht. Ein späterer Workbook-Rückbau verändert die Navigation. Außerdem nicht gecacht (mehrfach pro Request).
4. **Advisor-Dashboard**: eigener hartkodierter Link „Team Context“ (jetzt doppelt zu „Intake“ in der Leiste); Advisor-Seiten waren nicht Teil dieser Phase.
5. **Kopfzeile bei Advisor-Ansicht**: Mit fünf Bereichen plus rechtem Bereich (inkl. „Über dich“ und Umschalter) bricht die Leiste bei 1280 px in zwei Reihen um (vorgesehenes `flex-wrap`, kein Überlauf). Founder-Ansicht passt in eine Reihe. Gestalterisch prüfen.
6. **Benennung**: „Profil › Angaben bearbeiten“ führt auf `/profile`, dessen Seitentitel und Avatar-Menüeintrag weiterhin „Über dich“ lauten. Bewusst so umgesetzt wie entschieden; Angleichung der Begriffe später prüfen.
7. **Performance des Dashboards** (viele sequentielle Abfragen, doppelte Leser) – unverändert, eigener Punkt.
8. Bereits vorher ungenutzte Dateien (`DailyQuote.tsx`, `dailyQuotes.ts`, `DashboardComparisonWorkspace.tsx`, `StartSessionButton.tsx`, `CopyLinkButton.tsx`) und Message-Gruppen bleiben; separate Bereinigung.

### Geänderte Dateien

- `docs/research/phase-9/phase-9.4a-dashboard-navigation-implementation.md` (neu)
- `web/messages/de/dashboard.json`, `web/messages/en/dashboard.json`
- `web/messages/de/navigation.json`, `web/messages/en/navigation.json`
- `web/src/app/(product)/dashboard/page.tsx`
- `web/src/app/layout.tsx`
- `web/src/features/dashboard/DashboardViewSwitch.tsx`
- `web/src/features/dashboard/founderDashboardV2.ts`
- `web/src/features/dashboard/DashboardHeroConstellation.tsx` (entfernt)
- `web/src/features/dashboard/DashboardJourneyLine.tsx` (entfernt)
- `web/src/features/dashboard/DashboardSpotlight.tsx` (entfernt)
- `web/src/features/instruments/align/AlignCard.tsx`
- `web/src/features/navigation/ProductShell.tsx`
- `web/src/features/navigation/workContext.ts` (neu)
- Tests: `navigation/__tests__/workContext.test.ts` (neu), `navigation/__tests__/areaNavigation.test.ts`, `navigation/__tests__/areaSubNavigation.test.ts`, `dashboard/__tests__/founderDashboardV2.test.ts`, `dashboard/__tests__/founderDashboardTasks.test.ts`, `dashboard/__tests__/founderWorkProfile.test.ts`, `instruments/align/__tests__/nurEineFassung.test.ts`, `reporting/__tests__/ownReportReachable.test.ts`, `connections/__tests__/founderConnections.test.ts`, `connect/__tests__/connectSlice1.test.ts`, `auth/__tests__/connectOnlySignup.test.ts`

NO DATABASE MIGRATION CREATED

NO RLS CHANGED

NO CONSENT SEMANTICS CHANGED

NO RESEARCH DATA EXPOSED

NO LEGACY USER DATA DELETED

NO REMOTE DB PUSH PERFORMED

NO PRODUCTION DEPLOY PERFORMED
