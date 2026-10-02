# Phase 7.4 – Founder Dashboard & Legacy Assessment Cleanup

Stand: 02.10.2026. Grundlage sind der aktuelle Code und die lokale Supabase-DB. Diese Phase ändert ausschließlich Dashboard-Leselogik, Darstellung, Begriffe und Einstiege. Fragen, Instrumentdefinitionen, Antwortspeicherung, Auswertung und Scoring bleiben unverändert.

## 1. Bisherige Dashboard-Logik

`web/src/app/(product)/dashboard/page.tsx` kombinierte drei Generationen:

- Legacy-Grundlagenkarten für Basisfragebogen und optionales Werteprofil, sobald `getAlignDashboardState().knowsPrevious` irgendeinen v1-Assessment-Datensatz fand. Ein leerer Entwurf genügte; die frühere Abfrage verwendete zudem ein unsortiertes `limit(1)` ohne Modulfilter.
- `AlignCard` für `founder-profile-v1` und `venture-alignment-v1`: bei neuen Accounts oberhalb der Verbindungen, bei Legacy-Accounts erst weit darunter. Die Karte hieß „Zwei Fragebögen / im Test“. Selbst nach Abschluss blieb „Weiter ausfüllen“ der erste Profil-Link.
- `AlignAnnounce` mit „neue Fassung des Tests“ nach der alten Übergangsentscheidung; aktuelle Antworten oder ein aktueller Abschluss unterdrückten diesen Hinweis nicht. Zusätzlich existierte ein eigener v2.1-Hinweis-/Archivpfad.

Die alten Grundlagenkarten nutzten `getLatestSelfAlignmentReport()` als Basisabschluss und dessen `valuesModuleStatus` für Werte. „Begonnen“ bedeutete bei base bereits einen Assessment-Datensatz, bei values einen offenen Datensatz. Die allgemeine Aufgabenliste konnte damit `/me/base` bzw. `/me/values` erneut anbieten. Das Gesamtprofil im Hero war fälschlich vom Vorhandensein eines alten Reports abhängig.

Für das aktuelle Arbeitsprofil wurden dagegen bereits Zeilen aus `alignment_answers` gezählt; abgeschlossen bedeutete `assessments.submitted_at IS NOT NULL`. Die Auswahl des aktuellen Assessments war bisher unsortiert.

## 2. Tatsächliche v1-Nutzung

`CURRENT_INSTRUMENT_ID` ist weiterhin **`founder-compatibility-v1`**, nicht bloß ein unbenutztes Überbleibsel. Lokale `instruments`-Statuswerte:

| Instrument | Status |
| --- | --- |
| founder-compatibility-v1 | active |
| founder-profile-v1 | draft |
| venture-alignment-v1 | draft |
| founder-alignment-v2 | archived |
| founder-alignment-v2-1 | archived |

Der vorhandene App-Flow bietet das aktuelle Arbeitsprofil trotzdem an; diese Phase ändert keinen Instrumentstatus. Lokal waren beim Audit drei abgeschlossene v1-base-Assessments und zwei abgeschlossene Founder-Arbeitsprofile vorhanden, keine values-Assessments.

**Neue Accounts können technisch weiterhin v1 erhalten:**

- Ein direkter Aufruf von `/me/base` nutzt `getOrCreateDraftAssessment("base")`; dessen Instrument-Default ist `CURRENT_INSTRUMENT_ID`.
- `/me/values` verwendet denselben Default für `values`.
- Legacy-Einladungen, Wiederholungs-/Refresh-Flows und `ensureInvitationMatchingBinding` können weiterhin diese Module verlangen bzw. anlegen. `invitationFlow.ts` erzeugt passende `/me/base`-/`/me/values`-Links; verbindungsbezogene Dashboard-Aufgaben bleiben dafür erhalten.
- `/me/report` liest v1 und bietet ohne Report noch einen Basisfragebogen-Einstieg. Die alten Abschlussseiten führen ebenfalls durch den historischen Basis-/Werte-Flow.
- Assessment-Actions, Matching-Bindings, Reporting und Rollen-Kompatibilität verwenden die Konstante weiterhin.

