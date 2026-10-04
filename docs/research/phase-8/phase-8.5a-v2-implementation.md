# Phase 8.5a-v2 – Umsetzung und Prüfbericht

## Ergebnis und Auditentscheidung

Die bestehende v1-Architektur wurde additiv erweitert. Es gibt keine neue Team-, Invite-,
Person-, Freigabe- oder Research-Tabellenarchitektur. Wiederverwendet werden `instruments`,
`assessments`, `alignment_answers`, die drei bestehenden Workstyle-Tabellen,
`alignment_shares` einschließlich ausgeblendeter Items, `platform_admins` sowie der
zentrale Research-Widerruf. Der v1-Audit bleibt in `docs/phase-8-5a-workstyle-audit.md`.

| Identität | Neue Fassung |
|---|---|
| Assessment | `founder-workstyle-pretest / 8.5a-v2` |
| DB-Instrument | `founder-workstyle-pretest-8-5a-v2` |
| Itemversion | `8.4-v0.3` |
| Manifestversion | `2.0.0` |
| Consent | `workstyle_research_v2` |
| Fachliche Quelle | `docs/research/phase-8/phase-8.4-v0.3-workstyle-pool.md` |
| Technische Registry | `web/docs/founder-workstyle-pretest-8.5a-v2.json` |
| Consent-Text | `web/docs/founder-workstyle-research-consent-v2.json` |

Alle gelieferten Itemtexte wurden unverändert übernommen. Der Generator
`web/scripts/build-workstyle-v2-registry.py` liest die fachliche Quelle und erzeugt Registry
und SQL-Seed. `--check` prüft die Übereinstimmung. Tests fixieren zusätzlich die SHA-256-Hashes
der v1-/v2-Registries und Consent-Dateien. Die numerischen v0.3-Items sind als `adapted`,
die sechs neuen R1-Mikroszenarien als `new` gekennzeichnet. Facetten bleiben ausdrücklich
Entwicklungsmetadaten. Keine Skalen-, Typen-, Match- oder Erfolgsbewertung wurde ergänzt.

## Historie, Schema und lokale Migrationen

Neue Migrationen:

- `supabase/migrations/20261112120000_workstyle_v2.sql`
- `supabase/migrations/20261112121000_workstyle_v2_item_seed.sql`

Nur lokal angewendet. Kein `supabase db push`, kein Git-Push, kein Deployment.

Die alten Migrationen, v0.2-Quelle, v1-Registry, v1-Consent-Datei und v1-Itemdefinitionen
bleiben unverändert. Es werden keine vorhandenen Antworten oder Sessionwerte umgeschrieben.
Der bestehende Trigger sperrt Änderungen und Löschungen historischer Itemdefinitionen auch
für v2. Jede neue Erhebung erhält eine eigene Assessment-/Session-ID.

Die einzige notwendige Schemaerweiterung betrifft vorhandene Tabellen:

- `workstyle_item_versions`: versionabhängige Form-Constraint; v2-Items haben `form = NULL`.
- `workstyle_pretest_sessions`: `form` wird nullable; eine gekoppelte Constraint verlangt
  für v1 weiterhin A/B/C und `workstyle_research_v1`, für v2 dagegen NULL und `workstyle_research_v2`.
- Additive Sessionfelder `manifest_version` und `resume_position`: bei historischen v1-Zeilen
  NULL, bei v2 `2.0.0` und eine Position 0–35. Der unveränderte v1-Vertrag löst sich intern als
  Manifest `1.0.0` auf; keine Migration historischer Sessionwerte ist nötig.

`start_workstyle_pretest` wählt die Instrumentfassung über die ausdrücklich übergebene
Consent-Version. Ein v1-Consent ist keine v2-Einwilligung. Doppelte Starts werden weiterhin
serverseitig serialisiert. v1 weist unverändert balanciert A/B/C zu, v2 weist keine Form zu.
Die bisherigen RPCs ohne Versionsargument liefern weiterhin ausschließlich v1.
Versionsbezogene Leser verwenden `get_my_workstyle_pretest_version` bzw.
`get_workstyle_research_dataset_version`.

## Speicherung, Freigaben und Widerruf

Die 30 Core-Antworten verwenden den bestehenden personenbezogenen Stack
`assessments → alignment_answers` mit `item_version = 8.4-v0.3`. Die sechs R1-Antworten
liegen ausschließlich in `workstyle_research_responses`. Im gemischten Ablauf dürfen sie
vor vollständigem Core gespeichert werden, während v1 seine bisherige Core-zuerst-Regel behält.

Alle 36 Items unterstützen `cannot_assess`: SQL NULL plus Missing-Code, niemals Skalenwert 6
oder numerische Mitte. Werte und Identitäten werden serverseitig gegen das eingefrorene
Instrument geprüft. Clientseitige Formularangaben können keine fremde Session, Form oder
Itemversion auswählen.

