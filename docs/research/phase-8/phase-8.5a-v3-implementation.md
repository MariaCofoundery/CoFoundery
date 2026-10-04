# Phase 8.5a-v3 / Development Instrument v0.4 – Implementierungsbericht

Stand: 2026-10-04. Branch: `feat/workstyle-v04`.
Ausgangspunkt: `da59cd13d9d4917376a24bfe07d6ceb59399aa47`.
Der Implementierungscommit ist der Commit, der diesen Bericht hinzufügt
(`git log -1 --format=%H -- docs/research/phase-8/phase-8.5a-v3-implementation.md`).

## Audit und Wiederverwendung

Die bestehende v2-Architektur ist ausreichend klar und wird additiv erweitert:

- `instruments`, `assessments` und `alignment_answers` tragen portable Founder-Profile. Kein neues Personenmodell; `auth.users.id`/Person Core bleiben unverändert.
- `workstyle_item_versions` trägt unveränderliche, instrumentbezogene Itemdefinitionen. `workstyle_pretest_sessions` trägt Consent, Manifest, Position, Kontext, Zeitangaben und Feedback; `workstyle_research_responses` bleibt privater Research-Speicher.
- Die bestehenden RPCs, Row Locks, RLS, `research_consent_preferences` und die zentrale Research-Löschung bleiben die Zugriffspunkte. Direkte Schreibzugriffe werden weiterhin abgewehrt.
- `platform_admins`/`is_platform_admin` bestimmen Research-Adminrechte. `alignment_shares`, ausgeblendete Blöcke und effektive Advisor-Freigaben bestimmen Produktzugriff. Keine neue Advisor-/Consent-Architektur und keine automatische Freigabe.
- `founder_teams`/`founder_team_members` bilden bereits n:m-Mitgliedschaften ab. Keine Team-/Invite-Migration; Readiness bleibt auf genau zwei Mitglieder beschränkt.
- Venture Alignment, Founder Setup, Legacy-Reports, FIND, CONNECT, Workspaces, Capability, Avatar und Person-Core-Synchronisation bleiben unverändert.

Es entstehen **keine neuen Tabellen oder Routen**. Die vorhandenen Teilnehmer-, Admin- und Export-Routen akzeptieren nun zusätzlich `?version=8.5a-v3`; v3 ist der neue Standard. v1/v2 bleiben explizit abrufbar.

## Versionen und unveränderte Historie

| Gegenstand | Neue Version |
| --- | --- |
| Assessment | `founder-workstyle-pretest / 8.5a-v3` |
| DB-Instrument | `founder-workstyle-pretest-8-5a-v3` |
| Itemversion | `8.4-v0.4` |
| Manifest | `3.0.0` |
| Präsentation | `mixed-v1` |
| Consent | `workstyle_research_v3` |

Fachliche Quelle: [phase-8.4-v0.4-workstyle-development-instrument.md](phase-8.4-v0.4-workstyle-development-instrument.md).
Technische Registry: [founder-workstyle-pretest-8.5a-v3.json](../../../web/docs/founder-workstyle-pretest-8.5a-v3.json).
Die Registry und der SQL-Seed werden aus der fachlichen Quelle mit
`python3 web/scripts/build-workstyle-v3-registry.py` erzeugt; `--check` prüft Reproduzierbarkeit.

Alle 52 Itemtexte und sämtliche kategorialen Antwortoptionen wurden wortgetreu gegen die gelieferte Spezifikation geprüft. Keine inhaltliche Änderung war erforderlich. Wiederverwendete Item-IDs erhalten zwingend die neue Item-/Instrumentversion. v1/v2-Quellen, Registries, Seeds, Migrationen und Consentdateien wurden nicht verändert; keine historischen Antworten oder Sessions wurden migriert. Immutable-Trigger und Regressionstests sichern die Definitionen. Der sichtbare Consenttext von v2 wurde für v3 unverändert übernommen, nur die Instrumentbindung ist neu.

## Minimale additive Datenänderungen

Neue, ausschließlich lokal angewandte Migrationen:

