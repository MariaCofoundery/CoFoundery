# ALIGN MVP — was zu tun ist

**Stand 29.09.2026.** Aus der Prüfung der beiden Arbeitsfassungen
(`MVP Report & Visualisierung Spec v0.1`, `Master-Arbeitsfassung v0.2`) gegen
das, was gebaut ist.

Die Reihenfolge ist keine Priorisierung nach Wichtigkeit, sondern nach
Abhängigkeit: Was oben steht, blockiert das darunter.

---

## Zuerst zu entscheiden — nicht von mir

### ☑ 1. Die Item-Kennungen zusammenführen — entschieden: v2.2

Die Master-Fassung benutzt für dieselben Fragen andere IDs, und in zwei Fällen
dieselbe ID für eine andere Frage.

| Inhalt | gebaut | Master v0.2 |
|---|---|---|
| Wann sprichst du einen Einwand an | `T03` | `T01` (T03 = „streichen") |
| Wochenlang offene Richtung | `X06` | `X02` |
| Informationsregel / Überblick | `K02` | `K04` |
| Mitteilung bei Planänderung | – | `K02` ← **andere Frage, gleiche ID** |
| Entscheiden ohne Zustimmung | `U04` | – |
| Welchen Weg wählst du selbst | – | `U04` ← **andere Frage, gleiche ID** |

**Warum das blockiert:** Eine gespeicherte Antwort merkt sich die ID. Dieselbe
ID mit neuer Bedeutung heißt: Alte Antworten bedeuten etwas anderes, ohne dass
es jemand merkt. Genau deswegen gibt es v2.1 statt eines korrigierten v2.

Zwei Wege: entweder zieht die Master-Fassung die gebauten IDs nach, oder es
wird eine neue Instrumentfassung (v2.2) mit eigener Kennung — dann bleiben
bisherige Antworten unter v2.1 gültig und lesbar.

### ☑ 2. Zahlen im Report — entschieden: keine

`MVP-Spec §5` rechnet `mean(A01, A02)` und zeigt „4.4 / 5".
`Master §8.1` verbietet genau das: „geordnete Kategorien dürfen intern codiert,
aber nicht automatisch als psychologische Messwerte ausgegeben werden".

Die beiden Dokumente widersprechen sich. Mein Vorschlag: Grafik ja, Zahl nein.
Ein Balken ohne Beschriftung sagt dasselbe, ohne Genauigkeit zu behaupten.

### ☑ 3. Die Fragen sprachlich überarbeitet — Sprachreview v0.1

Maria hat am 29.09.2026 geliefert:
`docs/CoFoundery_ALIGN_Sprachreview_S01_MissingReasons_v0.1.md`.

**Das Dokument ist die Quelle, nicht meine Abschrift.** Der Generator liest es
und legt es über die Master-Arbeitsfassung — zwei Dokumente und nicht eines:
Die Master-Fassung sagt, *was* gefragt wird, das Review, *wie* es dasteht.
Zusammengeschrieben ließe sich später nicht mehr sagen, was gemessen werden
soll und was wir daraus gemacht haben.

Der Generator bricht ab, wenn eine Frage im Review fehlt, wenn er eine nennt,
die es nicht gibt, wenn „Antworten unverändert" nicht stimmt, oder wenn eine
Umformulierung die Anzahl der Antworten ändert.

Mitgekommen: `du/dein` klein, Bedingungssätze als eigene Sätze, echte
Fragesätze für W02–W06, und je Item der passende Auslassungsgrund.

Die alte Vorlage `fragebogen-v2-1-ueberarbeitung.md` ist am 29.09.2026
gelöscht worden: Sie enthielt die 36 Fragen von v2.1 in Wortlauten, die es
nicht mehr gibt. Die Master-Arbeitsfassung v0.2 hat sie bereits umformuliert,
und aus ihr sind die beiden Bögen gebaut — geprüft, jeder Fragetext und jede
Antwortmöglichkeit steht wörtlich dort.

### ☑ 3b. Founder-Profil und Venture-Alignment trennen — gebaut

Zwei Fassungen mit eigenen Kennungen (`founder-profile-v1`,
`venture-alignment-v1`). `assessments.module` trägt den Scope,
`assessments.venture_id` das Vorhaben.

U/K liegt beim **Vorhaben**, nicht beim Profil — die Quelle sagt „beim
Teamstart bestätigen“, und das ist nicht portabel. Bestätigen statt neu
beantworten löst die Oberfläche durch Vorbelegen.

Der Ablauf **Vorhaben anlegen oder wählen** ist inzwischen gebaut: Wer keins
hat, bekommt eins über `create_solo_venture()` (SECURITY DEFINER, weil auf
`founder_teams` nur SELECT-Policies liegen und Teams sonst ausschließlich durch
Trigger entstehen); wer mehrere hat, wird gefragt statt geraten; das Dashboard
listet sie mit Stand.

---

## Bauen — unabhängig von 1 und 2

### ☑ 4. Erwartungsdifferenzen (R01 gegen R02) — gebaut

**Die wichtigste Lücke.** `MVP-Spec §16` nennt sie Priorität 1, und zu Recht:
„Maria sagt 12–16 Stunden zu, Alex erwartet 25." Das ist der konkreteste
Befund im ganzen Report.

In v2 war das gebaut (`expectationGaps`), in v2.1 habe ich es **nicht
mitgenommen**. Der Vergleich stellt bisher nur gleiche Frage gegen gleiche
Frage; eine gerichtete Erwartung fällt dabei durch.

Gerichtet heißt: A→B ist etwas anderes als B→A. Beide zu einer Zahl zu machen
hieße, zwei Beziehungen zu einer zu verschmelzen.

### ☑ 5. Relevanzlogik im Teamreport — gebaut

`MVP-Spec §16`: Erwartungsdifferenzen zuerst, dann konkrete Ziele und Regeln,
dann Arbeitspräferenzen, dann Gemeinsamkeiten. Gemeinsamkeiten **aktiv
zeigen**, nicht nur Unterschiede.

Heute ist die Agenda in der Reihenfolge des Fragebogens. Das war eine bewusste
Entscheidung gegen eine Sortierung nach Schwere — die Kategorien hier sind
aber keine Schwere, sondern Art. Das geht.

### ◐ 6. Grafiken — zwei von vier gebaut

- ☑ **Founder Work Map** — `WorkMap` in `AlignMaps.tsx`, auf beiden
  Antwortseiten und in der Advisor-Ansicht. Ein Punkt je Antwort, kein
  Abschnittswert: `mean(A01, A02)` würde behaupten, dass die Fragen eines
  Abschnitts dasselbe messen und sich verrechnen lassen — dafür gibt es weder
  Normstichprobe noch bestätigte Faktoren.
- ☑ **Team Difference Map** — `DifferenceMap`, Hantel je Frage auf der
  Vergleichsseite. Nur wo beide geantwortet haben und beide Skalen gleich lang
  sind. Keine Abstandszahl: `stepsApart` ist bewusst entfernt.
- ☐ **Venture Direction** — braucht Punkt 8 (S01 als sechs Wichtigkeiten).
  Heute ist S01 eine Mehrfachauswahl; ein Radar daraus wäre eine erfundene
  Abstufung zwischen „genannt“ und „nicht genannt“.
- ☐ **Dot Plot ab drei Personen** — es gibt keinen Dreiervergleich. Der
  Vergleich ist durchgängig auf zwei Personen gebaut (`compareV21(a, b)`), und
  das ist keine Lücke in der Grafik, sondern im Modell darunter.

Ohne Rot/Grün und ohne Zahl — Entscheidung 2.

Was die beiden gebauten Bilder NICHT zeigen: Fragen ohne Reihenfolge
(`single_choice`). Eine Handlungswahl hat keine Stelle auf einer Achse, und
eine zu zeichnen wäre eine Behauptung über Nähe. Sie stehen in der Liste
darunter.

### ☑ 7. Deep-Dive-Routing — gebaut

CTA-Karten am Ende jedes Vergleichsabschnitts, in `DeepDiveCards.tsx`.

Die Vertiefungsbereiche mussten nicht gebaut werden — es gibt sie: der
**Founder-Setup-Katalog** mit 20 Themen, je mit Stand, Fassung und Bestätigung
von beiden. `/align/decisions` aus dem Dokument existiert nicht und wird auch
nicht angelegt; die Zuordnung steht in `deepDive.ts`.

Drei Regeln, die dabei entstanden sind:

- **Es wird nichts geschrieben.** Der Report leitet weiter, mehr nicht (§17).
  Eine vorbelegte Notiz aus einem Zweiervergleich landete in einem Thema, das
  dem ganzen Team gehört — wer zu dritt ist, hätte damit Antworten an jemanden
  weitergegeben, dem sie niemand freigegeben hat.
- **Nur bei einem gemeinsamen Vorhaben.** Wer mit jemandem vergleicht, der
  nicht im selben `founder_team` ist, hat keinen Ort für eine Vereinbarung.
- **Die Phase entscheidet mit.** Vor der Gründung nur Themen der Phase
  `before` — der Katalog sagt selbst, dass „Founder-Exit" vor der Rechtsform
  Lärm ist.

Zuordnung je **Abschnitt**, nicht je Frage: je Frage wäre genauer und nach der
ersten Umformulierung falsch. `S – Ziele & strategische Richtung` hat bewusst
kein Thema — der Katalog hat nichts für Ziele, und ein erfundener Link wäre
schlimmer als keiner.

### ☑ 8. S01 als sechs Wichtigkeiten — gebaut

`S01a`–`S01f` (je eine geordnete Wichtigkeit) plus `S01_top` (höchstens zwei
Ziele). Die alte `S01` ist **zurückgezogen, nicht gelöscht**: `retired: true`
heißt im Bericht ja, im Fragebogen nein. Eine Kennung zu streichen, auf die
gespeicherte Antworten zeigen, macht sie unlesbar.

**Nichts wird umgerechnet.** Aus „genannt oder nicht" eine Stufe zwischen eins
und fünf zu machen hieße, sich eine Wichtigkeit auszudenken, die niemand
angegeben hat.

Die gemeinsame Frage steht einmal über den sechs Zielen — sechsmal wäre Lärm,
keinmal ließe sechs Sätze ohne Frage stehen. Die Obergrenze von zwei bei
`S01_top` prüft die Serverfunktion, nicht nur das Eingabefeld.

---

## Im Dokument selbst ändern

### ☑ 9. Datenmodell (`MVP-Spec §19–21`) umgeschrieben

Nicht gestrichen, sondern ersetzt durch das, was wirklich gebaut ist — mit
Begründung je Unterschied, damit die Abweichung nicht wie ein Versehen
aussieht:

- `assessmentVersion` als Text → `instrument_id` mit Status
  (`draft`/`active`/`archived`). Eine Fassung, die nur als Text dasteht, lässt
  sich nicht archivieren.
- vier `value*`-Spalten → ein `value jsonb` plus `answer_format`. Vier
  Spalten, von denen drei leer sind, laden dazu ein, in `valueNumeric` zu
  rechnen.
- `missing_code` fehlte im Vorschlag ganz und ist der Kern.
- **Keine Snapshots.** Sie enthielten gerechnete Abschnittswerte — die gibt es
  nicht, also wäre es eine Ablage für eine Zahl, die nie entsteht.
- **Kein gespeichertes `TeamComparison`.** Der Vergleich wird gerechnet, kennt
  keine `value: number` und ist auf zwei Personen gebaut.

### ☑ 10. `visibility` je Antwort (`§24`) klargestellt

Sichtbarkeit hängt an der **Freigabe**, nicht an der Antwort — und zwar je
Empfänger (`alignment_shares` + `alignment_share_hidden_blocks`). Dieselbe
Antwort kann Person A gezeigt und Person B verborgen werden; eine Spalte an der
Antwort könnte das nicht ausdrücken. Und `"private" | "team" | "advisor"` ist
keine Leiter: „Advisor" ist nicht mehr als „Team", sondern etwas anderes.

Dabei gefunden und behoben: Die Formregel fürs **Ausblenden** war enger als die
fürs **Antworten** (`^[A-Z][0-9]{2}$` gegen `^[A-Z][0-9]{2}[a-z]?$`). G02a und
G02b ließen sich beantworten, aber nicht zurückhalten — die engere Regel stand
ausgerechnet auf der schützenden Seite. Migration 20261081120000.

## Offen, aber nie auf der Liste gewesen

Stand 29.09.2026. Nicht nummeriert, weil es keine Punkte aus den beiden
Dokumenten sind — beim Bauen aufgefallen.

### ☐ Forschungsdaten der beiden Bögen

Die Einwilligung fragt breit: „deine Antworten und Nutzungsdaten pseudonymisiert
für wissenschaftliche Forschung zur Zusammenarbeit in Gründerteams". Sie würde
die beiden Bögen also decken.

Aufgezeichnet wird trotzdem nichts: `trackServerResearchEvent` kennt nur
`founder_base_v2` und `values_v2`, und `resolveResearchItem` weist alles andere
ab. Wer einwilligt und die neuen Bögen ausfüllt, trägt zur Forschung nichts bei
— ohne dass es jemandem gesagt wird.

**Warum ich das nicht einfach gebaut habe:** Ein Forschungsereignis braucht
Item, Dimension und Antwortwert. „Dimension" gibt es hier bewusst nicht — es
werden keine Dimensionswerte gebildet. Was stattdessen das Analyseobjekt ist,
ist eine Modellentscheidung und keine Verdrahtung.

Nicht zu verwechseln mit der **Pretest-Messung** (`alignment_item_views`): Die
läuft seit dem 29.09.2026 für beide Bögen und hängt nicht an der Einwilligung,
weil sie den Vorgang misst und nicht die Person.

### ☐ Einmal im Browser durchklicken

Serverseitig ist der ganze Weg abgelaufen: ausfüllen, abgeben, Bericht,
freigeben, vergleichen, Advisor-Ansicht, Discovery. Was dabei nicht geprüft
werden kann, ist das Verhalten im Browser — Tippen, Autospeichern,
Zwischenzustände. Genau dort lag der gemeldete Speicherfehler.

### ☐ Fragen an die Gutachterin

- Die vier Verhaltensitems (A91/U91/K91/T91) stehen auf `proposal`.
- `confidential_first` als eigener Auslassungsgrund — ja oder nein.
- Die Abweichung „jede Frage ohne eigenen Auslassungsgrund bekommt ‚kann ich
  noch nicht einschätzen'" (steht in `deviationsFromSource`, von mir
  entschieden und zur Bestätigung vorgelegt).

