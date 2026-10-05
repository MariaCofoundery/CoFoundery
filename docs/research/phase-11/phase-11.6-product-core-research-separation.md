# Phase 11.6 – Arbeitsprofil und Forschung getrennt, Advisor-Teambericht nur bei gegenseitiger Bereitschaft

Stand: 05.10.2026. Branch: `feat/workstyle-reporting-v04`, HEAD `aee3abdd`. Phase 11.5 und 11.6 liegen gemeinsam **uncommitted** im Working Tree. Kein Push, kein Deployment, kein Remote-Supabase-Push.

**Neue Migration:** `supabase/migrations/20261118130000_workstyle_product_core_completion.sql`. Sie ist nur lokal angewendet und setzt auf `20261118120000_workstyle_team_mutual_readiness.sql` (Phase 11.5) auf.

Grundsatz: **29 Fragen bilden das aktuelle Produktinstrument.** Daraus folgt keine Aussage, dass 29 Fragen psychometrisch endgültig ausreichen. Die 23 Forschungs- und Kandidatenfragen dienen weiter der Instrumententwicklung.

---

## 1. Alter 52-Screen-Vertrag

Ablauf bis 11.5 (8.5a-v3, Manifest 3.0.0, Itemversion 8.4-v0.4):

| Schritt | Umsetzung | Kopplung |
|---|---|---|
| Start | `start_workstyle_pretest(p_consent_version, p_context, p_new)`. Die Version wird **aus der Einwilligung** abgeleitet (`workstyle_research_v3` → 8.5a-v3), ohne Einwilligung `research_consent_required`. Kontext (Erfahrung, Team, Phase) ist Pflicht. | Produkt nur mit Forschungseinwilligung |
| Einwilligung | `workstyle_pretest_sessions.consent_version` / `consent_given_at`, beide `NOT NULL`, Constraint `workstyle_session_version_contract` | jede Sitzung ist eine Forschungssitzung |
| Speichern | `save_workstyle_pretest_v3`: feste, **gemischte** Reihenfolge über alle 52 Positionen (`workstyle_previous_answer_required`). Core landet in `alignment_answers`, Forschung in `workstyle_research_responses`. Bearbeitungszeiten in `sessions.timings` | Core-Frage 30 erst nach allen Forschungsfragen davor |
| Abschluss | `p_finalize` nur an Position 52 → `complete_workstyle_pretest` verlangt **29 Core + 23 Forschung** und setzt `assessments.submitted_at` **und** `sessions.completed_at` gleichzeitig | Produktabschluss = Forschungsabschluss |
| Fortsetzen | `get_my_workstyle_pretest_version` liefert Sitzung + Antworten, `resume_position` (0–51, global), `set_workstyle_pretest_position` für Zurück | globale Position |
| Widerruf | `erase_workstyle_research`: Forschungsantworten, Kontext, Zeiten und Feedback werden gelöscht. Bei `completed_at` bleibt das Core-Profil, sonst wird die ganze Teilnahme gelöscht. Auch beim Ablehnen in den zentralen Forschungseinstellungen (Trigger) | „abgeschlossen“ hieß 52/52 |
| Export | `get_workstyle_research_dataset_version`: **alle** nicht widerrufenen Sitzungen, inklusive Core-Antworten | jede Sitzung war Forschung |

Tabellen: Core in `alignment_answers` (Produkt, lesbar über RLS/RPC), Forschung in `workstyle_research_responses` (nur über RPC, nie in Produktlesern), Metadaten in `workstyle_pretest_sessions` (nur über RPC).

**Report-Bereitschaft:** Alle Produktleser prüfen `assessments.submitted_at` auf der aktuellen Instrument-ID. Das sind `get_workstyle_product_profile`, `get_workstyle_product_team`, `get_workstyle_product_team_status`, `workstyle_core_visible_to`, `get_discovery_workstyle_signals`, `share_workstyle_product`, `guard_workstyle_share`, Dashboard (`dashboardData`, `navState`), `aboutYouData`, `TeamJourneyStatus` und `shareData`.

**Forschungsabschluss:** `sessions.completed_at`.

## 2. Neue Produktvollständigkeit

**PRODUCT COMPLETION = `assessments.submitted_at`**, gesetzt sobald **alle 29 aktuellen Core-Antworten** vorliegen (`usage='core'` und `scientific_status='core'`, gezählt aus `workstyle_item_versions`).

