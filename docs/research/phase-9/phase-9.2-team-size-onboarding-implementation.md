# Phase 9.2 – Teamgröße, Onboarding und Handoffs

Stand: 04.10.2026. Ausgangspunkt: `feat/workstyle-reporting-v04`, Commit `ff84683f40c1a5a6b7a62fa7bd7d86eda5bd702f`. Änderungen dieser Phase sind lokal, nicht deployed und nicht committed.

Grundlagen: [Systemaudit](phase-9.0-align-system-audit.md), [Phase 9.1](phase-9.1-align-journey-implementation.md). Maßgeblich waren zusätzlich der aktuelle Code und die Funktionsdefinitionen der laufenden lokalen Datenbank `supabase_db_cofoundery-app`; alte Migrationen allein wurden nicht als aktueller Vertrag betrachtet.

## 1. Vorher / nachher und überprüfter Ist-Zustand

| Bereich | Vorher, im Code / lokaler DB | Nachher |
|---|---|---|
| Kanonisches Team | `founder_teams` / `founder_team_members`, maximal vier, Teamzeile serialisiert Beitritte | Unverändert |
| Relationship | Global eindeutiges Personenpaar, höchstens einem Founder-Team zugeordnet | Unverändert; kein automatisches Umhängen |
| Klassische Einladung | Erzeugt/wiederverwendet Relationship; übernimmt genau ein geeignetes Solo-Vorhaben oder legt Team an | Bestehende Logik erhalten; explizite Einladung in ein bestehendes Team ergänzt |
| C/D hinzufügen | Internes `ensure_founder_team_for_relationship(..., team)` vorhanden, kein entsprechender Founder-Einstieg | Homebase → vorhandene `/invite/new?team=…` → vorhandener Token-/Join-Flow |
| FIND | Bewusster, bestätigter Erstkontakt → bestehender Relationship-/Team-Handoff | Unverändert; danach C/D über dieselbe Team-Einladung |
| Workstyle-Report | Bereits 2–4, aktuelle v0.4-Version, personenspezifische Shares | Unverändert, zusätzliche Roster-/Snapshot-Regressionsprüfungen |
| Setup-Produktreport | Prüft bereits Bestätigungen aller aktuellen Mitglieder | Unverändert |
| Setup-UI / Homebase-Status | Bestätigungspointer allein konnte einen alten Paarstand weiterhin als aktuell darstellen | Readmodel prüft aktuellen Roster; Hinweis und Status „In Klärung“ bei fehlender Zustimmung |
| RMM / FITW | Produkt-UI und Server Actions nur zwei; kein fertiger Paarselektor im größeren Team | Grenze ausdrücklich erklärt, keine Freischaltung der teilweisen RMM-Dreierfähigkeit |
| Commitment | Relationship-basiert; Handoff nur bei genau zwei; Dreier-Hinweis galt nicht für vier | Hinweis gilt auch für vier, Paar bleibt explizit |
| Intake | Generische Teilnehmer-/Reviewer-/Directed-Pair-Arrays, aber zwei DB-Prüfungen und Action max. drei | Bestehendes Instrument jetzt 2–4 |
| Invite-Welcome | Angenommene Einladung wurde nach Tokenablauf als abgelaufen angezeigt | Bereits angenommene Einladung bleibt fortsetzbar |

Quellanker: `founderTeamHomebaseData.ts`, `founderTeamHomebaseModel.ts`, `currentJourneyData.ts`, `invitationFlow.ts`, `readMyMindActions.ts`, `founderInTheWildActions.ts`, `commitmentLabActions.ts`, `team-intake/*`, Migrationen `20261114120000_workstyle_product_reporting.sql` und `20261115120000_discovery_workstyle_contract.sql`. Für die neue Migration wurden die aktuellen lokalen Definitionen von Einladungstrigger, Intake-Erstellung und Intake-Rosterprüfung gelesen.

## 2. Teammodell

