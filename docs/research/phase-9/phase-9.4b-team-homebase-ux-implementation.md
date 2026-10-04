# Phase 9.4B – Team-Homebase / Team-Kontext UX

Stand: 04.10.2026. Branch: `feat/workstyle-reporting-v04`. Ausgangscommit: `4903ef20` (`fix: repair dashboard connection report status`, darunter `e5c0291b` = Phase 9.4A). Änderungen dieser Phase sind lokal und **nicht committed**.

Reine Informationsarchitektur- und Darstellungsarbeit an `/teams/[teamId]` und der Teamnavigation. Keine neue Team-, Relationship-, Agreement-, Assessment-, Advisor- oder Datenlogik.

## 1. Vorher / nachher

**Vorher** (von oben nach unten): Zurück-Link · Kopf („Unsere Zusammenarbeit“ + Teamname) · Teamnavigation mit Kontextzeile, hartkodiertem Extra-Link „Euer Zusammenspiel“ und hartkodiertem „Frühere Auswertungen“ · Founder-Liste mit Einladung · vier große Statuskacheln (hartkodiert Deutsch) · Abschnitt „Euer Zusammenspiel“ (hartkodiert) · Founder Setup („Bereits gestartet“) · „Optionale Vertiefungen“-Hinweis · ggf. Startpunkt-Hinweis („links oben …“) · „Einander kennenlernen“ mit großen RMM- und FitW-Flächen · eingeklappte frühere Auswertungen (mitten in der Seite) · „Verbindlich werden“ mit Commitment Lab · „Zum Nachschlagen“ mit Library-Karte · Advisor-Panel. Capability war nur als letzter Navigationsreiter erreichbar.

**Nachher**:

1. Teamkopf: Name, Kontext, ggf. Begleitung, Mitglieder mit Avataren und Anzahl, Einladung bzw. Hinweis bei vier, darunter eine kompakte Statuszeile.
2. Teamnavigation: Übersicht · Euer Zusammenspiel · Fähigkeiten & Rollen · Founder Setup · Library, rechts leise „Frühere Auswertungen“.
3. **Verstehen**: Euer Zusammenspiel · Was ihr aufbauen wollt · Was ihr einbringt.
4. **Vertiefen**: ausdrücklich zu zweit – Commitment Lab je tatsächlich vorhandenem Paar, Read My Mind, Founder in the Wild.
5. **Vereinbaren**: Founder Setup mit Zählung, Rosterhinweis, Advisor-Aufgabe, Setup öffnen, Dokument.
6. Zum Nachschlagen: schlichte Library-Zeile.
7. Frühere Auswertungen und Arbeitsstände: eingeklappt, am Ende.
8. Advisor-Panel (nur wo der bestehende Vertrag es zeigt).

## 2. Neue Informationsarchitektur

Drei Ebenen in der Reihenfolge, in der ein Team sie benutzt: **Verstehen → Vertiefen → Vereinbaren**. Founder Setup bleibt trotzdem „von oben“ erreichbar: über die Statuszeile im Kopf und über die Teamnavigation, beide oberhalb von „Vertiefen“. Die Zusage aus Phase 9.2 („Setup ist vor den optionalen Vertiefungen erreichbar“) ist damit weiter erfüllt und durch einen Test abgesichert; das vollständige Setup-Panel steht wie im abgestimmten Zielbild unter „Vereinbaren“.

Teamnavigation (`FounderTeamNavigation`): fünf Bereiche mit aktivem Zustand und `aria-current`, frühere Auswertungen als sekundärer Link (`#team-alignment`). Die Kontextzeile „Bereiche für {team}“ entfällt (wiederholte den Kopf; die Rollen-Seite rief sie ohne Teamnamen auf). Die Workstyle-Seite zeigt die Teamnavigation jetzt ebenfalls – nur für Mitglieder (nicht für Advisor) und nicht im Druck (`ws-no-print`). Commitment-Lab-Seiten markieren „Übersicht“ (früher „Alignment“). Keine Route gelöscht oder umbenannt.

## 3. Teamheader

