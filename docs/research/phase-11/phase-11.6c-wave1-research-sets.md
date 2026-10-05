# Phase 11.6C – Finaler Workstyle-Ablauf: 29 Core + optional 8 gemischte Entwicklungsfragen

Stand: 05.10.2026. Branch: `feat/workstyle-reporting-v04`, Ausgangscommit `aee3abdd`. Phase 11.5–11.6C sind mit `39c2c4a1` (`feat: finalize workstyle assessment and research wave 1`) committed. Uncommitted sind nur noch die Korrektur der Workbook-Migrationshistorie (Datei wieder `20261117120000_retire_active_workbook_writes.sql`) und die zugehörigen Dokumentationskorrekturen. Siehe Abschnitt 18. Kein Push, kein Deployment, kein Remote-Supabase-Push.

---

## 1. Finale Produktentscheidung

Das Produktinstrument besteht aus den **29 festen Core-Items** von 8.5a-v3 (Manifest 3.0.0, Itemversion 8.4-v0.4). Nur sie speisen:
- Einzelbericht und Workstyle Signature,
- Teambericht und Team-Readiness,
- FIND-Workstyle,
- Teilen und Advisor-Personenansicht.

Freiwillig kommen **8 Entwicklungsfragen** hinzu, also maximal **37 Situationen**. Wer forscht, bekommt sie **in denselben Fragebogen gemischt**. Für die Person ist es ein einziger Fragebogen; technisch bleiben die Forschungsdaten getrennt (`workstyle_research_responses`, eigene Metadaten, kein Produktleser).

## 2. 29 gegenüber 37

| | Ohne Forschung | Mit Forschung |
|---|---|---|
| Fragen | 29 Core | 29 Core + 8 aus Set A **oder** B |
| Reihenfolge | Core in fester Reihenfolge | Core in fester relativer Reihenfolge, Entwicklungsfragen dazwischen gemischt |
| Fortschritt | „Frage x von 29“ | „Frage x von 37“, ohne Markierung als Forschung |
| Abschluss | „Dein Arbeitsprofil ist bereit.“ | „Geschafft – danke.“ (erst nach Frage 37) |
| Forschungsdaten | keine (per Constraint ausgeschlossen) | Antworten, Kontext, Zeiten, Set, Reihenfolge |

Wer erst nach fertigem Arbeitsprofil einsteigt („Forschung später unterstützen“, sehr nachgeordnet), bekommt nur die 8 Set-Items in eigener, gespeicherter Reihenfolge, angezeigt als „Entwicklungsfrage x von 8“. Mitten im Arbeitsprofil (Core begonnen, nicht fertig) ist der Einstieg nicht möglich (`research_entry_unavailable`).

## 3. Einwilligung im Einstieg

Genaue Texte (DE, im Fragebogen):

> **Mach’s dir kurz bequem.**
> Nimm dir gern einen Kaffee, einen Tee oder etwas zum Snacken dazu. In den nächsten Situationen geht es um Entscheidungen, Zusammenarbeit, offene Fragen und die Art, wie du Dinge angehst.
> Es gibt kein Richtig oder Falsch. Antworte so, wie du im echten Arbeitsalltag wahrscheinlich reagieren würdest – nicht so, wie es ideal klingen würde.
> Jede Antwort wird sofort gespeichert. Du kannst jederzeit aufhören und später weitermachen. Dein Arbeitsprofil bleibt privat, bis du selbst etwas freigibst.
>
> **Dein Arbeitsprofil basiert auf 29 Situationen.**
> Wenn du möchtest, kannst du uns zusätzlich mit 8 Entwicklungsfragen helfen, Made2Found weiterzuentwickeln. Dann sind es insgesamt 37 Situationen – die zusätzlichen Fragen werden ganz normal zwischen die anderen gemischt. Sie verändern dein Arbeitsprofil und deinen Report nicht. Ob du mitmachst, entscheidest du frei.
>
> **Wie möchtest du starten?**
> ○ **Nur mein Arbeitsprofil** – 29 Situationen
> ○ **Ja, ich unterstütze die Weiterentwicklung** – 37 Situationen – 8 davon helfen bei der Weiterentwicklung
>
> *(nur bei „Ja“)* Damit wir die Entwicklungsfragen auswerten dürfen, brauchen wir deine Einwilligung. Ausgewertet werden pseudonymisiert deine Antworten – auch die zu deinem Arbeitsprofil –, zwei kurze Angaben zu deinem Kontext und die Bearbeitungszeiten. Niemand im Team und kein Advisor sieht die Entwicklungsantworten. Du kannst die Einwilligung jederzeit widerrufen; ein fertiges Arbeitsprofil bleibt erhalten.
> ▸ Einwilligungstext lesen · zwei Kontextangaben (+ Phase optional) · ☐ Einwilligungsbestätigung (wörtlich aus `workstyle_research_v3`)
>
> [ Los geht’s ]

