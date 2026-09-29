# CoFoundery ALIGN — Sprachreview + S01-Entscheidung v0.1

Stand: 29.09.2026  
Zweck: Umsetzungsgrundlage für VS Code  
Basis: `docs/fragen-ueberarbeiten.md` + gemeinsames Review  
Status: redaktionelle/produktseitige Freigabe für die nächste Implementierungsrunde; wissenschaftlich weiterhin Entwicklungsfassung

---

# 1. Grundregeln

Für die sprachliche Überarbeitung gilt:

- Fragetext darf umformuliert werden.
- Hinweise dürfen umformuliert, ergänzt oder gestrichen werden.
- Antwortbeschriftungen dürfen sprachlich verbessert werden.
- Reihenfolge bestehender Antwortoptionen bleibt erhalten.
- Anzahl bestehender Antwortoptionen bleibt erhalten.
- Das gemessene Konstrukt bleibt erhalten.
- Wenn eine Frage strukturell etwas anderes messen soll, bekommt sie eine neue Item-ID bzw. neue Item-Struktur.
- In der gesamten Anwendung wird `du/dein` kleingeschrieben.

Wichtig:

`S01` ist eine bewusste strukturelle Ausnahme und wird nicht nur sprachlich überarbeitet, sondern neu aufgebaut.

---

# 2. Entscheidung zu S01

## 2.1 Warum S01 geändert wird

Die bisherige S01 ist eine Mehrfachauswahl:

> Welche Ergebnisse möchtest du mit dem Unternehmen in den nächsten drei Jahren erreichen?

Das ist für eine Venture-Direction-Grafik zu grob, weil eine Nicht-Auswahl nicht erkennen lässt, ob ein Ziel:

- unwichtig ist,
- durchaus wichtig, aber nicht Top-Priorität ist,
- oder nur zugunsten eines noch wichtigeren Ziels nicht ausgewählt wurde.

Deshalb wird S01 in sechs getrennte Wichtigkeitsratings aufgeteilt.

---

## 2.2 Neue Struktur

### Gemeinsame Frage

> Wie wichtig sind dir für dieses konkrete Vorhaben die folgenden Ziele in den nächsten drei Jahren?

Antwortskala für alle sechs Items:

1. gar nicht wichtig
2. eher wenig wichtig
3. mittel
4. ziemlich wichtig
5. sehr wichtig

Auslassungsgrund:

- `not_decided` = habe ich noch nicht entschieden

### S01a — Wirtschaftliche Tragfähigkeit

> Ein wirtschaftlich tragfähiges Unternehmen aufbauen, das verlässlich Einkommen erwirtschaften kann.

Interner Key:

```ts
substance
```

### S01b — Wachstum & Skalierung

> Das Unternehmen deutlich wachsen lassen und einen größeren Markt erreichen.

Interner Key:

```ts
growth
```

### S01c — Gesellschaftliche / ökologische Wirkung

> Mit dem Unternehmen einen konkreten gesellschaftlichen oder ökologischen Beitrag leisten.

Interner Key:

```ts
impact
```

### S01d — Exit-Perspektive

> Ein Unternehmen aufbauen, das perspektivisch teilweise oder vollständig verkauft werden kann.

Interner Key:

```ts
exit
```

### S01e — Fachliche / technologische Verwirklichung

> Eine fachlich oder technologisch anspruchsvolle Idee verwirklichen.

Interner Key:

```ts
realization
```

### S01f — Unternehmerische Unabhängigkeit

> Mehr unternehmerische und persönliche Unabhängigkeit erreichen.

Interner Key:

```ts
independence
```

## 2.3 Zusätzliche Priorisierungsfrage

Nach den sechs Ratings:

> Welche ein oder zwei dieser Ziele sind dir aktuell besonders wichtig?

Mehrfachauswahl: maximal 2.

Interner Key:

```ts
S01_top
```

## 2.4 Migration / technische Entscheidung