- Name: `team.name`, sonst die Founder-Namen mit „+“ (bestehender Fallback).
- Kontext: bestehende Texte „Ihr prüft eine gemeinsame Gründung“ / „Ihr arbeitet bereits als Founder-Team zusammen“.
- Begleitung: nur **verbundene** Paar-Advisor aus dem bestehenden Reader (`team.advisors`, `status = linked`), z. B. „Begleitung: Petra Begleitung“. Keine neue Abfrage, keine Ableitung aus Rollen.
- Mitglieder: Avatar oder Initialen plus ausgeschriebener Name (Information nie nur über Farbe), Überschrift „{n} Founder“.
- Einladung „Weitere Person in dieses Team einladen“ bei < 4 (bestehende Route `/invite/new?team=…`); bei 4 nur der Hinweis „Dieses Team hat vier Mitglieder …“.
- Statuszeile (`TeamJourneyStatus`): vier getrennte Zustände – Deine Arbeitsweise, Deine Angaben zum Vorhaben, Euer Zusammenspiel, Founder Setup – je als Text plus Link. Kein Fortschrittsbalken, kein Prozent, keine „3 von 4“, keine Ampel.

## 4. Verstehen

| Einstieg | Ziel | Aktion |
|---|---|---|
| Euer Zusammenspiel – „So arbeitet ihr zusammen: wo sich eure Arbeitsweisen ähneln, wo sie sich unterscheiden und worüber es sich zu sprechen lohnt.“ | `/teams/[teamId]/workstyle` | Ansehen |
| Was ihr aufbauen wollt – „Ziele, Zeit, Geld, Risiko und Erwartungen an dieses Vorhaben – jede Person antwortet für sich.“ | `/founder-alignment/vorhaben?venture=…` bzw. `/antworten?venture=…` | Beginnen / Fortsetzen / Deine Angaben ansehen (aus demselben Venture-Zustand wie die Statuszeile) |
| Was ihr einbringt – „Erfahrung, gewünschte Verantwortung und was ihr lieber abgebt oder extern löst – nebeneinander, ohne Bewertung.“ | `/teams/[teamId]/roles` | Ansehen |

Kein Score, keine Bewertung. Die Statuszeile und die Venture-Aktion lesen dieselben bestehenden Quellen (siehe Abschnitt 9).

## 5. Vertiefen

Einleitung: „Freiwillige Formate, die ihr jeweils zu zweit macht. Was dabei herauskommt, gilt für dieses Paar – nicht automatisch für das ganze Team.“

- **Zwei Founder**: Das Paar wird genannt („Ihr zwei: A & B“); Commitment Lab, Read My Mind und Founder in the Wild stehen darunter.
- **Drei/vier Founder**: Hinweis, dass RMM und FitW derzeit nur in Zweierteams startbar sind und das Commitment Lab mit direkt verbundenen Personen genutzt wird. Jede Commitment-Zeile nennt ihr Paar („Für A & C“).
- Die Paarliste kommt ausschließlich aus `team.alignment` (bestehende Relationships, beide Personen aktuelle Mitglieder, angemeldete Person beteiligt). **Keine** theoretischen Paare, **keine** Relationship-Erzeugung, **kein** neuer Pair-Selector.
- RMM- und FitW-Karten sind ruhiger gestaltet (keine Verlaufsflächen, keine doppelte Sammelüberschrift, `h3` unter der Bereichsüberschrift). Zustände, Aktionen, Anker (`#collaboration-lab`) und Datenzugriffe sind unverändert; im 3/4-Team zeigen sie weiterhin ihren ehrlichen Hinweis bzw. den Link auf eine abgeschlossene frühere Runde.
- Startpunkt-Hinweis für ein neues Paar (Logik unverändert) mit korrigierter Copy (verweist auf „Vertiefen“ statt „links oben“).

## 6. Vereinbaren

Founder-Setup-Panel (visuell der stärkste Bereich):

- Zählung **wörtlich wie auf der Setup-Seite** (`countFounderSetupStatuses`): „{x} festgehalten · {y} in Klärung · {z} offen · {p} Bestätigungen offen“. Kein Nenner, kein Prozent. Ohne Beginn „Noch nicht gestartet“; Reader nicht lesbar → „Status nicht verfügbar“.
- Rosteränderung: der bestehende Hinweis `teams.setup.rosterChanged` erscheint, wenn eine frühere Bestätigung nicht von allen aktuellen Mitgliedern getragen wird. Eine solche Revision zählt nicht als festgehalten.
- Advisor-Setup-Aufgabe (`pendingSetupAdvisorTask`, Anker `#advisor-setup-access`) unverändert.
- Aktionen: „Founder Setup öffnen“, bei begonnenem Setup zusätzlich „Dokument ansehen“ (`/setup/document`).
- Keine neue Agreement-Logik, keine automatische Revision oder Bestätigung, keine Workbook-Zustimmung als aktuelle Zustimmung.