EN (Referenzübersetzung; der Fragebogen ist wie bisher nur deutsch, für `en` zeigt die App den bestehenden Hinweis):

> **Make yourself comfortable.** Feel free to grab a coffee, a tea or a snack. The next situations are about decisions, collaboration, open questions and the way you approach things.
> There is no right or wrong. Answer the way you would probably react in your real working day – not the way that would sound ideal.
> Every answer is saved right away. You can stop at any time and continue later. Your work profile stays private until you share something yourself.
> **Your work profile is based on 29 situations.** If you like, you can also help us develop Made2Found with 8 development questions. That makes 37 situations in total – the additional questions are simply mixed in with the others. They do not change your work profile or your report. Whether you take part is entirely up to you.
> **How would you like to start?** ○ **Just my work profile** – 29 situations · ○ **Yes, I’ll support the development** – 37 situations, 8 of which help with development.

**Fairness der Wahl:**
- Beide Wege sind gleich gestaltete Karten, keine ist vorausgewählt.
- Es gibt einen gemeinsamen Startknopf „Los geht’s“. Er ist deaktiviert, bis ein Weg gewählt ist; bei „Ja“ zusätzlich bis zur Einwilligung (Checkbox nicht vorausgewählt) und den zwei Pflicht-Kontextangaben.
- Der Einwilligungstext ist aufklappbar.

Die Einwilligungsversion bleibt `workstyle_research_v3` (Abschnitt 16). Der Bestätigungssatz der Einwilligung nennt weiterhin „Research-Pretest“; das ist versionierter Einwilligungstext und deshalb unverändert (Restpunkt).

## 4. Set A

| Pos. | Item | Bereich | Vergleich mit Core |
|---|---|---|---|
| 1 | ORG-06 | ORG (Anchor) | ORG-01/-02 |
| 2 | EXP-05 | EXP | EXP-04 |
| 3 | EVI-R1 | EVI | EVI-01 (Paar mit VOICE-R1) |
| 4 | AMB-06 | AMB | AMB-01, EVI-06 |
| 5 | **EL-03r** (Überarbeitung von EL-03) | EL | EL-05 |
| 6 | VOICE-R1 | VOICE | VOICE-01 |
| 7 | ORG-05 | ORG | ORG-03 |
| 8 | DEC-02 | DEC → EVI-Abgrenzungsmarker | EVI-02 |

## 5. Set B

| Pos. | Item | Bereich | Vergleich mit Core |
|---|---|---|---|
| 1 | ORG-06 | ORG (Anchor) | ORG-01/-02 |
| 2 | EXP-R1 | EXP | EXP-01 |
| 3 | VOICE-06 | VOICE | VOICE-03, EVI-03 |
| 4 | AMB-03 | AMB | AMB-02 |
| 5 | **EVI-04r** (Überarbeitung von EVI-04) | EVI | EVI-06, EVI-03 |
| 6 | **EL-06r** (Überarbeitung von EL-06) | EL | EL-05 |
| 7 | AMB-R1 | AMB | AMB-05, ORG |
| 8 | FS-R2 | FS → EVI-Abgrenzungsmarker | EVI-05 |

„Pos.“ ist die Position in der Set-Definition. Gezeigt werden die Items in zufälliger, gespeicherter Reihenfolge (Abschnitt 9).

## 6. Anchor

Nur **ORG-06** steht in beiden Sets; sonst überschneiden sich die Sets nicht (Test). Begründung wie in 11.6B: ORG-Richtung, doppelte Fallzahl, Plausibilitätscheck der Zuteilung.

## 7. Set-Version

Die Set-Version **`research-sets/1.0.0`** ist eine eigene Achse:
- **Quelle:** `web/docs/founder-workstyle-research-sets-1.0.0.json`, mit Sets, Anchor, Zuteilungs- und Reihenfolgeregel und den drei Überarbeitungen.
- **Datenbank:** `workstyle_research_set_items(version, set)`, unveränderlich und intern.
- **Code:** `researchSets.ts`, prüft die Datei beim Laden.
- **Pro Sitzung:** `research_set`, `research_set_version`.

