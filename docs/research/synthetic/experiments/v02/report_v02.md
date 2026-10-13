# Matching-Experiment 2 (v0.2) – Bericht

Stand: 13.10.2026. Branch `research/matching-experiment-v02`, aufbauend auf Experiment 1 (`e04b7227`, noch nicht in `main`).
Alle Zahlen stammen aus [`results_v02.json`](results_v02.json); der Lauf ist deterministisch (etwa 13 s).

**Keine Produktentscheidung, keine Produktimplementierung.** M7 und M7core bleiben Hypothesen.

## 0. Zuerst lesen

1. **Vorab-Festlegung eingehalten.**
   - Modelle, Normalisierung, Stressfälle und README wurden vor dem Volllauf gehasht (`preregistration_v02.json`); `results_v02.json → meta.preregistration` bestätigt: **alle vier Dateien unverändert**.
   - Der Rauchtest vorher hat gezeigt, dass die v02-Maschinerie die Baseline für alle 24.180 FIND- und 29.774 CONNECT-Paare exakt reproduziert.
2. **Nach dem ersten Volllauf korrigiert (Auswertung, nicht Modelle):**
   - **Gleichstände in CONNECT.** Mein v02-Skript sortierte gleiche Scores nach ID aufsteigend, v01 nach ID absteigend. Allein das bewegte M7core von Recall@10 0,98 auf 0,84. Korrigiert: Sortierung wie v01, **zusätzlich** pessimistische Kennzahlen (bei Gleichstand stehen Relevante hinten).
   - **Stressfall-Kriterien streng gemacht.** „A vor B“ heißt jetzt echter Score-Vorsprung, „in den Top k“ zählt pessimistisch, „nicht in den Top k“ optimistisch. Im ersten Lauf (nachsichtig) bestanden M7core 12/13, `M7core_v2` 13/13; streng sind es **7/13** bzw. **10/13**.
   - In FIND ändern Gleichstände praktisch nichts (pessimistisch höchstens −0,01).
   - **Laufzeit aus `results_v02.json` entfernt**, weil sie die Datei von Lauf zu Lauf verändert hat. Seitdem ist die Ergebnisdatei byte-identisch reproduzierbar, auch mit anderem `PYTHONHASHSEED`.
   - Diese Korrekturen betreffen nur `run_experiment_v02.py`. Die vier vorregistrierten Dateien sind unverändert. Die README ist absichtlich nicht nachgezogen, damit ihr Hash gültig bleibt; die Datei `posthoc_v02.py` fehlt deshalb in ihrer Dateiliste.
3. **POST-HOC** (nach Sicht auf Ergebnisse entstanden, keine bestätigten Befunde):
   - Variante `PH1_need_multiplicative` in `posthoc_v02.py`,
   - Diagnosen zu L1-Sperren und Generalisten.
4. **Die Grenzen aus Experiment 1 gelten weiter.** Die Referenz ist aus denselben strukturierten Feldern gebaut, die die Modelle lesen; die absoluten Werte auf konstruierten Paaren sind optimistisch. Aussagekräftig sind Unterschiede, Kontrastpaare und Stressfälle.

## 1. Bleibt M7 strukturell führend?

**Ja, für FIND.**

| Modell | Recall@10 | NDCG@10 | MRR | paarweise Ordnung | excellent@10 | promising@10 | exclude in Top 10 | falsch gesperrt |
|---|---|---|---|---|---|---|---|---|
| **M7** | 0.92 | 0.80 | 0.82 | 0.99 | 1.00 | 0.82 | 0.02 | 0 |
| G1_best_match | 0.92 | 0.80 | 0.83 | 0.99 | 1.00 | 0.82 | 0.02 | 0 |
| G3_breadth_evidence | 0.92 | 0.80 | 0.83 | 0.99 | 1.00 | 0.80 | 0.02 | 0 |
| A5_min_0.75 | 0.91 | 0.80 | 0.82 | 0.99 | 1.00 | 0.81 | 0.02 | 0 |
| D2_shrink_median | 0.92 | 0.80 | 0.83 | 0.99 | 1.00 | 0.82 | 0.02 | 0 |
| N_generic2 (ohne Wörterbuch) | 0.88 | 0.73 | 0.75 | 1.00 | 0.93 | 0.75 | 0.02 | 0 |
| L1_strict | 0.70 | 0.67 | 0.73 | 0.88 | 0.86 | 0.65 | 0.00 | 114 |
| M7v2a (a-priori-Kombination) | 0.70 | 0.67 | 0.73 | 0.88 | 0.86 | 0.63 | 0.00 | 114 |
| *PH1 (POST-HOC)* | 0.92 | 0.78 | 0.79 | 0.99 | 0.95 | **0.86** | 0.02 | 0 |