1. `supabase/migrations/20261113120000_workstyle_v3.sql`
2. `supabase/migrations/20261113121000_workstyle_v3_item_seed.sql`

Die erste Migration erweitert die Versionsverträge und vorhandenen RPCs. Drei nullable Spalten ergänzen kategoriale Rohantworten und die getrennte Präsentationsinformation:
`alignment_answers.workstyle_rendered_order`,
`workstyle_research_responses.response_option` und
`workstyle_research_responses.rendered_order`.
Constraints erhalten den alten v1/v2-Vertrag. Die zweite Migration fügt ausschließlich 52 neue, versionierte Definitionen ein.

v3 speichert `form = NULL`; es gibt keine A/B/C-Zuweisung. Die historische v1-Zuweisung bleibt bestehen. Die feste A/B-Reihenfolge innerhalb eines Comparative-Items ist davon unabhängig und wird als `rendered_order = ["A", "B"]` gespeichert, auch bei Missing.

## Core, Research und Candidate

| Wissenschaftlicher Status | Anzahl | Technischer Speicher / Freigabe |
| --- | ---: | --- |
| `core` | 29 | `alignment_answers`, normale explizite Produktfreigaben |
| `core_research` | 6 | `workstyle_research_responses`, `research_only` |
| `candidate_core` | 4 | `workstyle_research_responses`, `research_only` |
| `research` | 13 | `workstyle_research_responses`, `research_only` |

Die bestehende Zweiteilung `core`/`research_only` bleibt erhalten; alle vier feineren Status werden im Manifest gespeichert. Für die nicht eindeutig produktiv freigegebenen `core_research`- und `candidate_core`-Items wurde konservativ der private Speicher gewählt. Insgesamt **29 produktnahe und 23 private Antworten**. DEC bleibt Candidate Area, FS bleibt Research Facet. Diese Speicherentscheidung ist keine wissenschaftliche Bewertung.

## Antwortformate und 52 Screens

24 W-, sieben S-, ein angepasstes S-, sieben U-, elf FC- und zwei Behavioral-Items ergeben exakt **52 Screens**. W/S/U speichern rohe Werte 1–5. FC speichert `strong_a`, `lean_a`, `lean_b`, `strong_b`; Behavioral speichert A–E. FC/Behavioral werden weder numerisch codiert noch als lineare Qualitätsskalen ausgewertet. `cannot_assess` bleibt für alle Items sichtbar und wird mit NULL-Wert gespeichert. Produkt-Core verwendet dafür wie bisher `missing_code`; Research und API verwenden `missing_reason`.

Es gibt keine Scores, Typen, Matchwerte, Ampeln oder Erfolgsprognosen. Admin zeigt Häufigkeiten je Rohoption. U bleibt unveränderte Unbehagens-Rohantwort ohne automatische Umpolung.

Die versionierte Reihenfolge lautet:

```text
ORG-01 EXP-01 VOICE-01 AMB-01 DEC-01 EL-01 EVI-01 EXP-02
ORG-03 AMB-02 EL-03 VOICE-02 EVI-02 DEC-02 EXP-03 FS-R1
AMB-04 ORG-04 EL-02 EXP-04 VOICE-03 EL-05 DEC-03 AMB-05
ORG-02 EVI-03 EL-04 ORG-05 EXP-05 VOICE-04 AMB-06 DEC-04
EVI-05 ORG-06 EVI-04 FS-R2 EXP-06 VOICE-05 AMB-03 ORG-07
EVI-06 EL-06 VOICE-06 DEC-R1 AMB-R1 VOICE-R1 EVI-R1 ORG-08
EL-R1 EXP-R1 ORG-R1 DEC-R2
```

Keine unmittelbar aufeinanderfolgenden Items desselben Bereichs und keine FC-Serie. Teilnehmer sehen ausschließlich Situationen, Antwortmöglichkeiten und einen dezenten Fortschrittsbalken. IDs, Konstrukte und Status bleiben verborgen. Der vorhandene feste Renderer `WorkstylePretestV2.tsx` unterstützt beide Versionen; auf eine reine Dateiumbenennung wurde verzichtet.