**Unverändert:** `manifest_version` 3.0.0, die Itemversion 8.4-v0.4 aller bestehenden Items, das per SHA-256 festgeschriebene Core-Manifest und alle Produktleser. Bestehende Profile bleiben gültig.

## 8. Zuteilung

In `start_workstyle_research`, serverseitig, in derselben Transaktion wie die Einwilligung:
1. Globale Sperre `pg_advisory_xact_lock('workstyle-pretest-8.5a-v3')`, dieselbe wie bei jedem v3-Start. Damit gibt es keine Race Condition zwischen Personen und keine doppelte Zuteilung derselben Person.
2. Das weniger belegte Set (alle Sitzungen mit `research_set_version = research-sets/1.0.0`) erhält die nächste Teilnahme; bei Gleichstand entscheidet `random()`.
3. Gespeichert werden Set und Version. Ein erneuter Aufruf, ein Neuladen, ein anderer Browser oder das Fortsetzen geben dieselbe Zuteilung zurück; es wird nie neu gelost.

Geprüft:
- pgTAP: zwölf aufeinanderfolgende Zusagen, nach jeder ist |A−B| ≤ 1.
- Echte parallele HTTP-Aufrufe:
  - 8 gleichzeitige Starts einer Person ergeben 1 Teilnahme, 1 Set und 1 Reihenfolge;
  - 12 Personen gleichzeitig ergeben 6:6.

## 9. Reihenfolge

`workstyle_research_order(version, set, mixed)` läuft einmal bei der Zusage. Das Ergebnis wird als `item_order` (Item-Schlüssel) in der Sitzung gespeichert:

- **Core:** feste relative Reihenfolge (Position im Manifest). Sie war schon im 52er-Ablauf fest und bleibt es, damit die Core-Antworten mit und ohne Forschung vergleichbar sind und Kontexteffekte zwischen Core-Items gleich bleiben.
- **Entwicklungsfragen:** zufällige Reihenfolge der 8 Set-Items, damit Positionseffekte nicht an einem Item hängen; das gilt auch für den Anchor.
- **Platzierung:** Die 29 Lücken „nach Core-Item k“ (k = 1…29) werden in 8 gleich große Gruppen geteilt ((b·29/8, (b+1)·29/8]). In jeder Gruppe kommt genau ein Entwicklungsitem in eine zufällige Lücke.
  - Die erste Frage ist immer ein Core-Item.
  - Zwei Entwicklungsfragen stehen nie direkt hintereinander.
  - Die erste liegt spätestens auf Position 4, die letzte frühestens auf Position 33.
  - Es gibt keine Häufung am Anfang oder Ende.
- Beim späten Einstieg gibt es nur die zufällige Reihenfolge der 8 Set-Items.

Der Client randomisiert nichts (Test: kein `Math.random`) und zeigt `item_order` unverändert.

**Durchsetzung beim Speichern:**
- Core in Core-Reihenfolge;
- Entwicklungsfragen nur aus dem eigenen Set und in gespeicherter Reihenfolge (`research_item_not_in_set`, `workstyle_previous_answer_required`);
- in einer full-23-Teilnahme keine Überarbeitungen.

## 10. Produktabschluss

Unverändert seit 11.6: `submitted_at`, gesetzt mit der 29. Core-Antwort durch `workstyle_v3_sync_completion`. Forschung koppelt das nicht.

Im 37er-Ablauf kann das mitten im Fragebogen passieren, etwa wenn Frage 35 die letzte Core-Frage ist. Die Oberfläche läuft trotzdem bis zum Ende des gewählten Ablaufs weiter; der Abschluss erscheint erst nach Frage 37. Bericht, Teilen, Teambericht, FIND und Advisor-Personenansicht stehen ab `submitted_at` bereits zur Verfügung.

## 11. Forschungsabschluss

`completed_at` wird gesetzt bei Einwilligung, fertigem Arbeitsprofil und allen Forschungs-Items der Teilnahme:
- **Welle 1:** die **8 Items des zugeteilten Sets**.
- **full-23** (bisheriger Einstieg ohne Set): unverändert die 23 Originale. Überarbeitungen zählen dort nie.

## 12. Fortsetzen

