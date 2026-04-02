# Scoring- und Response-Pattern-System des Founder-Compatibility-Modells

Stand: 31.03.2026

Dieses Dokument beschreibt eine **einfach interpretierbare Auswertungslogik** für das bereinigte Founder-Compatibility-Instrument mit:

- `24 CORE`-Items für das eigentliche Matching
- `12 SUPPORT`-Items für narrative Vertiefung
- einem **separaten Response-Pattern-Layer**, der keine Scores verändert, sondern nur Interpretationshinweise liefert

Leitprinzipien:

- Scoring soll **verständlich, transparent und auditierbar** bleiben.
- Pattern-Analyse soll **nicht diagnostisch** wirken.
- Soft Flags dürfen **nie** direkt in Passungswerte oder Risikowerte eingreifen.

---

## 1. Grundstruktur

### 1.1 Datengrundlage

Für jede Person werden nur die `24 CORE`-Items gescored:

- 6 Dimensionen
- pro Dimension 4 Items
- alle Itemwerte auf einer einheitlichen `0–100`-Skala

Die `12 SUPPORT`-Items werden getrennt gespeichert und ausschließlich für:

- narrative Anreicherung
- Spannungs- oder Gesprächshinweise
- exemplarische Reporttexte

verwendet.

### 1.2 Polrichtung

Alle CORE-Items müssen so kodiert sein, dass höhere Werte konsistent auf denselben Pol der jeweiligen Dimension zeigen.

Beispiel:

- `0` = stärker linker Pol
- `100` = stärker rechter Pol

Dann gilt für die Dimensionen:

- Unternehmenslogik: `0 = aufbauorientiert`, `100 = opportunitätsorientiert`
- Entscheidungslogik: `0 = analytisch`, `100 = intuitiv`
- Arbeitsstruktur & Zusammenarbeit: `0 = autonom`, `100 = abgestimmt`
- Commitment: `0 = klar begrenzt`, `100 = hoch priorisiert`
- Risikoorientierung: `0 = sicherheitsorientiert`, `100 = chancenorientiert`
- Konfliktstil: `0 = reflektierend`, `100 = direkt`

---

## 2. CORE SCORING

## 2.1 Personenscore pro Dimension

Für jede Person und jede Dimension:

`dimension_score = Mittelwert der 4 CORE-Items der Dimension`

Wenn alle 4 Items vorliegen:

`score_person_dimension = (item1 + item2 + item3 + item4) / 4`

Wenn 1 Item fehlt:

- Mittelwert der verbleibenden 3 Items
- Dimension bleibt auswertbar

Wenn 2 oder mehr Items fehlen:

- Dimension wird als `insufficient_data` markiert
- kein stabiler Dimensionsscore

## 2.2 Vergleich zweier Personen

Für jede Dimension:

- `scoreA = Dimensionsscore Person A`
- `scoreB = Dimensionsscore Person B`
- `distance = abs(scoreA - scoreB)`
- `alignment = 100 - distance`

Interpretation:

- hohe `alignment` = ähnliche Lage auf derselben Achse
- hohe `distance` = deutliche Differenz

## 2.3 TeamFit und tensionScore

Um Score und Interpretationsrichtung lesbar zu halten:

- `teamFit = alignment`
- `tensionScore = distance`

Das ist bewusst einfach.

Beispiel:

- `scoreA = 28`
- `scoreB = 40`
- `distance = 12`
- `alignment = 88`
- `teamFit = 88`
- `tensionScore = 12`

## 2.4 Dimensionskategorien

### Alignment-Kategorie

- `85–100` → `sehr hoch`
- `70–84` → `hoch`
- `50–69` → `gemischt`
- `0–49` → `niedrig`

### Tension-Kategorie

- `0–15` → `gering`
- `16–30` → `moderat`
- `31–50` → `erhöht`
- `51–100` → `hoch`

## 2.5 Gesamtprofil

Da alle 6 Dimensionen gleich wichtig, aber unterschiedlich interpretierbar sind, bleibt die Aggregation bewusst schlicht:

`overallFit = Mittelwert aller gültigen teamFit-Werte`