Keine neue Team-, Venture-, Advisor- oder Agreement-Tabelle. Team = n:m; Relationship = konkretes Zweierpaar. Die bestehende Vierergrenze bleibt in `enforce_founder_team_member_limit` und `ensure_founder_team_for_relationship` bestehen. Die Teamzeile wird bei Beitritt gesperrt; offene Einladungen reservieren keinen Sitz.

Beziehungen werden nicht zwischen Teams verschoben. Gehört das einladende Paar bereits zu einem anderen Team, schlägt die gezielte Annahme geschlossen fehl. Es wird weder ein weiteres Team angelegt noch eine alte Beziehung umgehängt. Mehrere Teams derselben Person bleiben fachlich möglich; ähnliche Roster werden deshalb nicht heuristisch zusammengelegt.

## 3. Invite-/Join-Flows

- Auf der Homebase steht bei weniger als vier Mitgliedern „Weitere Person in dieses Team einladen“.
- `/invite/new?team=…` liest das Team mit dem bestehenden Membership-Reader. Fremde Team-IDs ergeben keinen nutzbaren Einstieg. Bei vier Mitgliedern führt die Route zur Homebase zurück.
- Bestehendes `CoFounderInviteForm` erhält den Teamkontext. Es verlangt weder eine neue Kontextentscheidung noch eine historische Modulwahl für diesen gezielten Beitritt.
- Die bestehende Server Action verwendet dafür `create_founder_team_invitation`. Dieser schmale RPC prüft Mitgliedschaft, Kapazität und bereits bestehende Mitgliedschaft des Empfängers und ruft den bisherigen sicheren Einladungsersteller auf.
- `invitations.target_founder_team_id` hält ausschließlich die bewusste Zielzuordnung fest. Ein Trigger schützt sie gegen Retargeting; Team und Kontext müssen zusammenpassen.
- `accept_invitation` bleibt der bestehende, emailgebundene und idempotente Token-Reader/Mutator. Der vorhandene Acceptance-Trigger erhält einen Zielteam-Zweig. Vor dem Beitritt werden aktuelle Mitgliedschaft des Einladenden und Relationship-Zuordnung erneut geprüft.
- Annahme, Membership und Relationship-Zuordnung geschehen in derselben DB-Transaktion. Fehlende Kapazität lässt die Einladung offen und hinterlässt keine teilweise hinzugefügte Person.
- Keine Workstyle-/Research-/Advisor-/Setup-Freigabe entsteht durch die Einladung.
- Bereits angenommene Einladungen dürfen auch nach Tokenablauf fortgesetzt werden; nicht angenommene abgelaufene oder widerrufene Einladungen bleiben gesperrt.
- Bestehende Profile und neue Accounts nutzen weiterhin den vorhandenen Login-/Pending-Token-/Welcome-Vertrag. Unvollständige Basics führen zum vorhandenen optionalen Profileinstieg; dessen Fortsetzung zeigt auf den aktuellen Teamreport. Keine ältere Assessmentstrecke wurde als Pflicht eingeführt.

Eine Einladung ohne explizites Ziel verwendet weiterhin die bestehende Solo-/Paar-Semantik. Es gibt keinen stillen Merge nach gleichem Namen oder überlappenden Mitgliedern.

## 4. Zwei Founder

Aktueller Workstyle-Report, Venture Alignment und Setup bleiben nutzbar. Commitment ist konkret paarbezogen. RMM und FITW können im bestehenden Zweierteam gestartet werden. Der gezielte Invite fügt C genau diesem Team hinzu. Historische Paarreports bleiben lesbar.

## 5. Drei Founder

Report liest drei aktuelle Profile und die jeweils erforderlichen Shares. C erhält keine frühere Vereinbarung automatisch. Homebase zeigt den aktuellen Roster, explizite Beziehungen des eingeloggten Mitglieds und die Grenzen der Paarvertiefungen. Commitment ist über eine vorhandene passende Relationship nutzbar; RMM/FITW starten keinen unvollständigen Gruppenflow. Intake unterstützt alle drei Teilnehmer wie bisher.

## 6. Vier Founder