- Position = erste offene Frage in `item_order` (bzw. Core-Reihenfolge). Beim Neuladen, im neuen Browser oder beim Fortsetzen ergibt sich exakt dieselbe Reihenfolge (Browser: nach 9 Antworten Neuladen → „Frage 10 von 37“, gleiche Reihenfolge, gleiches Set).
- **Arbeitsprofil fertig, Entwicklungsfragen offen:** Beim nächsten Besuch kommt ein eigener Zwischenstand: „Dein Arbeitsprofil ist fertig. Du hast noch N freiwillige Entwicklungsfragen offen. Sie verändern deinen Report nicht – du kannst sie jetzt beantworten oder einfach später.“ Dazu drei Wege: Arbeitsprofil ansehen · Entwicklungsfragen fortsetzen · Zum Dashboard.
  - Fortsetzen springt jeweils zur nächsten **offenen** Frage, nicht durch bereits Beantwortetes.
  - Auf der Profilseite heißt das Angebot dann „Forschungsteil fortsetzen“.
- Wer mitten im Ablauf ist, wird nicht auf den Zwischenstand umgeleitet.

## 13. Überarbeitete Itemtexte

**EVI-04r** (behavioral, EVI, `core_research`). Die Optionen sind jetzt gleichwertige reale Vorgehensweisen, jede mit eigenem nachvollziehbarem Grund, statt einer Methodenleiter:
> Ein für euer Vorhaben wichtiges Ergebnis fällt deutlich anders aus als erwartet. Was tust du am ehesten zuerst?
> A Ich warte ab, ob sich das Ergebnis wiederholt – ein einzelner Ausreißer kann täuschen.
> B Ich gehe vom naheliegendsten Grund aus und arbeite damit weiter, damit wir nicht ins Stocken geraten.
> C Ich schaue mir an, wie das Ergebnis zustande gekommen ist, bevor ich es deute.
> D Ich überlege mir mehrere mögliche Erklärungen und wäge sie gegeneinander ab.
> E Ich frage mich zuerst, ob meine ursprüngliche Erwartung überhaupt stimmte.

**EL-03r** (behavioral, EL, `core_research`). Kürzer, vier klar unterschiedliche nächste Schritte; die EVI-nahe Option „Ursachen verstehen“ entfällt:
> Du hast etwas ausprobiert, und das Ergebnis überrascht dich. Was machst du als Nächstes am ehesten?
> A Ich probiere es noch einmal genauso, um zu sehen, ob es sich bestätigt.
> B Ich ändere gezielt eine Sache und probiere es erneut.
> C Ich probiere einen deutlich anderen Ansatz aus.
> D Mir reicht das Ergebnis – ich entscheide damit, ohne noch einmal zu testen.

**EL-06r** (likelihood, EL, `research`), alltagsnäher:
> Ein erster Versuch spricht gegen deine ursprüngliche Idee. Wie wahrscheinlich ist es, dass du dir überlegst, was du beim nächsten Versuch gezielt anders prüfst?

Konstrukt, Bereich, Antwortformat und Forschungsfrage sind jeweils unverändert. Ein STOP war nicht nötig: Für EVI-04 gelang eine gleichwertige 5er-Variante. Bei EL-03 sind vier Optionen sauberer als eine erzwungene fünfte.

## 14. Item-Versionierung

`workstyle_item_versions` erlaubt je Instrument **einen** Eintrag pro Item-Schlüssel (`unique(instrument_id,item_key)`), und Einträge sind unveränderlich (Trigger). Eine zweite Version unter demselben Schlüssel würde Schema und Leselogik ändern; das Core-Manifest ist zusätzlich per Hash festgeschrieben.

Deshalb:
- Die Überarbeitungen sind **neue, rein private Einträge** mit eigenem Schlüssel (`EVI-04r`, `EL-03r`, `EL-06r`), Positionen 53–55.
- Sie tragen `definition.revision_of` und `definition.research_set_version`.
- Die Itemversion bleibt `8.4-v0.4`: Text und Schlüssel sind eins zu eins verbunden, es wird nichts überschrieben.
- Die Originale bleiben unverändert für die full-23-Kohorte.
- Das Core-Manifest (52 Items, 3.0.0) ist unberührt. Die 3 Einträge stehen nur in der Set-Datei und in der Datenbank.
- Die Produktleser filtern ohnehin auf `scientific_status='core'`. Kein bestehendes Profil wird ungültig.