## Speichern, Resume und Finalisierung

Die Position wird serverseitig gespeichert. Zurücknavigation, Reload und Wiederaufnahme erhalten Position und Antwort. Der Server verhindert das Überspringen unbeantworteter Vorgänger. Manifest und Itemversion bestimmen jede Eingabe; der alte numerische Save-RPC weist v3 zurück.

`save_workstyle_pretest_v3` validiert Format, Option, Itemversion, Missing und A/B-Reihenfolge, sperrt die Session und schreibt in den zuständigen Speicher. Der Button bei Frage 52 speichert die letzte Antwort und finalisiert Assessment und Research-Session in einer Transaktion. Danach folgt unmittelbar Danke / freiwilliges Feedback. Identische Abschluss-Retries liefern denselben Abschlusszeitpunkt; abweichende nachträgliche Antworten werden abgewiesen.

Der bestehende Widerruf entfernt private Antworten, Feedback und Research-Metadaten. Ein abgeschlossenes Core-Profil bleibt als private Produktinformation erhalten. Unvollständige Teilnahmen werden vollständig entfernt. Researchteilnahme erzeugt keine Produkt-/Advisor-Freigabe.

## Admin, Export und Teamreadiness

Admin und CSV filtern strikt nach Assessmentversion. v1 behält A/B/C; v2/v3 verwenden keine künstliche Form. v3 zeigt wissenschaftlichen Status, Format, Rohoptionshäufigkeiten und die vorhandenen Zeit-/Missing-/Feedbackkennzahlen. Keine automatische Itembewertung.

Der v3-Long-Export enthält den bestehenden pseudonymen `session_id` als Teilnehmer-/Sessionkennung, Assessment-Key, Instrument-, Assessment-, Manifest- und Itemversion, Item-ID, Konstrukt, Facette, Bereichs-/Itemstatus, Speicherstatus, Format, Position, Präsentationsvariante, Rohantwort/Option, Missing, Start-/Antwort-/Abschlusszeit, Antwortzeit und Consentversion. Die interne Assessment-UUID und User-ID werden bewusst nicht ergänzt; die pseudonyme Session-ID erfüllt den Verknüpfungszweck ohne zusätzliche Identifikatoren. Freitextfeedback bleibt außerhalb des normalen CSV. Historische CSV-Spalten bleiben unverändert.

`getWorkstyleTeamInputs` und der DB-RPC berücksichtigen v3 ausschließlich mit denselben Instrument-, Manifest- und Itemversionen. Bei gemischten jüngsten Profilversionen wird kein älteres Profil als Ersatz gewählt. Nur die 29 regulären Core-Items gelangen in den Datenzugriff; Research, DEC und FS bleiben ausgeschlossen. FC-Core bleibt eine Rohoption mit Format-/Präsentationsmetadaten, kein Score. Effektive Freigaben und ausgeblendete Blöcke werden geprüft. Es gibt keine neue Report-UI.

## Verifikation

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 2.750 bestanden, keine Fehler/Skips |
| `npm run db:test` | 139 Dateien, 2.205 pgTAP-Tests bestanden |
| Typecheck (`tsc --noEmit` in `web`) | bestanden |
| `npm run lint` | keine Fehler; 42 bestehende Warnungen |
| `npm run build` | bestanden |
| Registry-/Seed-Reproduktion und historische Definitionen | bestanden |
| Wortlautvergleich gegen Spezifikation | alle 52 Prompts und alle kategorialen Optionen identisch |
| Lokaler Konkurrenztest | sechs Starts → eine Session; sechs Abschlüsse + Retry → ein Abschluss; Widerrufsrennen wahrt 29/23-Grenze |
| Browser Desktop 1280×1000 / Mobil 390×844 | alle Formate visuell geprüft; kein horizontaler Überlauf |
| Vollständiger Browserflow | Consent, Kontext, alle 52 Fragen, Missing, Save, Reload, Zurück/Vorwärts, direkter Abschluss, optionales Feedback bestanden |
| Browser Admin/CSV | 52 Zeilen, kategoriale Rohantworten, Versionsgrenzen, keine IDs/Freitexte im CSV bestätigt |
| Historische Browseransichten | v1/v2-Teilnehmer-, Admin- und Exportansichten weiterhin erreichbar |
| Browser Widerruf + DB-Kontrolle | 29 Core erhalten, 0 private Antworten, Feedback gelöscht |
| Anonymer Browserzugriff | Teilnehmeransicht verlangt Anmeldung; Admin/Export HTTP 404 |
| Browserfehler | keine JavaScript-Fehler |