`overallTension = Mittelwert aller gültigen tensionScore-Werte`

Voraussetzung:

- mindestens 4 von 6 Dimensionen sind auswertbar

Optional kann zusätzlich ein **Dimensionsprofil** stärker betont werden als ein einziger Gesamtscore. Das ist inhaltlich oft sinnvoller.

## 2.6 Gewichtung

Empfehlung für Version 1:

- **keine differenzielle Gewichtung**
- alle 6 Dimensionen gehen gleichgewichtet ein

Begründung:

- maximal transparent
- methodisch defensiv
- erst nach empirischer Validierung sollten unterschiedliche Gewichte geprüft werden

---

## 3. SUPPORT ITEMS

Die 12 SUPPORT-Items werden **nicht** in Scores eingerechnet.

Sie dienen drei Zwecken:

### 3.1 Narrative Enrichment

Sie machen abstrakte Unterschiede konkreter.

Beispiel:

- Unternehmenslogik-Score zeigt Differenz
- Support-Szenario zeigt, dass diese Differenz besonders bei Pivot- oder Investorensituationen relevant wird

### 3.2 Tension Hints

Support-Items können Hinweise liefern wie:

- “Diese Differenz könnte besonders in Wachstumsphasen relevant werden”
- “Im Alltag zeigt sich die Spannung vermutlich eher in Mitsicht und Übergaben”

### 3.3 Report Explanations

Support-Items liefern Material für:

- konkrete Reportbeispiele
- Gesprächsfragen im Workbook
- differenzierte Textbausteine

Wichtig:

- SUPPORT-Items dürfen **Interpretation vertiefen**
- sie dürfen **niemals einen schwachen CORE-Score kompensieren**

---

## 4. RESPONSE-PATTERN-ANALYSE

Die Pattern-Analyse dient nicht dazu, Personen zu “prüfen”, sondern um besonders glatte, extreme oder widersprüchliche Antwortmuster vorsichtig einzuordnen.

Diese Kennwerte verändern **keinen Score**.

## 4.1 Consistency Score

### Ziel

Prüfen, wie konsistent eine Person **innerhalb einer Dimension** auf die 4 CORE-Items antwortet.

### Logik

Für jede Dimension:

- berechne die Standardabweichung der 4 Itemwerte

Dann:

`consistency_dimension = 100 - (SD / 50 * 100)`

Begrenzung:

- Minimum `0`
- Maximum `100`

Interpretation:

- hoher Wert = Antworten innerhalb der Dimension liegen eng beieinander
- niedriger Wert = starke Streuung innerhalb derselben Dimension

### Empfehlung

Zusätzlich:

`consistency_overall = Mittelwert aller consistency_dimension-Werte`

### Bedeutung

- sehr hohe Konsistenz kann auf klares Profil hindeuten
- sehr niedrige Konsistenz kann auf innere Differenzierung, Missverständnisse oder situative Antwortlogik hindeuten

## 4.2 Extremeness Score

### Ziel

Erfassen, wie stark eine Person zu Randwerten tendiert.

### Logik

Anteil der Antworten auf CORE-Items, die bei:

- `0–10`
- oder `90–100`

liegen.

Formel:

`extremeness = (Anzahl extremer Antworten / Anzahl gültiger CORE-Antworten) * 100`

### Interpretation

- niedrig: ausgewogenes Antwortmuster
- hoch: starke Polfestlegung

Wichtig:

- hohe Extremeness ist **kein Problem an sich**
- sie ist nur interpretativ relevant

## 4.3 Flatness Indicator

### Ziel

Erkennen, ob das Profil über alle Dimensionen hinweg zu wenig Differenzierung zeigt.

### Logik

Berechne die 6 Dimensionsscores einer Person.

Dann:

- `dimension_range = max(score) - min(score)`

Flatness-Regel:

- `range <= 12` → stark flach
- `range 13–20` → eher flach
- `range > 20` → ausreichend differenziert

### Interpretation

Ein sehr flaches Profil kann heißen:

- Person antwortet sehr generell
- feine Unterschiede zwischen Arbeitslogiken werden wenig genutzt
- oder das Profil ist tatsächlich relativ homogen

## 4.4 Contradiction Detection

### Ziel

Logisch spannungsreiche Antwortkombinationen erkennen.

### Prinzip

Nicht jede Streuung ist Widerspruch. Gezählt werden nur **vorab definierte Paarungen**, die theoretisch schwer zusammenpassen.

### Empfohlene Widerspruchsregeln

#### Unternehmenslogik

- stark aufbauorientierte Grunditems + stark opportunitätsnahe Support-Szenarien

#### Entscheidungslogik

- sehr hohe Datenorientierung + sehr starke Präferenz für sofortige Festlegung ohne Klärung

#### Arbeitsstruktur

- hohe Präferenz für frühe Mitsicht + hohe Toleranz für späte Information

#### Commitment

- sehr hohe Priorisierung + sehr hohe Akzeptanz starker Parallelverpflichtungen

#### Risikoorientierung

- sehr niedrige Downside-Toleranz + sehr hohe Bereitschaft für stark belastende Wachstumssprünge

#### Konfliktstil

- sehr frühe Problemanzeige + sehr starke Tendenz, Spannung möglichst lange nicht anzusprechen

### Ausgabelogik

Pro Person:

- `0` Widersprüche → kein Hinweis
- `1` Widerspruch → leichter Hinweis
- `2+` Widersprüche → deutlicher Hinweis auf gemischtes Antwortmuster

Wichtig:

- Contradiction Detection ist **regelbasiert**
- sie ist kein Beweis für Ungültigkeit

---

## 5. SOFT FLAGS

Flags dienen nur der Interpretation.

Sie dürfen:

- keine Scores anpassen
- keine Person diskreditieren
- nicht als “Qualitätskontrolle” nach außen formuliert werden

## 5.1 Flag: Very Smooth Profile

### Regel

- `consistency_overall >= 85`
- und `flatness range <= 12`

### Bedeutung

Das Profil wirkt über viele Bereiche hinweg sehr einheitlich und wenig differenziert.

### Report-Wording

`Eure Antworten zeichnen in vielen Bereichen ein sehr geschlossenes Profil. Es kann hilfreich sein, in einzelnen Themen noch genauer zu prüfen, wo feine Unterschiede im Alltag sichtbar werden könnten.`

## 5.2 Flag: Low Differentiation

### Regel

- mindestens 4 von 6 Dimensionsscores liegen in einem Korridor von `±8` Punkten um den persönlichen Mittelwert

### Bedeutung

Die Person hat nur geringe Spreizung zwischen den Dimensionen gezeigt.

### Report-Wording

`In euren Antworten zeigen sich bisher eher wenige starke Ausschläge zwischen den Themenfeldern. Für das Gespräch kann es hilfreich sein, Unterschiede nicht nur global, sondern pro Alltagssituation anzuschauen.`

## 5.3 Flag: High Extremeness

### Regel

- `extremeness >= 45`

### Bedeutung

Die Person hat viele Positionen sehr klar und randnah beantwortet.

### Report-Wording

`Einige Antworten sind sehr klar positioniert. Das kann auf eine deutliche innere Orientierung hinweisen und lohnt sich besonders dort, wo ihr als Team unterschiedliche Arbeitslogiken zusammenbringen müsst.`

## 5.4 Flag: Possible Internal Tension

### Regel

- `contradictions >= 2`

### Bedeutung

Das Antwortmuster zeigt intern gemischte Signale.

### Report-Wording

`In einzelnen Bereichen zeigt euer Antwortmuster unterschiedliche Tendenzen. Das ist nicht ungewöhnlich, kann aber ein Hinweis darauf sein, dass bestimmte Themen stark vom konkreten Kontext abhängen.`

## 5.5 Flag: Uneven Confidence Pattern

### Regel

- mindestens 2 Dimensionen mit sehr hoher Konsistenz (`>= 85`)
- und mindestens 2 Dimensionen mit niedriger Konsistenz (`<= 55`)

### Bedeutung