## 15. Export

`get_workstyle_research_dataset_version('8.5a-v3')` (nur Plattform-Admins, nur mit Einwilligung, pseudonym) liefert zusätzlich:
- `research_cohort` (`wave-1` | `full-23`);
- `research_set`, `research_set_version`;
- `item_order` (tatsächlich gezeigte Reihenfolge, daraus die Position je Item);
- wie bisher die Antworten mit Zeitstempel (Core und Forschung, gedeckt durch die Einwilligung wie in 11.6), Kontext, Zeiten und Feedback.

Für Welle 1 sind Zeiten wie seit 11.6 nur mit Einwilligung vorhanden; im 37er-Ablauf also für alle 37 Fragen.

Die Daten erlauben später: Vergleich Set A gegen B, Itemposition, Antwortverteilung, „kann ich noch nicht einschätzen“, Bearbeitungszeit, Vergleiche zwischen Core und Kandidaten, ORG-06 als Anchor, full-23 gegen Welle 1. Eine Auswertung ist nicht gebaut. Der CSV-Baustein `analytics.ts` kennt die Überarbeitungen noch nicht (Restpunkt).

## 16. Widerruf

Unverändert seit 11.6, erweitert um die neuen Metadaten:
- **Arbeitsprofil fertig:** Forschungsantworten, Kontext, Zeiten, Feedback **sowie Set, Set-Version und Reihenfolge** werden gelöscht, `withdrawn_at` wird gesetzt. Das Arbeitsprofil bleibt.
- **Arbeitsprofil noch nicht fertig, mit Einwilligung:** Die Teilnahme wird gelöscht, wie es der Einwilligungstext v3 sagt („ein unvollständiger Pretest wird gelöscht“). Die Oberfläche sagt das vor dem Widerruf ausdrücklich und bietet den Neubeginn mit 29 Situationen an. So bleibt der Einwilligungstext stimmig, und es braucht keine neue Einwilligungsversion.
- Reine Arbeitsprofile ohne Einwilligung sind nicht betroffen.

Set und Reihenfolge sind Teil der Forschungsteilnahme. Es gibt keine neue stille Aufbewahrung.

## 17. Migration

`20261118140000_workstyle_research_wave1.sql`, additiv, lokal angewendet:
- 3 private Item-Einträge (Abschnitt 14);
- `workstyle_research_set_items` (intern);
- Sitzungsspalten `research_set`, `research_set_version`, `item_order` mit Constraint: Set und Version nur gemeinsam, nur mit aktiver Einwilligung, Reihenfolge nur mit Set;
- `workstyle_research_order` (intern);
- angepasst: `workstyle_v3_sync_completion`, `start_workstyle_research`, `save_workstyle_pretest_v3`, `erase_workstyle_research`, `get_workstyle_research_dataset_version`.

Gleiche Signaturen, keine neuen Grants für `authenticated`. Bestehende Sitzungen, full-23-Daten, Core-Antworten, Freigaben und Berichte bleiben unverändert; es gibt keine Datenübernahme.

## 18. Workbook-Migration (Korrektur)

In 11.6C wurde `20261117120000_retire_active_workbook_writes.sql` auf `20261118150000` umbenannt, unter der Annahme, sie sei remote noch nicht angewendet. **Das war falsch:** Beim finalen Release-Preflight ist `20261117120000` remote bereits als angewendet registriert. Inhalt beider Fassungen per SHA-256 identisch.

- Die Datei heißt wieder **`20261117120000_retire_active_workbook_writes.sql`** (per `git mv`), der SQL-Inhalt ist unverändert.
- Sie ist **keine ausstehende Post-Deploy-Migration**.
- Kein Remote-Repair, kein Remote-Push.
- Lokal: Der Verlaufseintrag in `supabase_migrations.schema_migrations` wurde in 11.6C auf `20261118150000` umgeschrieben und steht dort noch. Er betrifft nur die lokale Historie, `db:test` nicht. Für einen sauberen Abgleich lokal zurücksetzen (nicht ausgeführt): `update supabase_migrations.schema_migrations set version='20261117120000' where version='20261118150000';`

## 19. Tests