Die alte S01 nicht überschreiben, wenn bereits Antworten gespeichert wurden.

Empfehlung:

```ts
S01        // legacy / inactive
S01a       // substance
S01b       // growth
S01c       // impact
S01d       // exit
S01e       // realization
S01f       // independence
S01_top    // top priorities
```

Die neue Struktur ist vorhabensspezifisch und gehört zum Venture Alignment, nicht zum portablen Founder-Profil.

---

# 3. Globale Entscheidung zu Auslassungsgründen

Auslassungsgründe werden technisch getrennt gespeichert.

```ts
type MissingReason =
  | "cannot_assess"
  | "not_decided"
  | "not_clarified"
  | "prefer_not_to_say"
  | "confidential_first";
```

Bedeutung:

```text
cannot_assess
= kann ich noch nicht einschätzen

not_decided
= habe ich noch nicht entschieden

not_clarified
= haben wir noch nicht geklärt

prefer_not_to_say
= möchte ich nicht angeben

confidential_first
= möchte ich zunächst nur für mich festhalten / vertraulich klären
```

Wichtig:

Auslassungsgründe sind **keine Skalenwerte**.

Nicht so speichern:

```ts
response = 6
```

Sondern:

```ts
response = null
missing_reason = "cannot_assess"
```

## 3.1 Prioritätsregel

Spezifische Auslassungsgründe haben Vorrang.

Beispiele:

```text
A01 → cannot_assess
R02 → not_clarified
S02 → not_decided / prefer_not_to_say
B01 → not_decided / prefer_not_to_say
L01 → confidential_first / prefer_not_to_say
```

Wenn ein Item **keinen sinnvolleren spezifischen Auslassungsgrund** hat, wird als Fallback angezeigt:

> kann ich noch nicht einschätzen

## 3.2 UI-Regel

`kann ich noch nicht einschätzen` wird nicht als normale zusätzliche Antwortoption in derselben visuellen Skala dargestellt.

Beispiel:

```text
nie
selten
manchmal
häufig
fast immer

────────────
Kann ich noch nicht einschätzen
```

Damit bleibt sichtbar:

- Skalenantworten = inhaltliche Antworten
- Auslassungsgrund = separate Entscheidung

---

# 4. Founder-Arbeitsprofil — sprachlich überarbeitete Fragen

## A — Analytische Prüfung

### A01

> Du musst zwischen mehreren realistischen Möglichkeiten entscheiden. Wie häufig vergleichst du ihre Vor- und Nachteile, bevor du dich festlegst?

Antworten unverändert:
1. nie
2. selten
3. manchmal
4. häufig
5. fast immer

Auslassung: `cannot_assess`

### A02

> Eine wichtige Entscheidung hängt davon ab, ob eine Annahme stimmt. Wie häufig prüfst du, welche Informationen für oder gegen diese Annahme sprechen?

Hinweis:

> Zum Beispiel die Annahme, dass genügend Kund:innen für ein Angebot bezahlen würden.

Antworten unverändert:
1. nie
2. selten
3. manchmal
4. häufig
5. fast immer

Auslassung: `cannot_assess`

---

## I — Nutzung von Erfahrungsintuition

### I01

> Du kennst dich in einem Thema gut aus. Wie stark fließt dein erster Eindruck normalerweise in deine Entscheidung ein?

Antworten unverändert:
1. gar nicht
2. eher wenig
3. mittel
4. stark
5. sehr stark

Auslassung: `cannot_assess`

### I02

> Mehrere Möglichkeiten erscheinen nach den verfügbaren Informationen ähnlich gut. Wie stark lässt du dann deine Erfahrung oder dein Gefühl mitentscheiden?

Antworten unverändert:
1. gar nicht
2. eher wenig
3. mittel
4. stark
5. sehr stark

Auslassung: `cannot_assess`

### I03

> Die verfügbaren Zahlen sprechen für eine Option, dein Gefühl eher dagegen. Wie stark beziehst du dieses Gefühl in deine weitere Entscheidung ein?