- Gesetzt wird es durch den internen Helfer `workstyle_v3_sync_completion`, den `save_workstyle_pretest_v3` nach jeder Antwort aufruft. `complete_workstyle_pretest` nutzt für v3 denselben Helfer.
- Die bestehende kanonische Spalte bekommt nur eine neue Bedeutung, es gibt keine Parallel-Logik. Alle Verbraucher übernehmen die Regel automatisch: `/me/profile/workstyle`, Teambericht, Team-Readiness, FIND-Workstyle, Advisor-Personenansicht, Join, Dashboard und Einladung.
- `get_my_workstyle_pretest_version` liefert zusätzlich `submitted_at`, damit der Fragebogen den Produktabschluss kennt.
- Abgeschlossene Core-Antworten sind unveränderlich. Eine identische Wiederholung ist erlaubt.

## 3. Forschungsvollständigkeit

**RESEARCH COMPLETION = `workstyle_pretest_sessions.completed_at`.** Gesetzt nur, wenn
- eine Forschungseinwilligung besteht und nicht widerrufen ist,
- das Arbeitsprofil fertig ist und
- alle 23 Forschungsantworten vorliegen.

Zustände für die Oberfläche: *nicht begonnen* (keine Einwilligung), *teilweise* (Einwilligung, `completed_at` leer), *abgeschlossen*, *widerrufen* (`withdrawn_at`). Der Forschungsabschluss hat keine Wirkung auf Produktbericht, Teambericht, FIND oder Teilen, denn diese lesen nur `submitted_at` und nur Core.

## 4. Einwilligung getrennt

- `consent_version` und `consent_given_at` dürfen für 8.5a-v3 leer sein. v1/v2 bleiben unverändert Pflicht.
- Neuer Constraint `workstyle_session_research_consent`:
  - beide Spalten sind gemeinsam leer oder gemeinsam gesetzt;
  - **ohne Einwilligung** sind `context`, `timings` und `feedback` leer, und es gibt weder `completed_at` noch `withdrawn_at`.
  - Ohne Einwilligung kann die Datenbank also keine Forschungsmetadaten halten.
- Forschungsantworten speichert `save_workstyle_pretest_v3` nur mit Einwilligung (`research_consent_required`). Bearbeitungszeiten werden nur mit Einwilligung gespeichert.
- `start_workstyle_research` setzt die Einwilligung ausdrücklich nachträglich. Das geht nur bei fertigem Arbeitsprofil und nie nach einem Widerruf derselben Sitzung.
- Einwilligungstext: unverändert `workstyle_research_v3`. Er deckt die spätere Teilnahme ab („meine Antworten, Kontextangaben, Bearbeitungszeiten und Feedback … ein abgeschlossenes privates Arbeitsprofil bleibt erhalten“). Die Einleitung sagt zusätzlich ausdrücklich, dass auch die Antworten aus dem Arbeitsprofil ausgewertet werden.
- Bestehende Einwilligungen bleiben gültig, keine wird ungültig.

## 5. Migration und RPC-Änderungen

`20261118130000_workstyle_product_core_completion.sql`, additiv:

| Objekt | Änderung |
|---|---|
| `workstyle_pretest_sessions` | Einwilligungsspalten für v3 nullable; Versions-Constraint für v3 angepasst; neuer Einwilligungs-Constraint |
| `workstyle_v3_sync_completion(uuid)` | **neu, intern** (für `public`/`anon`/`authenticated` gesperrt): Produkt- und Forschungsabschluss |
| `start_workstyle_product(boolean)` | **neu**, nur `authenticated`: startet bzw. setzt das Arbeitsprofil ohne Einwilligung fort; `p_new` beginnt nur nach fertigem Profil neu |
| `start_workstyle_research(text, jsonb)` | **neu**, nur `authenticated`: Einwilligung + Kontext, nur bei fertigem Arbeitsprofil |
| `get_my_workstyle_pretest_version` | gleiche Signatur, zusätzlicher Schlüssel `submitted_at` |
| `save_workstyle_pretest_v3` | gleiche Signatur. Reihenfolge nur innerhalb des Teils, Forschung nur mit Einwilligung, Zeiten nur mit Einwilligung, Abschluss automatisch. `p_finalize` bleibt für bestehende Aufrufer und wird nur auf Nicht-Null geprüft |
| `complete_workstyle_pretest` | v1/v2 unverändert, v3 über den Helfer |
| `erase_workstyle_research` | nur Sitzungen mit Einwilligung; „abgeschlossen“ = `submitted_at` |
| `get_workstyle_research_dataset_version` | nur Sitzungen mit Einwilligung, zusätzlich `research_consent_given_at` |
| Bestandsübernahme | v3-Teilnahmen mit allen 29 Core-Antworten ohne `submitted_at` erhalten `submitted_at` = Zeitpunkt der letzten Core-Antwort |
| `get_workstyle_product_team` | Gegenseitigkeit für **jede** lesende Person (siehe Abschnitt 13) |
| `get_workstyle_team_inputs` | historischer Team-Adapter, dieselbe Gegenseitigkeit, fassungsunabhängig (v1–v3) |