D wird über denselben Invite-Vertrag hinzugefügt. Report und Setup bleiben n-member. Homebase zeigt die erreichte Grenze; ein fünfter Beitritt wird auch bei bereits vorher ausgestellter Einladung serverseitig abgewiesen. Intake unterstützt vier Teilnehmer, zwölf gerichtete Paarperspektiven und Veröffentlichung erst nach allen vier Freigaben. Diese Perspektiven bleiben als Autor → Gegenüber erkennbar; es entsteht kein Team-Score.

## 7. Pairwise Modules

| Modul | Produktgrenze | Handoff |
|---|---|---|
| Commitment Lab | Relationship-Paar innerhalb eines 2–4-Teams; Reader verlangt eigene Beteiligung und aktuelle Mitgliedschaft beider Personen | Bestehende explizite Kopierfunktion nur genau zwei Mitglieder; bei 3/4 Links zur gemeinsamen Klärung |
| Read My Mind | Zwei Mitglieder; historische Daten bleiben unter bisherigen Readern | Keine neue Paarauswahl, keine Aktivierung teilweise vorhandener Dreier-DB-Funktionen |
| Founder in the Wild | Zwei Mitglieder | Bestehender situativer Lern-/Debrief-Flow, kein Teamresultat aus Paarantworten |

Die Homebase erklärt: Diese Vertiefungen finden zwischen zwei Teammitgliedern statt. Der konkrete Commitment-Eintrag nennt das Paar. Keine zusätzlichen Relationships zwischen sämtlichen Teammitgliedern werden künstlich angelegt. Entfernte Personen verschwinden aus der aktuellen Homebase-Paarliste; historische Daten werden nicht gelöscht.

## 8. Workstyle-Report und Status

Instrument `founder-workstyle-pretest-8-5a-v3`, Itemversion `8.4-v0.4`, Manifest `3.0.0`, Report `workstyle-report/1.0.0` unverändert. Es bleiben exakt 29 produktfähige Core-Antworten; 23 Research-/Candidate-Antworten bleiben privat. Kein alter Paarreport als Fallback.

Der vorhandene Reader berechnet aktuelle Inputs bei jedem Lesen aus dem Roster. Eine neue Person ohne passendes aktuelles Profil bzw. ohne erforderliche Freigabe verhindert die entsprechende aktuelle Auslieferung. Personenspezifische Workstyle- und Venture-Zustände, Reportverfügbarkeit und Setup-Status bleiben getrennt. Kein Gesamtprozentsatz und kein neuer Status-/Consent-Store.

## 9. Venture Alignment

`venture-alignment-v1` und die 42 aktiven Items wurden nicht geändert. Die bestehende `venture_id = team_id`-Bindung und individuelle Antwortfreigaben bleiben maßgeblich. Einstieg über den vorhandenen Journey-Status. `alignmentModel.ts` markiert R02 bei mehr als zwei Personen bereits als nicht eindeutig zuordenbar und erzeugt daraus keinen Unterschiedsbefund. Diese sichere Darstellung wurde beibehalten.

## 10. Founder Setup

20 Themen, Working State, Diskussion, Revision, Bestätigung, Historie und Dokument bleiben bestehen. Das UI-Readmodel folgt jetzt der bereits vorhandenen Produktreport-Regel: Ein gespeicherter historischer Bestätigungspointer allein genügt nicht; alle aktuellen Mitglieder müssen in den Bestätigungen enthalten sein.

Bei Wachstum bleibt die alte Revision gespeichert und über die Historie lesbar. Der neue Hinweis erklärt, dass eine erneute Diskussion und bei Bedarf eine neue Revision nötig sind. Es gibt keine automatische Revision, Vereinbarung oder Zustimmung. Pending-Revisions werden weiter durch die bestehende, teamzeilengesperrte DB-Confirmation-Funktion gegen den aktuellen Roster geprüft. Nach Entfernung eines Mitglieds zählt die Zustimmung aller noch aktuellen Mitglieder; historische Bestätigungen werden nicht gelöscht.

Die Homebase zeigt Setup jetzt vor den optionalen Paarvertiefungen. Die vier Statusfelder behalten getrennte Verträge; fehlende Roster-Bestätigung wird nicht mehr als „Bestätigte Themen vorhanden“ ausgegeben.