Antworten unverändert:
1. gar nicht
2. eher wenig
3. mittel
4. stark
5. sehr stark

Auslassung: `cannot_assess`

---

## E — Frühes Erproben

### E01

> Dir fehlen noch Informationen für eine Entscheidung. Ein kleiner Test könnte zusätzliche Hinweise liefern. Wie wahrscheinlich ist es, dass du den Test startest, statt zunächst weiter Informationen zu sammeln?

Antworten unverändert:
1. sehr unwahrscheinlich
2. eher unwahrscheinlich
3. teils/teils
4. eher wahrscheinlich
5. sehr wahrscheinlich

Auslassung: `cannot_assess`

### E02

> Zwei Vorgehensweisen erscheinen beide sinnvoll. Ein kleiner Test könnte zeigen, welche in der Praxis besser funktioniert. Wie wahrscheinlich ist es, dass du zunächst einen solchen Test machst?

Antworten unverändert:
1. sehr unwahrscheinlich
2. eher unwahrscheinlich
3. teils/teils
4. eher wahrscheinlich
5. sehr wahrscheinlich

Auslassung: `cannot_assess`

### E03

> Eine Entscheidung ist noch nicht endgültig und lässt sich mit wenig Aufwand korrigieren. Wie wahrscheinlich ist es, dass du zunächst eine vorläufige Richtung festlegst?

Antworten unverändert:
1. sehr unwahrscheinlich
2. eher unwahrscheinlich
3. teils/teils
4. eher wahrscheinlich
5. sehr wahrscheinlich

Auslassung: `cannot_assess`

---

## T/D — Unterschiede ansprechen und formulieren

### T01

> Während eines Gesprächs merkst du, dass du eine geplante Entscheidung anders siehst. Sie ist wichtig, aber nicht dringend. Wann sprichst du deinen Einwand zum ersten Mal an?

Antworten unverändert:
1. noch im laufenden Gespräch
2. nach dem Gespräch, aber am selben Arbeitstag
3. am nächsten Arbeitstag
4. später, wenn ich meine Sicht weiter sortiert habe
5. situationsabhängig

Auslassung: `cannot_assess`

### T02

> Du hast Bedenken, kannst sie aber noch nicht genau begründen. Was entspricht dann eher deinem Vorgehen?

Antworten unverändert:
1. direkt ansprechen und Unklarheit benennen
2. kurz erwähnen und später genauer darauf zurückkommen
3. erst für mich sortieren und dann ansprechen
4. erst ansprechen, wenn ich es ziemlich genau benennen kann
5. situationsabhängig

Wichtig:
- nominal / teilweise geordnet
- vorerst kein linearer Score

Auslassung: `cannot_assess`

### D01

> Du bist inhaltlich anderer Meinung. Welcher Einstieg passt dann am ehesten zu dir?

Antworten unverändert:
1. „Ich sehe das anders, weil …“
2. „Ich habe bei dem Punkt noch Bedenken …“
3. „Wie würde unser Vorschlag mit … umgehen?“
4. „Ich würde gern noch eine andere Möglichkeit anschauen …“
5. anders

Wichtig:
- nominale Gesprächspräferenz
- kein Direktheitsscore

Auslassung: `cannot_assess`

### D02

> Ein Vorschlag erscheint dir nicht sinnvoll. Wie wahrscheinlich ist es, dass du ausdrücklich sagst, dass du ihm nicht zustimmst?

Antworten unverändert:
1. sehr unwahrscheinlich
2. eher unwahrscheinlich
3. teils/teils
4. eher wahrscheinlich
5. sehr wahrscheinlich

Auslassung: `cannot_assess`

---

## X — Wohlbefinden bei offener Informationslage

### X01

> Wie wohl fühlst du dich, wenn für dasselbe Ergebnis mehrere plausible Erklärungen offen sind und noch unklar ist, welche davon zutrifft?