DB-Tests decken zusätzlich Consentpflicht, RLS/Fremdzugriff, Advisor ohne/mit Freigabe, verborgene Blöcke, Versionkonflikte, Core-/Research-Trennung, Antwortvalidierung, Unveränderlichkeit, optionale Rückmeldung und Widerruf ab. Die neuen Konkurrenztests sind aus dem Verzeichnis `web` mit `node scripts/test-workstyle-v3-concurrency.mjs` gegen die lokale Supabase-Instanz reproduzierbar. Browserdaten wurden mit einem isolierten lokalen Testkonto erzeugt und nach Prüfung gelöscht.

## Geänderte Dateien

Neu:

- `docs/research/phase-8/phase-8.4-v0.4-workstyle-development-instrument.md`
- `docs/research/phase-8/phase-8.5a-v3-implementation.md`
- `docs/research/phase-8/workstyle-research-consent-v3.md`
- `supabase/migrations/20261113120000_workstyle_v3.sql`
- `supabase/migrations/20261113121000_workstyle_v3_item_seed.sql`
- `supabase/tests/workstyle_pretest_v3.sql`
- `web/docs/founder-workstyle-pretest-8.5a-v3.json`
- `web/docs/founder-workstyle-research-consent-v3.json`
- `web/scripts/build-workstyle-v3-registry.py`
- `web/scripts/test-workstyle-v3-concurrency.mjs`
- `web/src/features/instruments/workstyle/__tests__/workstyleV3.test.ts`

Erweitert:

- `web/src/app/(product)/research/workstyle-pretest/page.tsx`
- `web/src/app/(product)/admin/research/workstyle-pretest/page.tsx`
- `web/src/app/(product)/admin/research/workstyle-pretest/export/route.ts`
- `web/src/features/instruments/instruments.ts`
- `web/src/features/instruments/workstyle/WorkstylePretestV2.tsx`
- `web/src/features/instruments/workstyle/actions.ts`
- `web/src/features/instruments/workstyle/analytics.ts`
- `web/src/features/instruments/workstyle/answers.ts`
- `web/src/features/instruments/workstyle/data.ts`
- `web/src/features/instruments/workstyle/registry.ts`
- `web/src/features/instruments/workstyle/teamReadiness.ts`

## Offene Punkte und Grenzen

Das Instrument ist nicht validiert. Die fachliche Quelle dokumentiert alle noch offenen empirischen Prüfungen einschließlich Verteilungen, Missing, Zeiten, Floor/Ceiling, sozialer Erwünschtheit, Trennschärfe, ordinaler EFA/CFA, polychorischer Korrelationen, bedingter Reliabilitätsanalyse, Test-Retest, Validität, Cross-Loadings und separater FC-Modellierung. Es wurden keine Analysen oder Ergebnisse erfunden. DEC, ORG, EL, EXP, VOICE, AMB und FS haben weiterhin die dort beschriebenen Struktur-/Abgrenzungsfragen.

Eine fachliche spätere Produktfreigabe von `core_research` oder DEC müsste ausdrücklich versioniert erfolgen. Kontrollierte A/B-Darstellungsvarianten sind technisch vorbereitet, aber noch nicht eingeführt. Weder neue Teamreport-Interpretationen noch 3+-Reportlogik wurden ergänzt. Produktion wurde nicht geprüft oder verändert; Migrationen sind nur lokal angewandt.

**NO REMOTE DB PUSH PERFORMED**

**NO PRODUCTION DEPLOY PERFORMED**

Kein Git-Push und kein Merge nach main.
