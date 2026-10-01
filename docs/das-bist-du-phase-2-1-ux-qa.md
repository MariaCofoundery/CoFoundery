# „Das bist du" — Phase 2.1: UX-QA und kleine Korrekturen

**Stand:** 01.10.2026 · **Branch:** `feat/das-bist-du-phase-2-1` · **Grundlage:**
laufender Code und laufende lokale Datenbank, dazu
`docs/das-bist-du-phase-2-implementation-report.md`

Kein Redesign, keine neue Datenschicht, keine Vorarbeit für Phase 3.

---

## 0. Wie geprüft wurde — und warum das diesmal etwas wert ist

Phase 2 hatte mobil **nur die CSS-Klassen** geprüft. Das steht so im damaligen
Bericht und war die größte Lücke.

Für diese Runde wurde tatsächlich gerendert. Das Projekt hat weder Playwright
noch Puppeteer, aber Google Chrome ist auf dem Rechner, und Node 24 bringt
einen WebSocket mit — also ein kleiner Treiber für das Chrome DevTools
Protocol (rund 110 Zeilen, nur im Scratchpad, **nicht** im Repository):

```
Chrome --headless=new --remote-debugging-port=9222
  → /dev-login, echte Formularabgabe, echte Cookies
  → Emulation.setDeviceMetricsOverride je Breite
  → Runtime.evaluate: gemessen wird am Layout, nicht am HTML
```

Gemessen wurde am **gerenderten Layout und am sichtbaren Text**, nicht am
Quelltext. Das ist nicht pedantisch: Die RSC-Nutzlast einer Next-Seite enthält
den ganzen Übersetzungsbaum, und eine Zählung darauf findet jeden Satz — auch
die, die nirgends stehen.

Eine eigene Falle kam dazu: `innerText` liefert Text so, wie er **gerendert**
wird, also durch `text-transform: uppercase` hindurch. Die erste Zählung nach
„von 9" lief großschreibungsempfindlich und hätte „1 VON 9" übersehen. Nach
der Korrektur stimmt das Ergebnis.

Abgedeckte Fälle: fünf Breiten × zwei Zustände (alles zu / alles auf) × zwei
Datenlagen (Seed-Profil, sehr volles Profil) × zwei Sprachen.

**Browser: nur Chrome 154 (Blink).** Safari und Firefox wurden nicht geprüft.
Was unten als „kein Überlauf" steht, ist in Blink gemessen.

---

## 1. Welche sichtbaren UX-Probleme wurden gefunden?

Sieben, davon vier, die man nur im Browser sieht.

### 1.1 Der Sprungbalken war bei 320 px fast ein eigener Bildschirm

| Breite | Punkte | Zeilen | Höhe |
|---|---|---|---|
| 320 px | 8 | **7** | **356 px** |
| 375 px | 8 | 6 | 304 px |
| 768 px | 8 | 2 | 96 px |

Umbruch war erlaubt — aber sieben Zeilen Inhaltsverzeichnis vor dem ersten
Inhalt sind kein Umbruch mehr, sondern eine Wand. Beim vollen Profil mit neun
Abschnitten wäre es noch eine Zeile mehr.

### 1.2 Horizontaler Überlauf bei 320 px, sobald der Altbestand offen war

Gemessen: **Seite 343 px breit bei 320 px Fenster.** Die Seite ließ sich
seitwärts schieben.

Ursache, zwei Ebenen tief:

* `SelfReportView` — die v1-Auswertung — stand früher allein auf einer Seite.
  Auf „Das bist du" liegt sie drei Ebenen tief: Seitenrand 24 px, Aufklapper
  16 px, Kasten 24 px, je Seite. Bei 320 px bleiben 182 px übrig. Ihr
  Flex-Kind hatte kein `min-w-0` und weigerte sich, unter seine
  Mindestinhaltsbreite von 269 px zu gehen.
* Darunter dasselbe noch einmal in `DimensionOverview`: ein Rasterkind ohne
  `min-w-0`, zwei Pixel Überhang.

Das ist kein Fehler des Altbestands und keiner des Umbaus — es ist die Folge
davon, dass etwas Breites in etwas Schmales gewandert ist. Vorher hat es
niemand gesehen, weil niemand bei 320 px nachgesehen hat.

### 1.3 Vier Tippziele unter 44 px