- **Keine vorab festgelegte Variante ist klar besser als M7.** G1, G3, A5 und D2-Median liegen gleichauf (±0,01).
- **Kein Modell löst die Lücke zwischen konstruierten und Kontrastpaaren:** M7 erreicht NDCG@10 0,84 auf konstruierten, 0,43 auf Kontrastpaaren. Die übrigen Varianten liegen auf Kontrastpaaren zwischen 0,38 und 0,47, die L-Varianten bei 0,33.
- **Die a priori festgelegte Kombination `M7v2a` ist gescheitert.** Sie enthält L1, und L1 sperrt nach der Referenz 114 positive Paar-Richtungen (Abschnitt 5). Das ist eine Lehre über Kombinationen: Ein Baustein, dessen Semantik strittig ist, nimmt die ganze Kombination mit.

## 2. Welche Generalisten-Korrektur funktioniert am besten?

**Keine wirklich.** G3 hilft am meisten, aber wenig.

| Variante | Exposition Generalisten / normal | Verhältnis | Anteil Generalisten an Top-5-Plätzen | … an Top-10-Plätzen | positive Paare verloren / gewonnen ggü. M7 |
|---|---|---|---|---|---|
| M7 | 0.127 / 0.059 | **2.17** | 6.0 % | 6.5 % | – |
| G1_best_match | 0.127 / 0.059 | 2.17 | 5.8 % | 6.5 % | 0 / 0 |
| G2_saturation | 0.123 / 0.060 | 2.06 | 5.8 % | 6.3 % | 1 / 0 |
| **G3_breadth_evidence** | 0.115 / 0.059 | **1.95** | 5.5 % | 5.9 % | 3 / 1 |
| G4_rare_need | 0.124 / 0.059 | 2.12 | 5.9 % | 6.3 % | 1 / 2 |

Generalisten machen 3,2 % des Pools aus.

**POST-HOC-Diagnose: Woher kommt die Exposition?**
- 62 % der Top-10-Auftritte von Generalisten entfallen auf Anfragen von Personen mit Tech-Rolle; bei normalen Profilen sind es 19 %.
- Generalisten haben 3 eigene Rollen, normale Profile im Schnitt 1,1. Sie decken häufiger eine gesuchte Rolle ab (79 % gegenüber 73 %).
- Sie suchen Technik, die häufigste Rolle im Pool. Damit ist die Gegenrichtung bei Tech-Anfragen fast immer erfüllt.

**Einordnung:**
- G1/G2 greifen nicht, weil M7 je Bedarf schon das beste Angebot nimmt; es gibt kaum Mehrfachzählung.
- G3 trifft den richtigen Mechanismus (Rollen ohne Tiefe zählen weniger), wirkt aber nur auf die Rolle, nicht auf die Gegenrichtung.
- **Ob die Exposition unfair ist, ist offen:** Die Referenz bewertet Generalist-↔-Tech-Paare überwiegend als promising/worth. Das ist eine Frage für die menschlichen Labels.
- **Spezialistinnen** bleiben in FIND unsichtbar (Exposition 0,01) und werden in CONNECT in allen Wörterbuch-Varianten auf Rang 1 gefunden.

## 3. Welche Gegenseitigkeitsform ist für FIND am stabilsten?

**A5 (0,75·min + 0,25·mittel) ist so gut wie M7 und minimal strenger. Keine Mittelungsform löst die Asymmetrie.**

| Variante | konstruiert asym.: Top 10 Seite mit Bedarf | … Seite ohne Bedarf ↓ | Kontrast asym.: Seite ohne Bedarf | promising@10 | positive verloren ggü. M7 |
|---|---|---|---|---|---|
| M7 (= A4) | 0.90 | **0.93** | 0.07 | 0.82 | – |
| A1 Schwelle 0,20 / 0,30 / 0,40 | 0.90 | 0.93 | 0.07 | 0.82 | 0 |
| A2 geometrisch | 1.00 | 0.93 | 0.07 | 0.81 | 2 |
| A3 harmonisch | 0.97 | 0.93 | 0.07 | 0.81 | 2 |
| A5 0,75·min | 0.90 | 0.90 | 0.07 | 0.81 | 1 |
| A6 nur Bedarf gegenseitig | 0.90 | 0.86 | 0.13 | 0.79 | 4 |
| *PH1 (POST-HOC)* | 0.86 | **0.55** | 0.00 | **0.86** | 7 (bei 7 gewonnenen) |

