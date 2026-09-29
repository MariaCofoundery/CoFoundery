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

### ☐ 3. Die Fragen sprachlich überarbeiten

Läuft bei Maria. Vorlage: `docs/fragebogen-v2-1-ueberarbeitung.md`.
Betrifft Formulierungen, nicht Struktur — Reihenfolge und Anzahl der Antworten
bleiben, sonst zeigen gespeicherte Antworten ins Leere.

### ☑ 3b. Founder-Profil und Venture-Alignment trennen — gebaut

Zwei Fassungen mit eigenen Kennungen (`founder-profile-v1`,
`venture-alignment-v1`). `assessments.module` trägt den Scope,
`assessments.venture_id` das Vorhaben.

U/K liegt beim **Vorhaben**, nicht beim Profil — die Quelle sagt „beim
Teamstart bestätigen“, und das ist nicht portabel. Bestätigen statt neu
beantworten löst die Oberfläche durch Vorbelegen.

Offen bleibt: **Vorhaben anlegen oder wählen** als Ablauf. Es gibt
`founder_teams` als Zuhause, aber keinen Weg dorthin.

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

### ☐ 7. Deep-Dive-Routing

`MVP-Spec §17/§18`: CTA-Karten aus dem Report in die Vertiefungsbereiche.
Der Report erzeugt keine Vereinbarung — er leitet weiter.

Die Routen müssen an die vorhandene App-Struktur angepasst werden; die im
Dokument (`/align/decisions`) gibt es nicht.

### ☐ 8. S01 als sechs Wichtigkeiten

Voraussetzung für die Venture-Direction-Grafik. Ändert das Item — hängt
deshalb an Entscheidung 1.

---

## Im Dokument selbst ändern

### ☐ 9. Datenmodell (`MVP-Spec §19–21`) streichen oder umschreiben

Beschreibt Tabellen, die es gibt, unter anderen Namen: `AssessmentResponse`
ist `alignment_answers`. Sonst baut jemand daneben.

### ☐ 10. `visibility` je Antwort (`§24`) klarstellen

Gebaut ist etwas anderes und mehr: Das Ausblenden hängt an der **Freigabe**,
nicht an der Antwort. Damit kann dieselbe Antwort Person A gezeigt und Person
B verborgen werden. Eine Spalte `visibility` am Item wäre eine zweite
Wahrheit, die nichts tut.

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
| Pretest-Messung (§10) | `alignment_item_views`, `docs/pretest-auswertung.md` |