| Element | Höhe | wo |
|---|---|---|
| „Bearbeiten" | **21 px** | `EditLink`, **neunmal** auf der Seite |
| „Zurück zur Übersicht" | 38 px | Kopf der Seite |
| „Als PDF speichern" | 42 px | `ReportActionButton`, geteilt |
| „Werte Add-on starten" | 38 px | im Altbestand |

Der erste ist der schlimmste: ein 21 px hoher Textlink, der neunmal vorkommt
und der einzige Weg zurück in die Bearbeitung ist.

### 1.4 „4 von 9" war die kleinste Schrift der Seite

10 px, weiß auf eingefärbtem Kreis. Form und Größe zusammen sagten
„Einrichtungsassistent, Schritt 4".

### 1.5 Fünf verschachtelte Aufklapper — in jedem Durchgang

Phase 2 hat zugesagt: höchstens ein Aufklapper je Abschnitt, keine
Verschachtelung. Im Browser gezählt: **fünf Aufklapper in Tiefe 2**, alle im
Abschnitt „Wie du arbeitest".

Sie stecken im Aufklapper „Deine frühere Auswertung" und gehören zu
`SelfReportView`: „2. So wirkst du im Alltag", „3. Wo es im Team kippt" und
drei weitere.

**Der Phase-2-Test hat das nicht gesehen, weil er die falsche Sache gezählt
hat** — `<ProfileDetails>` in `page.tsx`, nicht die Verschachtelung, die durch
ein eingesetztes Bauteil entsteht. Die Zusage galt für die Seite, der Test
prüfte eine Datei. Siehe Punkt 9: bewusst nicht gelöst, aber jetzt benannt.

### 1.6 Die Hierarchie Teil → Abschnitt war vier Pixel dünn

Teilüberschrift 24 px, Abschnittsüberschrift 20 px. Beim Überfliegen ist das
keine Ebene, sondern ein Zufall.

### 1.7 Zehn Pixel Schrift im Altbestand

