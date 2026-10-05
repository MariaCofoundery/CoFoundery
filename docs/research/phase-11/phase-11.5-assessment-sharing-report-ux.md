# Phase 11.5 – Assessment-UX, Sharing-Konsistenz & Report-Visuals

Stand: 05.10.2026. Branch: `feat/workstyle-reporting-v04`, Ausgangscommit `aee3abdd` (`feat: refine founder discovery and intro flow`). Alle Änderungen sind lokal und **nicht committed**. Kein Push, kein Deployment, kein Remote-Supabase-Push.

**Eine neue Migration:** `supabase/migrations/20261118120000_workstyle_team_mutual_readiness.sql`, nach ausdrücklicher Freigabe angelegt und nur lokal angewendet. Sie ändert nur Lesefunktionen: keine Tabelle, keine Spalte, keine Policy, kein Schreibpfad, keine Freigabe.

Nicht angefasst: Workstyle-Items, Instrumentversion, Konstrukte, Scores, Matching, Advisor-Rechte, Freigabe- und Consent-Verträge, Daten.

---

## 1. Ursache der Sharing-Asymmetrie

`get_workstyle_product_team` (zuletzt `20261114120000`) hat für jede betrachtende Person einzeln entschieden: Bereit war der Bericht, sobald **alle anderen** Mitglieder ihr aktuelles Arbeitsprofil **für die betrachtende Person** freigegeben hatten. Ob die betrachtende Person selbst freigegeben hatte, spielte keine Rolle.

Folge in einem Zweierteam, in dem nur B an A freigegeben hat: A sah den Teambericht, also auch B im Vergleich. B sah nur „noch nicht bereit“. Für B war das unverständlich, und es widersprach der Erwartung, dass der Teambericht ein gemeinsames Ergebnis ist. Dasselbe passierte in Dreier- und Viererteams für jede Teilmenge.

Datenschutzrechtlich war das kein Leck: A sah nur, was B freigegeben hatte. Es war aber ein Produktfehler, weil derselbe Bericht für verschiedene Mitglieder in unterschiedlichen Zuständen erschien.

## 2. Neue Readiness-Regel

**Der Teambericht erscheint für alle aktuellen Mitglieder gleichzeitig. Vorher erscheint er für niemanden.** Voraussetzung: Jedes Mitglied hat ein aktuelles Arbeitsprofil (v3, Manifest 3.0.0) und hat es für **jedes** andere aktuelle Mitglied wirksam freigegeben, ohne verborgene Blöcke.

Umsetzung (Migration `20261118120000`):

- `workstyle_core_visible_to(owner, viewer)`: interne Hilfsfunktion, die die bestehende Regel aus `get_workstyle_product_profile` als Wahrheitswert liefert (`alignment_share_is_effective`, keine `alignment_share_hidden_blocks`). Für `public`, `anon` und `authenticated` ist sie nicht aufrufbar.
- `get_workstyle_product_team`: Die Funktion ist unverändert übernommen. Für Mitglieder kommt eine Prüfung über alle geordneten Paare (x → y) hinzu. Fehlt ein Paar, ist das Ergebnis `not_ready`, für alle Mitglieder gleich.
- `get_workstyle_team_share_readiness(team)`: Nur Mitglieder können sie aufrufen. Sie liefert `ready | missing | unavailable` und je Person `name`, `is_viewer`, `has_current_workstyle` und `shared_with_all_members`. Das sind zwei Wahrheitswerte je Person, keine Antworten und keine Bereiche.
- Snapshots: `get_workstyle_product_snapshot` prüft weiterhin gegen die aktuell erlaubte Eingabe. Wird eine Freigabe entzogen, liefert der Snapshot für alle `null` (getestet).

Freigaben bleiben gerichtet. Die Regel legt nichts an und gibt nichts frei. Sie legt nur fest, wann der gemeinsame Bericht gezeigt wird.

Advisor-Zugriff auf Teamberichte ist unverändert: Die neue Prüfung greift nur, wenn die betrachtende Person Mitglied ist (`is_current_user_founder_team_member`). Advisor-Rechte sind ein eigener Vertrag, der nicht über die Mitgliedschaft läuft. **Nachtrag Phase 11.6:** Die Gegenseitigkeit gilt inzwischen auch für Advisors (`20261118130000`, siehe `phase-11.6-product-core-research-separation.md`, Abschnitt 13).

