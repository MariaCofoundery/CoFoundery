# ALIGN UX / QA Spec — Teil 2 „Was du aufbauen willst“ v0.1

Stand: 30.09.2026  
Zweck: Umsetzungsgrundlage für VS Code  
Scope: Venture-Alignment / bisher „Euer Vorhaben“  
Out of scope: Discovery / „Wonach du suchst“ (separate Runde)

---

## 1. Grundentscheidung

Der zweite Bereich heißt user-facing:

# Was du aufbauen willst

Navigation:

```text
Wie du arbeitest | Was du aufbauen willst | Wonach du suchst
```

Warum:
- funktioniert für Solo-Founder
- funktioniert für bestehende Teams
- funktioniert vor einer Co-Founder-Suche
- setzt kein bestehendes „Wir“ voraus
- klingt weniger verwaltungsmäßig als „Das Vorhaben“

Interne Modul-/Item-Namen bleiben unverändert.

---

## 2. UX-Prinzip für diesen Bereich

Die fachlichen Inhalte bleiben weitgehend erhalten.

Diese Runde optimiert vor allem:
- Sprache
- Gruppierung
- Antwortlabels
- Alltagstauglichkeit
- Verständlichkeit der Skalen
- Übergänge
- Rendering / Komponentenfehler

Wichtig:

> Wenn ein Konstrukt über „Selbstständigkeit“, „Freiheit“ oder ähnliche abstrakte Begriffe erfasst wird, sollen die Antwortoptionen möglichst zeigen, wie das im Alltag aussieht.

Also nicht nur:

```text
sehr wenig selbstständig
eher wenig
teils/teils
eher selbstständig
sehr selbstständig
```

sondern, wo sinnvoll, verhaltensnahe Anker wie:

```text
fast alles vorher abstimmen
viel abstimmen
teils selbst / teils gemeinsam
meist selbst entscheiden, bei wichtigen Punkten Rücksprache
innerhalb des vereinbarten Rahmens selbst entscheiden
```

Dadurch bleibt dieselbe geordnete Logik erhalten, aber Nutzer:innen müssen „selbstständig“ nicht selbst übersetzen.

---

## 3. Startseite / Intro

### Was du aufbauen willst

> Jetzt geht es um dein konkretes Vorhaben.
>
> Was möchtest du damit erreichen? Was kannst du realistisch einbringen? Und welche Erwartungen, Regeln oder Grenzen sind dir dabei wichtig?
>
> Manche Dinge sind vielleicht schon ziemlich klar, andere noch nicht. Beides ist völlig okay. Gerade offene Punkte können später helfen, wichtige Gespräche sichtbar zu machen.

Wenn noch kein Name vorhanden ist:

### Wie heißt dein Vorhaben?

Subline:

> Ein Arbeitstitel reicht völlig.

Placeholder:

```text
z. B. Made2Found oder Projekt X
```

Buttons:

```text
Weiter
Später
```

Nicht mehr user-facing anzeigen:

```text
42 Fragen zu Zielen, Zusagen, Regeln und Grenzen.
Gilt fuer EIN Vorhaben und einen Zeitraum.
Nicht uebertragbar ...
```

---

## 4. Abschnitt 1 — Wie möchtest du zusammenarbeiten?

Interne Items: U01, U03, U04, U05, K01, K03, K04

Übergang:

> Wenn Verantwortlichkeiten klar verteilt sind: Wie viel Spielraum möchtest du in deinem Bereich haben?

### U01 — Vorgehen im eigenen Bereich

Frage:

> Wenn dein Verantwortungsbereich klar ist: Wie möchtest du im Alltag entscheiden, wie du ein Ziel erreichst?

Neue Antwortlabels:

1. ich möchte das Vorgehen grundsätzlich gemeinsam abstimmen
2. ich möchte die meisten Schritte vorher abstimmen
3. teils selbst entscheiden, teils abstimmen
4. meist selbst entscheiden und bei wichtigen Punkten Rücksprache halten
5. in meinem Bereich selbst entscheiden und nur bei größeren Auswirkungen abstimmen

Missing Reason separat.

### U03 — Ausgaben innerhalb eines vereinbarten Budgets

Frage:

> Für deinen Bereich gibt es ein vereinbartes Budget. Wie möchtest du innerhalb dieses Rahmens über Ausgaben entscheiden?

