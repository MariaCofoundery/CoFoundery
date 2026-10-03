# MADE2FOUND – Phase 8.5a: Implementierung und Verifikation

Stand: 04.10.2026. Grundlage: Architektur-Audit `90267ea` und danach vom Auftraggeber gelieferter Phase-8.4-v0.2-Pool. Der Pool umfasst **37 Items**, davon **20 Core-Items** und **6/6/5 zusätzliche Items** in A/B/C. Eine anfängliche manuelle Fehlzählung wurde durch maschinelle Prüfung korrigiert; keine ID wurde gestrichen oder ergänzt.

## 1. Bestand und Wiederverwendung

Der [Audit](../../phase-8-5a-workstyle-audit.md) prüfte Repository und laufende lokale Supabase-Datenbank vor der Implementierung. Wiederverwendet werden:

- `auth.users.id`/`person_core.user_id` als Personenidentität; keine zweite Person-ID.
- `instruments` und `assessments` für den portablen Workstyle. Modul `founder_profile`, ohne Venture-ID. Die neue Instrumentkennung ersetzt keinen bestehenden Fragebogen.
- `alignment_answers` für ausschließlich die 20 gemeinsamen Core-Antworten. Ergänzung: `item_version`; bestehende Antworten behalten `NULL` und ihre bisherige Bedeutung.
- `founder_teams` und `founder_team_members` als vorhandener n:m-Team-/Venture-Container; `assessments.venture_id` für bestehendes Venture Alignment.
- `alignment_shares`, optionale Hidden-Blocks und `alignment_share_is_effective` für explizite produktive Freigaben. Keine neue Advisor-/Invite-Architektur.
- Die bestehende Research-Verwaltung unter `/account`. Ein Link führt zur instrumentbezogenen Teilnahme/Verwaltung; ein Widerruf über `set_my_research_consent('declined')` räumt die neue Research-Ergänzung ebenfalls auf.
- `platform_admins`, `is_platform_admin()` und `requirePlatformAdmin()` für Dashboard und Export.

CONNECT, FIND, Problem Radar, Workspaces, Capability-Daten, Branding, Person-Core-Synchronisierung, Avatarlogik, Legacy-Reports und vorhandene Invite-/Advisor-Flows wurden nicht umgebaut. Der bestehende Adminbereich erhält lediglich einen weiteren Link.

## 2. Tatsächlich neue Datenstruktur

| Tabelle | Zweck und Grenze |
| --- | --- |
| `workstyle_item_versions` | Unveränderliche Itemdefinitionen, Instrument-/Itemversion, Key, Reihenfolge und vollständige Metadaten; 37 Seed-Zeilen. Änderungen/Löschungen bestehender Fassungen sind gesperrt. |
| `workstyle_pretest_sessions` | Research-Metadaten als 1:1-Erweiterung einer vorhandenen `assessment_id`: zufällige Export-Session-ID, feste Form, Assessment-/Consent-Version, Einwilligungs-/Start-/Abschluss-/Widerrufszeiten, drei kurze Kontextangaben, Antwortzeiten, freiwilliges Feedback. Keine zusätzliche Personenidentität. |
| `workstyle_research_responses` | Ausschließlich zugewiesene rotierende Forschungsantworten; Bezug auf dieselbe Erhebung und unveränderliche Itemversion. Keine Produkt-/Advisor-Share-Policy. |

Die private Research-Ablage ist notwendig, weil die bestehende assessmentweite Produktfreigabe sonst auch rotierende Items erfassen könnte. Der portable Core wird nicht in einen zweiten Forschungsantwortspeicher kopiert: Die Admin-Lesefunktion nimmt ihn nur über eine nicht widerrufene instrumentbezogene Teilnahme hinzu.

Beide privaten Research-Tabellen haben RLS und keine direkten Client-Lese-/Schreibrechte. Zugriff ausschließlich über eng begrenzte RPCs. Ein bereits bestehendes allgemeines Research-Opt-in berechtigt nicht zum Start. Auch eine Zustimmung zum neuen Pretest aktiviert keine allgemeine Research-Präferenz und keine Produktfreigabe.