Antworten unverändert:
1. sehr unwohl
2. eher unwohl
3. weder wohl noch unwohl
4. eher wohl
5. sehr wohl

Auslassung: `cannot_assess`

### X02

> Wie wohl fühlst du dich, wenn über mehrere Wochen offen bleibt, welche von zwei möglichen Richtungen euer Vorhaben nehmen wird?

Antworten unverändert.

Auslassung: `cannot_assess`

### X03

> Wie wohl fühlst du dich, wenn ihr zu derselben Idee widersprüchliche Rückmeldungen bekommt und noch nicht klar ist, welche davon relevanter sind?

Antworten unverändert.

Auslassung: `cannot_assess`

### X04

> Wie wohl fühlst du dich, wenn eine wichtige Frage eine Zeit lang keine eindeutige Antwort hat?

Antworten unverändert.

Auslassung: `cannot_assess`

---

# 5. Venture Alignment — sprachlich überarbeitete Fragen

## U/K — Zusammenarbeit: Spielraum und Information

### U01

> Dein Verantwortungsbereich ist klar geregelt. Wie selbstständig möchtest du dort normalerweise über das Vorgehen entscheiden?

Antworten unverändert:
1. sehr wenig selbstständig
2. eher wenig
3. teils/teils
4. eher selbstständig
5. sehr selbstständig

Auslassung: `cannot_assess`

### U03

> Für deinen Bereich gibt es ein vereinbartes Budget. Wie selbstständig möchtest du innerhalb dieses Rahmens über Ausgaben entscheiden?

Antworten unverändert.

Auslassung: `cannot_assess`

### U04

> In deinem Bereich sind mehrere sinnvolle Vorgehensweisen möglich. Wie selbstständig möchtest du entscheiden, welchen Weg du gehst?

Antworten unverändert.

Auslassung: `cannot_assess`

### U05

> Während der Arbeit ändert sich etwas. Wie frei möchtest du einen vereinbarten Plan in deinem Bereich selbst anpassen können?

Antworten unverändert:
1. gar nicht frei
2. eher wenig frei
3. teils/teils
4. eher frei
5. sehr frei

Auslassung: `cannot_assess`

### K01

> Wann zeigst du anderen Foundern normalerweise einen Zwischenstand aus deinem Bereich?

Antworten unverändert:
1. schon bei ersten Ideen/Skizzen
2. wenn die Richtung klarer wird, aber noch vieles offen ist
3. bei einem ersten brauchbaren Stand
4. eher wenn das Ergebnis weitgehend fertig ist
5. stark situationsabhängig

Wichtig:
- nominal / teilweise geordnet
- kein Mittelwert

Auslassung: `cannot_assess`

### K03

> In einem anderen Bereich zeichnet sich eine wichtige Richtungsänderung ab. Wann möchtest du davon erfahren?

Antworten unverändert:
1. schon während sie geprüft wird
2. sobald eine Richtung wahrscheinlich wird
3. wenn die Entscheidung getroffen ist
4. wenn sie für meinen Bereich relevant wird
5. situationsabhängig

Wichtig:
- gewünschter Informationszeitpunkt
- nicht mit Entscheidungshoheit verwechseln

Auslassung: `cannot_assess`

### K04

> Welche Form von Überblick über andere Bereiche passt im Alltag am besten zu dir?

Antworten unverändert:
1. regelmäßiger kurzer Überblick
2. aktive Information bei größeren Änderungen
3. zugänglicher Arbeitsstand bei Bedarf
4. ich frage gezielt nach
5. andere Regel

Wichtig:
- nominal
- keine Rangfolge

Auslassung: `cannot_assess`

---

## S — Ziele & strategische Richtung

### S01

Siehe Abschnitt 2.

Alte S01 wird nicht nur umformuliert, sondern strukturell ersetzt.

### S02

> Welche Vorstellung hast du aktuell für deine Unternehmensanteile in den nächsten drei Jahren?