Einige Themen sind sehr klar, andere noch wenig stabil oder stärker situationsabhängig.

### Report-Wording

`Bei manchen Themen wirkt euer Profil bereits sehr klar, bei anderen noch deutlich offener. Genau diese Unterschiede können gute Ansatzpunkte für gezielte Klärung sein.`

---

## 6. TEAMBEZOGENE PATTERN-HINWEISE

Zusätzlich zu personbezogenen Patterns können teambezogene Hinweise berechnet werden.

## 6.1 Smooth Alignment Flag

### Regel

- `overallFit >= 85`
- aber in mindestens 2 Support-Szenarien deutliche Differenzen (`distance >= 34`)

### Bedeutung

Das Kernprofil wirkt sehr ähnlich, aber in konkreten Situationen könnten trotzdem relevante Unterschiede auftauchen.

### Report-Wording

`Euer Kernprofil wirkt in vielen Bereichen ähnlich. In einzelnen konkreten Situationen zeigen sich aber Unterschiede, die für eure Zusammenarbeit trotzdem wichtig werden können.`

## 6.2 Polarized Difference Flag

### Regel

- mindestens 2 Dimensionen mit `distance >= 40`
- und zugleich mindestens 2 Dimensionen mit `distance <= 10`

### Bedeutung

Das Team ist nicht einfach “ähnlich” oder “verschieden”, sondern gemischt: in manchen Themen sehr nah, in anderen deutlich unterschiedlich.

### Report-Wording

`Euer Profil ist nicht gleichmäßig ähnlich oder unterschiedlich. Es gibt Felder mit sehr hoher Nähe und andere, in denen ihr deutlich verschiedene Arbeitslogiken mitbringt.`

---

## 7. REPORT-INTEGRATION

## 7.1 Trennung der Ebenen

Empfohlene Reihenfolge im Report:

1. `CORE Matching`
   - Dimensionsscores
   - teamFit
   - tensionScore

2. `Interpretation`
   - kurze Erläuterung pro Dimension
   - Support-Item-Hinweise

3. `Pattern-Hinweise`
   - nur als dezente Zusatzebene
   - keine Warnsprache

## 7.2 Was im Report vermieden werden sollte

Nicht schreiben:

- `eure Antworten sind widersprüchlich`
- `eure Angaben wirken unzuverlässig`
- `hier ist Bias erkennbar`

Stattdessen immer:

- `gemischte Tendenzen`
- `kontextabhängige Signale`
- `wenig Differenzierung`
- `sehr geschlossenes Profil`

## 7.3 Empfohlene UI-Position

Pattern-Hinweise eher:

- in einer kleinen Sektion `Zusätzliche Hinweise`
- oder als Info-Callout unter dem Hauptprofil

Nicht:

- als prominenter Score
- nicht farblich alarmistisch

---

## 8. Beispielausgabe

### Beispiel Dimension

`Entscheidungslogik`

- `scoreA = 24`
- `scoreB = 58`
- `distance = 34`
- `alignment = 66`
- `teamFit = 66`
- `tensionScore = 34`

Interpretation:

- spürbare Differenz im Entscheidungsmodus
- Person A eher analytisch
- Person B eher intuitiver

Möglicher Support-Hinweis:

`Unter Zeitdruck könnte diese Differenz stärker sichtbar werden als in Routineentscheidungen.`

Möglicher Pattern-Hinweis:

`Bei Person B zeigen sich in dieser Dimension klare Antworten, während andere Themen noch offener wirken.`

---

## 9. Harte Empfehlung für Version 1

Für die erste belastbare Modellversion gilt:

1. `CORE` und `SUPPORT` strikt trennen
2. alle Scores ausschließlich auf den 24 CORE-Items aufbauen
3. Pattern-Layer nur interpretativ verwenden
4. keine mathematische Korrektur über Flags oder Pattern-Indikatoren
5. vor späterer Komplexität zuerst qualitative und psychometrische Prüfung der CORE-Architektur

Das System bleibt so:

- verständlich
- methodisch defensiv
- ausbaubar
- und für Nutzer weiterhin vertrauenswürdig