- **Die Schwellen A1 greifen bei asymmetrischen Paaren nie.** Auch die Richtung ohne Bedarf liegt über 0,40. Die Schwellen sortieren nur die Paare mit zu wenig Daten in die zweite Stufe (16 / 48 / 88 % der insufficient-Paare).
- **Ursache:** Branche, Absicht und Gegenrichtung tragen 60 % des gerichteten Scores und sind symmetrisch. Sie halten auch die Richtung ohne Bedarf hoch. Das bestätigt die Vermutung aus Experiment 1.
- **POST-HOC PH1** (gegenseitiger Bedarf als Faktor, Branche und Absicht nur als Modulation):
  - senkt die Seite ohne Bedarf von 93 % auf 55 %,
  - erhöht promising@10 von 0,82 auf 0,86 und Kontrast-NDCG@10 von 0,43 auf 0,45,
  - kostet excellent@10 1,00 → 0,95 (4 von 88 Richtungen),
  - erhöht die Generalisten-Exposition leicht (2,35).
  - **Nicht bestätigt**; ein Kandidat für Experiment 3.

## 4. Welche Strategie für fehlende Daten ist am fairsten?

**Ziel war: wenig Daten weder belohnen noch bestrafen.** Gemessen am Verhältnis der Exposition Sparse/normal (1,0 = fair) und an der Robustheit, wenn bei 25 % der Profile Felder fehlen:

| Variante | Sparse / normal | Spearman Exposition ~ Vollständigkeit | insufficient in Top 10 | insufficient in 2. Stufe | betroffene excellent@10: vorher → mit Lücken | Recall@10 mit Lücken |
|---|---|---|---|---|---|---|
| M7 (Unbekanntes = 0) | 0.86 | −0.21 | 0.10 | – | 1.00 → 0.95 | 0.92 |
| D1 neutral 0,5 | **2.10** | −0.38 | 0.10 | – | 1.00 → 0.97 | 0.93 |
| D1 Median | 0.86 | −0.21 | 0.10 | – | 1.00 → 0.95 | 0.92 |
| D2 Shrinkage → 0,5 | **2.10** | −0.38 | 0.10 | – | 1.00 → 0.97 | 0.93 |
| **D2 Shrinkage → Median** | 1.32 | −0.31 | 0.10 | – | 1.00 → **0.97** | **0.93** |
| D3 Mindestevidenz | **0.09** | −0.17 | 0.08 | 0.96 | 1.00 → **0.58** | **0.75** |

- **Ein neutraler Wert von 0,5 belohnt fehlende Daten.** Unbekannte Gruppen bekommen mehr als die meisten beobachteten Werte; der Median der beobachteten Branchen-Übereinstimmung im Pool ist 0.
- **D3 bestraft fehlende Daten massiv.** Sparse-Profile verschwinden fast ganz, und unter fehlenden Feldern bricht das Ranking ein (Recall@10 0,92 → 0,75). Als **Kennzeichnung** funktioniert D3 dagegen gut: 96 % der insufficient-Paare landen korrekt in der zweiten Stufe.
- **D1 mit Populationsmedian ist hier im Ergebnis identisch mit M7.** Die Mediane im Pool sind Bedarf 0, Branche 0, Ergänzung 0,33 und Absicht 0,85. Die Gruppe, die am häufigsten fehlt (Branche), wird also wie in M7 mit 0 gefüllt. Grundsätzlich ist der Median aber die sauberere Begründung.
- **Am fairsten bei guter Robustheit: D2 Shrinkage zum Populationsmedian.** Das Verhältnis Sparse/normal ist 1,32 statt 0,86 oder 2,10, und es ist so robust wie die 0,5-Varianten.
- **Empfehlung (Hypothese):** Ranking nach D2-Median, getrennt davon D3 nur als **Kennzeichen** („wenig Angaben“), nicht als Ranking-Stufe.

## 5. Welche Ortsregel vermeidet Fehlentscheidungen?

Es kommt darauf an, welche Ortssemantik gilt. **Referenz und vorgegebene L1-Semantik widersprechen sich**, und das muss vor einer Produktregel geklärt werden.