### ☐ v2 und v2.1 abräumen

Beide sind `archived`, und der Umstiegshinweis erscheint nicht mehr. Die Seiten
unter `/founder-alignment/pilot/*`, die Registratur v2.1 und
`dashboardVersionData.ts` stehen aber noch — für alle, die v2.1 ausgefüllt
haben und ihren Bericht behalten sollen. Wann das weg kann, hängt daran, ob
dort noch Antworten liegen.

---

## Schon vorhanden — nicht neu bauen

| Aus den Dokumenten | Wo |
|---|---|
| Vierschritt-Reportformel (§8.2) | `conversationCardsV21.ts` |
| „nicht geteilt ≠ fehlend" (§8.4, §24) | Policy auf `alignment_answers`, DB-Test |
| Vorschau vor dem Teilen (§8.4) | `ShareFormV21` am eigenen Bericht |
| Vergleichskategorien (§8.3) | `comparisonV21.ts` |
| Keine Ampel (§13.1) | `ComparisonViewV21`, bewusst Graustufen |
| Vergleich nur bei gleicher Fassung (§8.1) | `assertComparableV21`, wirft |
| KI-Regeln (§29/§30) | als Testmuster gegen erzeugte Karten |
| Pretest-Messung (§10) | `alignment_item_views`, `docs/pretest-auswertung.md` — seit 29.09.2026 auch für die beiden neuen Bögen, vorher nur v2.1 |