- **Neu, pgTAP `workstyle_research_wave1.sql`:**
  - Sets exakt, nur ORG-06 gemeinsam, unbekannte Set-Version leer, Hilfsfunktionen intern;
  - 30.A ohne Forschung: kein Set, keine Forschungsdaten;
  - 30.B/G Zusage legt Teilnahme mit Set und Version an;
  - 37er-Reihenfolge: 37 eindeutig, 29 Core, genau die 8 Items des eigenen Sets, Core-Reihenfolge fest;
  - an 60 erzeugten Reihenfolgen: erste Frage Core, keine zwei Forschungsitems hintereinander, früh und spät je eines, keine Häufung;
  - 30.D/E/F wiederholter Start und Neuladen: gleiches Set, gleiche Reihenfolge, eine Teilnahme;
  - 30.C Ausgleich;
  - 32.A 28 Core + 8 Forschung → kein Profil; letzte Core-Antwort schließt beides ab;
  - 32.B 29 Core + teilweise Forschung → Profil fertig;
  - 32.C Bericht = 29 Core, ohne Forschungsinhalte;
  - 32.D Teilen trotz offener Forschung;
  - Forschungsabschluss = 8 Set-Items;
  - Set und Reihenfolge beim Speichern durchgesetzt;
  - Abbruch und Fortsetzen (Fall 14);
  - kein Einstieg mitten im Profil; später Einstieg = 8;
  - 32.E Widerruf;
  - unvollständige Teilnahme mit Einwilligung wird gelöscht;
  - full-23 ohne Set, Überarbeitungen dort abgelehnt;
  - Export trennt Kohorten, pseudonym.
- **Angepasst:**
  - `workstyle_pretest_v3.sql`: 52er-Bestand plus Prüfung der 3 privaten Überarbeitungen;
  - Fixture-Schleifen in `workstyle_product_reporting.sql`, `workstyle_team_mutual_readiness.sql`, `discovery_workstyle_contract.sql` und `workstyle_product_core_completion.sql` laufen über den 52er-Bestand;
  - 11.6-Suite: Forschung in Set-Reihenfolge, „nicht mitten im Profil“ statt „nicht vor dem Profil“.
- **Neu, Node `phase116c.test.ts`:**
  - Sets exakt;
  - Set-Datei, Migration und Code byte-genau gleich;
  - Überarbeitungen mit eigenem Schlüssel und gleichem Konstrukt und Format;
  - Antwortprüfung der Überarbeitungen;
  - Core-Manifest unverändert;
  - Einstieg mit fairer Wahl;
  - gemeinsamer Fragebogen ohne Forschungsmarkierung und ohne Client-Zufall;
  - 37er-Abschluss und Zwischenstand;
  - Migrationsreihenfolge: die drei DB-first-Migrationen kommen nach `20261117120000`, `20261118140000` ist die letzte.

  `phase115.test.ts` und `phase116.test.ts` sind an den neuen Ablauf angepasst; die negativen Garantien bleiben.
- **Parallel-HTTP-Test** (lokal, Testnutzer gelöscht): siehe Abschnitt 8. Repo-Skript `test-workstyle-v3-concurrency.mjs` (bisheriger 52er-Weg) grün.
- **Ergebnis `npm run ci:check`:** `tsc` sauber, 2852/2852 Node-Tests, `next build`, `db:test` gegen den laufenden Container mit 146 Dateien / 2264 Tests „PASS“. ESLint und `git diff --check` sauber.

## 20. Browser

Lokale Daten über die echten RPCs: Vera (fertiges Profil), Nora (eingeladen), Ole, Mia, Tom. Danach gelöscht; die Datenbank hat wieder 4 Nutzer und 1 Team.

| Fall | Breite | Ergebnis |
|---|---|---|
| Einstieg | 1280/390 | warm, „29 Situationen“, „insgesamt 37“, kein „Pretest“ im Fließtext, nichts vorausgewählt, Start deaktiviert; bei „Ja“ Einwilligung nicht angehakt, Start deaktiviert; kein Überlauf |
| 1 – 29er, Einladung (= Fall 6) | 390 | „Frage x von 29“, 29 Schritte, Abschluss „Dein Arbeitsprofil ist bereit.“, „Freigaben für Vera prüfen“, nur kleiner Link „Forschung später unterstützen“; Sitzung ohne Einwilligung, Set und Reihenfolge |
| 2 – 37er | 1280 | „Frage 1 von 37“ … 37, Set A, Abschluss „Geschafft – danke.“ mit kleinem Hinweis und „Forschungsteilnahme verwalten“; 37 Antworten, beide Abschlüsse gesetzt |
| 3 – 37er | 390 | Set B (Ausgleich), 37 Schritte, Abschluss, kein Überlauf |
| 4 – Abbruch | 1280 | nach 9 Antworten Neuladen → „Frage 10 von 37“, gleiche Reihenfolge, gleiches Set |
| 5 – Profil fertig, Forschung offen | 1280/390 | Zwischenstand „Dein Arbeitsprofil ist fertig. … noch 6 freiwillige Entwicklungsfragen offen“; Bericht und Teilen erreichbar; Fortsetzen springt zur nächsten offenen Frage und endet mit „Geschafft – danke.“ |