Die normale primäre Dashboard-Karte und Produktnavigation führen jetzt zum aktuellen Arbeitsprofil. Allgemeine persönliche Legacy-Fortsetzungsaufgaben werden dort nicht mehr ausgespielt. Eine globale Stilllegung der alten Einladungs-, Reporting- und Matching-Pfade wäre eine eigene Migration und gehört nicht in diese Phase. **`CURRENT_INSTRUMENT_ID` bleibt unverändert.**

## 3. Tatsächlicher Status des Werteprofils

Das Werteprofil gehört zum Legacy-Instrument `founder-compatibility-v1`, Modul `values`. Es verwendet:

- `assessments` mit `module = 'values'` und dem Legacy-Instrument;
- `assessment_answers` für die Antworten;
- `questions` mit `category = 'values'` und `choices` für den alten Fragebogen;
- `values_scoring.ts`, `scoreSelfValuesProfile` und die bestehenden Report-Funktionen für die Auswertung. Die interne Fragebogenversion heißt dabei `values_v2`; das ist kein eigenständiges aktuelles Founder-Instrument.

Außerhalb des Dashboards erscheint es auf `/me/values` und dessen Abschlussseite, in individuellen Legacy-Berichten (`SelfReportView`/`IndividualReportPageContent`, auch als ältere Ansicht im Gesamtprofil), in Einladungs-/gemeinsamen Reports sowie in vorhandenen Debug-Ansichten. Legacy-Einladungen können values weiterhin voraussetzen. Es ist deshalb fachlich Legacy, aber technisch noch produktiv verwendet.

Das Dashboard bietet kein offenes Werte-Modul mehr an. Bei vorhandenem Basisreport samt abgeschlossenem Werte-Modul steht unter „Frühere Auswertungen“ ausdrücklich „Enthält dein früheres Werteprofil“. Der Zugang bleibt `/me/report`. Bestehende Berichtsinhalte und Berechnungen ändern sich nicht. Der bisherige Selbstbericht setzt einen abgeschlossenen Basisfragebogen voraus; eine isolierte Werteauswertung ohne Basisbericht wird hier nicht neu gebaut.

## 4. Neue State Machine

`founderWorkProfileState.ts` entscheidet ausschließlich die Darstellung:

| Zustand | Tatsächliche Bedingung | DE-CTA | Ziel |
| --- | --- | --- | --- |
| Neu | Kein v1-base-Abschluss, keine aktuelle Antwort, kein aktueller Abschluss | Dein Founder-Arbeitsprofil erstellen | `/founder-alignment/profil` |
| Legacy | Mindestens ein v1-base-Abschluss, keine aktuelle Antwort, kein aktueller Abschluss | Neues Arbeitsprofil erstellen | `/founder-alignment/profil` |
| Begonnen | Mindestens eine aktuelle Antwort, noch kein Abschluss | Arbeitsprofil fortsetzen | `/founder-alignment/profil` |
| Abgeschlossen | `submitted_at` des aktuellen Arbeitsprofils gesetzt | Arbeitsprofil ansehen | `/me/profile` |

Priorität: abgeschlossen → begonnen → Legacy → neu. Ein leerer aktueller Entwurf ist nicht begonnen. Ein offener alter Entwurf oder ein values-Abschluss allein ist kein abgeschlossener v1-Basisfragebogen.

Der Dashboard-Datenleser sortiert aktuelle Assessments nun nach `created_at DESC`, entsprechend der bestehenden Profil- und Antwortseiten. Fortschritt gehört zum neuesten Assessment; frühere Antworten werden nicht in einen neuen Entwurf hineingezählt. Für den Legacy-Abschluss werden alle eigenen v1-base-Datensätze betrachtet. Fehler beim Lesen von Assessments/Antworten zeigen einen neutralen Ladehinweis statt erfundener Start-CTAs.

## 5. Darstellung und CTAs