**UI-Zustände** (`teamReadiness.ts`, `TeamReadinessPanel.tsx`, nur für Mitglieder auf `/teams/[teamId]/workstyle`):

| Zustand | Text (Auszug) | Aktion |
|---|---|---|
| `READY` | Bericht wird angezeigt | – |
| `MISSING_MINE` | „Deine Freigabe fehlt noch …“ | **Freigaben prüfen** → `/me/profile/workstyle#freigaben` |
| `MISSING_OTHERS` | „Deine Freigabe ist da. Warte noch auf die Freigabe von {names}.“ | keine; kein Knopf für fremde Freigaben |
| `MISSING_MULTIPLE` | „Es fehlen noch mehrere Freigaben – auch deine …“ | Freigaben prüfen |
| `INSUFFICIENT_WORKSTYLE` | „… jede Person braucht ein aktuelles Arbeitsprofil …“ | eigenes Profil fehlt → „Wie du arbeitest ausfüllen“ |

Darunter steht eine Liste aller Mitglieder mit ✓/○ und Status in Textform. Das Symbol ist nicht der einzige Träger der Information. Advisors sehen weiter den bisherigen neutralen Hinweis.

## 3. Invite-Sharing-UX

Im Einladungsformular (`CoFounderInviteForm`) steht vor dem Absenden ein Hinweis: **„Was mit der Einladung geteilt wird“**. Text: „Mit der Einladung wird nichts automatisch geteilt – keine Antworten, kein Arbeitsprofil, keine Angaben zum Vorhaben. Nach der Annahme entscheidet jede Person selbst, was sie für die andere freigibt. Euer gemeinsamer Bericht erscheint erst, wenn alle ihre Arbeitsweise füreinander freigegeben haben – dann für alle gleichzeitig.“

Eine Freigabe schon beim Einladen vorzumerken ist nicht möglich. Dafür bräuchte es eine neue Persistenz (eine Freigabe an eine Person, die noch kein Konto hat) und einen neuen Consent-Vertrag. Das ist bewusst nicht umgesetzt. Freigeben lässt sich nach der Annahme über die Abschlussseite und das Readiness-Panel.

## 4. Completion-UX

Nach Frage 52 (`WorkstylePretestV2`) gilt folgende Reihenfolge:

1. **Geschafft** – „Dein Arbeitsprofil ist bereit.“
2. „Dein Arbeitsprofil bleibt privat, bis du etwas freigibst. Niemand sieht deine Antworten automatisch – auch nicht die Person, die dich eingeladen hat.“
3. **Arbeitsprofil ansehen** (Hauptaktion) → `/me/profile/workstyle`
4. **Freigaben für {Namen} prüfen** → `/me/profile/workstyle#freigaben`. Nur im Einladungskontext. Die Namen kommen aus dem Team-Homebase (`getFounderTeamHomebase`), auf das die Person bereits Zugriff hat.
5. Zu eurem Team (im Einladungskontext) · **Zum Dashboard**
6. Eingeklappt: „Forschung & Feedback (freiwillig)“ mit Feedback und „Späteren Stand neu erheben“. Das Widerrufen der Forschungseinwilligung bleibt am Seitenende erreichbar.

Die Abschlussseite gibt nichts frei. Die Speicherlogik ist unverändert.

## 5. Assessment vorher / nachher

| | vorher | nachher |
|---|---|---|
| Einstieg | sachlicher Forschungsrahmen | „Mach’s dir kurz bequem.“, echte Anzahl, dann Einwilligung, „Los geht’s“ |
| Fortschritt | native `<progress>`, grau | Verlaufsbalken Violett → Cyan, „Frage x von 52“, `role="progressbar"` |
| Frage | lange Formularfläche | eine ruhige Karte je Situation, mehr Weißraum, deutliche Auswahlzustände |
| Navigation | nur Weiter | **Zurück** (sekundär), **Weiter**, auf der letzten Frage **Abschließen** |
| Pausieren | implizit | „Jede Antwort ist gespeichert. **Später weitermachen**“ → Dashboard |
| Nach Weiter | Seite blieb unten stehen | Kartenanfang unter der Kopfleiste, Fokus auf der Frage |
| Abschluss | „Danke für deine Teilnahme.“ | siehe Abschnitt 4 |