Antwortlabels:
1. Ich möchte langfristig beteiligt bleiben und plane aktuell keinen Verkauf.
2. Ein teilweiser Verkauf wäre für mich grundsätzlich möglich.
3. Ich möchte gezielt auf einen späteren vollständigen Verkauf hinarbeiten.
4. Das hängt für mich von bestimmten Bedingungen ab.
5. Ich möchte mir alle Möglichkeiten offenhalten.

Auslassung:
- `not_decided`
- `prefer_not_to_say`

### S03

> Wie stehst du aktuell dazu, externes Kapital aufzunehmen und dafür Unternehmensanteile abzugeben?

Antworten unverändert:
1. zunächst ohne externes Eigenkapital
2. Möglichkeit offenhalten
3. gezielt suchen
4. abhängig von Bedingungen

Auslassung:
- `not_decided`
- `prefer_not_to_say`

### S04

> Welches konkrete Ergebnis sollte das Vorhaben aus deiner Sicht in den nächsten zwölf Monaten erreichen?

Hinweis:

> Auch ein klares Lernergebnis kann ein Ziel sein – zum Beispiel eine Annahme zu prüfen oder bewusst zu entscheiden, einen Ansatz nicht weiterzuverfolgen.

Antwortform: `structured_text`

Auslassung: `cannot_assess`

### S06

> Welche Rolle möchtest du in etwa drei Jahren selbst im Unternehmen haben?

Antworten unverändert:
1. stark operativ
2. vor allem führen/organisieren
3. vor allem fachlich/strategisch gestalten
4. schrittweise aus Tagesgeschäft zurückziehen
5. hauptsächlich als Anteilseigner:in
6. andere Vorstellung

Auslassung: `not_decided`

UI-Label:

> ist mir noch unklar

---

## R — Ressourcen & tatsächliche Zusagen

### R01

> Wie viele Stunden pro Woche kannst du in den nächsten zwölf Wochen realistisch und verlässlich für das Vorhaben einplanen?

Antwortform: `number_range`

Auslassung:
- `not_decided`
- `prefer_not_to_say`

### R02

> Wie viele Stunden pro Woche erwartest du in den nächsten zwölf Wochen ungefähr von [Name]?

Antwortform: `person_number_range`

Wichtig:
- gerichtete Erwartung
- nicht über Personen mitteln

Auslassung: `not_clarified`

### R03

> Welche regelmäßigen Zeiten könntest du in den nächsten zwölf Wochen für gemeinsame Arbeit freihalten?

Antwortform: `time_windows`

Hinweis:

> Private Gründe für nicht verfügbare Zeiten müssen nicht angegeben werden.

Auslassung: `cannot_assess`

### R04

> Ab wann brauchst du voraussichtlich regelmäßige Auszahlungen aus dem Vorhaben, um deinen Lebensunterhalt zu decken?

Antworten unverändert:
1. ab sofort
2. ab Datum
3. innerhalb 12 Monate voraussichtlich nicht

Auslassung:
- `cannot_assess`
- `prefer_not_to_say`

### R05

> Welche monatliche Auszahlung brauchst du ab diesem Zeitpunkt ungefähr mindestens?

Erscheint nur, wenn R04 relevant beantwortet wurde.

Antwortform: `money_range`

Wichtig:
- Mindestbedarf
- keine Gehaltsforderung
- keine Unternehmensprognose

Auslassung: `cannot_assess`

### R06

> Unter welchen Bedingungen könntest du dir vorstellen, das Vorhaben zu deiner beruflichen Haupttätigkeit zu machen?

Antworten unverändert:
1. bereits Haupttätigkeit
2. bestimmte Auszahlung gesichert
3. Finanzierung erreicht
4. Meilenstein erreicht
5. ab Datum
6. andere Bedingung
7. aktuell nicht geplant

Auslassung: `not_decided`

### R09

