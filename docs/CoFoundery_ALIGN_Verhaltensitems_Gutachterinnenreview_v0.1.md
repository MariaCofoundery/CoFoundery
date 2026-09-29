# CoFoundery ALIGN — Gutachterinnenreview der Verhaltensitems v0.1

Stand: 29.09.2026  
Basis: `verhaltensitems-review.md` + gemeinsames Gutachterinnenreview  
Status: alle vier Items auf `revise`

---

## 1. Gesamtentscheidung

```text
A91  → revise
U91  → revise
K91  → revise
T91  → revise
```

Keines der vier Items wird verworfen. Keines wird in der aktuellen Fassung final freigegeben.

Grundregel:

> Die Verhaltensitems prüfen nicht, ob die reguläre Antwort „stimmt“. Sie ergänzen das allgemeine Selbstbild bzw. die gewünschte Arbeitsweise um einen konkreten jüngsten Fall. Eine Abweichung kann durch Situation, Rolle oder Rahmenbedingungen entstanden sein.

Keine numerische Verrechnung, keine Übereinstimmungsquote, kein Gültigkeitsurteil.

---

## 2. „Kam nicht vor“ und Missing Reasons

„Kam nicht vor“ bleibt eine **inhaltliche Antwort** und ist kein Auslassungsgrund.

`cannot_assess` bleibt ausschließlich:

> daran kann ich mich nicht sicher erinnern

Technisch nicht gleichbehandeln.

---

## 3. A91 — revise

### Neue Fassung

> Denk an die letzte wichtige Entscheidung, die du in den vergangenen sechs Monaten getroffen hast. Hast du vor der Entscheidung geprüft, ob eine oder mehrere zentrale Annahmen zutreffen?

Hinweis:

> Gemeint ist jede Form des Nachprüfens: nachrechnen, nachlesen, jemanden fragen oder etwas ausprobieren.

Antworten:

1. ja, ich habe die zentralen Annahmen vor der Entscheidung geprüft
2. teilweise – ich habe nur einen Teil der zentralen Annahmen geprüft
3. nein
4. in den vergangenen sechs Monaten stand keine solche Entscheidung an

Auslassung:

```text
cannot_assess
```

UI:

> daran kann ich mich nicht sicher erinnern

### Modul

```text
Founder-Arbeitsprofil
A02 ↔ A91
```

Wichtig: A02 ist bereits berichtete typische Häufigkeit. Der Vergleich lautet deshalb:

```text
allgemeine Selbsteinschätzung / typisches Verhalten
↔
letzter konkreter Fall
```

Nicht „Wunsch ↔ Wirklichkeit“.

### Zeitraum

```text
6 Monate
```

---

## 4. U91 — revise

### Neue Fassung

> Denk an die letzte Entscheidung, die in diesem Vorhaben in deinen klar zugeordneten Verantwortungsbereich fiel. Hast du sie getroffen, ohne vorher die Zustimmung anderer einzuholen?

Hinweis:

> Gemeint ist Zustimmung, nicht Information. Jemanden zu informieren oder Rücksprache zu halten ist etwas anderes, als auf ein Ja zu warten.

Antworten:

1. ja, ich habe selbst entschieden
2. ich habe vorher Rücksprache gehalten, hätte aber selbst entscheiden dürfen
3. ich habe auf die Zustimmung einer anderen Person gewartet
4. in diesem Zeitraum hatte ich in diesem Vorhaben keinen eigenen Verantwortungsbereich

Auslassung:

```text
cannot_assess
```

### Modul

```text
Venture-Alignment
U04 ↔ U91
```

Hier ist die Gegenüberstellung tatsächlich:

```text
gewünschter Entscheidungsspielraum
↔
zuletzt realisiertes Verhalten im konkreten Venture
```

Eine Abweichung ist keine Inkonsistenz.

### Zeitraum

```text
3 Monate
oder
seit Beginn des Vorhabens, falls es jünger ist
```

---

## 5. K91 — revise

### Neue Fassung

> Denk an das letzte Mal in den vergangenen drei Monaten, als du in diesem Vorhaben anderen Foundern einen Zwischenstand aus deinem Bereich gezeigt hast. In welchem Zustand war der Zwischenstand zu diesem Zeitpunkt?

Antworten:

1. erste Ideen oder Skizzen – vieles war noch offen
2. die Richtung war klarer, aber noch vieles offen
3. ein erster brauchbarer Stand
4. das Ergebnis war weitgehend fertig
5. ich habe in diesem Zeitraum keinen Zwischenstand gezeigt

Auslassung:

```text
cannot_assess
```

### Modul

```text
Venture-Alignment
K01 ↔ K91
```

Keine numerische Differenz berechnen.

### Zeitraum

```text
3 Monate
oder
seit Beginn des Vorhabens, falls es jünger ist
```

---

## 6. T91 — revise

T91 wird nicht gestrichen, nur weil T03 nicht mehr existiert.

Neues Gegenstück:

```text
T01
```

### Neue Fassung