Private Sessions und Researchantworten bleiben ohne direkte Lese-/Schreibrechte für
Teilnehmer und Advisor. Owner- und Admin-RPCs prüfen den angemeldeten Nutzer bzw. die
bestehende `is_platform_admin()`-Berechtigung. Produktfreigaben gelten nur für abgeschlossene
Core-Assessments; Forschungsdaten werden darüber nicht geteilt.

Der bestehende zentrale Widerruf erfasst **beide** Instrumentfassungen. Er löscht private
Researchantworten, Kontext, Zeitdaten und Feedback. Abgeschlossene produktive Core-Antworten
bleiben privat erhalten und erscheinen nicht mehr im Researchdatensatz. Unvollständige
Erhebungen werden gelöscht. Es entstehen keine automatischen Advisor-Freigaben.

## Teilnehmerflow, Reihenfolge und Abschluss

Die vorhandene Route `/research/workstyle-pretest` zeigt standardmäßig v2.
`?version=8.5a-v1` erhält die historische Ansicht; bei bestehender v1-Teilnahme erscheint
in v2 ein neutraler Link „Frühere Teilnahme öffnen“. Der historische Login-Rücksprung behält
seinen Versionsparameter.

v2 zeigt das gelieferte Intro und die neuen Erfahrungsgruppen 0 / 1 / 2–3 / 4–5 / 6 oder mehr /
möchte ich nicht angeben. Die beiden übrigen Kontextfragen bleiben gleich.
Es gibt keine sichtbaren Konstrukte, IDs, Versionsnummern oder Core-/Research-Labels.
Der Fortschrittsbalken zeigt keine permanente numerische Restanzeige.
Situation und Frage werden durch zwei unveränderte Teilstrings des gelieferten Wortlauts
visuell getrennt. AMB erhält keinen zusätzlichen Stem. Neue Fragen erhalten Fokus und werden
in den sichtbaren Bereich gescrollt.

Die feste Reihenfolge ist in Dokument, Registry und DB-Positionen identisch:

1. ORG-01
2. EXP-01
3. VOICE-01
4. AMB-01
5. EL-01
6. EVI-01
7. AMB-02
8. EVI-02
9. ORG-R1
10. EL-02
11. EXP-02
12. VOICE-02
13. VOICE-R1
14. EXP-03
15. EVI-03
16. ORG-02
17. AMB-03
18. EL-03
19. EL-R1
20. AMB-04
21. VOICE-03
22. EVI-04
23. ORG-03
24. EXP-04
25. EXP-R1
26. ORG-04
27. EL-04
28. VOICE-04
29. EVI-05
30. AMB-05
31. EVI-R1
32. AMB-R1
33. ORG-05
34. VOICE-05
35. EL-05
36. EXP-05

Speichern setzt die nächste Position serverseitig. Auch ein Rücksprung wird vor dem
Fragenwechsel gespeichert; Reload öffnet dieselbe Position mit der gespeicherten Antwort.
Unbeantwortete vorherige Fragen können serverseitig nicht übersprungen werden.

Bei EXP-05 ruft „Fragebogen abschließen“ `finish_workstyle_pretest_v2` auf. Die Funktion
sperrt die eigene Session, speichert die letzte Antwort, validiert Vollständigkeit und setzt
`assessments.submitted_at` und `workstyle_pretest_sessions.completed_at` in derselben
Transaktion auf denselben Zeitpunkt. Fehler rollen auch die letzte Antwort zurück.
Ein identischer Retry nach verlorener Antwort liefert denselben Abschluss; ein Retry mit
verändertem Wert wird abgewiesen. Danach zeigt die UI direkt Danke / freiwilliges Feedback.
Es gibt keine zusätzliche Abschlussseite.

Das bestehende optionale Feedback erhält `clear_realistic_items`. Die Auswahl zeigt in v2
nur Fragetexte. Der Server akzeptiert ausschließlich Items der jeweiligen Instrumentfassung.
Feedback ist keine Voraussetzung für einen vollständigen Datensatz.

## Admin, Export und Teamreadiness

Die vorhandenen Admin- und Exportrouten verwenden `?version=8.5a-v1` bzw. `?version=8.5a-v2`;
der Standard ist v2. Die Datenbank filtert nach Version, die Statistik-/Exportfunktionen
filtern zusätzlich. Gleichnamige IDs verschiedener Versionen werden nicht zusammengefasst.

v1 behält A/B/C-Auswertung und Core-Vergleich nach Form. v2 zeigt N, Completion, Median-Dauer,
gespeicherte offene Position, Item-N, Missing, Verteilungen, Antwortzeiten und Feedbackflags
inklusive klar/realistisch. Keine automatische Itembewertung. CSV enthält Assessment-,
Manifest- und Itemversion, Nutzung und `research_only`, Kontext, Missing und Abschlussinfos.
Das v2-Formfeld ist leer. Keine direkten IDs und kein Freitextfeedback im normalen CSV.