## 7. Capability / Rollen

„Was ihr einbringt“ ist jetzt ein eigener Einstieg unter „Verstehen“ und in der Navigation als „Fähigkeiten & Rollen“ (früher „Rollen“, letzter Reiter). Die Copy nennt die drei Achsen getrennt: Erfahrung (application_level), gewünschte Verantwortung (ownership_wish), abgeben/extern lösen (Ownership-Wunsch `prefer_other`/`prefer_external` bzw. Sourcing). Die Rollen-Seite selbst und ihre Daten sind unverändert.

## 8. Pairwise-Darstellung 2 / 3 / 4

| Team | Gezeigte Paare (Browser) |
|---|---|
| 2 (E, F) | „Ihr zwei: E & F“, ein Commitment-Einstieg, RMM/FitW startbar |
| 3 (A, B, C; Relationships A–B, A–C) | A: A–B und A–C · B: nur A–B · C: nur A–C · kein B–C · RMM/FitW mit Zweier-Hinweis |
| 4 (G, H, I, J; Relationships G–H, G–I, G–J) | G: drei Paare · H: nur G–H · RMM/FitW mit Zweier-Hinweis |

## 9. Founder Setup und Statuszeile

`TeamJourneyStatus` ist in Daten (`loadTeamJourneyStatus`) und Darstellung getrennt. Die vier Ableitungen sind **unverändert** (gleiche Abfragen bzw. RPC `get_workstyle_product_team_status`; Setup aus demselben Readmodel, „bestätigt“ nur bei Bestätigung aller aktuellen Mitglieder). Neu ist nur: Die Homebase lädt das Setup-Readmodel (`getFounderSetup`) einmal und gibt es an Statuszeile und Panel weiter; vorher fragte die Statuszeile es zusätzlich selbst ab und die Seite nur `getFounderSetupStarted`. Ein Lesefehler führt zu „Status nicht verfügbar“ statt zu einem Seitenfehler.

Hinweis: Die Statuszeile zeigt bei einer nicht mehr gültigen Bestätigung „In Klärung“ (bestehender Vertrag: `rosterConfirmationMissing` zählt dort mit), die Setup-Zählung zählt das Thema dagegen unter „offen“ (bestehender Vertrag der Setup-Seite). Beide Verträge sind beibehalten; der Rosterhinweis darunter erklärt die Lage.

## 10. Historische Inhalte

„Frühere Auswertungen und Arbeitsstände“ (`<details id="team-alignment">`) ist eingeklappt, steht am Ende (vor dem Advisor-Panel) und ist optisch sekundär. Inhalt unverändert: Paarreports, frühere Workbook-Auswertung, historische Matching-Arbeitsstände, älterer Report (leise), historische Notizen/Entwürfe. Anker und Links erhalten; keine Daten gelöscht.

## 11. Advisor

- Paar-Advisor-Panel (`FounderRelationshipAdvisorPanel`) unverändert, am Ende der Seite. Es erscheint weiterhin nur für Paare mit Legacy-`report_runs`/`sourceInvitationId` (Browser: Zweierteam mit historischer Auswertung ja, Dreier-/Viererteam nein).
- Teamkopf nennt verbundene Paar-Advisor aus demselben Reader.
- Setup-Advisor-Aufgabe unverändert im Setup-Panel.
- Keine neue Berechtigung, keine neuen Grants, keine Ausweitung auf Teams ohne passenden Vertrag.

## 12. Invite

Bei < 4 Mitgliedern der bestehende Einladungs-Link im Teamkopf, bei 4 keiner (Browser bestätigt). Offene Einladungen werden **nicht** angezeigt: Der Homebase-Reader liefert sie nicht, und eine zusätzliche Abfrage war nicht Teil dieser Phase.

## 13. I18n

Neu in `teams.json` (DE/EN): `homebase.founders.count`, `homebase.header.advisors`, `homebase.journey.*`, `homebase.understand.*`, `homebase.deepen.*`, `homebase.setup.document`, überarbeitete `homebase.groups.*` (Verstehen/Vertiefen/Vereinbaren, korrigierter Startpunkt), `teamNavigation.workstyle`; geändert `teamNavigation.roles` („Fähigkeiten & Rollen“ / „Skills & roles“), `teamNavigation.alignment` („Frühere Auswertungen“ / „Earlier results“), `teamNavigation.library` („Library“).

Entfernt nach Verwendungsprüfung: `homebase.title`, `homebase.pairScope`, `homebase.founders.title`, `teamNavigation.context`, `collaborationLab.homebase.title`/`.description`.