## 6. Produkt- vs. Research-Länge

Geprüft wurde, ob die 29 Produktfragen von den 23 Forschungsfragen getrennt werden können (Ergebnis nach 29 Fragen, Forschung freiwillig danach). **Ohne Migration und Consent-Änderung geht das nicht:**

- `save_workstyle_pretest_v3` verlangt, dass alle vorherigen Positionen in der festen, gemischten Reihenfolge beantwortet sind. Abschließen ist erst an Position 52 möglich.
- `complete_workstyle_pretest` verlangt 29 Core- **und** alle Forschungsantworten.
- Der Start setzt die Forschungseinwilligung voraus. Eine reine Produktteilnahme ohne Forschung gibt es im Vertrag nicht.

Entscheidung (abgestimmt): **jetzt nicht trennen.** Die Einleitung nennt die Anteile ehrlich: „Insgesamt sind es 52 Situationen. 29 davon bilden dein Arbeitsprofil; die übrigen 23 helfen uns, das Instrument weiterzuentwickeln.“ Der Fortschritt zeigt „Frage x von 52“. Eine getrennte Zählung wäre bei gemischter Reihenfolge irreführend.

Konzept für später (eigene Phase mit Migration, Consent-Text und Tests): neue Reihenfolge Core zuerst, Abschluss nach 29 Core-Antworten, Forschungsteil optional mit eigener Einwilligung. Item-Inhalte und Instrumentversion bleiben dabei unverändert, Vergleichbarkeit und Manifest müssen aber geklärt werden.

## 7. Intro

„Mach’s dir kurz bequem.“ Danach drei kurze Absätze: Worum es geht (Situationen aus dem Gründeralltag, keine richtigen oder falschen Antworten). Die echte Anzahl samt Aufteilung Profil/Forschung. Datenschutz (privat bis zur Freigabe). Es gibt **keine Minutenangabe**, weil dafür keine belastbare Messung vorliegt. Ein Test prüft, dass das Wort „Minuten“ nicht vorkommt.

## 8. Progress

`Progress` ist ein Balken in Markenfarben (`from-violet-600 to-cyan-400`) auf hellem Grund. Darüber steht der Text „Frage {n} von {total}“. `aria-valuenow`, `aria-valuemin`, `aria-valuemax` und `aria-valuetext` sind gesetzt. Es gibt keine Prozentangabe.

## 9. Scroll / Fokus

Ursache: Nach „Weiter“ wurde nur der Inhalt getauscht. Wer bei einer langen Antwortliste nach unten gescrollt hatte, landete mitten in oder unter der nächsten Frage.

Fix: Die Fragekarte hat `scroll-mt-36`. Nach einem Wechsel scrollt die Karte nur dann in den Blick, wenn ihr Anfang verdeckt ist (über der Kopfleiste oder unterhalb von 60 % der Höhe). Danach erhält die Legende den Fokus mit `preventScroll`. So liest ein Screenreader die neue Frage vor, ohne dass die Seite springt.

Geprüft im Browser bei 390 und 1280 px: ganz nach unten scrollen, Weiter. Der Kartenanfang liegt bei 144 px, die Legende hat den Fokus, bei jedem Schritt. Zusätzlich lief ein vollständiger Durchlauf über 52 Schritte als eingeladene Person bis zur neuen Abschlussseite mit Partnernamen.

## 10. Einzelreport Visual

Neue Reihenfolge (`IndividualWorkstyle`):

1. freundlicher Einstieg
2. **Workstyle Signature**
3. „Wo deine Antworten in eine Richtung gehen“: nur Bereiche mit getragener Richtung außerhalb der Mitte, mit Claim-Markierung
4. Bereiche im Einzelnen
5. „So liest du das“: Methodik, darunter „wie das bei anderen ankommt, misst der Bericht nicht“
6. Anhang