Neue Antwortlabels:

1. Ausgaben grundsätzlich vorher gemeinsam abstimmen
2. die meisten Ausgaben vorher abstimmen
3. kleinere Ausgaben selbst entscheiden, größere gemeinsam
4. meist selbst entscheiden und nur größere oder ungewöhnliche Ausgaben abstimmen
5. innerhalb des vereinbarten Budgets selbst entscheiden

Missing Reason separat.

Warum diese Fassung:

„Wie selbstständig möchtest du entscheiden?“ ist abstrakt. Diese Skala zeigt konkret:
- wie oft abgestimmt wird
- wann Rücksprache nötig ist
- wo der vereinbarte Rahmen greift

Die Reihenfolge bleibt von wenig zu viel eigenem Entscheidungsspielraum erhalten.

### U04 — mehrere sinnvolle Wege

Frage:

> Wenn mehrere sinnvolle Wege möglich sind: Wie möchtest du entscheiden, welchen du gehst?

Neue Antwortlabels:

1. gemeinsam entscheiden, welchen Weg wir nehmen
2. vorher Rücksprache halten und den Weg meist gemeinsam festlegen
3. je nach Situation gemeinsam oder selbst entscheiden
4. Input einholen und dann meist selbst entscheiden
5. im eigenen Verantwortungsbereich selbst entscheiden

Missing Reason separat.

### U05 — Plan anpassen

Frage:

> Wenn sich während der Arbeit etwas verändert: Wie möchtest du mit Anpassungen an einem vereinbarten Plan umgehen?

Neue Antwortlabels:

1. Änderungen am vereinbarten Plan gemeinsam entscheiden
2. die meisten Änderungen vorher abstimmen
3. kleinere Änderungen selbst, größere gemeinsam entscheiden
4. meist selbst anpassen und bei größeren Änderungen Rücksprache halten
5. im eigenen Bereich selbst anpassen und andere informieren, wenn es für sie relevant ist

Missing Reason separat.

Hinweis:

Hier bewusst nicht „Wie frei möchtest du …?“ verwenden.

---

## 5. Abschnitt 1b — Wie viel Einblick möchtest du gegenseitig haben?

Interne Items: K01, K03, K04

Übergang:

> Gute Zusammenarbeit heißt nicht für alle dasselbe. Manche möchten früh eingebunden sein, andere lieber dann, wenn etwas konkreter wird.

### K01

Frage:

> Wann zeigst du anderen Foundern normalerweise einen Zwischenstand aus deinem Bereich?

Antwortoptionen können inhaltlich bleiben:

1. schon bei ersten Ideen oder Skizzen
2. wenn die Richtung klarer wird, aber noch vieles offen ist
3. bei einem ersten brauchbaren Stand
4. eher wenn das Ergebnis weitgehend fertig ist
5. stark situationsabhängig

### K03

Frage:

> In einem anderen Bereich zeichnet sich eine wichtige Änderung ab. Wann möchtest du davon erfahren?

Antwortoptionen können bleiben.

### K04

Frage:

> Welche Art von Überblick über andere Bereiche wäre für dich im Alltag am hilfreichsten?

Antwortoptionen:

1. regelmäßiger kurzer Überblick
2. aktive Information bei größeren Änderungen
3. zugänglicher Arbeitsstand bei Bedarf
4. ich frage gezielt nach
5. andere Regel

TODO:
Prüfen, ob `andere Regel` derzeit ein Textfeld öffnet. Nur dann beibehalten, wenn Freitext hier fachlich wirklich gewollt und explizit spezifiziert ist.

---

## 6. Abschnitt 2 — Was soll daraus werden?

Interne Items: S01a–S01f, S01_top, S02, S03, S04, S06

Übergang:

> Menschen bauen Unternehmen aus ganz unterschiedlichen Gründen auf. Was ist dir bei **diesem Vorhaben** besonders wichtig?

### S01a–S01f — Ziele

Gemeinsame Frage:

> Wie wichtig sind dir diese Ziele in den nächsten drei Jahren?

Ziele:

1. Ein wirtschaftlich tragfähiges Unternehmen aufbauen, das verlässlich Einkommen erwirtschaften kann.
2. Deutlich wachsen und einen größeren Markt erreichen.
3. Einen konkreten gesellschaftlichen oder ökologischen Beitrag leisten.
4. Ein Unternehmen aufbauen, das später teilweise oder vollständig verkauft werden könnte.
5. Eine fachlich oder technologisch anspruchsvolle Idee verwirklichen.
6. Mehr unternehmerische und persönliche Unabhängigkeit erreichen.

Gemeinsame Skala:

```text
gar nicht wichtig
eher wenig wichtig
mittel
ziemlich wichtig
sehr wichtig
```

Missing Reason:

```text
habe ich noch nicht entschieden
```

UI:
Als gemeinsamer Block darstellen, nicht als sechs große unabhängige Fragekarten.

### S01_top

Frage:

> Und welche ein oder zwei davon stehen für dich gerade besonders weit oben?

Maximal zwei auswählen.

### S02 — Beteiligung

Frage:

> Wie denkst du heute über deine Beteiligung am Unternehmen?

Antworten inhaltlich beibehalten.

### S03 — externes Kapital

Frage:

> Wie offen bist du dafür, externe Investor:innen aufzunehmen und dafür Unternehmensanteile abzugeben?

Antworten inhaltlich beibehalten.

### S04 — nächste zwölf Monate

Frage:

> Was sollte dieses Vorhaben aus deiner Sicht in den nächsten zwölf Monaten konkret erreichen?

Hinweis:

> Auch ein klares Lernergebnis kann ein Ziel sein – zum Beispiel eine wichtige Annahme zu prüfen oder bewusst zu entscheiden, einen Ansatz nicht weiterzuverfolgen.

### S06 — eigene Rolle

Frage:

> Wenn du ungefähr drei Jahre vorausblickst: Welche Rolle möchtest du dann am liebsten im Unternehmen haben?

Antworten inhaltlich beibehalten.

---

## 7. Abschnitt 3 — Was kannst du wirklich einbringen?

Interne Items: R01, R02, R03, R04, R06

Übergang:

> Jetzt wird es konkreter.
>
> Hier geht es nicht darum, was theoretisch möglich wäre, sondern darum, was du in der nächsten Zeit **realistisch zusagen kannst**. Unterschiedliche Möglichkeiten sind kein Problem – wichtig ist, dass sie sichtbar werden.

### R01

> Wie viele Stunden pro Woche kannst du in den nächsten zwölf Wochen realistisch und verlässlich für dieses Vorhaben einplanen?

### R02

> Wie viele Stunden pro Woche erwartest du in den nächsten zwölf Wochen ungefähr von [Name]?

Gerichtete Logik beibehalten; A→B und B→A nicht mitteln.

### R03

> Welche regelmäßigen Zeiten könntest du in den nächsten zwölf Wochen für gemeinsame Arbeit freihalten?

Hinweis:

> Private Gründe für nicht verfügbare Zeiten musst du nicht angeben.

### R04

> Ab wann müsstest du voraussichtlich regelmäßig Geld aus dem Vorhaben bekommen, damit du deinen Lebensunterhalt damit abdecken kannst?

### R06

> Was müsste passieren, damit du dir vorstellen könntest, das Vorhaben zu deiner beruflichen Haupttätigkeit zu machen?

---

## 8. Abschnitt 4 — Wenn etwas nicht nach Plan läuft

Interne Items: R09, R10, R12

Übergang:

> Nicht jedes Vorhaben entwickelt sich so, wie man es am Anfang erwartet. Was wäre dir dann wichtig?

### R09

> Angenommen, ein wichtiger vereinbarter Meilenstein wird nicht erreicht. Wie möchtest du dann über deine weitere Mitarbeit entscheiden?

### R10

> Wie wichtig ist es dir persönlich, dieses konkrete Vorhaben weiterzuführen?

Kein Commitment Score.

### R12

> Wann wäre ein guter Zeitpunkt, diese Zusagen und Erwartungen gemeinsam wieder anzuschauen?

Antworten:
- an einem bestimmten Datum
- nach dem nächsten Meilenstein
- habe ich noch nicht festgelegt

---

## 9. Abschnitt 5 — Wie wollt ihr Entscheidungen treffen?

Interne Items: G01, G04, G05

Übergang:

> Unterschiede gehören dazu. Spannend wird es dann, wenn klar ist, **wie ihr trotzdem zu einer Entscheidung kommt.**

### G01

> Ihr seid euch bei einer wichtigen Entscheidung uneinig. Sie liegt klar im Verantwortungsbereich einer Person und betrifft die anderen Bereiche nicht wesentlich.
>
> Welche Regel sollte dann gelten?

### G04

> Ihr kommt bis zum vereinbarten Zeitpunkt bei einer wichtigen Entscheidung zu keiner Einigung. Welche Wege sollten dann grundsätzlich möglich sein?

### G05

> Bei welchen Entscheidungen sollten aus deiner Sicht immer alle Founder zustimmen?

---

## 10. Abschnitt 6 — Geld, Risiko & Absicherung

Interne Items: B01, B04, B05

Übergang:

> Geld und persönliches Risiko können sehr unterschiedliche Grenzen haben. Hier geht es nicht darum, was „mutig“ oder „richtig“ ist – sondern darum, was für dich realistisch passt.

### B01

> Wie viel eigenes Geld würdest du aktuell höchstens zusätzlich investieren, wenn du einkalkulierst, dass du den Betrag vollständig verlieren könntest?

Keine Ableitung über Mut, Vermögen, Founder-Fähigkeit oder Commitment.

### B04

> Welche finanzielle Reserve sollte für dich mindestens bestehen bleiben, bevor zusätzliches Geld in das Vorhaben fließt?

KRITISCHER UI-BUG:

Aktuell wird hier offenbar dieselbe Komponente wie bei `Stunden pro Woche` gerendert.

Erwartet:

```text
Betrag in EUR
```

Nicht:

```text
Stunden pro Woche
Falls der Umfang schwankt ...
```

### B05

> Ein Schritt würde einen spürbaren Teil eurer Zeit oder eures Budgets beanspruchen. Was wäre dir wichtig, bevor ihr loslegt?

Antworten inhaltlich beibehalten.

Keine Anzahl der ausgewählten Absicherungen als Risikoscore interpretieren.

---

## 11. Abschnitt 7 — Wenn zwei Dinge gleichzeitig wichtig sind

Interne Items: W01–W06

Übergang:

> Manchmal sind zwei Dinge gleichzeitig sinnvoll – aber sie ziehen in unterschiedliche Richtungen.
>
> In den nächsten Situationen geht es nicht um richtig oder falsch. Uns interessiert, **was für dich stärker wiegt**.

Gemeinsames UX-Muster:

1. kurzes Szenario
2. zwei getrennte Wichtigkeitsbewertungen
3. anschließende Wegwahl

User-facing:

```text
[Szenario]

Wie wichtig sind dir dabei diese beiden Aspekte?

Aspekt A
○ gar nicht wichtig ... ○ sehr wichtig

Aspekt B
○ gar nicht wichtig ... ○ sehr wichtig

Wenn du dich in dieser Situation entscheiden müsstest:
Welchen Weg würdest du zuerst wählen?

○ A
○ B
○ etwas anderes
○ ich kann das noch nicht entscheiden
```

Wichtig:
Die zwei Wichtigkeitsratings nicht automatisch zu einer „richtigen“ Entscheidung verrechnen.

### W01
Szenario:

> Ihr habt eine neue Finanzplanung erstellt, aber einige Zahlen sind noch unsicher. Akut sind alle zugesagten Zahlungen abgesichert.

Aspekte:
- früh wissen, wie sich die finanzielle Situation entwickeln könnte
- Informationen möglichst gut prüfen, bevor sie geteilt werden

### W02
Aspekte:
- Kontinuität in einer bewährten Zusammenarbeit
- Rolle und aktuelle Fähigkeiten passen gut zueinander

### W03
Aspekte:
- direkte gesellschaftliche / ökologische Wirkung
- zusätzlicher finanzieller Spielraum

### W04
Aspekte:
- vor dem Start gemeinsames Verständnis herstellen
- Änderung zeitnah umsetzen und anschließend überprüfen

### W05
Aspekte:
- zusätzlicher finanzieller Puffer
- früher Erkenntnisgewinn über den Markt

### W06
Aspekte:
- alle erhalten einen gleichen Anteil am gemeinsamen Erfolg
- unterschiedliche Beiträge werden bei der Verteilung berücksichtigt