| Variante | exclude-Paare zugelassen | davon ortsbedingt (von 28) | positive Paare fälschlich gesperrt | davon Ort |
|---|---|---|---|---|
| L0 (M7) | 5 % | 4 | 0 | 0 |
| L1 streng | 2 % | 2 | **114** | 114 |
| L2 Region | 2 % | 2 | 112 | 112 |
| L3 streng + Orts-Confidence | 2 % | 2 | 114 | 114 |

- **L1 löst den bekannten Fehler.** „DACH, remote“ erfüllt kein „nur Leipzig“ mehr (`syn-pair0021`); die zugelassenen ortsbedingten exclude-Paare halbieren sich.
- **Gleichzeitig sperrt L1 114 Richtungen, die die Referenz für passend hält** (POST-HOC-Diagnose nach Regel):

  | Ort/Remote-Kombination | gesperrt |
  |---|---|
  | hybrid ↔ hybrid an verschiedenen Orten | 34 |
  | flexibel ↔ hybrid | 28 |
  | hybrid ↔ onsite | 18 |
  | flexibel ↔ onsite | 14 |
  | onsite ↔ remote | 20, davon 8 am **selben** Ort |

- **Die Referenz kennt nur zwei Ortskonflikte:** „beide nur vor Ort an verschiedenen Orten“ und ausdrückliche Must-haves. Die L1-Vorgabe ist viel strenger. Welche Sicht stimmt, können nur Menschen bzw. die Produktentscheidung sagen.
- **L2 (Region)** rettet nur 2 Paare, darunter aber `syn-pair0297` (Köln/Bonn ↔ Ruhrgebiet, beide in NRW), das L1 sperrt.
- **Nebenwirkung:** Ein strenges Gate bevorzugt Profile **ohne** Ortsangabe. Sparse/normal steigt bei L1 auf 2,33, weil „unbekannt“ nie sperrt. Eine strenge Ortsregel setzt also einen Anreiz, den Ort leer zu lassen.
- **L3:** 29 % der Top-10-Treffer haben eine unsichere Ortsangabe. Das ist als eigene Anzeige sinnvoll, ändert aber kein Ranking.
- **Empfehlung:**
  - Platzhalter erfüllen keinen konkreten Ort; das ist unstrittig und behebt `syn-pair0021`.
  - Remote ↔ onsite am selben Ort nicht sperren.
  - Hybrid/flexibel an verschiedenen Orten **nicht hart sperren, solange Menschen das nicht bestätigen**.

## 6. Wie viel Nutzen kommt wirklich vom Synonym-Wörterbuch?

| | FIND NDCG@10 | FIND excellent@10 | FIND falsch gesperrt | CONNECT Recall@10 (wie v01 / pessimistisch) | CONNECT NDCG@10 (wie v01 / pessimistisch) | Stressfälle (streng) |
|---|---|---|---|---|---|---|
| Wörterbuch (M7 / M7core) | 0.80 | 1.00 | 0 | 0.98 / 0.74 | 0.72 / 0.57 | 7/13 |
| v01 generic | 0.71 | 0.90 | 8 | 0.30 / 0.23 | 0.21 / 0.15 | 4/13 |
| **generic2** (neu, blind) | 0.73 | 0.93 | **0** | 0.39 / 0.32 | 0.28 / 0.22 | 7/13 |
| Wörterbuch + generic2 | 0.80 | 1.00 | 0 | 0.98 / 0.74 | 0.72 / 0.57 | **10/13** |

- **FIND:** Die Struktur trägt den Großteil. Ohne Wörterbuch fällt NDCG@10 nur von 0,80 auf 0,73. `generic2` ist besser als v01 generic und sperrt dank Ortsbestandteil-Regeln kein positives Paar mehr.
- **CONNECT:** Das Wörterbuch trägt fast alles. Ohne es fällt Recall@10 auf 0,39. Grund: In CONNECT ist das Thema der Hauptinhalt, und DE/EN-Übersetzungen („Vertrieb“ ↔ „Sales“) kann keine generische Regel.
- **Wörterbuch + generic2** ist auf dem Datensatz gleich gut wie das Wörterbuch allein, besteht aber **3 Stressfälle mehr**:
  - „Pitch“ ⊂ „Investor Pitch“ (C4),
  - „Biozid-Zulassung“ ~ „Biozidrecht“ (C6),
  - „MDR Klasse IIb“ ⊃ „MDR“ (C11).