**Signature** (`SignatureOverview`): Die Logik aus Phase 10B (`overviewMark`) ist unverändert: Punkt nur bei getragener Richtung, gestrichelte Spannweite bei gemischten Antworten, nichts bei zu wenigen Antworten. Neu sind **kontextbezogene Pole** je Bereich. Sie stammen wörtlich aus den Richtungsaussagen und bleiben innerhalb der gemessenen Situationen, zum Beispiel „spricht Einwände eher nicht an“ ↔ „spricht Einwände eher an“. Darunter stehen klein die tatsächlichen Skalenenden. Begriffe wie Typ, Risiko, Intuition oder rational kommen nicht vor (per Test ausgeschlossen). Links und rechts sind gleichwertig gestaltet, es gibt keine Wertungsfarbe. Spannweiten-Labels haben einen weißen Hintergrund, damit Skalenpunkte nicht durchscheinen.

## 11. Teamreport Visual

- **2 Personen:** eine gemeinsame Spur, ein Marker oberhalb und einer unterhalb. Nichts liegt übereinander.
- **3–4 Personen:** je Person eine eigene schmale Spur mit Namen (gestapelt). Es gibt keine Mehrheit und keinen Mittelwert.
- Unter jeder Spur steht eine Textzeile je Person, sodass die Grafik (`aria-hidden`) nicht die einzige Informationsquelle ist.
- Nebenbefund behoben: Die Abschnitte des Teamberichts hatten **auf dem Bildschirm keinerlei Abstand**. Ursache: `space-y-12${…}` im Template-String. Tailwind hat die Klasse dort nicht erkannt, und sonst kommt sie nirgends vor. Das war schon auf HEAD so. Jetzt steht ein Leerzeichen vor `${`, gemessen sind 48 px zwischen den Abschnitten. Im Einzelbericht ist dieselbe Schreibweise ebenso korrigiert (`space-y-8` funktionierte dort nur zufällig, weil die Klasse anderswo vorkommt).

## 12. Capability Map

Die Matrix im Anhang ist durch eine **Fähigkeiten-Karte als Mosaik** ersetzt (`CapabilityMosaic` in `ComponentMatrix.tsx`). Sie baut ausschließlich auf dem bestehenden Modell auf (`componentRows`: Bereiche, Familien, Owner, Zustände, Sourcing). Es gibt keine erfundenen Rollen.

- Ein Baustein je Bereich, zu dem mindestens eine Person Angaben gemacht oder freigegeben hat. Alle Bausteine liegen in einem gemeinsamen Raster, die Familie steht klein im Baustein.
- Je Person eine Zeile mit Initialen. **Erfahrung und Verantwortungswunsch stehen getrennt:** ★ wiederholt angewandt (ab `EXPERIENCED`), ◆ möchte verantworten, ＋ möchte beitragen, ↗ möchte hineinwachsen, ↪ lieber eine andere Person, ◇ lieber extern, ? noch unklar. „keine Angabe“ ist gedämpft dargestellt.
- Hinweise am Baustein: „Verantwortung ungeklärt“, „Mehrere möchten verantworten“, „Extern denkbar“, „Noch nicht alle Angaben“. Bausteine ohne Owner haben einen gestrichelten Rand.
- Fußzeile: „Zu N weiteren Bereichen hat niemand Angaben gemacht oder freigegeben. Daraus wird keine fehlende Fähigkeit abgeleitet. ‚Extern denkbar‘ ist eine Eigenschaft des Bereichs und heißt noch nicht, dass etwas beauftragt ist.“
- Lückensprache („fehlt euch“, „Lücke“, „vollständig abgedeckt“), Score und Prozent sind per Test ausgeschlossen.

## 13. Historische Reports

Im vollständigen Profil-PDF (`/me/profile/print?mode=full`) stehen historische Auswertungen (Basis-/Werte-Report und frühere Arbeitsprofil-Fassung) standardmäßig nur noch als **kompakte Archivkarte** (`ArchiveCard`: Titel, Datum, Hinweis). Den vollständigen Altinhalt gibt es weiterhin, wenn „Frühere Auswertung mit aufnehmen“ gewählt ist (`includeLegacy`). Daten und Routen sind unverändert.