## 11. Team Intake

Bestehende Tabellen, Round, Teilnehmer, Reviewer, Rosterbestätigung, private Hinweise, gerichtete Antworten und Withdrawal wiederverwendet. Keine fachliche Itemänderung und kein Intake-v2.

Additiv geändert: `create_team_intake` und `team_intake_roster_matches` von 2–3 auf 2–4; Actionvalidierung, Text und Eingabelänge entsprechend. Die übrigen Schleifen und Readermodelle sind bereits generisch. Ein vorhandenes Team wird nur bei passendem exaktem Roster und vorhandener Berechtigung gewählt. Die explizite Neuteam-Option bleibt eine eigene Kontextentscheidung, kein automatischer Abgleich ähnlicher Roster.

Rosterwechsel widerrufen bestehende Intake-Rounds über `invalidate_team_intake_membership`; historische Zeilen werden nicht gelöscht. Benannte Reviewer sehen erst freigegebene Daten, private Hinweise gehen nicht in den gemeinsamen Report.

## 12. Advisor

Keine neue Advisor-Freigabe. `can_read_workstyle_team` verlangt für Mehrpersonenteams weiterhin eine aktive Review mit exakt passendem freigegebenem Roster; eine alte Paarfreigabe genügt nicht. Workstyle- und Capability-Zugriff werden zusätzlich personenbezogen geprüft. `get_advisor_confirmed_founder_setup` und bestehende Setup-Grants bleiben eigenständig.

Setup-Grant-Trigger pausieren bei hinzugefügten Mitgliedern und prüfen beim Entfernen den verbleibenden Roster. Historische Advisor-Reviews bleiben ihre ursprünglichen Reviewkontexte; sie werden nicht als neues größeres Team ausgegeben. Kein automatischer Zugriff auf Paar-Lab-Rohdaten, Research oder Intake durch Advisor-Rolle allein.

## 13. Snapshots und Teamänderungen

Keine Snapshotmigration und keine neue Semantik. Auslieferung vergleicht weiterhin aktuelle, berechtigte Produktinputs mit dem gespeicherten Input. Zusätzliche Regressionen prüfen ausdrücklich 2→3, 3→4 und Entfernung von D: ein nicht mehr passender Snapshot wird nicht ausgeliefert. Vorhandene Tests für Hidden Blocks, Widerruf, fremden Snapshot und Instrumentisolation bleiben bestehen.

Das ist eine Prüfung des aktuellen Inputs, keine irreversible Löschung alter Snapshots. Historische Snapshotzeilen bleiben gespeichert; ein unverändert identischer, erneut berechtigter Input folgt weiterhin der bisherigen Wiederverwendungsregel.

## 14. Security

- Keine RLS-Policy gelockert; keine neuen direkten Schreibrechte auf Memberships.
- Invite-Ziel ist serverseitig gebunden, gegen Client-Retargeting geschützt und bei Annahme erneut geprüft.
- Nichtmitglied kann keinen Team-Invite ausstellen; entfernter Einladender kann über einen alten offenen Invite keinen Beitritt mehr autorisieren.
- Foreign Team, Relationship-Teilnahme, aktuelle Mitgliedschaft und Advisor-Roster sind getrennte Prüfungen.
- Join gibt keine Antwort-Shares, Capability-Disclosure, Research-Einwilligung oder Agreement-Bestätigung.
- Capability Evidence, pending Proposals und bestehende Disclosure-Logik unverändert.
- Workstyle-Produktreader und private Research-Speicher unverändert.
- Testkonten und Browserzustände sind ausschließlich lokal und außerhalb des Repositorys angelegt; keine Testmail wurde versendet.

## 15. Migrationen

`supabase/migrations/20261116120000_team_size_onboarding.sql`:

1. Nullable FK `invitations.target_founder_team_id`.
2. Trigger `guard_invitation_target_team`.
3. Schmaler RPC `create_founder_team_invitation`, authenticated only.
4. Additive Ersetzung des aktuellen Acceptance-Triggers mit explizitem Zielzweig; bestehende Solo-Übernahme bleibt erhalten.
5. Zwei vorhandene Intake-Funktionen erlauben vier Teilnehmer.