Unverändert:
- `start_workstyle_pretest` (bisheriger Einstieg mit Einwilligung, für bestehende Aufrufer und Skripte)
- `set_workstyle_pretest_position`, `save_workstyle_feedback` (verlangt den Forschungsabschluss)
- `share_workstyle_product`, `get_workstyle_product_profile`, Snapshots
- RLS, Grants auf Tabellen

Keine neue Tabelle, keine Instrumentversion, keine Items, keine Scores, keine Rechteerweiterung.

## 6. Bestehende Nutzer

| Fall | Behandlung |
|---|---|
| **A** 52/52 | unverändert vollständig (`submitted_at` und `completed_at` waren schon gesetzt), Bericht unverändert |
| **B** 29 Core, Forschung teilweise | wird durch die Bestandsübernahme zum Arbeitsprofil. Forschungsantworten bleiben, der Forschungsteil lässt sich fortsetzen (Einwilligung besteht schon) |
| **C** Core teilweise | Der Arbeitsprofil-Teil zeigt nur die offenen Core-Fragen. Vorhandene Forschungsantworten bleiben gespeichert. Mit der 29. Core-Antwort ist das Profil fertig; wurde die Forschung schon beendet, wird sie im selben Moment abgeschlossen |
| **D** v1/v2 | unverändert historisch, keine Zuordnung, eigene Seiten (`?version=8.5a-v2` / `-v1`) unverändert |

Keine Antwort wird geändert, verschoben oder gelöscht. Geprüft:
- B und C im Datenbankversuch: B erhält den Zeitpunkt der letzten Core-Antwort und behält 5 Forschungsantworten, C bleibt unvollständig.
- A, C und D in pgTAP.

## 7. Einleitung zum Arbeitsprofil

„Mach’s dir kurz bequem.“
- **29** ganz unterschiedliche Situationen aus dem Arbeitsalltag;
- keine richtigen oder falschen Antworten, so antworten, wie es meistens wirklich ist;
- jede Antwort wird sofort gespeichert, später weitermachen jederzeit;
- privat, bis man selbst freigibt.

Kein Forschungshinweis, keine Einwilligung, keine Kontextfragen, keine Minutenangabe, kein „Pretest“. Seitentitel jetzt „Wie du arbeitest“, Login-Link „Anmelden und loslegen“.

## 8. Fortschritt

- Arbeitsprofil: „Frage x von 29“, `aria-label="Fortschritt Arbeitsprofil"`.
- Forschung: eigener Balken „Forschungsfrage x von 23“, `aria-label="Fortschritt Forschungsteil"`, darüber „Forschungsteil · freiwillig“.
- Keine kombinierte 52er-Leiste.
- Balken und Fragekarte (`WorkstyleProgress`, `WorkstyleQuestion`) sind gemeinsam genutzt; Scroll- und Fokusverhalten aus 11.5 bleibt.

## 9. Abschluss

Nach Frage 29: **Geschafft – „Dein Arbeitsprofil ist bereit.“** Darunter der Datenschutzsatz, dann in dieser Reihenfolge:
1. **Arbeitsprofil ansehen**
2. **Freigaben für {Name} prüfen** (nur aus einer Einladung)
3. Zu eurem Team
4. Zum Dashboard

Darunter, deutlich nachgeordnet (gestrichelte Karte): „Made2Found bei der Weiterentwicklung unterstützen“ mit „Mehr erfahren“. Es gibt keine automatische Weiterleitung in die Forschung. „Arbeitsprofil später neu beantworten“ braucht eine Bestätigung; das bisherige Profil bleibt aktuell, bis das neue fertig ist.

## 10. Forschungs-Einstieg