---

## 12. Abschnitt 8 — Was für dich nicht infrage kommt

Interne Items: L01, ggf. L02/L03

Übergang:

> Zum Schluss geht es um persönliche Grenzen. Nicht alles muss verhandelbar sein.

### L01

> Gibt es Entscheidungen oder Vorgehensweisen, die für dich grundsätzlich nicht infrage kommen?

Privacy-Logik beibehalten.

### OFFEN: L02 / L03

In der aktuellen gerenderten Fassung endet der Bereich nach L01.

Prüfen:
- Sind L02 und L03 laut aktueller Master-/Registraturfassung weiterhin vorgesehen?
- Wenn ja: Renderingfehler beheben.
- Wenn nein: Quelle / Registratur dokumentieren.

---

## 13. Abschluss

Nicht:

```text
Founder-Profil erstellen
```

Neue Copy:

### Geschafft.

> Schau noch einmal kurz über deine Angaben. Wenn alles für dich passt, kannst du diesen Teil abschließen.

Button bevorzugt:

```text
Auswertung erstellen
```

Alternative, falls noch keine Auswertung direkt folgt:

```text
Diesen Teil abschließen
```

Subline:

> Mit dem Absenden schließt du diesen Durchgang ab.

---

## 14. Fortschrittslogik

Nicht gleichzeitig unterschiedliche Zahlen wie:

```text
42 Fragen
0 von 39 beantwortet
```

anzeigen.

Empfehlung:
- Einzelfragenzahl nicht prominent anzeigen
- stattdessen Abschnittsfortschritt / Steps
- z. B. `Schritt 2 von 8`

---

## 15. Save / Submit

Die robuste Save-/Submit-Logik aus Teil 1 auch für Teil 2 verwenden.

Erforderlich:

```text
saving
saved
error
retry
```

Keine Abgabe bei ungespeicherten lokalen Änderungen.

Kein endloses:

```text
Wird abgegeben ...
```

---

## 16. Textfelder — allgemeine Regel

Feste Auswahloptionen öffnen nur dann ein Textfeld, wenn dies für das Item ausdrücklich spezifiziert ist.

Bei `anders`, `andere Regel`, `weitere`, `andere Bedingung` jeweils explizit prüfen:

```text
Soll Freitext wirklich Bestandteil des Items sein?
```

Wenn ja:
- Registry / Spec markieren
- optional vs. required festlegen

Wenn nein:
- kein Textfeld rendern

---

## 17. Discovery nicht anfassen

„Wonach du suchst“ ist nicht Teil dieses Dokuments.

Ähnlichkeit, gewünschte Differenz, Wichtigkeitsgewicht und mathematische Matchpunkte werden separat spezifiziert.

---

## 18. Akzeptanzkriterien

```text
☐ Navigation zeigt „Was du aufbauen willst“
☐ neue Start-Copy eingebaut
☐ alte technische Einleitung entfernt
☐ U01/U03/U04/U05 haben verhaltensnahe Antwortlabels
☐ U-Antworten bleiben geordnet von wenig zu viel Entscheidungsspielraum
☐ K-Bereich hat neue UX-Übergänge
☐ S01a–f als gemeinsamer Zielblock dargestellt
☐ Ressourcenbereich hat verständliche Einleitung
☐ R09/R10/R12 als eigener UX-Abschnitt
☐ G-Bereich user-facing umbenannt
☐ B04 rendert EUR/Betrag statt Stunden-Komponente
☐ W01–W06 haben einheitliches 3-Schritt-Layout
☐ L02/L03 Status geklärt
☐ Abschlussbutton ist nicht „Founder-Profil erstellen“
☐ keine widersprüchlichen Fragezahlen in der UI
☐ Save-/Submit-Logik wie in Teil 1 robust
☐ keine unerwarteten Inline-Textfelder
☐ kompletter Browser-Durchgang erfolgreich
```

---

## 19. Hinweis zu Teil 1

Die von VS Code bereits umgesetzte Vererbung des gemeinsamen X-Prompts für Screen 7 ist sinnvoll:

```text
groupPromptInherited = true
```

X03 und X04 bleiben Situationen unter derselben Frage:

> Wie wohl fühlst du dich jeweils damit?

Daran in dieser Runde nichts ändern.