Ersetzte hartkodierte Texte: die vier Statuskacheln (Namen und Zustände), Abschnitt „Euer Zusammenspiel“ samt Fließtext und Link, „Euer Zusammenspiel“ und „Frühere Auswertungen“ in der Teamnavigation.

## 14. Accessibility

- Genau eine `h1` (Teamname); `h2` je Ebene; `h3` je Karte/Panel.
- Statuszeile als beschriftete Liste (`aria-label`), Zustände als Text.
- Teamnavigation mit `aria-label` und `aria-current="page"`.
- Avatare mit Alt-Text; Namen immer ausgeschrieben.
- Alle Aktionen sind echte Links; Ziele mindestens 44 px hoch; sichtbarer Fokusring.
- `details/summary` für den Rückblick mit Fokuszustand.

## 15. Mobile / Desktop

Geprüft bei 1280×900 und 390×844 (Chrome headless über das DevTools-Protokoll, eigener Dev-Server, lokale Testkonten). Horizontaler Überlauf überall 0. Avatare brechen bei 3/4 sauber um (2×2 bei 390 px), Statuszeile stapelt, Karten stehen untereinander, Commitment-Aktionen volle Breite, Teamnavigation bricht bedienbar um. Screenshots visuell geprüft (Zweierteam Desktop/Mobil, Dreierteam Desktop, Viererteam Mobil). Der bestehende Forschungs-Dialog für Konten ohne Entscheidung wurde nur für Screenshots per CSS ausgeblendet, keine Entscheidung geschrieben. Druck: Die Homebase ist nicht druckrelevant; auf der Workstyle-Seite liegt die neue Navigation im `ws-no-print`-Bereich.

## 16. Tests

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 2.789 / 2.789 |
| `npm run db:test` | 143 Dateien, 2.262 Prüfungen, PASS (lokales Supabase lief) |
| `npx tsc --noEmit` | erfolgreich |
| `npm run lint` | 0 Fehler, 43 Warnungen (unverändert) |
| `npm run build` | erfolgreich |
| `npm run ci:check` | erfolgreich |
| `git diff --check` | erfolgreich |

Nach dem `ci:check`-Lauf wurden nur noch zwei ungenutzte Message-Schlüssel entfernt; `npm test` und `tsc` danach erneut grün.

**Neu** (`teams/__tests__/teamHomebaseOrder.test.ts`): Reihenfolge Kopf → Status → Verstehen → Vertiefen → Vereinbaren → Nachschlagen → Rückblick → Advisor; jedes Angebot in seiner Ebene; Setup über Statuszeile und Navigation oberhalb von „Vertiefen“; Statuszeile mit vier getrennten Zuständen ohne Gesamtwert und mit Roster-Regel; Vertiefen nur aus `team.alignment`, keine Paarkombinationen, keine Relationship-Erzeugung, Paarname ab drei Mitgliedern, Zweier-Hinweis für RMM/FitW.

**Angepasst** (positive Struktur): `teamHomebaseOrder` (Reihenfolge, `!setup?.started`), `readMyMindSlice2A` (RMM in „Vertiefen“), `commitmentLabV1` (Lab in „Vertiefen“, vor Setup und Rückblick), `founderTeamHomebase` (DE/EN-Kopie der drei Ebenen).

**Unverändert grün** (u. a. Negativ-Garantien): kein `alignmentPercent|compatibilityScore|teamHealth`, Mitgliedschaftsprüfung und `notFound`, Avatar-Reihenfolge Founder < Setup < Rückblick < Notizen < Advisor (`founderTeamUi`), `<details` vor historischen Notizen (`historicalWorkbook`), `#team-alignment` (`founderConnections`), Advisor-Aufgabe (`advisorInvitationUxReliability`), Setup-Link (`founderSetup`), Library nach Setup (`founderLibrary`), Rollen-Reiter (`capabilityTeamPage`), FitW-/RMM-Zustände.

## 17. Bekannte funktionale Grenzen (bewusst nicht gelöst)