**Scroll und Fokus:** Jede Frage stand bei 1280 und 390 px mit dem Kartenanfang bei 144 px, der Fokus lag immer auf der Frage. In keinem Fall war eine Karte als Forschung markiert. Behoben dabei: Wegen der globalen `scroll-behavior: smooth` war der Sprung zur nächsten Frage auf dem Handy animiert und kam verzögert; er ist jetzt `instant`.

## 21. Release-Reihenfolge

Remote bereits angewendet: alles bis einschließlich `20261117120000_retire_active_workbook_writes` (Release-Preflight).

Remote ausstehend, in Versionsreihenfolge, **alle DB-first vor dem Code-Deploy**:
1. `20261118120000_workstyle_team_mutual_readiness`
2. `20261118130000_workstyle_product_core_completion`
3. `20261118140000_workstyle_research_wave1` (der neue Code braucht `start_workstyle_research` mit Set und Reihenfolge und die neuen Spalten)

Danach der Code-Deploy. Es gibt keine Post-Deploy-Migration; ein normales `supabase db push` vor dem Deploy genügt.

**Wirkung von `20261118140000` auf heute laufenden Code** (vor dem Deploy):
- Der alte Fragebogen (Start mit Einwilligung, 52 Schritte) läuft weiter, ohne Set (full-23).
- Die neuen Spalten bleiben leer.
- Der alte Code liest `workstyle_item_versions` nicht direkt, die drei zusätzlichen privaten Einträge stören ihn also nicht.

## 22. Restpunkte

- **Einwilligungstext v3:** Der Bestätigungssatz nennt „Research-Pretest“, und der Text spricht von „diesem Pretest“. Inhaltlich deckt er Welle 1 ab, eine neue Version ist nicht zwingend. Bei der nächsten inhaltlichen Überarbeitung sollte das Wording an „Entwicklungsfragen“ angepasst werden (dann als neue Einwilligungsversion).
- `analytics.ts` / Admin-CSV kennen die Überarbeitungen und die Kohorten noch nicht. Der JSON-Export enthält alles; für die Auswertung erweitern, bevor sie gebaut wird.
- Wer mitten im 29er-Arbeitsprofil doch forschen möchte, kann das erst nach dem Abschluss (8 Fragen separat). Bewusst einfach gehalten.
- Der bisherige Einstieg `start_workstyle_pretest` (52er, full-23) bleibt für bestehende Aufrufer und das Repo-Skript. Nach dem Deploy prüfen, ob er stillgelegt werden kann.
- `WorkstylePretestV2` enthält weiterhin ungenutzte v3-Zweige (DELETE_CODE_LATER, siehe 11.6).
- Der Fragebogen bleibt deutschsprachig; die EN-Texte oben sind Referenz für eine spätere Übersetzung.
- Ausgleich der Sets zählt aktive Zuteilungen. Nach einem Widerruf wird das Set gelöscht und zählt nicht mehr; das ist bei der Auswertung zu berücksichtigen.

---

PRODUCT REPORT STILL USES ONLY 29 CORE ITEMS
RESEARCH PARTICIPATION IS OPTIONAL
RESEARCH PARTICIPANTS SEE MAXIMUM 37 QUESTIONS
RESEARCH ITEMS ARE MIXED INTO THE FLOW
SET ASSIGNMENT IS STABLE
SET A/B ARE APPROXIMATELY BALANCED
RESEARCH DOES NOT CHANGE CURRENT REPORTS
NO NEW SCORE OR TYPOLOGY
NO AUTOMATIC SHARING
TEAM REPORT MUTUAL READINESS REMAINS
RESEARCH DATA REMAINS ISOLATED
HISTORICAL FULL-23 DATA IS PRESERVED
NO REMOTE DB PUSH
NO PRODUCTION DEPLOY
