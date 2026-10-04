# v0.4 Produktreporting – Umsetzung und Audit

Ausgangspunkt: `55d0098e83e7a8c405e4d35c9c44a3f3add09219`.
Branch: `feat/workstyle-reporting-v04`. Der Ausgangscommit bleibt unverändert.
Report-Schema: `workstyle-report/1.0.0`.

## Audit des bisherigen Standes

| Bereich | Vorhanden / Entscheidung |
| --- | --- |
| Person | `auth.users`, `person_core`, `profiles` bleiben die Identität und bestehenden Projektionen. Keine neue Person-ID. |
| Einzelprofil | `/me/profile` zeigte das 16-Item-Arbeitsprofil mit `WorkMap` und `WorkProfileSynthesisView` primär. Es bleibt als einklappbare Historie erhalten. |
| Advisor-Person | Bestehende Bereichsfreigaben und Antwortfreigaben; die neue Darstellung verwendet denselben Produktreader wie das eigene Profil. Aktuelle Venture-Angaben bleiben eigenständig sichtbar. |
| Teams | `founder_teams` / `founder_team_members` sind bereits n:m; `relationships` und Einladungen bleiben paarbezogen. Keine parallele Team- oder Invite-Struktur. |
| Mitgliedergrenze | Der vorhandene, mit Teamsperre serialisierte Trigger erlaubte drei Mitglieder. Er und `ensure_founder_team_for_relationship` erlauben jetzt vier. Vier ist die ausdrücklich geforderte Erweiterung, keine neue beliebige Plattformgrenze. |
| Einladung / Zuordnung | Bestehende Einladung und Annahme unverändert; die vorhandene vertrauenswürdige Team-Zuordnungsfunktion kann Beziehungen einem bestehenden Team zuordnen. Kein neuer öffentlicher Mitglieder-Schreibweg und keine neue Invite-UI. |
| Workstyle | v3: 52 Antworten, davon 29 ausdrücklich produktfähige Core-Antworten in `alignment_answers`; 23 private Research-/Candidate-Antworten separat. Registry, Instrument, Itemtexte, Pretest und Research-Consent bleiben unverändert. |
| Readiness | Bisher genau zwei Personen. Jetzt generische Mitgliederarrays; Versionsgleichheit und vollständige Core-Freigabe bleiben erforderlich. Der historische kombinierte Reader behält zusätzlich seine Venture-Vollständigkeitsregel. |
| Venture Alignment | Bestehende `assessments.venture_id`, `venture-alignment-v1`, Antworten und Shares. Nur die neueste abgegebene Erhebung desselben Teams wird verwendet. |
| Founder Setup | Bestehende Items, Revisionen und Bestätigungen. Produktreport zeigt ausschließlich bestätigte Revisionen, die von allen aktuellen Mitgliedern bestätigt wurden. Arbeitsnotizen werden nicht gelesen. |
| Capability | `capability_areas`, `capability_families`, `person_capability_entries`, `get_disclosed_capability` und Advisor-Bereichsreader werden wiederverwendet. Keine neue Taxonomie. |
| Coverage | `buildFounderProfileCoverage` zählte zuvor auch `contribute` als Verantwortungsabdeckung. Jetzt zählt ausschließlich `own`; Erfahrung wird nicht verrechnet. `capabilityReadout` und bestehende Coverage-Grafik bleiben erhalten. |
| Legacy-Reports | Bestehende paarbezogene Matching-/Report-Ansichten und deren Scores bleiben historischer Bestand; die neuen Ansichten rufen ihre Scoring-Engines nicht auf. |
| Snapshots | `report_runs` benötigt Paarbeziehung und Einladung; `matching_report_runs` ist ebenfalls paarbezogen, `person_alignment_snapshots` an den alten Score-Vertrag gebunden. Eine neue kleine Produkt-Snapshot-Tabelle ist deshalb erforderlich. |
| Print | Bestehende Kurz-/Lang-Routen unter `/me/profile/print` werden erweitert. Keine neue PDF-Engine. Browserdruck nutzt HTML/CSS und A4-Regeln. |

## Daten- und Interpretationsvertrag