Route: dieselbe Seite, `/research/workstyle-pretest?version=8.5a-v3&teil=forschung`. Keine neue Produktroute.

**Wo das Angebot erscheint:**
- auf der Abschlussseite;
- auf `/me/profile/workstyle` (nicht im Druck, nicht in Snapshots);
- über den bestehenden Link in den Forschungs-Einstellungen im Account (jetzt „Forschung zum Arbeitsprofil: teilnehmen oder Einwilligung verwalten“).

**Wann:** nur bei fertigem, aktuellem Arbeitsprofil, ohne Widerruf und solange die Forschung nicht abgeschlossen ist. **Nicht** auf den Dashboards, nicht im Teambericht, nicht im Druck.

**Einleitung „Made2Found bei der Weiterentwicklung unterstützen“:**
- freiwillig;
- dient der Weiterentwicklung;
- fließt nicht ins Arbeitsprofil ein und ist für niemanden sichtbar;
- wertet pseudonymisiert auch die Antworten aus dem Arbeitsprofil aus;
- jederzeit unterbrechen, fortsetzen und widerrufen; das Arbeitsprofil bleibt.

Der volle Einwilligungstext ist aufklappbar. Die Checkbox ist **nicht vorausgewählt**, „Forschungsteil starten“ bleibt bis zur Einwilligung deaktiviert, und „Nein, danke“ ist ein gleichwertiger Knopf. Wer ablehnt oder das Angebot ignoriert, hat keinen Nachteil.

## 11. Fortsetzen

- **Arbeitsprofil:** Die Position wird aus den Antworten bestimmt (erste offene Core-Frage). „Zurück“ springt innerhalb der Sitzung. „Später weitermachen“ führt zum Dashboard.
- **Forschung:** getrennt, erste offene Forschungsfrage. „Später weitermachen“ führt zum Arbeitsprofil, das Angebot dort heißt dann „Forschungsteil fortsetzen“.
- Getestet im Browser: 5 Forschungsfragen, abbrechen, Profilseite zeigt „Forschungsteil fortsetzen“, Wiederaufnahme bei „Forschungsfrage 6 von 23“. Das Arbeitsprofil blieb die ganze Zeit fertig.
- `resume_position` (global) wird weiter für bestehende Aufrufer gepflegt, der neue Ablauf braucht es nicht.

## 12. Auswirkung auf den Teambericht

Der Teambericht braucht nur das Arbeitsprofil (29 Core) jeder Person und die gegenseitigen Freigaben (11.5). Forschung spielt keine Rolle. Getestet:
- Profile nur aus dem Produktteil und Profile nach widerrufener Forschung zählen beide mit 29 Antworten;
- im Advisor-Teambericht stehen keine DEC/FS-Inhalte.

## 13. Advisor: gegenseitige Bereitschaft

**Vorher (11.5):** Die Gegenseitigkeit galt nur für Mitglieder (`is_current_user_founder_team_member … and exists(…)`). Ein Advisor mit Gruppenfreigabe (`advisor_team_reviews`) oder Paar-Advisor-Zugang sah den Teambericht, sobald jedes Mitglied **ihm** freigegeben hatte, auch wenn die Founder einander noch nichts freigegeben hatten. Er sah den gemeinsamen Bericht also vor dem Team.

**Jetzt:** In `get_workstyle_product_team` gilt die Prüfung über alle gerichteten Mitgliederpaare für **jede** lesende Person. Advisors brauchen weiterhin zusätzlich ihre eigenen Freigaben. Dieselbe Regel gilt im historischen Adapter `get_workstyle_team_inputs`. Snapshots folgen automatisch (`get_workstyle_product_snapshot` vergleicht mit dem aktuellen Ergebnis). Ein gespeicherter Advisor-Snapshot wird nach einem Widerruf nicht mehr als aktuell ausgeliefert.

**Personenfreigaben bleiben unabhängig:** Gibt A ihr Arbeitsprofil dem Advisor frei, sieht er A einzeln (`get_workstyle_product_profile`), den A/B-Teambericht aber erst bei gegenseitiger Bereitschaft.