> Ihr erreicht einen wichtigen vereinbarten Meilenstein nicht. Was sollte dann für deine weitere Mitarbeit gelten?

Antworten unverändert:
1. bis Datum weiterarbeiten und neu entscheiden
2. neues konkretes Ziel vereinbaren und bis dahin weiter
3. gemeinsam neu entscheiden
4. unter bestimmten Bedingungen nicht weiterführen
5. andere Vorgehensweise

Auslassung: `not_decided`

### R10

> Wie wichtig ist es dir persönlich, dieses konkrete Vorhaben weiterzuführen?

Antworten unverändert:
1. gar nicht wichtig
2. eher wenig
3. mittel
4. ziemlich wichtig
5. sehr wichtig

Wichtig:
- Einzelindikator subjektiver Bindung
- nicht mit Zeit oder Geld zu einem Commitment-Score verrechnen

Auslassung: `cannot_assess`

### R12

> Wann sollten diese Angaben spätestens wieder überprüft werden?

Antworten unverändert:
1. an einem bestimmten Datum – bitte angeben
2. nach dem nächsten Meilenstein

Auslassung: `not_decided`

UI-Label:

> habe ich noch nicht festgelegt

---

## G — Entscheidungs- und Teamregeln

### G01

> Ihr seid euch bei einer wichtigen Entscheidung in einem klar zugeordneten Verantwortungsbereich uneinig. Andere Bereiche sind nicht wesentlich betroffen. Welche Regel soll in so einem Fall gelten?

Antworten unverändert:
1. verantwortliche Person entscheidet nach Anhörung
2. vorher benannte andere Person entscheidet nach Rücksprache
3. Mehrheit entscheidet
4. nur bei Zustimmung aller
5. abhängig von Entscheidungsart

Wichtig:
- nominal
- bei Zweier-Teams löst Mehrheit keinen Gleichstand

Auslassung: `cannot_assess`

### G04

> Ihr findet bis zum vereinbarten Zeitpunkt keine Einigung über eine wichtige Entscheidung. Welche Lösungen sollten dann grundsätzlich möglich sein?

Antworten unverändert:
1. vorher benannte Person entscheidet
2. begrenzter Test
3. externe Beratung/Moderation
4. neue Frist
5. anderer Weg

Auslassung: `not_decided`

### G05

> Bei welchen Entscheidungen sollten aus deiner Sicht grundsätzlich alle Founder zustimmen?

Antworten unverändert:
1. neue Founder/Beteiligungen
2. größere finanzielle Verpflichtungen
3. grundlegende Richtungsänderung
4. Unternehmensverkauf
5. wesentliche Änderung persönlicher Zusagen
6. weitere

Wichtig:
- Gesprächsgrundlage
- keine Rechtsvereinbarung

Auslassung: `not_decided`

UI-Label:

> habe ich noch nicht festgelegt

---

## B — konkrete Risikogrenzen & Absicherung

### B01

> Welchen zusätzlichen Betrag an eigenem Geld würdest du aktuell höchstens in das Vorhaben investieren, wenn du einkalkulierst, dass du ihn vollständig verlieren könntest?

Antwortform: `money_range`

Wichtig:

Keine Ableitung von:
- Vermögen
- Mut
- Gründerfähigkeit

Auslassung:
- `not_decided`
- `prefer_not_to_say`

### B04

> Welche finanzielle Mindestreserve sollte bestehen bleiben, bevor ihr zusätzliches Geld in ein größeres Vorhaben steckt?

Antwortform: `number_range`

Auslassung:
- `cannot_assess`
- `not_decided`
- `prefer_not_to_say`

### B05

> Ein Vorhaben würde einen spürbaren Teil eurer Zeit oder eures Budgets beanspruchen. Welche Absicherungen wären dir vorher wichtig?

Antworten unverändert:
1. kleiner Vorversuch
2. feste Ausgabenobergrenze
3. vorher vereinbarte Stop-/Neubewertungsbedingung
4. externe fachkundige Einschätzung
5. andere Absicherung
6. keine zusätzliche Absicherung