Die Polbeschriftungen der v1-Dimensionsskala („substanz & aufbauorientiert",
„intuitiv handlungsorientiert") stehen bei 10 px. Gefunden, **nicht geändert** —
siehe Punkt 9.

---

## 2. Was wurde geändert?

Elf Dateien, alles CSS, Text oder eine Bedingung. Kein Bauteil neu gebaut.

| Datei | Änderung |
|---|---|
| `ProfilePillar.tsx` | Zähler als Augenbraue statt Plakette; `badge`-Farben und das ungenutzte `eyebrow` entfallen |
| `ProfilePart.tsx` | Teilüberschrift ab `sm` auf 28 px |
| `app/me/profile/page.tsx` | Nummer ohne Gesamtzahl · Sprungbalken als Rollzeile unter `sm` · drei Tippziele auf 44 px · zwei Aufklapper nur noch bedingt |
| `FounderProfileDirection.tsx` | `intro` darf fehlen — sie stand im Aufklapper ein zweites Mal |
| `SelfReportView.tsx` | `min-w-0` · ein Tippziel auf 44 px |
| `DimensionOverview.tsx` | `min-w-0` |
| `ReportActionButton.tsx` | `min-h-11` (42 → 44 px) |
| `SelfValuesProfileSection.tsx` | `min-h-11` |
| `FounderProfileBase.tsx` | `min-h-11` |
| `messages/{de,en}/profile.json` | `sections.step` · Aufklappername bei den Stärken · die toten Fortschrittswörter entfernt |
| zwei Testdateien | fünf neue Zusagen, eine nachgezogen |

Vier der Änderungen liegen in geteilten Bauteilen (`ReportActionButton`,
`SelfReportView`, `DimensionOverview`, `FounderProfileBase`). Sie wirken auch
auf `/me/report` und die Advisor-Ansichten: `min-w-0` erlaubt dort nur etwas,
was dort ohnehin nie nötig wird, und 42 → 44 px sind zwei Pixel.

---

## 3. Wie wurde „x von 9" ersetzt?

Durch **„Abschnitt 4"** — Nummer bleibt, Gesamtzahl geht.

Nicht durch die nackte „4": Eine Zahl allein in der Augenbraue liest sich wie
ein Schritt in einem Ablauf, und sie beantwortet nicht, was sie zählt. „Abschnitt 4"
ist eine Beschriftung.

Nicht ersatzlos gestrichen: Die Nummer ist der einzige Hinweis, dass die Seite
eine Reihenfolge hat. Ohne sie stehen neun gleich aussehende Überschriften da.

**Und die Form hat sich mitgeändert.** Die Plakette ist weg — ein Kreis mit
einer Zahl darin ist die Form, in der Einrichtungsassistenten ihre Schritte
zeigen, unabhängig davon, was darin steht. Jetzt steht die Nummer als normale
Augenbraue in der Farbe des Teils, 11 px statt 10.

```
vorher:   ( 4 VON 9 )          10 px, Plakette, eingefärbter Hintergrund
nachher:  ABSCHNITT 4          11 px, Augenbraue, Farbe des Teils
```

Nachgemessen am sichtbaren Text, nicht am Quelltext:

```
"\d+ von 9"         0 ×   (großschreibungsunempfindlich)
"\d+ / 9"           0 ×
"Abschnitt 1".."Abschnitt 9"   je 1 ×
"ausgefüllt" / "erledigt" / "Fortschritt"   0 ×
```

Dazu sind die toten Schlüssel der alten Kachelübersicht aus beiden Sprachen
geflogen: `founderProfile.pillars.step` („{index} von {total}") und
`founderProfile.overview` mit „ausgefüllt" / „noch offen". Sie wurden seit dem
Umbau von niemandem mehr gelesen, lagen aber als fertige Formulierung bereit.

> **Ein Treffer, der kein Fortschritt ist:** „noch offen" steht einmal auf der
> Seite — als Zustand einer einzelnen Stärke („du hast noch nicht gesagt, wie
> oft") und als Name einer Verantwortungsgruppe. Beides ist eine Auskunft über
> eine Angabe, keine über die Seite.

Die Sprungnavigation ist unverändert vorhanden und zeigt weiterhin nur die
Abschnitte, die es gibt.

---

## 4. Welche Viewports wurden tatsächlich im Browser getestet?

Alle geforderten, plus 1440 px. Chrome 154 headless, echtes Layout, echte
Anmeldung.

| | 320 | 375 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| Seed-Profil, zu | ✓ | ✓ | ✓ | ✓ | ✓ |
| Seed-Profil, alles auf | ✓ | ✓ | ✓ | ✓ | ✓ |
| volles Profil, zu | ✓ | ✓ | ✓ | ✓ | ✓ |
| volles Profil, alles auf | ✓ | ✓ | ✓ | ✓ | ✓ |
| englisch | | ✓ | | ✓ | |

Je Durchgang gemessen: Seitenbreite gegen Fensterbreite, jedes Element, das
rechts hinausragt (eigene Rollbereiche ausgenommen), abgeschnittener Text
(`scrollWidth > clientWidth` bei `overflow: hidden`), jedes Tippziel in `main`,
jede Schrift unter 11 px, der Sprungbalken (Punkte, Zeilen, Höhe, eigener
Rollbereich), jeder Abschnitt (Höhe, Überschriftengröße, Zahl der Aufklapper),
jeder Aufklapper samt Verschachtelungstiefe, die Abstände zwischen den
Abschnitten.

**Ergebnis nach den Korrekturen, über alle zwanzig Durchgänge:**

```
horizontaler Überlauf       0
abgeschnittener Text        0
Tippziele unter 44 px       0
Sprungbalken breiter als die Seite   0
```

Der Sprungbalken danach:

| Breite | Zeilen | Höhe | eigener Rollbereich |
|---|---|---|---|
| 320 px | 1 | 48 px | ja |
| 375 px | 1 | 48 px | ja |
| 768 px | 2 (3 beim vollen Profil) | 96 px | nein |
| 1024 / 1440 px | 2 | 96 px | nein |

Unter `sm` eine schiebbare Zeile, die bis an den Bildschirmrand läuft, damit
man sieht, dass dort noch etwas kommt; darüber wie bisher Umbruch. Die Seite
wird dadurch nicht breiter — der Rollbereich gehört der Liste.

**Englisch** (375 / 1024): kein Überlauf, keine zu kleinen Tippziele,
„Section 1 … Section 9", „As of October 1, 2026".

---

## 5. Wie verhält sich ein sehr volles Profil?

Erzeugt wurde ein temporärer Zustand bei Nora:

| | |
|---|---|
| Fähigkeitsbereiche | **54** (alle), Stufen 1–5 im Wechsel, jeder siebte ohne Stufe |
| Verantwortungswünsche | alle sechs, reihum — `own`, `contribute`, `grow_into`, `prefer_other`, `prefer_external`, `unclear` |
| `grow_into` | 9 Bereiche |
| Stärken | 20 neue + 5 aus dem Seed = **25** |
| Richtungsaussagen | **40** — alle zehn Facetten, je vier |
| Ressourcen | 18 bestätigte (6 je Art) + **2 offene Vorschläge** |
| dazu | neues ALIGN-Arbeitsprofil **und** v1-Altbestand |

**Lesbar und navigierbar: ja.** Kein Überlauf, nichts abgeschnitten, alle neun
Abschnitte erreichbar, der Sprungbalken bei 320 px weiterhin eine Zeile.

Die offenen Vorschläge erschienen **0 ×** — die Regel hält auch bei voller Last.

Höhe der Seite:

| | 320 px | 1024 px |
|---|---|---|
| alles zu | 15 355 px | 8 501 px |
| alles auf | 52 391 px | 22 720 px |

Der aufgeklappte Wert ist der Druckzustand, nicht der Lesezustand.

**Der längste Abschnitt ist „Was dich antreibt":** 2 900 px bei 320 px,
1 136 px bei 1024 px. Grund: Die Begrenzung gilt je Facette (zwei), nicht für
den Abschnitt. Zehn gefüllte Facetten ergeben zwanzig Sätze in der
Zusammenfassung.

Das bleibt so. Auf eine Aussage je Facette zu gehen, hieße genau bei den
Menschen die Hälfte wegzuklappen, die am meisten gesagt haben — und zwischen
den Facetten zu gewichten, verlangt eine Rangfolge, die dieses Modell nicht
hat.

**Alle Testdaten wurden entfernt**, danach `supabase db reset --local` und
`npm run dev:seed`. Nachgezählt: 0 Zeilen mit der Markierung in
`person_strengths`, `direction_statements`, `person_resources`; 21
Fähigkeitseinträge, wie der Seed sie anlegt.

---

## 6. Gab es horizontales Overflow?

**Vorher ja, jetzt nein.**

Vorher: 320 px, Altbestand aufgeklappt → Seite 343 px breit. Zwei Ursachen,
beide fehlendes `min-w-0` (siehe 1.2). Bei 375 px und darüber trat es nicht
auf.

Nachher: über alle zwanzig Durchgänge **kein einziger Fall**, auch nicht beim
vollen Profil mit allen Aufklappern offen.

Die einzige Stelle, die überhaupt horizontal rollt, ist der Sprungbalken unter
`sm` — gewollt, ein eigener Rollbereich, und die Seite bleibt bei 320 px genau
320 px breit.

---

## 7. Wie wurde die Summary-/Detail-Doppelung gelöst?

**Der Aufklapper erscheint nur noch, wenn er mehr enthält als die
Zusammenfassung.**

| Abschnitt | vorher | jetzt |
|---|---|---|
| Deine Stärken | Zusammenfassung 5, Aufklapper **alle** (bei ≤ 5: dieselben) | Aufklapper nur bei mehr als 5 |
| Was dich antreibt | Zusammenfassung 2 je Facette, Aufklapper **alle** | Aufklapper nur, wenn eine Facette mehr als 2 hat |

Beim Seed-Profil verschwinden beide, beim vollen Profil sind beide da — im
Browser so gemessen.

Dazu ein Fund, der nicht in der Aufgabe stand: Der Richtungs-Aufklapper
wiederholte **auch die Einleitung**, Wort für Wort wie darüber. `intro` darf
dort jetzt fehlen, so wie es bei den Stärken schon war.

**Nicht gemacht:** die Herkunft an jeden Satz der Zusammenfassung hängen. Neben
jeder Aussage gelesen, macht sie aus Aussagen eine Liste von Fußnoten — und die
Aufgabe schließt es ausdrücklich aus. Keine neuen verschachtelten Aufklapper.

**Preis, offen gesagt:** Wer fünf Stärken oder wenige Richtungsaussagen hat,
sieht die Herkunft jetzt gar nicht mehr. Das ist der Tausch, den die
bevorzugte Regel verlangt — und die weniger schlechte Hälfte davon: Wer einmal
aufklappt und dasselbe findet, klappt den nächsten nicht mehr auf.

Der Name des Aufklappers sagt jetzt auch, wofür er da ist: „Alle Stärken mit
ihrer Herkunft" statt „Alle Stärken ansehen". Bei Richtung und Ressourcen
stand das schon so.

**Die Ressourcen behalten ihren Aufklapper**, obwohl er keine Einträge
hinzufügt. Oben stehen kurze Schlagworte in Gruppen, unten eine Liste mit Art
und Herkunft — zwei Darstellungen derselben Sache, nicht dieselbe zweimal, und
die Einträge sind Schlagworte statt ganzer Sätze. Das ist die zweite erlaubte
Lösung: Herkunft über einen dezenten Mechanismus zugänglich.

---

## 8. Wurde `profileFreshness` verändert? Warum nicht?

**Nein — und das ist ein Befund, keine Unterlassung.**

Die sechs Abfragen laufen bereits nebeneinander:

```ts
const zeitpunkte = await Promise.all(QUELLEN.map(async (quelle) => { … }));
```

Und der Aufruf selbst hängt im großen `Promise.all` der Seite, zusammen mit
den elf anderen Ladern. Sechs Rundwege bleiben sechs Rundwege — sie kosten
aber nur einen davon an Zeit, und jeder ist eine Zeile mit `limit(1)` auf einem
Index.

Nichts daran ist offensichtlich seriell, also wurde nichts angefasst. Kein
Cache, keine materialisierte Sicht, keine RPC — für ein Datum unter einer
Überschrift.

Was dazukam, ist ein Test: Er liest die Quelle und fällt, sobald jemand das
`Promise.all` in eine Schleife verwandelt. Er prüft die **Reihenfolge**, nicht
die Zahl der Abfragen — die darf wachsen, wenn eine Quelle dazukommt.

---

## 9. Welche Probleme wurden bewusst nicht gelöst?

**9.1 Die fünf verschachtelten Aufklapper im Altbestand.** Sie gehören
`SelfReportView` und sind dessen eigene Kapitelstruktur. Sie flach zu machen
hieße, das Bauteil umzubauen, das auch `/me/report` trägt — und das ist weder
CSS noch klein. Die Tiefe ist 2, nicht mehr, und sie entsteht erst, wenn
jemand den Altbestand ausdrücklich öffnet.

Festgehalten ist dafür, dass die Phase-2-Zusage „höchstens ein Aufklapper je
Abschnitt" für die **Seite** galt und der Test die **Datei** geprüft hat. Wer
sie einlösen will, muss bei `SelfReportView` anfangen.

**9.2 Zehn Pixel Schrift in der v1-Dimensionsskala.** `DimensionScale`
(kompakt) setzt die Polbeschriftungen auf 10 px. Das ist unter der Grenze, die
ich sonst anlege. Es zu ändern ändert auch den v1-Bericht und die
Advisor-Ansichten — das ist ein eigener Schritt, und v1 wird bewusst getrennt
gehalten.

**9.3 Deutsche Registraturtexte in der englischen Seite.** Im englischen
Durchgang gemessen: „A – Analytische Prüfung", „E – Frühes Erproben",
„X – Wohlbefinden bei offener Informationslage". Die Fragetexte der
Instrument-Registratur sind einsprachig. Steht ausdrücklich auf der
Nicht-bauen-Liste.

**9.4 Drei Zeilen Sprungbalken bei 768 px im vollen Profil.** Neun Punkte, 148
px. Erlaubt (Umbruch), aber nicht schön. Eine Rollzeile bis `md` hochzuziehen
würde das lösen und auf dem Tablet etwas verstecken, das dort hinpasst. Nicht
entschieden — zu wenig Grund.

**9.5 „Was dich antreibt" bleibt der längste Abschnitt.** Begründung in
Punkt 5.

**9.6 Safari und Firefox.** Nur Blink gemessen. `min-w-0`, `overflow-x-auto`
und `min-h` sind alt und überall gleich — aber gemessen ist gemessen, und das
war Chrome.

---

## 10. Ist die Seite bereit für Phase 3 „Über dich"?

**Ja, aus Sicht dieser Prüfung.**

Was dafür spricht: Die Seite trägt ein sehr volles Profil ohne Überlauf, ohne
Abschneiden und ohne zu kleine Ziele, in zwei Sprachen und auf fünf Breiten.
Die Struktur Teil → Abschnitt → Zusammenfassung → Aufklapper ist jetzt auch
optisch drei Ebenen und nicht mehr vier Pixel. Und sie behauptet nirgends mehr
einen Fortschritt.

Was Phase 3 wissen sollte:

* **„Das bist du" bleibt ein Lesemodell.** Alle Korrekturen hier waren CSS,
  Text oder eine Bedingung; keine neue Tabelle, keine neue Spalte, kein
  Schreibweg. Ein Guided Builder schreibt in die kanonischen Quellen, und diese
  Seite liest sie weiter.
* **Der Altbestand ist die Stelle, an der es eng wird.** Beide
  Überlauf-Ursachen lagen dort, und die fünf verschachtelten Aufklapper auch.
  Wenn Phase 3 ohnehin an „Wie du arbeitest" vorbeikommt, wäre das der
  Zeitpunkt.
* **Der Einstieg von „Über dich" aus muss die Abschnitts-IDs treffen.** Sie
  heißen unverändert `ueber-dich`, `arbeitsweise`, `staerken`, `faehigkeiten`,
  `erfahrung`, `verantwortung`, `entwicklung`, `ressourcen`, `antrieb` und
  stehen in `page.tsx` einmal als Daten.

---

## 11. Unverändert geblieben

Alles aus Abschnitt 8 der Aufgabe, nachgeprüft: kein Gesamtfortschritt, kein
Score, keine Typologie, kein Radar, `grow_into` weiterhin als eigener
Abschnitt „Wohin du wachsen willst" und nicht als Lücke, Können und Wollen
getrennt, nur bestätigte Ressourcen (0 offene Vorschläge im vollen Profil),
keine Evidence-Zitate, v1 getrennt und datiert, keine Venture-Angaben als
Personeneigenschaft, keine neue Synthesetextebene.

Alles aus Abschnitt 9 ist nicht gebaut: kein Guided Builder, kein
`person_section_marks`, keine Kapitelstatus, keine PDF-Modi, keine neue
Print-Route, Ressourcen-Pflege unverschoben, Navigation unangetastet,
`focus_skill`/`intention` unberührt, Registraturen unübersetzt.

---

## 12. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2522 Tests · next build · 1293 DB-Tests
                     alles grün
```

Dazu zwanzig gemessene Durchgänge im Browser (Abschnitt 4) und die
Zählung am sichtbaren Text (Abschnitt 3).

**Neue Zusagen in Tests** — sie lesen den Quelltext, statt ihn zu wiederholen:

`src/features/reporting/__tests__/dasBistDu.test.ts`
* Die Zählweise trägt `{index}`, **kein** `{total}` und kein „von"/„of"/„/" —
  in beiden Sprachen. Die Seite reicht keine Gesamtzahl durch. Die toten
  Blöcke `pillars` und `overview` sind weg und bleiben weg.
* Der Sprungbalken hat unter `sm` einen eigenen Rollbereich, `flex-wrap` steht
  dort nicht ohne Stufe, und seine Punkte schrumpfen nicht.
* `mehrStaerken` und `mehrRichtung` entscheiden über die beiden Aufklapper,
  und `originLabel` steht weiterhin nur im Aufklapper.
* **Jedes** `inline-flex` in `page.tsx` trägt `min-h-11`. Fünf Treffer, alle
  grün — und der nächste hinzugefügte Knopf wird mitgeprüft.

`src/features/reporting/__tests__/founderProfile.test.ts`
* Die sechs Freshness-Abfragen laufen nebeneinander.
* Der Zähler sitzt nicht wieder in einer Plakette.

---

## 13. Was du in Vercel noch selbst ansehen solltest

Gemessen ist Layout, nicht Gefühl. Offen bleibt:

1. **Der Sprungbalken auf einem echten Telefon.** Schieben mit dem Daumen,
   Trägheit, und ob erkennbar ist, dass rechts noch etwas kommt. Das ist der
   einzige wirklich neue Mechanismus.
2. **„Bearbeiten" antippen.** Jetzt 44 px hoch, aber immer noch ein Textlink —
   ob er sich wie ein Ziel anfühlt, sieht man nicht in Zahlen.
3. **Safari auf iPhone**, einmal durch. Besonders der Rollbereich und die
   Aufklapper.
4. **„Abschnitt 4" im Zusammenhang lesen** — ob die Nummer jetzt wirklich nur
   noch Position sagt oder ob sie ganz entbehrlich wäre. Sie zu streichen ist
   jederzeit eine Zeile.
5. **Der Ausdruck.** Beim Drucken geht alles auf; am vollen Profil sind das
   52 000 px Inhalt. Wie viele Seiten das werden, wurde nicht gemessen.