**Advisor-Oberfläche** (`/teams/[teamId]/workstyle`, kein Mitglied, nicht bereit): „Der gemeinsame Bericht ist noch nicht verfügbar. Es fehlen noch Freigaben im Team. Der Bericht erscheint hier, sobald alle im Team ihre Arbeitsweise füreinander freigegeben haben – und für dich.“
- keine Mitgliederliste, keine Namen;
- kein Link zum eigenen Profil;
- keine Unterscheidung zwischen „Freigabe fehlt“ und „nicht verfügbar“ (`get_workstyle_product_team_status` wird für Advisors nicht mehr aufgerufen);
- `get_workstyle_team_share_readiness` bleibt nur für Mitglieder;
- Advisors können keine Freigaben setzen.

## 14. Datenschutz und Löschung

- Ohne Einwilligung keine Forschungsdaten. Das ist im Constraint festgeschrieben, und RPCs sind der einzige Schreibweg.
- Export nur mit Einwilligung. Reine Produktsitzungen fehlen dort vollständig, auch ihre Core-Antworten.
- **Widerruf:**
  - mit fertigem Profil: Forschungsantworten, Kontext, Zeiten und Feedback werden gelöscht, `withdrawn_at` wird gesetzt, das Arbeitsprofil bleibt;
  - mit Einwilligung und unfertigem Profil (nur Bestandsfälle): Die Teilnahme wird wie bisher gelöscht. So steht es im Einwilligungstext, und die Oberfläche sagt es an dieser Stelle;
  - ohne Einwilligung: keine Wirkung.
  - Gleiches gilt für die Ablehnung in den zentralen Forschungseinstellungen (bestehender Trigger).
- Account-Löschung: unverändert über die Kaskade von `auth.users`. `account_deletion_*` und `research_consent_separation` sind grün.
- Produktleser lesen weiterhin nie `workstyle_research_responses`.

## 15. Tests

- **Neu:** pgTAP `supabase/tests/workstyle_product_core_completion.sql`, alle Produkt- und Forschungsfälle über die echten RPCs als `authenticated`:
  - **G** ohne Einwilligung startbar; keine Einwilligung, kein Kontext, keine Zeiten; Forschung ohne Einwilligung verweigert; Core-Reihenfolge erzwungen; Forschung vor dem Profil verweigert
  - **C** 28/29 → kein Profil
  - **A** 29/29 ohne Forschung → `submitted_at`, Bericht mit 29 Antworten, keine Forschungsdaten, keine Zeiten; abgeschlossene Antworten unveränderlich
  - **H** Forschung nachträglich; **B** teilweise Forschung ändert den Produktabschluss nicht; Zeiten nur für Forschungsantworten; Reihenfolge im Forschungsteil; Export nur mit Einwilligung; Forschungsabschluss später; Feedback
  - **D** 52/52 über den bisherigen Einstieg vollständig
  - **C** Bestand 28 Core + 23 Forschung → kein Profil, die letzte Core-Antwort schließt beides
  - **I** Widerruf: unvollständig mit Einwilligung wird gelöscht; nach fertigem Profil sind die Forschungsdaten weg und das Profil bleibt; kein Neustart der Forschung; Widerruf ohne Teilnahme lässt das Profil unberührt
  - **E** Team-Bereitschaft mit reinen Produktprofilen
  - **F** FIND-Signale mit reinen Produktprofilen
  - Neu erheben ohne geerbte Einwilligung, das bisherige Profil bleibt aktuell
- **Advisor** (gleiche Suite):
  - **C** nur Personenfreigabe → Einzelansicht ja, Teambericht nein
  - **A** nicht gegenseitig → A, B und Advisor ohne Bericht, auch bei einseitiger Mitgliederfreigabe
  - Advisor ohne Readiness-Details, historischer Adapter folgt derselben Regel
  - **B** gegenseitig → dieselbe Grundlage für A, B und den Advisor
  - **E** Widerruf → Team und Advisor ohne Bericht, Advisor-Snapshot nicht mehr aktuell, Personenfreigabe unberührt
  - **D** drei Founder, die dritte fehlt → auch der Advisor ohne Bericht, erst bei voller Gegenseitigkeit bereit
- **Angepasst** (bewusste Vertragsänderung, keine Lockerung):
  - `workstyle_pretest.sql`, `workstyle_pretest_v2.sql`, `workstyle_pretest_v3.sql`: Team-Eingaben für einen Advisor erst mit gegenseitigen Mitgliederfreigaben; der einseitige Fall ist jetzt ausdrücklich als `not_ready` geprüft.
  - v3: „atomarer Abschluss“ ersetzt durch „Produkt mit der 29. Core-Antwort, Forschung getrennt und später“.