Wichtig:
- Anzahl der Häkchen nicht zählen
- Option 6 schließt andere Antworten aus

Auslassung: `not_decided`

---

## W — Prioritäten in konkreten Zielkonflikten

### Gemeinsame Instruktion

> In den folgenden Situationen können zwei unterschiedliche Anliegen gleichzeitig wichtig sein. Bewerte zuerst, wie wichtig dir beide Anliegen sind. Wähle danach, welchen Weg du in der beschriebenen Situation eher gehen würdest.

Antwortformat bleibt: `value_case`

### W01

> Ihr habt eine neue Finanzplanung erstellt, aber einige Zahlen sind noch unsicher. Es besteht aktuell keine Gefahr, dass zugesagte Zahlungen nicht geleistet werden können. Wie würdest du mit der vorläufigen Planung umgehen?

Auslassung: `not_decided`

### W02

Szenario:

> Eine Person arbeitet schon lange mit euch zusammen. Die Anforderungen ihrer Rolle haben sich verändert und sie erfüllt einige davon aktuell noch nicht. Für eine Übergangslösung steht Budget zur Verfügung.

Frage:

> Wie würdest du in dieser Situation eher vorgehen?

Auslassung: `not_decided`

### W03

Szenario:

> Ihr könnt zwischen zwei wirtschaftlich tragfähigen Angeboten wählen. Eines erzielt mehr gesellschaftliche oder ökologische Wirkung. Das andere erwirtschaftet einen höheren Überschuss, der für die weitere Entwicklung des Unternehmens genutzt werden könnte. Beide decken ihre laufenden Kosten.

Frage:

> Wie würdest du zwischen den beiden Angeboten entscheiden?

Auslassung: `not_decided`

### W04

Szenario:

> Ein interner Arbeitsablauf soll verändert werden. Die betroffenen Personen haben ihre Sicht bereits schriftlich eingebracht. Ein weiterer gemeinsamer Austausch würde den Start um ungefähr eine Woche verschieben.

Frage:

> Wie würdest du über das weitere Vorgehen entscheiden?

Auslassung: `not_decided`

### W05

Szenario:

> Ihr habt zusätzliches Budget zur Verfügung. Eure laufenden Verpflichtungen sind abgesichert. Ihr könnt das Geld entweder als zusätzliche Reserve behalten oder einen klar begrenzten Markttest damit durchführen.

Frage:

> Wie würdest du das zusätzliche Budget eher einsetzen?

Auslassung: `not_decided`

### W06

Szenario:

> Für ein gemeinsam erreichtes Ergebnis steht ein zusätzlicher Bonus zur Verfügung. Die vereinbarten Grundregeln wurden von allen erfüllt, die dokumentierten Beiträge zum konkreten Ergebnis waren aber unterschiedlich.

Frage:

> Wie würdest du den zusätzlichen Bonus eher verteilen?

Auslassung: `not_decided`

---

## L — persönliche Grenzen

### L01

> Gibt es Vorgehensweisen oder Entscheidungen, die für dich im Unternehmen grundsätzlich nicht infrage kommen?

Antwortform: `free_text_repeatable`

Auslassung:
- `confidential_first`
- `prefer_not_to_say`

UI:
- möchte ich zunächst nur für mich festhalten
- möchte ich nicht angeben

### L02

> Woran würdest du in einer konkreten Situation erkennen, dass diese Grenze erreicht oder überschritten ist?

Erscheint nur, wenn L01 beantwortet wurde.

Antwortform: `free_text_per_entry`

Auslassung:
- `not_decided`
- `confidential_first`

UI:
- habe ich noch nicht festgelegt
- möchte ich zunächst vertraulich klären

### L03

> Was sollte passieren, wenn ihr euch nicht einig seid, ob eine für dich wichtige Grenze in einer konkreten Situation betroffen ist?