## 14. Founder Quote

`QuoteOfTheDay` (`features/dashboard/QuoteOfTheDay.tsx`) steht im Hero des Founder-Dashboards. Es gibt 10 kuratierte Hauszeilen in `common.quoteOfTheDay` (de/en), keine zugeschriebenen Zitate. Die Auswahl ist **stabil je Kalendertag in Europe/Berlin** (`quoteIndexFor`, `quoteDayIndex.ts`): Alle Personen sehen am selben Tag dieselbe Zeile, ohne Zufall und ohne Personalisierung. Aussagen zu Fit oder Kompatibilität („passt“, „kompatibel“, „weniger Konflikte“) sind per Test ausgeschlossen. Frühere Zeilen, die Ähnlichkeit oder Verschiedenheit als Vorteil darstellten, sind entfernt.

## 15. Advisor Quote

Dieselbe Komponente und dieselbe Tageslogik stehen im Hero von `/advisor/dashboard`. Founder und Advisor sehen am selben Tag dieselbe Zeile.

## 16. Mobile

Browserreview bei 390 px: Assessment (Intro, Fragen, Abschluss), Readiness-Panel, Signature mit 1, 2 und 4 Personen, Mosaik, Dashboards mit Zitat. Kein horizontaler Überlauf (`scrollWidth − innerWidth = 0` auf allen geprüften Seiten). Auf schmalen Bildschirmen steht das Mosaik einspaltig, die Signature-Spuren haben eine feste Namensspalte von 4,5 rem.

## 17. Print / PDF

- Signature-Bereiche (`.ws-lane`), Bausteine (`.ws-tile`) und Bildunterschriften werden nicht über Seitengrenzen geteilt.
- Das Mosaik bleibt im Druck ein dreispaltiges Raster. Damit die globale Druckregel `.ws-report .grid > * + * { margin-top: 4mm }` die Bausteine nicht versetzt, ist die Ausnahme spezifischer (`.ws-mosaic.grid`). Gemessen: alle Bausteine einer Zeile auf gleicher Höhe.
- Symbole statt Farbe tragen die Bedeutung, daher bleibt die Karte auch in Graustufen lesbar.
- Historische Inhalte im Profil-PDF: siehe Abschnitt 13. Der Freigabebereich im Arbeitsprofil ist `ws-no-print`. Das Readiness-Panel erscheint nur, solange es keinen Teambericht gibt, und ist dann der ganze Seiteninhalt.
- Geprüft per Print-Emulation und `Page.printToPDF` (A4) für Team- und Einzelbericht.

## 18. Accessibility

- Fortschritt mit `role="progressbar"` und vollständigen ARIA-Werten. Nach jedem Wechsel liegt der Fokus auf der Fragelegende.
- Zurück, Weiter und Abschließen sind echte Buttons im Formular, mindestens 48 px hoch. Später weitermachen ist ein echter Textlink.
- Grafiken (Signature, Marker) sind `aria-hidden`, ihre Aussage steht jeweils als Text daneben.
- Readiness-Panel mit `aria-labelledby`, Mitgliederliste mit `aria-label`, Status als Text, nicht nur ✓/○.
- Mosaik-Legende als Text, Symbole begleitet von Wörtern. Farbe trägt nirgends allein Bedeutung.

## 19. Tests

- **pgTAP** `supabase/tests/workstyle_team_mutual_readiness.sql` deckt die Fälle A–G ab:
  - A: einseitige Freigabe, in beiden Richtungen → für beide `not_ready`
  - C: gegenseitige Freigabe → identische Eingabe für beide
  - D/F: drittes Mitglied ohne Freigabe → niemand sieht etwas, Paar-Snapshot `null`
  - teilweise Dreierfreigabe → niemand
  - E: alle → identisch für drei
  - G: Widerruf → niemand, Snapshot `null`, nach Wiederherstellung wieder sichtbar
  - verborgener Block → zählt als nicht freigegeben
  - Mitglied ohne Workstyle
  - Nicht-Mitglied: Readiness `null`
  - Hilfsfunktion für `authenticated` nicht aufrufbar