- **Node:**
  - neu `web/src/features/instruments/workstyle/__tests__/phase116.test.ts` (8 Tests): Instrumentgröße, Migrationsinhalt (keine Freigabe, keine Items, kein Löschen außerhalb des Widerrufs), nur Core im Ablauf, eigene Fortschritte, kein „Pretest“ und keine 52, Abschlussreihenfolge ohne Weiterleitung, Einwilligung nicht vorausgewählt, „Nein, danke“ gleichwertig, Route, Profil-Angebot, neutraler Advisor-Hinweis, i18n-Parität;
  - `phase115.test.ts` zeigt auf den neuen Ablauf.
- **Ergebnisse:**
  - `npm run ci:check`: `tsc` sauber; 2844/2844 Node-Tests; `next build`; `db:test` gegen den laufenden lokalen Container mit 145 Dateien / 2264 Tests, `Result: PASS`. Die DB-Suite lief also tatsächlich und wurde nicht übersprungen.
  - `git diff --check` sauber, ESLint auf den geänderten Dateien sauber.
  - Das manuelle Skript `scripts/test-workstyle-v3-concurrency.mjs` (doppelter Start, gleichzeitige Abschlüsse, Widerruf) ist grün.

## 16. Browser

Lokale Daten über die echten RPCs: Vera (Profil nur aus dem Produktteil), Nora (neu, per Einladung im Team), Ada (Advisorin mit Gruppenfreigabe). Alle Testdaten wurden danach gelöscht, die Datenbank hat wieder 4 Nutzer und 1 Team.

1. Start im Einladungskontext: Einleitung mit „29 ganz unterschiedliche Situationen“, ohne 52, „Pretest“ oder Einwilligung (1280/390, kein horizontaler Überlauf).
2. 29 Fragen bei 390 px: nur „Frage x von 29“, Fokus jedes Mal auf der Frage, Zurück funktioniert.
3. Abschluss: „Dein Arbeitsprofil ist bereit.“, „Freigaben für Vera prüfen“, Reihenfolge wie in Abschnitt 9, Forschung nur als Angebot.
4. `/me/profile/workstyle`: Bericht sichtbar, Angebot „Mehr erfahren“.
5. Ohne Forschung: Sitzung ohne Einwilligung, ohne Kontext, ohne Zeiten, `submitted_at` gesetzt.
6. Forschung später: Einleitung, Checkbox nicht vorausgewählt, Start deaktiviert, „Nein, danke“ vorhanden, danach „Forschungsfrage x von 23“.
7. Abbruch nach 5 und Wiederaufnahme bei „Forschungsfrage 6 von 23“; Profil weiter fertig; 5 Forschungsantworten, 5 Zeitwerte, nur aus dem Forschungsteil.
8. Einladungskontext mit Freigabe-CTA: siehe 3.
9. Teambericht vor den Freigaben: Readiness-Panel für Nora. Nach gegenseitiger Freigabe: Bericht für beide, identisch.
10. Advisorin vor der Bereitschaft: neutraler Hinweis, keine Namen, kein Profil-Link (1280/390). Nach der Mitgliederfreigabe, aber ohne Noras Freigabe an sie: weiter kein Bericht. Nach Noras Personenfreigabe: derselbe Bericht wie für die Founder.

Scroll und Fokus (gemessen nach „ganz nach unten, Weiter“): Bei 1280 px liegt der Kartenanfang bei 142–144 px, bei 390 px zwischen 54 und 125 px, also vollständig sichtbar; der Fokus sitzt immer auf der Frage.

## 17. Auswirkung auf den Release-Plan

Remote ausstehend sind jetzt **9** Migrationen: `20261113120000` … `20261117120000` (7, wie im Release-Audit), dazu `20261118120000` (11.5) und **neu `20261118130000`** (11.6).