## 3. Migrationen

1. `20261111120000_workstyle_pretest.sql`: neues Instrument, drei Ergänzungstabellen, Core-Itemversion, Validierung, Owner-/Admin-RPCs, Consent/Widerruf und interne Teamdatenfunktion.
2. `20261111121000_workstyle_item_seed.sql`: generierter unveränderlicher 37-Item-Seed.
3. `20261111122000_workstyle_core_sharing.sql`: vorhandene Hidden-Blocks erlauben neue Entwicklungs-IDs; Workstyle-Entwürfe sind nicht teilbar.
4. `20261111123000_workstyle_session_timestamps.sql`: Erhebungszeitpunkte mit `clock_timestamp()`, damit auch mehrere Aufrufe in einer Transaktion eindeutig bleiben; gemeinsame Abschlusszeit für Session und Assessment.

Alle vier wurden **nur lokal** auf den vorhandenen Supabase-Teststack angewendet. Keine Remote-Migration, kein Produktionsdeploy und keine Datenmigration historischer Antworten.

## 4. Dokumentation, Registry und Versionierung

- Fachquelle: [phase-8.4-v0.2-workstyle-pool.md](phase-8.4-v0.2-workstyle-pool.md).
- Technische Registry: `web/docs/founder-workstyle-pretest-8.5a-v1.json`.
- Generator: `python3 web/scripts/build-workstyle-registry.py`; Prüfung ohne Schreiben: `python3 web/scripts/build-workstyle-registry.py --check`.
- Assessment: **`founder-workstyle-pretest` / `8.5a-v1`**; DB-Instrument-ID gemäß vorhandener Slug-Konvention: `founder-workstyle-pretest-8-5a-v1`.
- Initiale Itemversion aller eingefrorenen Entwicklungs-IDs: **`8.4-v0.2`**.
- Herkunft: `live_reference`, `adapted`, `new`; Entwicklungsstatus separat `candidate_for_pretest`. Die in der Quelle nicht einzeln erklärte VOICE-Herkunft wird transparent mit `source_status_explicit=false` markiert. Technische Facettenzuordnungen werden als Entwicklungszuordnung ausgewiesen; ORG-01–04 bleiben in der gelieferten Facette A.
- `usage`, `research_only`, `form` und `product_status` trennen Core-Vergleichskandidaten und ausgeschlossene Research-Items.
- SHA-256-Vertragstests schützen den eingefrorenen Registry- und Einwilligungswortlaut. Eine inhaltliche Änderung benötigt neue Versionsdateien und neue DB-Definitionen; alte Seeds nicht regeneriert überschreiben.

Jede gespeicherte Core-Antwort enthält `item_version`; die Assessmentzeile benennt das Instrument. Research-Antworten haben zusätzlich einen zusammengesetzten Fremdschlüssel zur exakten Itemdefinition. Wiederholte Erhebung erzeugt ein neues Assessment; alte abgegebene Antworten bleiben erhalten.

`cannot_assess` wird als Missing mit **NULL-Wert** gespeichert. Werte sind ausschließlich ganzzahlige 1–5. Die Option wird entsprechend der Quelle für EVI/AMB und begründet für alle EXP-Items angeboten. Für EL, VOICE und ORG wurde keine nicht gelieferte Missing-Option hinzugefügt. Eine D01-artige nominale Gesprächsfrage wurde dokumentiert, aber mangels vollständiger eigener Spezifikation nicht als Skalenitem erfunden.

## 5. Routen und Online-Flow

Neue Routen:

- `/research/workstyle-pretest`: öffentlicher Intro-Einstieg, Teilnahme nach Anmeldung; Intro → gesonderte Einwilligung → maximal drei Kontextfragen → identischer 20-Item-Core → eine Research-Erweiterung → Abschluss → freiwilliges Feedback.
- `/admin/research/workstyle-pretest`: bestehende Plattform-Adminprüfung; N, N je Form, Completion, Median Dauer, erste offene Position, Item-N/Missing/Verteilungen/Antwortzeit, Feedbackflags und Core-Vergleich nach Form.
- `/admin/research/workstyle-pretest/export`: zusätzlich serverseitig geprüfter CSV-Download mit `private, no-store`.