`get_workstyle_team_inputs` und `checkWorkstyleTeamReadiness` verlangen zwei Personen,
explizite Freigaben oder Eigentümerschaft, ausreichende Venture-Alignment-Antworten und
identische Instrument-, Manifest- und Itemversionen. v1 erwartet 20 Core-Items, v2 genau 30.
R1-Antworten sind weder in der SQL-Abfrage noch im zulässigen Core-Set enthalten.
Es wird das neueste abgeschlossene Profil je Person verwendet; bei v1/v2-Mischung erfolgt
kein stiller Rückgriff auf ein älteres Profil. Fehlende, widerrufene oder eingeschränkte
Freigaben führen zu `not_ready` ohne Teiloffenlegung.

Das bestehende n:m-Teammodell bleibt unverändert; die aktuelle Datenfunktion liefert bei
3+ Mitgliedern weiterhin keinen Teilreport. Es gibt keine neue Teamreport-UI und keine
Änderungen an Founder Setup, Venture-Inhalten oder Legacy-Reports.

## Prüfungen

- Typecheck erfolgreich.
- `npm test`: 2.742 erfolgreich.
- `npm run lint`: keine Fehler; 42 bereits bestehende Warnungen.
- `npm run db:test`: 138 Dateien / 2.204 pgTAP-Prüfungen erfolgreich.
  Die Workstyle-Dateien bündeln zusätzlich viele Assertions in je einem Transaktionstest.
- `npm run build`: erfolgreich.
- v1-/v2-Generatoren `--check`: erfolgreich.
- Lokaler HTTP-Konkurrenztest: sechs Starts ergeben eine v2-Session ohne Form, sechs
  parallele Finalisierungen und ein Retry ergeben genau einen Abschluss. Ein konkurrierender
  Widerruf verhindert weitere Writes und erhält ausschließlich 30 Core-Antworten.
- Browser: Desktop und 390×844 mobil; separate Einwilligung, neue Kontextoptionen,
  feste 36er-Reihenfolge, alle Missing-Optionen, keine internen Labels, Rücksprung/Reload,
  direkte Finalisierung, neues Feedback, Versionstrennung, CSV und Widerruf geprüft.
- Browser-Widerruf mit DB-Evidenz: Forschungsdaten und offener v1-Testlauf gelöscht,
  abgeschlossener v2-Core mit 30 Antworten erhalten. Anonyme Admin-/Exportanfragen: 404.
- Historischer v1-Browserflow: eigene Einwilligung, Start, Antwortspeicherung und Resume;
  historische Formauswertung/CSV bleibt getrennt.

Temporäre lokale Testkonten werden nach dem Durchlauf gelöscht. Keine produktiven Daten
oder externen Deployments wurden verändert.

## Offene Punkte / bewusste Grenzen

Keine bekannten technischen Blocker. Die fachliche/empirische Prüfung des Entwicklungsinstruments
bleibt offen; insbesondere darf die v0.3-Ambiguitätsantwort nicht wie v0.2-Wohlbefinden behandelt
werden. Keine endgültige Skala oder produktive Scoreinterpretation wird behauptet.
Dauerwerte enthalten Pausen; Antwortzeiten sind keine Messung aktiver Aufmerksamkeit.
Die Browserprüfung erfolgte in Chromium mit Desktop- und mobilem Viewport, nicht auf realen
iOS-/Android-Geräten. Veröffentlichung und Anwendung auf einer nicht lokalen Datenbank sind
nicht Teil dieses Auftrags.

## Geänderte Dateien

Der Commit-Hash steht im Abschlussbericht. Die vollständige Dateiübersicht:

- `docs/research/phase-8/phase-8.4-v0.3-workstyle-pool.md`
- `docs/research/phase-8/phase-8.5a-v2-implementation.md`
- `docs/research/phase-8/workstyle-research-consent-v2.md`
- `supabase/migrations/20261112120000_workstyle_v2.sql`
- `supabase/migrations/20261112121000_workstyle_v2_item_seed.sql`
- `supabase/tests/workstyle_pretest.sql`
- `supabase/tests/workstyle_pretest_v2.sql`
- `web/docs/founder-workstyle-pretest-8.5a-v2.json`
- `web/docs/founder-workstyle-research-consent-v2.json`
- `web/scripts/build-workstyle-v2-registry.py`
- `web/scripts/test-workstyle-v2-concurrency.mjs`
- `web/src/app/(product)/admin/research/workstyle-pretest/export/route.ts`
- `web/src/app/(product)/admin/research/workstyle-pretest/page.tsx`
- `web/src/app/(product)/research/workstyle-pretest/page.tsx`
- `web/src/features/instruments/instruments.ts`
- `web/src/features/instruments/workstyle/WorkstylePretest.tsx`
- `web/src/features/instruments/workstyle/WorkstylePretestV2.tsx`
- `web/src/features/instruments/workstyle/__tests__/workstyle.test.ts`
- `web/src/features/instruments/workstyle/__tests__/workstyleV2.test.ts`
- `web/src/features/instruments/workstyle/actions.ts`
- `web/src/features/instruments/workstyle/analytics.ts`
- `web/src/features/instruments/workstyle/answers.ts`
- `web/src/features/instruments/workstyle/data.ts`
- `web/src/features/instruments/workstyle/registry.ts`
- `web/src/features/instruments/workstyle/teamReadiness.ts`