Erscheint nur, wenn L01 beantwortet wurde.

Antworten unverändert:
1. zunächst aussetzen und gemeinsam klären
2. externe fachliche/rechtliche Einschätzung
3. neutrale Person hinzuziehen
4. persönliches Veto
5. abhängig von Art der Grenze
6. andere Regel

Wichtig:
- nominal
- kein Verfahren ist universell besser

Auslassung: `not_decided`

---

# 6. Offener Review-Punkt: vier Verhaltensitems auf `proposal`

Dieser Punkt ist noch **nicht itemgenau freigegeben**, weil in der vorliegenden Vorlage nicht eindeutig benannt ist, welche vier IDs damit gemeint sind.

Daher:

```ts
reviewStatus = "proposal"
```

für die betreffenden vier Items beibehalten, bis die IDs eindeutig vorliegen.

Nicht automatisch auf `approved` setzen.

Grundregel für die spätere Entscheidung:

## Founder-Arbeitsprofil

Möglichst erfassen:
- typisches tatsächliches Verhalten
- typisches Erleben
- typische persönliche Arbeitsweise

Beispiele:

```text
Wie häufig machst du ...
Wie stark beziehst du ...
Wann sprichst du ...
Wie wohl fühlst du dich ...
```

## Venture Alignment

Möglichst erfassen:
- gewünschte Regeln
- Erwartungen
- Zusagen
- Ressourcen
- konkrete Grenzen

Beispiele:

```text
Wie selbstständig möchtest du ...
Wie viele Stunden kannst du zusagen ...
Welche Regel soll gelten ...
```

---

# 7. Implementierungsreihenfolge

## Schritt 1

Globale Sprachregel umstellen:

```text
Du / Dein / Dich
→
du / dein / dich
```

Nur in Nutzertexten. Eigennamen / Überschriften nicht blind transformieren.

## Schritt 2

Sprachlich überarbeitete Texte aus diesem Dokument übernehmen.

Keine Antwortreihenfolge verändern.

## Schritt 3

Missing-Reason-Modell einführen bzw. prüfen.

```ts
cannot_assess
not_decided
not_clarified
prefer_not_to_say
confidential_first
```

## Schritt 4

S01 Legacy einfrieren.

Neue Items anlegen:

```text
S01a
S01b
S01c
S01d
S01e
S01f
S01_top
```

## Schritt 5

Venture-Direction-Grafik auf S01a–S01f aufbauen.

Nicht aus der alten Mehrfachauswahl berechnen.

## Schritt 6

W01–W06 gemeinsame Instruktion + echte Fragesätze einbauen.

## Schritt 7

Vier `proposal`-Items separat reviewen, sobald die IDs eindeutig sind.

---

# 8. Nicht tun

Nicht:

- alte S01-Antworten stillschweigend in neue 1–5-Werte konvertieren
- `cannot_assess` als höchste Skalenstufe speichern
- `confidential_first` mit `prefer_not_to_say` zusammenwerfen
- nominale Items mitteln
- K/T/D künstlich zu linearen Scores machen
- aus privaten oder ausgelassenen Antworten in Reports etwas ableiten
- durch Sprachänderungen das gemessene Konstrukt verschieben

---

# 9. Kurzfassung für die Implementierung

```text
1. du/dein kleinschreiben.
2. Fragetexte gemäß diesem Dokument ersetzen.
3. Antwortreihenfolge und Antwortanzahl bestehender Items unverändert lassen.
4. Missing Reasons getrennt speichern.
5. confidential_first als eigenen Missing Reason führen.
6. cannot_assess nur als separate Auslassungsoption darstellen.
7. S01 nicht nur umformulieren, sondern als S01a–S01f + S01_top neu aufbauen.
8. Alte S01 als Legacy belassen.
9. W02–W06 um explizite Fragesätze ergänzen.
10. Vier unklare Verhaltensitems weiter auf proposal lassen, bis ihre IDs eindeutig geprüft sind.
```