- Instrument: `founder-workstyle-pretest-8-5a-v3`.
- Manifest: `3.0.0`; Itemversion: `8.4-v0.4`.
- Exakt 29 Items mit `scientific_status=core`, `usage=core`, `research_only=false`.
- DEC, FS, `core_research`, Research-Items, Freitext-Researchfeedback und Forschungsmetadaten gelangen weder in Produktreader noch Snapshots.
- Die sechs Produktbereiche bleiben EVI, EXP, EL, VOICE, AMB und ORG. Keine Gesamtwerte, Normen, Matchdistanzen, Typen oder Erfolgsprognosen.
- Missing bleibt Missing. Keine numerische Ersetzung. Fehlende Freigaben sind keine fehlenden Fähigkeiten.
- Der neueste abgeschlossene Workstyle wird **vor** der Freigabeprüfung gewählt. Gemischte oder neuere inkompatible Fassungen führen nicht zu einem Rückgriff auf ältere Profile.
- Ein Team kann trotz freiwilliger `cannot_assess`-Antworten dargestellt werden; die betroffenen Situationen werden als unzureichend beschrieben. Nicht freigegebene Core-Items verhindern hingegen den gemeinsamen vollständigen Report.

### Deterministische Beschreibung und Grafik

`model.ts` erzeugt konkrete Beschreibungen aus benannten Rohantworten, ohne LLM. Zwei Situationen pro Bereich können im Einzeltext sichtbar werden. Vorteil und Kontext bleiben ausdrücklich mögliche Funktionen, keine Identitätszuschreibung.

Die Detailgrafik zeigt jede ausgewählte Antwortkategorie. FC-Antworten bleiben qualitative A/B-Präferenzen mit ausgeschriebenen Alternativen. Keine arithmetische Verarbeitung von FC oder Behavioral-Antworten.

Die kompakte Übersicht verwendet ausschließlich für die Anzeige den unteren ordinalen Median gleichartig formulierter Core-Items. Damit bleibt die Position eine tatsächlich ausgewählte Kategorie. Mindestens zwei und mindestens die Hälfte der geeigneten Antworten müssen vorliegen. EXP-Seriousness und alle FC-/Behavioral-Items sind ausgeschlossen; bei ORG stehen deshalb nur nächste Schritte und Zwischenstände in der Übersicht. Diese Position wird weder persistiert noch für Interpretation oder Matching verwendet.

Teamregeln vergleichen Antwortbereiche derselben Items: untere Kategorien, mittlere Kategorie, obere Kategorien; FC-Richtung A/B. Sie liefern ähnliche/unterschiedliche Muster, mögliche Ergänzungen und Gesprächsfragen. Es gibt keine numerische Distanz. Eine Situation wird nur gegenübergestellt, wenn alle aktuellen Mitglieder dazu eine sichtbare Einschätzung haben. 2/3/4 Personen verwenden dieselbe Logik; keine paarweise Explosion.

Initialen, unterschiedliche Konturen und ausgeschriebene Namen/Antworten ergänzen die Farbe. Marker stehen je Mitglied auf einer eigenen Zeile und überdecken einander nicht. Semantische Überschriften, Figurenbeschreibungen und native Links/Buttons bleiben per Tastatur erreichbar.

## Komponenten und Sourcing

Die Matrix trennt drei Achsen:

1. `application_level`: sichtbare Anwendungserfahrung als Originaltext.
2. `ownership_wish`: Übernehmen, beitragen, hineinwachsen, abgeben, extern lösen, unklar.
3. `capability_areas.sourcing`: `internal_only`, `component`, `depends`.

Nur `own` zählt als Übernahmewunsch. `grow_into` und `contribute` zählen nicht als Ownership. Eine niedrige Anwendungserfahrung wird nicht mit Ownership verrechnet; beides steht sichtbar nebeneinander. Eine Zusammenfassung bedeutet einen Verantwortungswunsch, noch keine gemeinsam vereinbarte Rolle.

`OPEN_INTERNAL` und der Hinweis auf eine einzige intern tragende Person werden nur bei vollständig sichtbaren Verantwortungsangaben verwendet. „Extern lösbar“ beweist keine Beauftragung. Externe Wünsche lösen eine Frage nach interner Schnittstelle und Abhängigkeit aus. Keine Aussage über ein fixes Rollenmodell Günter Faltins; Bezug ist ausschließlich das Komponentenprinzip.

## Venture Alignment und Founder Setup

Der Teamreport zeigt freigegebene Angaben für **dieses** Vorhaben mit der bestehenden Itemregistratur und dem bestehenden Antwort-Readout. Keine Summenscores. Fehlende Antworten bleiben offen. Bei 3+ wird die historisch auf eine einzelne andere Person bezogene Frage R02 nicht automatisch als Teamvergleich interpretiert.

Founder Setup bleibt ein eigener Abschnitt. Keine Interpretation von Entwürfen, keine erfundenen Vereinbarungen. Ohne bestätigte Inhalte erscheint für Teammitglieder der bestehende Setup-Einstieg. Advisor-Setup setzt weiterhin den eigenen, einstimmigen Setup-Grant voraus; eine Teamreview-Freigabe reicht dafür nicht.

## Rechte und Snapshot-Lebenszyklus