- **A – Paar-Advisor-Verwaltung** erscheint nur für Paare mit Legacy-`report_runs`/`sourceInvitationId`. Neue Teams ohne Legacy-Report haben auf der Homebase keine Paar-Advisor-Verwaltung. Keine neue Advisor-Logik gebaut.
- **B – fehlende Paar-Relationships** nach C/D-Beitritt (z. B. B–C, H–I): Für diese Paare gibt es keinen Commitment-Einstieg. Die UI zeigt ehrlich nur vorhandene Paare; keine Relationship wurde erzeugt.
- RMM/FitW ohne Paarauswahl in 3/4-Teams (kein neuer Selector).
- Offene Team-Einladungen werden nicht angezeigt (kein vorhandener Reader).
- Anzeigenamen kommen aus dem bestehenden Namens-Reader; bei Konten ohne freigegebene Darstellung erscheinen Fallbacks („Founder 1 …“).
- Begriffe: Karte „Was ihr einbringt“, Reiter „Fähigkeiten & Rollen“, Seitentitel der Rollen-Seite weiterhin „Rollen und Zuständigkeiten“ – angleichen, wenn die Rollen-Seite überarbeitet wird.

## 18. Offene Punkte für das Report Quality Review

- `teams/[teamId]/workstyle/page.tsx` und `TeamWorkstyleReport` enthalten weiterhin hartkodierte deutsche Texte („Zum Team“, „Euer Zusammenspiel“, „Euer Vorhaben“, Druck-/Snapshot-Texte).
- Länge und Hierarchie des Teamreports (insbesondere bei vier Personen), Gesprächsimpulse, Komponentenmatrix.
- Capability-Teamseite: Begriffe, Darstellung von Anwendung / Ownership / Sourcing.
- Venture-Alignment-Darstellung im Team (inkl. R02 bei 3+).
- Statuswortlaut „In Klärung“ (Statuszeile) vs. „offen“ (Setup-Zählung) bei Rosteränderung – fachlich korrekt nach bestehenden Verträgen, sprachlich prüfen.

Testdaten: 9 lokale Konten `p94b-*@cofoundery.local` mit 2er-, 3er- und 4er-Team über die echten RPCs (`create_founder_invitation_reliable`, `create_founder_team_invitation`, `accept_invitation`, `propose_founder_team_setup_revision`, `confirm_founder_team_setup_revision`, `save_founder_team_setup_working_state`), dazu direkt angelegt: Basis-Assessments für die historische Auswertung, ein leerer Venture-Entwurf und ein verbundener Paar-Advisor-Datensatz. Danach vollständig entfernt (Relationships, dann Konten, mit dem bestehenden Wartungsschalter `app.allow_account_cleanup`). Endstand identisch zum Ausgangsstand: 4 Seed-Konten, 1 Team, 0 Relationships/Advisor/Einladungen/Report-Runs/Setup-Einträge/Löschhinweise. Seed-Konten nicht verändert; Skripte, Logs und Screenshots nur im Session-Scratchpad.

### Geänderte Dateien

- `docs/research/phase-9/phase-9.4b-team-homebase-ux-implementation.md` (neu)
- `web/messages/de/teams.json`, `web/messages/en/teams.json`
- `web/messages/de/collaborationLab.json`, `web/messages/en/collaborationLab.json`
- `web/src/app/(product)/teams/[teamId]/page.tsx`
- `web/src/app/(product)/teams/[teamId]/workstyle/page.tsx`
- `web/src/app/(product)/teams/[teamId]/roles/page.tsx`
- `web/src/app/(product)/teams/[teamId]/setup/page.tsx`
- `web/src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx`
- `web/src/app/(product)/teams/[teamId]/founder-library/page.tsx`
- `web/src/app/(product)/teams/[teamId]/commitment-lab/[relationshipId]/page.tsx`
- `web/src/features/teams/FounderTeamNavigation.tsx`
- `web/src/features/teams/TeamJourneyStatus.tsx`
- `web/src/features/collaborationLab/ReadMyMindHomebaseCard.tsx`
- `web/src/features/founderInTheWild/FounderInTheWildHomebaseCard.tsx`
- `web/src/features/founderLibrary/FounderLibraryHomebaseCard.tsx`
- Tests: `teams/__tests__/teamHomebaseOrder.test.ts`, `teams/__tests__/founderTeamHomebase.test.ts`, `collaborationLab/__tests__/readMyMindSlice2A.test.ts`, `commitmentLab/__tests__/commitmentLabV1.test.ts`

NO DATABASE MIGRATION CREATED

NO RLS CHANGED

NO CONSENT SEMANTICS CHANGED

NO RESEARCH DATA EXPOSED

NO RELATIONSHIPS AUTO-CREATED

NO LEGACY USER DATA DELETED

NO REMOTE DB PUSH PERFORMED

NO PRODUCTION DEPLOY PERFORMED