Feedback wird erst nach dem erfolgreichen Assessmentabschluss angeboten und ist nie dessen Voraussetzung. Alle fünf Feedbackbereiche sind freiwillig, mit Itemauswahl und begrenztem Freitext, wo vorgesehen. Speichern und Fortsetzen ist gegen Netzwerkfehler wiederholbar. Jede neue Frage erhält den Tastaturfokus. Explizite Assessment-IDs verhindern, dass ein alter Browser-Tab versehentlich eine spätere Erhebung beantwortet.

Die vorhandenen Routen wurden nicht ersetzt. Ergänzt wurden Links in der Research-Verwaltung und im vorhandenen Adminbereich. Die neue Erhebung ist deutschsprachig; Itemtexte werden nicht automatisch übersetzt.

## 6. A/B/C, Resume und Parallelität

`start_workstyle_pretest` serialisiert die Zuweisung mit einem Transaktions-Advisory-Lock. Unter A/B/C wird die Form mit der kleinsten gespeicherten Sessionanzahl gewählt; Gleichstände werden deterministisch aufgelöst. Die Form wird einmal in der Session gespeichert. Wiederholte Starts/Reloads lesen dieselbe Session; eine noch offene Erhebung wird auch bei einem parallelen „neu“-Aufruf fortgesetzt. Ein späterer neuer Stand nach Abschluss erhält ein neues Assessment.

Der gemeinsame Core stammt für alle aus derselben unveränderlichen Registry. Die DB weist fremde Form-Items, unbekannte Versionen, ungültige Skalenwerte und fehlenden Consent zurück. Erst nach allen 20 Core-Antworten können Erweiterungsantworten gespeichert werden. Abschluss benötigt exakt Core plus die eigene Erweiterung. Ein Session-Zeilenschloss serialisiert Save, Abschluss und Widerruf.

## 7. Research-Consent, Widerruf und Export

Die explizite Einwilligung **`workstyle_research_v1`** ist in [workstyle-research-consent-v1.md](workstyle-research-consent-v1.md) und `web/docs/founder-workstyle-research-consent-v1.json` dokumentiert. Session und Consent-Evidenz werden atomar erzeugt; Zeitpunkt, Consent-Version und Assessmentversion bleiben verbunden.

Ein Widerruf löscht Zusatzantworten, Kontext, Zeiten und Feedback. Ein unvollständiger Pretest wird gelöscht. Bei einem abgeschlossenen Pretest bleiben der private Produkt-Core und ein minimaler widerrufener Teilnahmebeleg erhalten; die Research-Lesefunktion schließt ihn vollständig aus. Produktfreigaben werden dadurch weder erweitert noch automatisch widerrufen. Der vorhandene allgemeine Widerruf ist über einen Trigger an dieselbe Löschfunktion angebunden. Kontolöschung greift über bestehende FK-Kaskaden.

Long-Export: zufällige pseudonyme Session-ID, Form, Assessment-/Itemversion, Item-Key, Core/Research-Nutzung, Kontextgruppe, Antworten/Missing, noch unbeantwortete Positionen, Start/Abschluss, optionale Antwortzeit und Consent-Version. Keine User-/Person-/Assessment-ID, keine E-Mail und kein Freitextfeedback. CSV-Zellen sind gegen Tabellenformeln abgesichert. Pseudonymisiert bedeutet nicht anonym; heruntergeladene Dateien können technisch nicht zurückgerufen werden. Für bereits exportierte Daten bleibt die Forschungsadministration verantwortlich.

Kennzahlen bleiben beschreibend. Missing-% bezieht sich auf gespeicherte Antworten, während nicht beantwortete Items separat bleiben. Die erste offene Position umfasst auch noch laufende Sessions und wird nicht als sicherer Abbruch ausgegeben. Dauer enthält Unterbrechungen; es wird keine aktive Aufmerksamkeit behauptet. Retakes zählen als Sessions, nicht als unterschiedliche Personen.

## 8. Vorbereitung des 2-Founder-Teamreports und Advisor Access