**`20261118130000` ist DB_FIRST_SAFE, nicht CODE_FIRST_SAFE.** Der neue Code ruft `start_workstyle_product` und `start_workstyle_research` auf, die es erst mit der Migration gibt. Sie braucht `20261118120000` (`workstyle_core_visible_to`) und muss **vor** dem Code-Deploy laufen. Wirkung auf den heute laufenden Code, wenn die Migration vorher läuft:
- Bisheriger Fragebogen (Start mit Einwilligung, 52 gemischte Schritte, `p_finalize` an Position 52, Abschluss über `completed_at`): funktioniert weiter. Das Arbeitsprofil wird schon mit der 29. Core-Antwort fertig und ist damit früher im Profil, im Teilen und im Teambericht sichtbar. Die Forschung läuft wie gewohnt bis 52.
- Ausnahme: Wer im alten Fragebogen nach der 29. Core-Antwort per „Zurück“ eine **frühere Core-Antwort ändert**, bekommt die bestehende Fehlermeldung. Eine unveränderte Wiederholung geht.
- Bestand B wird sofort zum Arbeitsprofil.
- Advisors ohne gegenseitige Bereitschaft sehen im alten Code den bisherigen „nicht verfügbar“-Block statt eines Berichts.
- Teamberichte, die bisher nur einseitig sichtbar waren, verschwinden bis zur vollen Gegenseitigkeit (11.5).

> **Nachtrag 11.6C:** Das Reihenfolgeproblem ist gelöst. Die Workbook-Migration heißt jetzt `20261118150000_retire_active_workbook_writes.sql` (remote nie angewendet, lokal per Verlaufseintrag nachgezogen). Details in `phase-11.6c-wave1-research-sets.md`.

**Reihenfolgeproblem:** `20261117120000_retire_active_workbook_writes` muss weiterhin **nach** dem Code-Deploy laufen. `20261118120000` und `20261118130000` müssen **vor** dem Deploy laufen, haben aber höhere Versionsnummern. Ein einfaches `supabase db push` würde 1117 zuerst anwenden. Vorschlag (Entscheidung bei dir):
- (a) Den Stage-Worktree so aufbauen, dass er 1113–1116 und 1118120000/1118130000 enthält, aber nicht 1117. Das spätere Nachziehen von 1117 braucht dann `supabase db push --include-all`.
- oder (b) 1117 vor dem ersten Remote-Push auf einen Zeitstempel nach `20261118130000` umbenennen (remote nie angewendet, lokal per Repair nachziehen).

Nicht remote gepusht.

## 18. Offene Punkte

- **Release-Reihenfolge** 1117 gegen 1118xx (Abschnitt 17), vor dem Remote-Push entscheiden.
- `start_workstyle_pretest`, `set_workstyle_pretest_position` und `resume_position` bleiben als bisherige Einstiege. Nach dem Deploy prüfen, ob sie stillgelegt werden können (Skripte unter `web/scripts/` nutzen sie noch).
- Forschung nach einem Widerruf erneut beginnen geht nur über eine neue Teilnahme („Arbeitsprofil später neu beantworten“). Eine Wieder-Einwilligung in derselben Sitzung ist bewusst nicht vorgesehen.
- Auswertung (`analytics.ts`): Dauer wird weiter ab `started_at` gemessen, also ab Beginn des Arbeitsprofils. Für Forschungsdauern `research_consent_given_at` aus dem Export nutzen. Die Anpassung steht noch aus.
- `get_workstyle_product_team_status` ist für Advisors weiter aufrufbar und unterscheidet in Summe „share_missing“ von „unavailable“ (bestand schon vorher). Die Oberfläche zeigt das Advisors nicht mehr; die Funktion selbst könnte für Nicht-Mitglieder vereinheitlicht werden.
- `/advisor/person/[userId]` verlangt weiterhin eine Advisor-Personenberechtigung. Eine reine Workstyle-Freigabe an einen Gruppen-Advisor öffnet diese Seite nicht (unverändert).
- `WorkstylePretestV2` enthält noch v3-Zweige aus 11.5, die für die aktuelle Route nicht mehr genutzt werden. DELETE_CODE_LATER, zusammen mit `DailyQuote.tsx`/`dailyQuotes.ts` aus 11.5.
- Der Fragebogen bleibt deutschsprachig (wie bisher).
- Die Trennung macht keine Aussage über die psychometrische Güte der 29 Fragen. Sie bilden das aktuelle Produktinstrument, die Forschung entwickelt es weiter.

---

PRODUCT COMPLETION USES ONLY 29 CORE ITEMS
RESEARCH IS OPTIONAL FOR PRODUCT USE
RESEARCH DATA REMAINS ISOLATED
NO NEW WORKSTYLE SCORE INTRODUCED
NO AUTOMATIC SHARING INTRODUCED
TEAM REPORT MUTUAL READINESS APPLIES TO ADVISORS
HISTORICAL DATA PRESERVED
NO REMOTE DB PUSH
NO PRODUCTION DEPLOY