Zusätzlich `supabase/migrations/20261116130000_preserve_team_invite_history.sql`: Die bestehende Leerteam-Bereinigung berücksichtigt nun historische Invite-Verweise. Das letzte Mitglied kann entfernt werden, ohne an dem neuen FK zu scheitern; der leere Kontext bleibt für die referenzierenden Einladungen erhalten. Offene Einladungen dürfen ohne aktuellen Einladenden keine Mitgliedschaft wiederherstellen. Der transaktionale DB-Test prüft diesen Ablauf und den Erhalt der Einladungshistorie.

Beide Migrationen nur lokal angewandt und mit `supabase migration repair … --status applied --local` in der lokalen Historie registriert. Historische Migrationen unverändert. Keine Antwortmigration, keine Tabellenlöschung, keine Datenbereinigung an Nutzerständen.

## 16. Tests

Abschließende Prüfergebnisse:

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 2.770 Tests bestanden, kein Fehler |
| `npm run db:test` | 142 Dateien, 2.246 pgTAP-Prüfungen bestanden |
| `npx tsc --noEmit` | Bestanden |
| `npm run lint` | 0 Fehler, 43 bestehende Warnungen |
| `npm run build` | Bestanden |
| Desktop / Mobile | 2/3/4 Homebase und Report geprüft; keine horizontalen Überläufe |
| Browser-Konsole | Keine Fehler in den abgeschlossenen Durchläufen |
| Invite Resume | C/D mit optionalem Basics-Schritt; vollständiges Profil direkt zum aktuellen Report, auch nach Ablauf einer bereits angenommenen Einladung |
| `git diff --check` | Bestanden |

Lokaler Testserver beendet und isolierte Browser-Testkonten entfernt. Keine Browser-/Testartefakte im Repository.

Neue DB-Suite `team_size_onboarding.sql`: echte authenticated-RPCs für zielgebundene Einladung, Foreign-Caller-Sperre, Ziel-Immutable, 2→3→4, idempotente Annahme, fünfte offene Einladung, volle Teams, keine automatischen Shares, entfernter Einladender sowie kompletter Vierer-Intake inklusive zwölf Perspektiven, Unvollständigkeits- und Reviewer-Grenzen.

Erweiterte DB-Suite `workstyle_product_reporting.sql`: Roster-Snapshotwechsel und historische Paarvereinbarung bei C-Beitritt zusätzlich zu bestehenden 2/3/4-, Version-, Research-, Capability- und Advisor-Prüfungen. Bestehender Intake-Test prüft jetzt fünfte statt vierte Person als Grenze.

Unit: Setup mit zwei, drei und vier Mitgliedern und veralteter Paarzustimmung; vollständige Bestätigungen; Intake-Report für vier; bisherige Layoutverträge auf die ausdrücklich gewünschte Journey aktualisiert. Bestehende Paardaten- und Freigabetests bleiben aktiv.

Browser: Desktop 1280×900, Mobile 390×844, Homebase und aktueller Report mit 2/3/4, gezielter Invite-Einstieg, echte Join-Annahme, bestehender Welcome-Flow, Vierergrenze, Setup, Commitment-Paar im Viererteam ohne automatischen Kopierbutton, RMM-Grenze, explizit freigegebener Advisor-Viererreport, Intake-Einstieg. Keine horizontalen Überläufe; Browserfehler separat kontrolliert. Screenshots wurden visuell geprüft und liegen unter `/tmp/phase92-*`.

## 17. Verbleibende echte Grenzen