`get_workstyle_team_inputs(team_id)` verwendet ausschließlich bestehende Teammitgliedschaften und exakt zwei Personen. Es liest abgegebene Core-Assessments und Venture-ALIGN-Assessments desselben `founder_team_id`. Owner-Zugriff oder wirksame explizite Shares sind für jede Person und beide Inhaltsbereiche nötig. Hidden-Blocks werden berücksichtigt; ein unvollständig freigegebener Core ergibt `not_ready` ohne Inhalte.

Der Serveradapter `getWorkstyleTeamInputs` ergänzt die DB-Accessprüfung um identische Assessment-/Itemversionen und die bestehenden ALIGN-Abgaberegeln aus der aktuellen Registry, einschließlich zurückgezogener und abhängiger Fragen. Unvollständig sichtbares Venture Alignment ergibt dort `not_ready`. Der SQL-RPC liefert autorisierte Eingabedaten; der Serveradapter ist die vollständige Bereitschaftsprüfung für einen späteren Produktreport.

Research-Erweiterungen werden in dieser Datenfunktion niemals gelesen. Die Daten werden nicht in Legacy-Scoring oder Advisor-Snapshot-Scoring eingespeist. Es gibt keine neue Report-UI, keinen Matchscore, keine Typologie, keine Ampeln und keine Erfolgsprognose. Eine Reportfreigabeoberfläche für den neuen Core ist bewusst noch nicht Teil des späteren finalen Teamreports; die vorbereitete Zugriffsschicht nutzt den bestehenden expliziten Share-Vertrag.

Advisor-Rechte werden nicht durch die Teilnahme erweitert. Der neue Adapter erfordert die jeweiligen Assessment-Shares; alleinige Legacy-Relationship-Freigaben reichen nicht. Er übernimmt die bestehende Wirksamkeitsprüfung persönlicher Advisor-Grants, statt eine neue rollenbasierte Generalfreigabe einzuführen. Private Forschungsrohdaten sind ausschließlich über den separat adminpflichtigen Research-RPC zugänglich, nicht im Advisor-UI.

## 9. Drei und mehr Founder

Das vorhandene n:m-Schema bleibt bestehen. Aktuell gilt weiter der bestehende Drei-Mitglieder-Grenzwert. Die neue Datenvorbereitung lehnt Teams mit drei Mitgliedern für einen Zweierreport ab, statt willkürlich zwei auszuwählen. Beliebig große Teams und 3+-Interpretationen sind eine spätere Phase; dafür wurde weder ein neues Teammodell noch eine zweite Invite-Architektur angelegt.

## 10. Verifikation

- `npm test`: **2.734/2.734** Tests bestanden, keine übersprungen.
- Typecheck (`web/node_modules/.bin/tsc --noEmit` im Web-Verzeichnis): bestanden. `npm run build`: bestanden, einschließlich der drei neuen dynamischen Routen.
- `npm run lint`: keine Fehler, **42 unveränderte Bestandswarnungen**.
- `npm run db:test`: **137 Dateien / 2.203 pgTAP-Tests** bestanden. Die neue Datei bündelt ihre Vertragsprüfungen in einer pgTAP-Suite mit zusätzlichen SQL-Assertions.
- Vollständige lokale pgTAP-Suite einschließlich neuer Workstyle-Vertragssuite: Missing/Versionen, Consent, fremde Nutzer, Formbindung, Resume, Abschluss, optionale Rückmeldung, Core-/Research-Trennung, explizite Advisor-Shares/Widerruf, ausgeblendeter Core, Drei-Mitglieder-Sperre, Retakes und zentrale Löschung.
- `node scripts/test-workstyle-concurrency.mjs` im Web-Verzeichnis: neun unabhängige gleichzeitige HTTP-Starts für drei Testpersonen ergeben drei Assessments; Form und Session bleiben bei Reload gleich. Save/Widerruf-Race endet ohne weitere Schreibberechtigung. Temporäre Konten werden im `finally` gelöscht.
- Browser mit isoliertem lokalen Testkonto: Intro, Consent-Sperre, Kontext, alle 20+6 Fragen, Missing, Reload, Abschluss, Feedback, Admin-Kennzahlen, CSV und Widerruf. Export vor Widerruf: 27 Zeilen inklusive Kopf; danach nur Kopfzeile. Anonyme Admin-/Exportaufrufe: 404. Keine Browserfehler. Mobile Ansicht geprüft.
- Keine Behauptung eines vollständigen manuellen Regressionstests aller bestehenden Produktseiten: deren Bestandsschutz wurde durch die vorhandenen automatisierten Suiten geprüft.