> Denk an das letzte Mal in den vergangenen sechs Monaten, als du eine wichtige, aber nicht dringende geplante Entscheidung anders gesehen hast als die anderen. Wann hast du deinen Einwand zum ersten Mal angesprochen?

Antworten:

1. noch im laufenden Gespräch
2. nach dem Gespräch, aber noch am selben Arbeitstag
3. am nächsten Arbeitstag
4. nach mehr als einem Arbeitstag
5. ich habe den Einwand nicht angesprochen
6. in den vergangenen sechs Monaten kam eine solche Situation nicht vor

Antwort 5:

```text
outsideSequence = true
```

Antwort 6 ist eine normale inhaltliche Antwort.

Auslassung:

```text
cannot_assess
```

### Modul

```text
Founder-Arbeitsprofil
T01 ↔ T91
```

### Zeitraum

```text
6 Monate
```

---

## 7. Anpassung T01

T01 soll ausschließlich den **Zeitpunkt des ersten Ansprechens** messen.

Deshalb Antwort 4 ändern:

Bisher:

> später, wenn ich meine Sicht weiter sortiert habe

Neu:

> nach mehr als einem Arbeitstag

Das Motiv „erst sortieren“ gehört inhaltlich eher zu T02.

---

## 8. Modulzuordnung aller vier Items

| Item | Modul | Gegenstück |
|---|---|---|
| A91 | Founder-Arbeitsprofil | A02 |
| T91 | Founder-Arbeitsprofil | T01 |
| U91 | Venture-Alignment | U04 |
| K91 | Venture-Alignment | K01 |

Begründung:

U91 und K91 hängen stark vom konkreten Venture, Rollen, Entscheidungsrechten und Informationsstrukturen ab. Sie sind deshalb nicht sinnvoll als rein portables Personenverhalten.

---

## 9. Entscheidung zu den Bezugszeiträumen

Keine künstliche Vereinheitlichung.

```text
A91   → 6 Monate
T91   → 6 Monate
U91   → 3 Monate / seit Venture-Start
K91   → 3 Monate / seit Venture-Start
```

Das sind vorläufige Entwicklungsentscheidungen und müssen im Pretest geprüft werden.

---

## 10. Pretest-Kriterien

Für jedes Verhaltensitem erfassen:

```text
- Anteil "kam nicht vor"
- Anteil "daran kann ich mich nicht sicher erinnern"
- Bearbeitungszeit
- Abbruchquote
- Rückfragen / Verständnisschwierigkeiten
- Freitextfeedback
```

Interpretation:

- viele `kam nicht vor` → Zeitraum möglicherweise zu kurz oder Ereignis zu selten
- viele `cannot_assess` → Zeitraum möglicherweise zu lang oder Frage zu unspezifisch

---

## 11. Reportlogik

Nicht:

> Deine Antwort zu A02 stimmt nicht mit A91 überein.

Nicht:

> Du überschätzt deine analytische Arbeitsweise.

Nicht:

> Deine Angaben sind inkonsistent.

Stattdessen:

> Du gibst allgemein an, zentrale Annahmen häufig zu prüfen. Bei deiner letzten wichtigen Entscheidung hast du die zentralen Annahmen teilweise geprüft.

Oder:

> Du möchtest in deinem Verantwortungsbereich weitgehend selbstständig entscheiden. Bei deiner letzten Entscheidung hast du auf die Zustimmung einer anderen Person gewartet.

Optional:

> Das kann an der konkreten Situation, euren Rollen oder den geltenden Entscheidungsregeln gelegen haben.

---

## 12. Produktentscheidung

Die vier Items sollen nach dieser Überarbeitung **noch nicht automatisch in den normalen MVP-Fragebogen aufgenommen werden**.

Nächster Status:

```text
candidate_for_pretest
```

Zunächst verwenden als:

- optionale Verhaltensanker
- Pretest-Items
- Forschungs-/Validierungsbausteine

Erst nach Pretest entscheiden:

```text
→ regulärer Produktbogen
→ optionaler Deep Dive
→ Forschungsmodul
→ verwerfen
```

---

## 13. Kurzfassung für die Implementierung

```text
A91 → revise
- Founder-Profil
- 6 Monate
- eine/mehrere zentrale Annahmen
- "kam nicht vor" bleibt Antwort

U91 → revise
- Venture-Alignment
- konkretes Venture nennen
- 3 Monate / seit Venture-Start
- Rücksprache klar von Zustimmung trennen

K91 → revise
- Venture-Alignment
- konkretes Venture nennen
- 3 Monate / seit Venture-Start
- Antwortstufen an K01 angleichen

T91 → revise
- Founder-Profil
- auf T01 beziehen
- 6 Monate
- T01 Antwort 4 auf "nach mehr als einem Arbeitstag" ändern
- "nicht angesprochen" = outsideSequence
- "kam nicht vor" = normale Antwort
```

---

## 14. Finale Gutachterinnenentscheidung

```text
A91  ☑ revise   ☐ approved   ☐ reject
U91  ☑ revise   ☐ approved   ☐ reject
K91  ☑ revise   ☐ approved   ☐ reject
T91  ☑ revise   ☐ approved   ☐ reject
```