- RMM/FITW: kein Paarselektor in 3/4-Teams. Bewusst nicht neu gebaut und nicht als fertige Mehrpersonenfunktion dargestellt.
- Keine neue Self-Service-Entfernung/Austrittsfunktion; DB-Rosterwechsel wurden als bestehender Wartungs-/Account-Lifecycle geprüft.
- Eine Relationship gehört weiterhin höchstens einem Team. Mehrere gemeinsame Ventures desselben Paars werden nicht über eine heimliche Zweitbeziehung modelliert; ein widersprüchlicher gezielter Invite schlägt fehl.
- Bestehende Team-Intake-/Advisor-Kontexte erzeugen keine vollständige Relationship-Matrix. Ohne passende Relationship gibt es keinen Commitment-Paareinstieg.
- Offene Einladungen reservieren keine Plätze; die endgültige Kapazitätsprüfung erfolgt bei Annahme.
- Emailzustellung, externer Magic-Link-Provider und ein kompletter frischer Signup wurden nicht über externe Dienste getestet. Die bestehenden Pending-Token-/Account-Sicherheitsprüfungen laufen in der vollständigen Testsuite; Browserprüfung verwendete isolierte bereits angelegte lokale Accounts.
- Bekannte Lint-Warnungen aus dem Bestand bleiben; keine großflächige Bereinigung.

## 18. Vorbereitung Phase 9.3

Aktuelle Journey: Teamroster → „Euer Zusammenspiel“ / Venture-Einstieg → Founder Setup → optionale klar paarbezogene Vertiefungen. Historische Reports und Workbooks sind weiterhin erreichbar und unverändert gespeichert.

Phase 9.3 kann nun Legacy-Workbook und Matching-Workspace anhand der Deletion Map aus Phase 9.0 konsolidieren, ohne die aktuelle Journey von ihnen abhängig zu machen. Historische Reader und geteilte Datenverträge zuerst sichern; keine neue Teamarchitektur nötig. Ein späterer Paarselektor für RMM/FITW wäre eine eigene fachliche Entscheidung, keine versteckte Legacy-Bereinigung.

NO LEGACY USER DATA DELETED

NO RESEARCH DATA EXPOSED

NO REMOTE DB PUSH PERFORMED

NO PRODUCTION DEPLOY PERFORMED

## Geänderte Dateien

- `docs/research/phase-9/phase-9.2-team-size-onboarding-implementation.md`
- `supabase/migrations/20261116120000_team_size_onboarding.sql`
- `supabase/migrations/20261116130000_preserve_team_invite_history.sql`
- `supabase/tests/team_context_intake.sql`
- `supabase/tests/team_size_onboarding.sql`
- `supabase/tests/workstyle_product_reporting.sql`
- `web/messages/de/collaborationLab.json`
- `web/messages/de/dashboard.json`
- `web/messages/de/intake.json`
- `web/messages/de/invite.json`
- `web/messages/de/teams.json`
- `web/messages/en/collaborationLab.json`
- `web/messages/en/dashboard.json`
- `web/messages/en/intake.json`
- `web/messages/en/invite.json`
- `web/messages/en/teams.json`
- `web/src/app/(product)/dashboard/actions.ts`
- `web/src/app/(product)/invite/new/page.tsx`
- `web/src/app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/page.tsx`
- `web/src/app/(product)/teams/[teamId]/commitment-lab/[relationshipId]/page.tsx`
- `web/src/app/(product)/teams/[teamId]/page.tsx`
- `web/src/app/(product)/teams/[teamId]/setup/page.tsx`
- `web/src/app/join/JoinClient.tsx`
- `web/src/app/join/welcome/page.tsx`
- `web/src/features/collaborationLab/ReadMyMindHomebaseCard.tsx`
- `web/src/features/collaborationLab/__tests__/readMyMindSlice2A.test.ts`
- `web/src/features/commitmentLab/__tests__/commitmentLabV1.test.ts`
- `web/src/features/dashboard/CoFounderInviteForm.tsx`
- `web/src/features/instruments/align/__tests__/einladungFassung.test.ts`
- `web/src/features/team-intake/InviteForm.tsx`
- `web/src/features/team-intake/__tests__/report.test.ts`
- `web/src/features/team-intake/actions.ts`
- `web/src/features/teams/TeamJourneyStatus.tsx`
- `web/src/features/teams/__tests__/founderSetup.test.ts`
- `web/src/features/teams/__tests__/founderTeamUi.test.ts`
- `web/src/features/teams/__tests__/teamHomebaseOrder.test.ts`
- `web/src/features/teams/founderSetupModel.ts`