- **Auffällig auf Kontrastpaaren:** Die beiden Varianten ohne Wörterbuch haben dort den höchsten NDCG@10 (generic2 0,46, v01 generic 0,47 gegenüber 0,43 mit Wörterbuch). Der Wörterbuch-Vorteil in FIND kommt also vor allem aus den konstruierten Paaren. Das passt zum Verdacht, dass Wörterbuch und Generator zu ähnlich sind.
- **Weiter zu optimistisch:** Das Wörterbuch stammt vom Autor des Datensatzes. Der echte Abstand zwischen Wörterbuch und generisch ist in Produktdaten vermutlich kleiner, der Nutzen eines guten Wörterbuchs für CONNECT aber trotzdem hoch.

## 7. Hält M7core auf neuen CONNECT-Stressfällen?

**Nur teilweise: 7 von 13 streng bestanden. Mit Wörterbuch + generic2 (`M7core_v2`) 10 von 13.**

| Fall | Typ | M7core | M7core_v2 | generic2 | f1 |
|---|---|---|---|---|---|
| C1 | Thema ja, Branche nein | ✓ | ✓ | ✗ | ✓ |
| C2 | Branche ja, Thema nein | ✗ | ✗ | ✗ | ✗ |
| C3 | Kategorie ja, Inhalt nein | ✗ | ✗ | ✗ | ✗ |
| C4 | gleiches Wort, falscher Kontext | ✗ | ✓ | ✓ | ✗ |
| C5 | Synonyme ohne Wortgleichheit | ✗ | ✗ | ✗ | ✗ |
| C6 | seltener Spezialbegriff | ✗ | ✓ | ✓ | ✗ |
| C7a–c | ein Angebot, drei Suchen | ✓✓✓ | ✓✓✓ | ✓✓✓ | ✓✓✓ |
| C8 | drei Angebote, ein Bedarf | ✓ | ✓ | ✗ | ✓ |
| C9 | geografischer Konflikt | ✓ | ✓ | ✓ | ✓ |
| C10 | remote, verschiedene Orte | ✓ | ✓ | ✗ | ✓ |
| C11 | Spezialbedarf vs. Generalist | ✗ | ✓ | ✓ | ✗ |

- **C2/C3 scheitern an der Grobheit des Scores.** Ein Angebot ohne passendes Thema bekommt über Kategorie oder Branche 0,25–0,5. Bei Gleichstand an Rang 10 in **91 % der Anfragen** landet es damit im Spitzenfeld.
- **Pessimistisch gerechnet** bricht M7core ein: Recall@10 0,98 → 0,74, promising@10 0,96 → 0,42. Ein großer Teil des CONNECT-Ergebnisses aus Experiment 1 kam aus der Gleichstandsauflösung.
- **C4 (Kontext)** besteht `M7core_v2` nur, weil „Investor Pitch“ das Suchthema enthält. Den Wortsinn versteht kein Modell. Das Sport-Angebot „Pitch“ bekommt allein über das gleiche Wort weiterhin 0,5 und steht damit im oberen Feld.
- **C5 (echte Synonyme)** scheitert überall; das braucht ein Wörterbuch oder Semantik.
- **`C_f1_breadth`** (breite Angebote abwerten) verbessert die pessimistischen Kennzahlen leicht (NDCG@10 0,57 → 0,60) und schadet C7 nicht. C11 löst es ohne generic2 aber nicht.

## 8. Welche Fehlerklassen bleiben?

1. **Grobe CONNECT-Scores mit massenhaft Gleichständen.** Das Ranking im Mittelfeld ist praktisch zufällig.
2. **Kontrastpaare:** NDCG@10 um 0,43 gegenüber 0,84 auf konstruierten Paaren, in allen Modellen.
3. **Asymmetrie in FIND:** Die Seite ohne Bedarf steht zu 93 % in den Top 10. Strukturell ungelöst; PH1 ist ein Kandidat.
4. **Generalisten-Exposition etwa ×2,** vor allem über Tech-Anfragen. Ob unfair, ist offen.
5. **Ortssemantik** (hybrid/flexibel, remote ↔ onsite am selben Ort) ist ungeklärt; Referenz und Vorgabe widersprechen sich.
6. **Echte Synonyme und Kontextbedeutung** sind ohne Wörterbuch bzw. Semantik nicht lösbar (C4, C5).
7. **Fehlende Daten:** Jede einfache Regel belohnt oder bestraft. Shrinkage zum Populationsmedian ist der beste Kompromiss, aber nicht neutral.

## 9. Welche Regeln wären stabil genug für eine v0.1-Produktengine?