- Teammitgliedschaft macht einen Report auffindbar, gibt aber keine Workstyle-Antworten frei.
- Jeder fremde Core benötigt einen wirksamen bestehenden `alignment_share`; ausgeschlossene Items werden serverseitig gefiltert.
- Advisor benötigen zusätzlich eine aktive Gruppenfreigabe für exakt die aktuellen Teammitglieder. Ein paarbezogener Relationship-Advisor-Grant gilt nur für das entsprechende Zweierteam.
- Diese Teamprüfung gilt auch für `get_workstyle_team_inputs`, damit der ältere Reader kein alternativer Zugangsweg wird.
- Capability und Capability-Tiefe behalten eigene Offenlegungen/Advisor-Scopes. Organisationen erteilen keine automatische Antwortfreigabe; Empfänger werden einzeln ausgewählt.
- `share_workstyle_product` setzt Share und Itemausschlüsse atomar über die bestehenden Tabellen. Die Empfängerauswahl nutzt vorhandene Kontakte, Teammitglieder und Advisor-Verbindungen.
- `workstyle_product_snapshots` ist RLS-geschützt und für Clients ausschließlich über RPC erreichbar. Snapshot-Payloads werden ausschließlich serverseitig erzeugt; Updates sind gesperrt.
- Gespeichert werden Report-Schema, Produktantworten samt Instrument/Manifest/Itemversion, Mitglieder und Kontext, sichtbare Capability-Daten samt vollständiger verwendeter Taxonomie/Sourcing, Alignment-Instrument/Manifest und sichtbare bestätigte Setup-Inhalte. Die bestehende Capability-Taxonomie hat keine separate explizite Versionsnummer; ihre Definitionen werden deshalb mit eingefroren.
- Snapshot-Zugriff ist an die erzeugende lesende Person gebunden. Jede Öffnung prüft erneut den aktuellen erlaubten Produktinput. Bei Änderungen an Daten, Mitgliedschaft oder Freigaben wird der alte Snapshot nicht mehr ausgeliefert; der gespeicherte Stand bleibt unverändert und ein neuer Stand muss erzeugt werden. Das ist eine bewusst strenge Widerrufssicherung, kein dauerhaft frei abrufbares historisches Archiv.
- Weder Forschungs-Einwilligung noch Research-Teilnahme erteilen eine Produkt- oder Advisor-Freigabe.

## Migration und Routen

Additive Migration: `supabase/migrations/20261114120000_workstyle_product_reporting.sql`.
Nur lokal angewandt. Sie erweitert den bestehenden Mitgliedertrigger auf vier, ergänzt Produkt-/Snapshot-/Share-Reader und die kleine Snapshot-Tabelle. Historische Migrationen und Itemdefinitionen bleiben unverändert.

Neue Routen:

- `/me/profile/workstyle`: aktueller Einzelreport, explizite Freigaben, Snapshot und Drucken.
- `/teams/[teamId]/workstyle`: generischer Teamreport, Snapshot und Drucken.

Erweiterte Einstiege:

- `/me/profile` und `/me/profile/print?mode=short|full`.
- Bestehende Teamnavigation.
- `/advisor/person/[userId]` und `/advisor/review/[reviewId]`.

## Prüfung

- Anwendungstests: `npm test` – 2.761 bestanden.
- Datenbank: `npm run db:test` – 140 Dateien / 2.206 pgTAP-Tests bestanden, einschließlich mehrerer Assertions innerhalb des neuen Report-Integrationstests.
- Typecheck: `npx tsc --noEmit` – bestanden.
- Lint: keine Fehler; 42 bereits vorhandene Warnungen.
- Produktionsbuild: `npm run build` – bestanden (Next.js 15.5.20).
- DB-Integration: reale v3-Start-/Antwort-/Abschluss-RPCs, 2/3/4 Mitglieder, fünftes Mitglied abgewiesen, private Antworten ausgeschlossen, versteckte Core-Antworten, Shares/Widerruf, historische Versionsisolation, Snapshot-Zugriff, Advisor-Gruppenfreigabe, getrennte Capability-Tiefe, nur einstimmig bestätigtes Setup.
- Unit: ähnliche/unterschiedliche Muster bei 2/3/4 Personen, Missing, FC, Display-Median, Versions-/Item-Allowlist, Komponentenfälle einschließlich `grow_into`, `prefer_other`, `prefer_external`, Mehrfachabdeckung und unbekannter Freigabe.
- Browser mit isolierten lokalen Konten: Einzelreport, primäres Profil, Desktop 1280×1000, Mobil 390×844, 2/3/4-Founder-Report, Komponentenmatrix, same-venture Antworten, Snapshot speichern/neu laden, Advisor mit/ohne Gruppenfreigabe, Advisor-Einzelansicht; keine JavaScript-Fehler.
- Druck: bestehende Kurz-/Lang-Profilrouten und Teamreport als echte Chromium-A4-PDFs erzeugt und mit PDFKit gerendert/visuell geprüft. Beispielumfang: Kurzprofil 5, Langprofil 13, ausführlicher Vierer-Teamreport 28 Seiten. Keine horizontal abgeschnittene Grafik; Konturen/Initialen bleiben ohne Farbe verständlich. Die lange Fassung enthält bewusst alle Rohantworten.