- **Node** `web/src/features/reporting/workstyle/__tests__/phase115.test.ts` (12 Tests): Readiness-Zustände und Parser (keine Antworten im Ergebnis), Migrationsinhalt (keine Schreibzugriffe auf `alignment_shares`, keine Tabelle), Teamseite und Panel ohne Knopf für fremde Freigaben, Fortschritt/Scroll/Fokus/Intro ohne Minuten, Abschlussreihenfolge ohne automatische Freigabe, Einladungshinweis, Zitat stabil je Tag und auf beiden Dashboards ohne Fit-Aussage, Signature-Pole ohne Typ- und Wertungsbegriffe, Reihenfolge im Einzelbericht, Mosaik ohne Lückensprache, Archivkarte im Profildruck.
- `profilDruck.test.ts` an die Archivkarte angepasst. Die negativen Garantien bleiben bestehen.
- **Browserreview** (lokale Fixtures, danach vollständig gelöscht): Teams mit 2, 3 und 4 Personen in allen Freigabekombinationen. Alle Mitglieder sehen jeweils denselben Zustand. T2 und T4 zeigen nach vollständiger Freigabe denselben Bericht für alle, T3 mit fehlender Freigabe für niemanden.
- **`npm run ci:check` grün:** `tsc --noEmit`; 2836/2836 Node-Tests; `next build`; `db:test` gegen den laufenden lokalen Supabase-Container mit 144 Dateien und 2263 Tests, `Result: PASS`. Die DB-Suite lief also tatsächlich und wurde nicht übersprungen. `git diff --check` sauber. ESLint auf den geänderten Dateien: keine Fehler, eine Warnung (`hasStartedBase` in `dashboard/page.tsx`), die schon auf HEAD bestand.

## 20. Offene Punkte

- **Release-Plan erweitern:** Die neue Migration `20261118120000` ist die achte remote ausstehende Migration. Sie ist **DB_FIRST_SAFE** und gehört nach `20261114120000`/`20261115120000`. Der heute live laufende Code ruft die neue Readiness-Funktion nicht auf, und für ihn ändert sich nur, dass einseitig sichtbare Teamberichte verschwinden, bis alle freigegeben haben. `20261117120000_retire_active_workbook_writes` bleibt wie geplant nach dem Code-Deploy. **Nachtrag 11.6C:** Die Workbook-Migration heißt jetzt `20261118150000_retire_active_workbook_writes.sql` und läuft nach allen DB-first-Migrationen (siehe `phase-11.6c-wave1-research-sets.md`).
- **Trennung Produkt/Research:** eigene Phase mit Migration und Consent-Änderung (Konzept in Abschnitt 6).
- **Freigabe beim Einladen vormerken:** nur mit neuer Persistenz und neuem Consent-Vertrag, bewusst nicht umgesetzt.
- **DELETE_CODE_LATER:** `features/dashboard/DailyQuote.tsx` und `dailyQuotes.ts` sind ungenutzt (ersetzt durch `QuoteOfTheDay`). Die Matrix-Darstellung im Anhang ist ersetzt; die ungenutzten Label-Importe sind entfernt, ältere `.ws-*`-Regeln in `report.css` sollten bei Gelegenheit gesichtet werden.
- Weitere Template-Strings mit Tailwind-Klasse direkt vor `${` gibt es in `src` nicht mehr (geprüft mit `grep`). Als Muster lohnt sich trotzdem eine Lint-Regel.
- Advisor-Sicht auf Teamberichte folgt weiter dem eigenen Advisor-Vertrag. Ob Advisors den Bericht auch erst bei vollständiger Gegenseitigkeit sehen sollen, ist eine Produktentscheidung für später. **Erledigt in Phase 11.6.**

---

NO AUTOMATIC SHARING INTRODUCED
TEAM REPORT VISIBILITY IS MUTUAL
NO RESEARCH DATA EXPOSED
NO SCORE OR TYPOLOGY INTRODUCED
NO DATABASE CLEANUP PERFORMED
NO REMOTE DB PUSH
NO PRODUCTION DEPLOY