## 11. Offene Punkte und Betriebsgrenzen

- Die lokale Umsetzung ist nicht produktiv ausgerollt. Vor einem Rollout sind die vier Migrationen in derselben Reihenfolge auf die Zielumgebung anzuwenden; der Remote-Schemastand wurde nicht geprüft.
- Keine empirische Validierung oder endgültige Skalenbildung. Die Core-Auswahl bleibt die gelieferte Phase-8.5a-Pretest-Auswahl. Form B/C sind über Registry-/DB-Tests abgedeckt; der vollständige Browserdurchlauf nutzte Form A.
- Der finale produktive Teamreport und dessen Oberfläche/Freigabebedienung folgen später. Bestehende ALIGN-/Advisor-Seiten laden weiterhin ihre bisherigen Instrumente.
- Allgemeine ältere ALIGN-Versionierungs-/Freigabegrenzen aus dem Audit wurden nicht großflächig refaktoriert. Der neue Core hat einen eigenen unveränderlichen Vertrag; Venture Alignment bleibt auf dem existierenden Instrument und seinen aktuellen Registry-/Abgaberegeln.
- Das Dashboard lädt für diesen kleinen Pretest die berechtigte Datenmenge über einen RPC. Größere Studien brauchen später Pagination/Aggregation, ohne neue Forschungsscores einzuführen.
- Keine automatisierte Löschung bereits heruntergeladener Exporte und kein Background-Retention-Job in dieser Phase.

## 12. Geänderte Dateien und Commit

Der Implementierungscommit enthält die unten genannten Dateien; der genaue Hash wird im Abschlussbericht ausgegeben. Der vorausgehende Auditcommit ist `90267ea`.

<!-- changed-files -->

- `docs/phase-8-5a-workstyle-audit.md`
- `docs/research/phase-8/phase-8.4-v0.2-workstyle-pool.md`
- `docs/research/phase-8/phase-8.5a-implementation.md`
- `docs/research/phase-8/workstyle-research-consent-v1.md`
- `supabase/migrations/20261111120000_workstyle_pretest.sql`
- `supabase/migrations/20261111121000_workstyle_item_seed.sql`
- `supabase/migrations/20261111122000_workstyle_core_sharing.sql`
- `supabase/migrations/20261111123000_workstyle_session_timestamps.sql`
- `supabase/tests/workstyle_pretest.sql`
- `web/docs/founder-workstyle-pretest-8.5a-v1.json`
- `web/docs/founder-workstyle-research-consent-v1.json`
- `web/messages/de/researchConsent.json`
- `web/messages/en/researchConsent.json`
- `web/scripts/build-workstyle-registry.py`
- `web/scripts/test-workstyle-concurrency.mjs`
- `web/src/app/(product)/admin/research/workstyle-pretest/export/route.ts`
- `web/src/app/(product)/admin/research/workstyle-pretest/page.tsx`
- `web/src/app/(product)/research/workstyle-pretest/page.tsx`
- `web/src/features/instruments/instruments.ts`
- `web/src/features/instruments/workstyle/WorkstylePretest.tsx`
- `web/src/features/instruments/workstyle/__tests__/workstyle.test.ts`
- `web/src/features/instruments/workstyle/actions.ts`
- `web/src/features/instruments/workstyle/analytics.ts`
- `web/src/features/instruments/workstyle/answers.ts`
- `web/src/features/instruments/workstyle/data.ts`
- `web/src/features/instruments/workstyle/registry.ts`
- `web/src/features/instruments/workstyle/teamReadiness.ts`
- `web/src/features/moderation/AdminModerationLink.tsx`
- `web/src/features/research/ResearchConsentSettings.tsx`