**Stabil über Experiment 1 und 2, alle Varianten und beide Teilmengen hinweg:**
- **Zwei Stufen:** erst Zulassung (Gate), dann Relevanz. Das Gate prüft die ausdrücklichen Must-haves **beider** Seiten und „beide nur vor Ort an verschiedenen Orten“. Fehlende Werte sind nie ein Ausschluss.
- **Ortsplatzhalter** („DACH“, „bundesweit“, „remote“) erfüllen keinen konkreten Ort, sie sind aber auch kein Konflikt, solange niemand einen Ort verlangt.
- **Relevanz = Bedarf statt Ähnlichkeit**, mit Ownership-bewusster Abdeckung: nur `own` mit Erfahrung voll, `grow_into` nie.
- **FIND gegenseitig mit Min-Betonung** (0,6–0,75 Gewicht auf dem Minimum); CONNECT gerichtet ohne Gegenseitigkeit.
- **Normalisierung als eigene Schicht:** generische Regeln (`generic2`) plus gepflegtes Wörterbuch. Generic2 allein ist für FIND tragfähig, für CONNECT nicht.
- **Confidence getrennt** vom Score anzeigen; „wenig Angaben“ als Kennzeichen, nicht als Strafe.

**Nicht stabil genug:**
- Ortsregeln jenseits der beiden oben,
- jede Generalisten-Korrektur,
- die konkrete Formel für Asymmetrie,
- die CONNECT-Relevanz in ihrer jetzigen Granularität.

## 10. Was brauchen menschliche Labels?

Die Stichprobe liegt bereit:
- `human_label_sample_v02.json`: 75 FIND- und 45 CONNECT-Paare,
- `human_label_protocol_v02.md`: Ablauf und Review-Fragen,
- `human_label_sample_key_v02.json`: interner Schlüssel.

Sie enthält Kontrastpaare, sechs Ortssemantik-Fälle, die bekannten Stresspaare und fünf neue CONNECT-Stressfälle. Zu klären:

1. **Ortssemantik:** Sind hybrid ↔ hybrid an verschiedenen Orten, flexibel ↔ onsite und remote ↔ onsite am selben Ort für Menschen Ausschlussgründe?
2. **Asymmetrie:** Wie stark gewichten Menschen den Nutzen für die Seite ohne Bedarf? Gehören solche Paare in FIND nach oben?
3. **Generalisten:** Ist ein breites Profil für eine Tech-Person ein guter oder ein mittelmäßiger Vorschlag?
4. **Kontrastpaare:** Teilen Menschen die Referenzklassen dort, wo alle Modelle schwach sind?
5. **CONNECT:** Zählen gleiche Kategorie bzw. gleiche Branche ohne passendes Thema für Menschen überhaupt? Davon hängt ab, ob sie im Score bleiben.
6. **Wenig Angaben:** Wie sicher fühlen sich Menschen bei Sparse-Paaren, und würden sie sie zeigen?

## Empfehlung für Experiment 3 bzw. einen Prototyp (keine Produktimplementierung)

1. **Zuerst menschliche Labels erheben** (Protokoll v02). Die Ortssemantik und die CONNECT-Grundfrage (zählt Kategorie/Branche ohne Thema?) entscheiden über die Struktur.
2. **FIND-Kandidat:**
   - M7-Gate mit Platzhalterregel (Platzhalter ≠ konkreter Ort),
   - Relevanz nach PH1-Struktur (gegenseitiger Bedarf als Faktor),
   - G3 für Rollen ohne Tiefe,
   - D2-Median bei fehlenden Werten,
   - D3 nur als Kennzeichen.

   PH1 muss in Experiment 3 **vorab** festgelegt und neu getestet werden.
3. **CONNECT-Kandidat:**
   - Wörterbuch + generic2,
   - feinere Relevanz gegen Gleichstände (z. B. Titel/Beschreibung als Zusatzsignal, f1-Abwertung breiter Angebote),
   - **ein expliziter Mindest-Themenbezug**, bevor Kategorie und Branche zählen.

   Erst dann gezielt erneut stresstesten.
4. **Auswertung:** pessimistische Gleichstandsauflösung und strenge Stresskriterien als Standard.
5. **Referenz verbreitern:**
   - CONNECT-Kontrastpaare,
   - mehr Ortsfälle,
   - ein unabhängig erzeugter Freitext-Satz (nicht vom selben Autor) für einen echten Wörterbuch-Test.