- Das aktuelle Arbeitsprofil steht einmal und an derselben Stelle für alle Nutzer, vor Verbindungen und Archiv. Die Abschnittsnavigation führt direkt dorthin.
- Nur Zustand Legacy zeigt den Hinweis „Es gibt inzwischen ein neues Founder-Arbeitsprofil“ und erklärt konkretere Arbeitsweisen, erhaltene frühere Antworten und den nicht überschriebenen alten Bericht. Die alten Transition-Banner werden im Dashboard nicht mehr gerendert. Gespeicherte Übergangsentscheidungen werden nicht verändert.
- „Das bist du“ bleibt im Hero auch ohne alten Report erreichbar; `/me/profile` enthält das Gesamtbild einschließlich Fähigkeiten, Erfahrung, Stärken und Richtung.
- Die bestehende Vorhaben-Karte, Freigabe-/Vergleichslinks und FIND-Verwaltung bleiben erhalten.
- Die Arbeitsprofil-Karte ist vollständig DE/EN lokalisiert. Der Navigationseintrag heißt „Founder-Arbeitsprofil“ / „Founder working profile“ statt „Neue Fassung (Test)“ / „New version (beta)“.
- Frühere Auswertungen sind nachgeordnet und ausdrücklich historisch eingeordnet. Vorhandene v2.1-Fassungen bleiben innerhalb des eingeklappten Archivs erreichbar; sie werden nicht als neues Angebot beworben.
- Keine neuen psychometrischen Aussagen, Scores oder Module.

## 6. Bewusst erhaltene Legacy-Pfade und Phase-8-Altlasten

Erhalten bleiben `/me/base`, `/me/values`, `/me/report`, `/founder-alignment/versionen`, vorhandene Pilot-Reports sowie die zugehörigen Einladungs-, Matching- und Abschlussabläufe. Auch begonnene alte Antworten bleiben über das Versionsarchiv erreichbar. Keine Daten werden gelöscht oder überschrieben.

Erst gesondert mit Phase 8 entscheiden: Instrumentstatus/Benennung und Default-Konstante, vollständige Ablösung der v1-Einladungen und Vergleichslogik, Umgang mit alten Übergangsentscheidungen und historischem Werte-Modul. Die alten Übergangskomponenten bestehen im Code weiter, werden auf dem Dashboard aber nicht eingebunden. Historische Texte wurden nicht pauschal umgeschrieben; auch bestehende nicht lokalisierte Archivdetails sind keine vollständige DE/EN-Neuentwicklung dieser Phase.

## 7. Tests und Auslieferung

- 15 neue Tests: tatsächlicher Dashboard-Datenleser und gerenderte Server-Komponente mit gemockter Supabase-Abhängigkeit für alle vier Nutzerzustände in DE/EN; leerer Entwurf; mehrere Assessment-Generationen; offener Legacy-Entwurf neben abgeschlossenem v1; values-only und fremder User; Lesefehler; Abschlusspriorität; erhaltene historische Einstiege.
- 60 gezielte Regressionstests bestanden. Bestehende Tests der alten Dashboard-Hierarchie wurden auf die explizit neuen Anforderungen angepasst; Fragen-/Scoringtests wurden nicht verändert.
- Browser: vorhandenes lokales abgeschlossenes Founder-Testkonto, DE und EN; „Arbeitsprofil ansehen“ → `/me/profile`, „Frühere Auswertung ansehen“ → `/me/report`, jeweils erfolgreiche Seite ohne Fehleroverlay. Screenshots bei EN 375×667 und DE 320×600 visuell geprüft; kein horizontaler Überlauf, keine Browserfehler. Zustände neu/Legacy/begonnen wurden komponenten-/datenleserbasiert geprüft, nicht durch Manipulation vorhandener lokaler Antworten im Browser.
- Vollständiger Abschlusscheck: `npm run ci:check` erfolgreich (Exit 0): TypeScript, 2.672 App-Tests, Production-Build sowie die vom Projekt eingebundenen 1.557 pgTAP-Prüfungen in 129 DB-Testdateien.

**Keine Migration, keine Schema-/RLS-Änderung, kein `db push`, keine neuen Env-Variablen.** Kein Deployment wurde ausgelöst.

Branch: `codex/phase-7-4-founder-dashboard`.

Nach Review aus dem Repository-Root (Vercel deployt den Push auf main automatisch):

```sh
git switch main
git merge --ff-only codex/phase-7-4-founder-dashboard
git push origin main
```

Falls main inzwischen durch Phase 8 weitergelaufen ist, muss der Branch zuerst mit diesem Stand abgeglichen und erneut geprüft werden; `--ff-only` verhindert einen unbeabsichtigten Merge.