## Bewusste Grenzen / manuelle Abnahme

- Fachliche manuelle Abnahme der deterministischen Texte und Druckdarstellung bleibt vor Veröffentlichung erforderlich; das Instrument wird nicht als psychometrisch validiert bezeichnet.
- Die Daten-/Reportlogik ist n-member-fähig, der bestehende Mitgliederschutz unterstützt in dieser Phase höchstens vier. Einladung und Teamzuordnung bleiben bestehende Flows; kein neuer Self-Service-Flow zum Zusammenführen beliebiger Teams.
- Produktreporting startet ausschließlich mit v0.4; ältere Workstyle-Antworten werden weder umgedeutet noch hochgerechnet.
- Die neue Beschreibung ist deutsch, passend zum gelieferten Instrument. Keine erfundene englische Instrumentfassung.
- Eine organisationsweite oder linkbasierte pauschale Produktfreigabe wurde nicht eingeführt.
- Snapshots sind absichtlich nicht mehr abrufbar, sobald der gegenwärtige Daten-/Freigabestand vom gespeicherten Stand abweicht.
- Print wurde in lokalem Chromium geprüft; die abschließende manuelle Abnahme sollte die tatsächlich eingesetzten Browser/Druckdialoge einschließen.

NO REMOTE DB PUSH PERFORMED

NO PRODUCTION DEPLOY PERFORMED

## Geänderte Dateien

- `docs/research/phase-8/phase-8.5a-v3-product-reporting.md`
- `supabase/migrations/20261114120000_workstyle_product_reporting.sql`
- `supabase/tests/founder_team_foundation.sql`
- `supabase/tests/problem_workspace_transitions.sql`
- `supabase/tests/workstyle_pretest.sql`
- `supabase/tests/workstyle_pretest_v2.sql`
- `supabase/tests/workstyle_pretest_v3.sql`
- `supabase/tests/workstyle_product_reporting.sql`
- `web/messages/de/profile.json`
- `web/messages/en/profile.json`
- `web/src/app/(product)/advisor/person/[userId]/page.tsx`
- `web/src/app/(product)/advisor/review/[reviewId]/page.tsx`
- `web/src/app/(product)/teams/[teamId]/workstyle/page.tsx`
- `web/src/app/me/profile/page.tsx`
- `web/src/app/me/profile/print/page.tsx`
- `web/src/app/me/profile/workstyle/page.tsx`
- `web/src/features/instruments/align/ShareForm.tsx`
- `web/src/features/instruments/align/__tests__/arbeitsprofilSynthese.test.ts`
- `web/src/features/instruments/align/shareActions.ts`
- `web/src/features/instruments/align/shareData.ts`
- `web/src/features/instruments/v21/__tests__/pilotPagesSayWhatTheyAre.test.ts`
- `web/src/features/instruments/workstyle/teamReadiness.ts`
- `web/src/features/reporting/__tests__/founderProfileCoverage.test.ts`
- `web/src/features/reporting/__tests__/profilDruck.test.ts`
- `web/src/features/reporting/founderProfileCoverage.ts`
- `web/src/features/reporting/profileReadModel.ts`
- `web/src/features/reporting/workstyle/ComponentMatrix.tsx`
- `web/src/features/reporting/workstyle/IndividualWorkstyle.tsx`
- `web/src/features/reporting/workstyle/SignatureOverview.tsx`
- `web/src/features/reporting/workstyle/TeamWorkstyleReport.tsx`
- `web/src/features/reporting/workstyle/WorkstyleSignature.tsx`
- `web/src/features/reporting/workstyle/__tests__/productReport.test.ts`
- `web/src/features/reporting/workstyle/actions.ts`
- `web/src/features/reporting/workstyle/alignmentModel.ts`
- `web/src/features/reporting/workstyle/componentsModel.ts`
- `web/src/features/reporting/workstyle/data.ts`
- `web/src/features/reporting/workstyle/model.ts`
- `web/src/features/reporting/workstyle/report.css`
- `web/src/features/teams/FounderTeamNavigation.tsx`
