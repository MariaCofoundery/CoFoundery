# Matching-Experiment 3 (v0.3) – Bericht

Stand: 13.10.2026 · Branch `research/matching-experiment-v03` (von `main` mit v02, `8ed8aac8`).
**Preregistration SHA-256:** `cbe29894e01cffb27d1d81aef7ab0bba9a425bda8db07b6eda858cfc09fad9df`
**HOLDOUT STATUS: UNOPENED**

Keine Produktimplementierung, keine Datenbank, keine Änderungen unter `web/` oder `supabase/`.
Alle Zahlen: [`results_v03.json`](results_v03.json). Beschreibende Zusatzanalyse: [`diagnostics_v03.json`](diagnostics_v03.json).

## 0. Einordnung und Ablauf

**Zwei getrennte Referenzschichten.** Keine von beiden misst „Founder-Kompatibilität“. Bewertet ist nur, wie sinnvoll ein Kontaktvorschlag aufgrund der verfügbaren Daten ist.

| Referenz | Was sie ist | Umfang hier |
|---|---|---|
| **SYNTHETIC REFERENCE** | konstruktiv erzeugte Ground Truth des Datensatzes | 400 der 439 Referenzpaare; die 39 Paare der Holdout-Stichprobe und Stressfall C4 sind ausgeschlossen |
| **SILVER DEVELOPMENT REFERENCE** | zwei getrennte **Modell**-Review-Pässe (SILVER_R1, SILVER_R2), keine menschliche Ground Truth | 50 FIND- und 30 CONNECT-Development-Paare |

**Reihenfolge, technisch erzwungen:**
1. Modelle fertig, Rauchtest: F0 = M7, C0 = M7core und F1 = PH1 für alle Paare exakt reproduziert.
2. Trockenlauf mit zufälligen Platzhalter-Labels im Scratchpad.
3. Festlegung geschrieben und gehasht.
4. Erst danach Silver-Dateien geöffnet und Lauf gestartet.

Der Lauf vergleicht die Festlegung vollständig und hätte bei jeder Abweichung abgebrochen.

**Offen zu benennen:**
- Die Ausgabe des Trockenlaufs zeigte schon vor der Festlegung, dass F1 und F3 die beiden **synthetischen** Entscheidungskriterien (Asymmetrie, Kontrast) erfüllen. Die Modelldateien waren da fertig und wurden danach nicht mehr geändert.
- Die Silver-Werte des Trockenlaufs waren Zufallsrauschen.

**Silver-Dateien:** `R1` ist byte-identisch mit `R1_fixed`. `R2` unterscheidet sich von `R2_fixed` nur in einem freien Begründungstext (RP-084), der in keine Kennzahl einfließt.

**Holdout:**
- Je Datei wurden 40 Zeilen verworfen, bevor ihr Inhalt gelesen wurde.
- `--unlock-holdout` bricht ab.
- Ein Testmarker in den Holdout-Zeilen des Trockenlaufs tauchte nirgends auf.

**Consensus:** Es gab keine yes/no-Konflikte außer RP-081, und der ist adjudiziert. Keine weitere Adjudication.

**Versehentliche Teil-Exposition des Holdouts (nach Abschluss aller Berechnungen):**
- Bei der abschließenden Whitespace-Prüfung (`git diff --check` über `docs/research`) wurden Zeilen der nicht von mir stammenden Datei `v02/silver_labels_R1_v02.backup.csv` ausgegeben.
- Darunter waren die SILVER_R1-Bewertungen der **Holdout-Paare RP-001 und RP-002**.
- Die Auswertungs-Pipeline hat den Holdout nie gelesen; alle Ergebnisse dieses Berichts standen zu diesem Zeitpunkt fest und wurden danach nicht verändert.
- Für eine spätere Holdout-Auswertung sind RP-001 und RP-002 aber **nicht mehr blind** und sollten dort ausgeschlossen oder gesondert gekennzeichnet werden.

## 1. Bestätigt sich PH1 nach der Vorab-Festlegung?

**Teilweise. Nach der vorab festgelegten Regel ist PH1 nicht besser als M7.**

| Kriterium (vorab) | F1 PH1 exakt | F2 min75 DICT | F3 min60 DICT | F2/F3 GENERIC |
|---|---|---|---|---|
| 1. Silver-Q1 Spearman ≥ M7 + 0,03 | ✗ (0,86 vs. 0,85) | ✗ (0,86) | ✗ (0,86) | ✗ (0,85 / 0,84) |
| 2. Q2/Q3 nicht schlechter | ✓ | ✓ | ✓ | ✓ |
| 3. Gate nicht schlechter | ✓ | ✓ | ✓ | ✓ |
| 4. synthetische Asymmetrie −0,10 | ✓ | ✓ | ✓ | ✓ |
| 5. Kontrast nicht kollabiert | ✓ | ✓ | ✓ | ✓ |
| **besser als M7** | **nein** | **nein** | **nein** | **nein** |

**Bestätigt ist der Asymmetrie-Effekt**, auf beiden Referenzen (Abschnitt 3).

**Nicht bestätigt ist ein besseres Gesamtranking.**
- M7 trifft die Silver-Gesprächsrelevanz bereits mit ρ = 0,85. Der Spielraum ist klein; bei 50 Paaren ist +0,01 nicht von Rauschen zu unterscheiden.
- Synthetisch verliert PH1 etwas: NDCG@10 sinkt von 0,78 auf 0,76, excellent@10 von 1,00 auf 0,95.
- Dafür steigen promising@10 (0,81 → 0,85), worth@10 (0,67 → 0,77) und Kontrast-NDCG@10 (0,43 → 0,45).

**F3 ist wie vorab vermerkt rechnerisch PH1.** Mit Gate v03 und Wörterbuch ist es in allen Silver-Kennzahlen identisch mit F1. Das Gate v03 ändert also auf diesen Daten nichts am Ergebnis.

## 2. Ist M7 oder PH1 näher an den Silver Labels?

**Fast gleich nah. PH1 liegt leicht vorn, vor allem bei der Richtung B → A und gegen R2.**

| SILVER FIND | Spearman Q1 | Kendall Q1 | NDCG Q1 | paarweise Q1 | Spearman A→B (Q2) | Spearman B→A (Q3) |
|---|---|---|---|---|---|---|
| F0 M7 – Consensus | 0.85 | 0.68 | 0.97 | 0.85 | 0.79 | 0.85 |
| F0 M7 – R1 / R2 | 0.84 / 0.81 | 0.69 / 0.66 | 0.95 / 0.98 | 0.88 / 0.86 | 0.84 / 0.77 | 0.85 / 0.75 |
| F1 PH1 – Consensus | **0.86** | **0.71** | 0.97 | 0.85 | 0.79 | **0.89** |
| F1 PH1 – R1 / R2 | 0.84 / **0.85** | 0.70 / 0.71 | 0.95 / 0.98 | 0.88 / 0.87 | 0.81 / 0.78 | 0.85 / 0.83 |
| F2 min75 DICT – Consensus | 0.86 | 0.71 | 0.97 | 0.85 | 0.79 | 0.89 |
| F2 min75 GENERIC – Consensus | 0.85 | 0.70 | 0.96 | 0.84 | 0.78 | 0.84 |

- **Gegen R1 sind M7 und PH1 gleichauf (0,84).** Gegen R2 legt PH1 von 0,81 auf 0,85 zu. PH1 passt also etwas besser zu einer der beiden Bewertungslogiken, nicht eindeutig zu beiden.
- **Die Modell-Confidence korreliert nur mäßig mit der Silver-Sicherheit** (Q5: ρ 0,52 Consensus; 0,41 R1, 0,64 R2). Das ist beschreibend und nicht optimiert.

## 3. Wie verhält sich asymmetrische Relevanz?

**SILVER:**
- 6 Development-Paare haben eine einseitige Silver-Relevanz (|Q2 − Q3| ≥ 2). Ihre mittlere Gesprächsrelevanz ist 2,9, gegenüber 4,1 bei Paaren, in denen beide Richtungen ≥ 4 haben.
- M7 setzt 3 dieser 6 Paare in die obere Hälfte, PH1 nur 1.
- Beispiel RP-003 (Q2 = 5, Q3 = 1,5, Q1 = 2,5):
  - M7: B → A = 0,60, Gesamt 0,65, Platz 18 von 50.
  - PH1: B → A = 0, Gesamt 0,20, Platz 27.

**SYNTHETIC** (konstruierte asymmetrische Paare; Anteil in den Top 10):

| Modell | Seite mit Bedarf | Seite ohne Bedarf ↓ |
|---|---|---|
| F0 M7 | 0.88 | **0.92** |
| F1 PH1 | 0.85 | 0.62 |
| F2 min75 DICT | 0.65 | **0.46** |
| F3 min60 DICT | 0.85 | 0.62 |

PH1 trennt die Seiten deutlich besser, und Silver bestätigt die Richtung. F2 (stärkere Min-Betonung) drückt zusätzlich, nimmt aber auch die Seite **mit** Bedarf mit (0,88 → 0,65).

## 4. Bleibt die min-betonte Gegenseitigkeit sinnvoll?

**Ja, in der M7-Form (0,6/0,4).** 0,75/0,25 (F2) bringt auf Silver nichts zusätzlich (gleiche Werte wie F3) und senkt synthetisch die Seite mit Bedarf zu stark. Den Unterschied macht nicht die Mittelung, sondern dass **Bedarf als Faktor** wirkt (PH1).

## 5. Funktioniert das Gate gegen Silver-Ausschlüsse?

**FIND – ja, ohne Fehler.**

| Gate | gegen Consensus Q4 | gegen R1 | gegen R2 |
|---|---|---|---|
| M7 / F1 | P 1,00 · R 1,00 · Spez. 1,00 · F1 1,00 (9 TP, 0 FP, 0 FN, 41 TN) | F1 0,94 (1 FP) | F1 1,00 |
| Gate v03 (F2/F3) | identisch, dazu 1 Paar „uncertain“ | identisch | identisch |

Synthetisch:
- Kein positives Paar fälschlich gesperrt (0 von 360 Richtungen).
- Von den exclude-Paaren werden 3 % zugelassen; keines davon steht in den Top 10.

Das Gate v03 bringt hier keinen messbaren Unterschied zu M7. Die Platzhalter-Regel („DACH erfüllt keinen Ort“) greift im Development-Satz nicht.

**CONNECT – das Gate erfasst alle Ausschlüsse aus Ort oder Laufzeit, aber nicht die inhaltlichen.**
- Recall gegen Silver-Q3 0,36 (4 von 11), Precision 1,00.
- Die 4 erkannten sind genau die Ausschlüsse wegen Ort (3) und Laufzeit (1).
- Die 7 übrigen begründet Silver mit „Thema passt nicht“. Das ist bewusst Aufgabe der Relevanz, nicht des Gates; dort bekommen sie niedrige Scores (siehe Q2-Gruppen).

## 6. Wie stark ist der Generalisten-Bias wirklich?

| Modell | Exposition Generalisten / normal | Bedarf der Anfrage gegenüber Generalist / normalem Profil in den Top 10 | ρ Exposition ~ Zahl eigener Rollen | ρ Exposition ~ Zahl Capabilities |
|---|---|---|---|---|
| F0 M7 | 2.17 | 0.49 / 0.59 | 0.21 | 0.09 |
| F1 PH1 | 2.35 | 0.50 / 0.63 | 0.23 | 0.05 |
| F2 DICT | 2.37 | 0.51 / 0.63 | 0.23 | 0.07 |

Weitere Werte:
- Top-10-Profile haben im Schnitt 1,2 eigene Rollen und 6,6 Capabilities; im Pool sind es 6,3 Capabilities.
- Spezialistinnen erscheinen in FIND fast nie (Exposition 0,01).

**Einordnung:**
- Generalisten stehen **mit weniger Bedarfsdeckung** in den Top 10 als normale Profile (0,49–0,51 gegenüber 0,59–0,63).
- Ihre Exposition hängt mit der **Zahl eigener Rollen** zusammen, nicht mit der Zahl der Capabilities. Breite Capability-Listen erzeugen keinen Bonus; das Best-Match-Prinzip wirkt.
- Der Vorteil kommt aus drei angebotenen Rollen, die öfter eine gesuchte Rolle treffen.
- PH1 verstärkt das leicht (2,35), weil Rollen-Abdeckung dort als Faktor wirkt.
- **Ob das fachlich falsch ist, bleibt offen.** Ein harter Abschlag ist wie vorgegeben nicht eingebaut.

## 7. Welche Probleme mit fehlenden Daten bleiben?

- **PH1 bevorzugt Sparse-Profile leicht.** Exposition Sparse/normal ist 1,37 (M7: 0,86). Ursache ist der unveränderte PH1-Modulator: Fehlen Branche und Absicht, gilt er als 0,5. Das ist mehr, als viele vollständige Profile mit abweichender Branche bekommen.
- Das ist genau das Muster, das Abschnitt 12 der Vorgabe vermeiden will. **PH1 wurde bewusst unverändert gelassen**, um es exakt zu prüfen. Die Korrektur gehört in das nächste Experiment.
- **Robustheit**, wenn bei 25 % der Profile Felder fehlen:

  | Modell | NDCG@10 vorher → nachher | Recall@10 nachher |
  |---|---|---|
  | M7 | 0,78 → 0,74 | 0,91 |
  | PH1 | 0,76 → 0,73 | 0,92 |
  | F2 DICT | 0,77 → 0,74 | 0,93 |

  Alle Modelle sind ähnlich robust.
- **insufficient_data:** 11 % in den Top 10, in allen Modellen gleich. Relevanz und Confidence sind getrennt ausgegeben.

## 8. Wie viel bringt das Synonym-Wörterbuch?

| | FIND Silver ρ Q1 | FIND syn. NDCG@10 | FIND Kontrast-NDCG@10 | CONNECT Silver ρ Q1 | CONNECT Q2-AUC | CONNECT pess. Recall@10 |
|---|---|---|---|---|---|---|
| C1 / F2 mit Wörterbuch (DICT) | 0.86 | 0.77 | 0.45 | **0.55** | **1.00** | **0.92** |
| C1 / F2 nur generisch (GENERIC) | 0.85 | 0.73 | **0.47** | 0.39 | 0.86 | 0.55 |

- **FIND:** Das Wörterbuch bringt wenig. Silver ist praktisch gleich, auf den Kontrastpaaren ist die generische Variante sogar leicht besser.
- **CONNECT:** Das Wörterbuch ist zentral, auf Silver wie synthetisch.
- **Einschränkung:** Das Wörterbuch stammt weiterhin vom Autor des Datensatzes. Die Silver-Paare enthalten dieselben Schreibweisen.

## 9. Welches CONNECT-Modell reduziert Gleichstände?

**C1 Topic-required mit Wörterbuch (C1_DICT).**

| Modell | Gleichstand an Rang 1 | an Rang 5 | an Rang 10 | identische Scores in den Top 10 (Ø) | Recall@10 wie v01 / pessimistisch | NDCG@10 wie v01 / pessimistisch |
|---|---|---|---|---|---|---|
| C0 M7core | 0.64 | 0.99 | 1.00 | 12.1 | 0.98 / 0.75 | 0.73 / 0.59 |
| **C1 DICT** | **0.24** | **0.64** | 0.82 | **4.7** | 0.94 / **0.92** | 0.72 / **0.70** |
| C2 DICT | 0.50 | 0.96 | 0.96 | 11.9 | 0.98 / 0.90 | 0.76 / 0.68 |
| C1 GENERIC | 0.24 | 0.69 | 0.88 | 9.0 | 0.57 / 0.55 | 0.37 / 0.35 |
| C2 GENERIC | 0.44 | 0.92 | 0.99 | 24.8 | 0.59 / 0.53 | 0.38 / 0.32 |

- C1_DICT verkleinert den Abstand zwischen „wie gerankt“ und „pessimistisch“ von 0,23 auf 0,02 (Recall@10). Sein Ergebnis hängt also kaum noch an der Auflösung von Gleichständen.
- Das vorab festgelegte Kriterium „Gleichstand an Rang 10 ≤ 50 % von C0“ verfehlt es trotzdem (0,82). Im Bereich niedriger Scores bleiben viele gleich (gedeckelt bei 0,10 oder nur Branche/Kategorie).
- C2 verringert Gleichstände kaum. Seine Coverage-Werte bleiben grob gestuft.

**Entscheidungsregel CONNECT:**

| Kriterium | C1 DICT | C2 DICT | C1/C2 GENERIC |
|---|---|---|---|
| 1. Silver-Q1 ≥ C0 + 0,03 | ✓ (0,55 vs. 0,51) | ✗ (0,53) | ✗ |
| 2. Q2-Gruppen geordnet, AUC nicht schlechter | ✓ (AUC 1,00) | ✓ (0,97) | ✗ |
| 3. Gate nicht schlechter | ✓ | ✓ | ✓ |
| 4. Gleichstand an Rang 10 ≤ 0,5 × C0 | ✗ (0,82) | ✗ | ✗ |
| 5. Stressfälle ≥ C0 und pessimistischer Recall nicht schlechter | ✓ (10/12 vs. 7/12) | ✓ (9/12) | ✗ |
| **besser als M7core** | **nein (4 von 5)** | nein | nein |

**Zur Primärmetrik:** Q1 fragt nach inhaltlicher Deckung. Silver gibt synthetischen exclude-Paaren (abgelaufen, Ortskonflikt) 4–5 Punkte bei der Deckung, aber „nicht anzeigen“. Jedes Modell, das sie korrekt sperrt, verliert dadurch Spearman-Punkte. Q2 (anzeigen) wäre als Primärziel passender gewesen. Das ist eine Schwäche der Festlegung; sie wird hier benannt, nicht nachträglich korrigiert.

## 10. Reicht ein Mindest-Themenbezug aus?

**Für die Spitze ja, für das Mittelfeld nicht.**
- Mit Themenpflicht (C1_DICT) trennt der Score die Silver-Gruppen sauber:

  | Silver Q2 | mittlerer Score | Anzahl Paare |
  |---|---|---|
  | anzeigen: yes | 0,78 | 14 |
  | maybe | 0,20 | 5 |
  | no | −0,29 (gesperrte Paare = −1) | 11 |

  Die AUC yes vs. no ist 1,00.
- Stressfälle: 10/12 statt 7/12. Neu bestanden sind C2 (Branche ja, Thema nein), C6 (seltener Fachbegriff) und C11 (Spezialbedarf vs. Generalist).
- **Weiter offen:**
  - C3 (gleiche Kategorie, falscher Inhalt): fällt durch, weil im unteren Bereich zu viele gleiche Scores liegen.
  - C5 (echte Synonyme ohne Wortgleichheit): fällt in allen Varianten durch.
  - Gleichstände im langen Ende.

## 11. Stimmen SYNTHETIC und SILVER überein?

**In FIND weitgehend.** Mittlere Silver-Gesprächsrelevanz je synthetischer Klasse:

| synthetische Klasse | Silver Q1 (Spanne) |
|---|---|
| excellent | 4,8 (4,5–5) |
| worth exploring | 4,4 |
| promising | 4,3 |
| asymmetrisch | 3,3 |
| low_relevance | 2,0 |
| insufficient | 2,0 |
| exclude | 1,8 |

Es gibt **keinen** deutlichen Widerspruch (z. B. excellent ≤ 2,5 oder exclude ≥ 3,5).

**In CONNECT** stimmen die Anzeige-Entscheidungen (Q2) vollständig überein:

| synthetische Klasse | Silver Q2 |
|---|---|
| excellent | yes (7/7) |
| low_relevance | no (6/6) |
| exclude | no (4/4) |
| insufficient | maybe (3/3) |
| promising | 5 × yes, 1 × maybe |

## 12. Wo widersprechen sie sich?

1. **CONNECT-exclude:** synthetisch „Ausschluss“, Silver-Deckung 4–5 (RP-004, RP-046, RP-059, RP-078). Kein echter Widerspruch: Der Inhalt passt, die Bedingung nicht. Die Referenzen messen hier verschiedene Dinge.
2. **„worth exploring“ (FIND)** bewertet Silver höher als die synthetische Abstufung (4,4 gegenüber 4,3 bei promising). Silver unterscheidet zwischen „beidseitig, aber anderes Feld“ und „passt in einer Richtung klar“ kaum.
3. **Stressfall C5** (Kundenakquise ↔ Neukundengewinnung): Silver sieht volle Deckung (5,0), kein Modell erkennt sie. Silver hat hier echtes Sprachverständnis, die Modelle nicht.
4. **Unterschiede zwischen den Silver-Pässen:** R2 bewertet systematisch etwas anders als R1 (z. B. M7-ρ 0,81 gegen R2, 0,84 gegen R1). Deshalb stehen alle Silver-Kennzahlen auch einzeln gegen R1 und R2.

## 13. Was ist stabil genug für einen Produkt-Prototyp?

Stabil über Experiment 1–3, beide Referenzen und beide Silver-Pässe:

- **Zwei Stufen:** erst Zulassung, dann Relevanz. Kein Bonus für eine erfüllte Bedingung.
  - FIND-Gate: ausdrückliche Must-haves beider Seiten und „beide onsite an verschiedenen Orten“. Silver-Ausschlüsse fehlerfrei getroffen.
  - CONNECT-Gate: Laufzeit und regional-vor-Ort. Alle Silver-Ausschlüsse dieser Art getroffen.
- **Unbekannt ist kein Konflikt.** Platzhalter wie „DACH“ erfüllen keinen konkreten Ort.
- **Relevanz aus Bedarf**, best match je Bedarf. Nur `own` mit Erfahrung zählt voll, `grow_into` nie. Breite Capability-Listen erzeugen keinen Bonus.
- **FIND gegenseitig mit Min-Betonung (0,6/0,4).** CONNECT gerichtet ohne Gegenseitigkeit.
- **CONNECT mit Themenpflicht**, Branche und Kategorie nur ergänzend, mit Wörterbuch plus generischer Schicht.
- **Relevanz und Confidence getrennt ausgeben.**

## 14. Was muss vor einer Produktimplementierung offen bleiben?

1. **PH1 als Standard:** Der Asymmetrie-Gewinn ist bestätigt, ein Gesamtgewinn nicht, und PH1 bevorzugt dünne Profile (1,37). Nächster Schritt: PH1 mit neutralerem Modulator (z. B. Populationsmedian statt 0,5), vorab festgelegt.
2. **Generalisten:** Der Vorteil aus der Zahl der Rollen ist real. Ob er fachlich gewollt ist, müssen echte Menschen entscheiden.
3. **CONNECT-Gleichstände im unteren Bereich** und echte Synonyme (C5).
4. **Primärmetrik für CONNECT:** Q2 (anzeigen) statt Q1 (Deckung). Für v04 vorab festlegen.
5. **Silver ist keine menschliche Referenz.** Vor einer Produktentscheidung sollten mindestens die 80 Development-Paare von Menschen bewertet werden; erst danach einmalig der Holdout.
6. **Wörterbuch-Unabhängigkeit:** Test mit Schreibweisen, die nicht vom Datensatz-Autor stammen.

---

### RECOMMENDED FIND STRUCTURE

1. **Gate (eligible / uncertain / not eligible)**
   - ausdrückliche Must-haves beider Seiten (Rolle, Stunden, Arbeitsweise, Suchstand, Start, Bereich, Expertise),
   - Ort nur bei konkretem Orts-Must-have, Gegenüber eindeutig anderswo und Must-Seite nicht remote-offen,
   - beide onsite an verschiedenen Orten.

   Unbekannt = uncertain. Kein Bonus.
2. **Gerichtete Relevanz je Richtung:** Bedarf (Rollen-Abdeckung + beste Abdeckung je abzugebendem Bereich; nur `own` mit Stufe ≥ 3 voll) als **Faktor**, moduliert durch gleiche Branche und Absicht. Der Modulator bei fehlenden Werten wird im nächsten Experiment vorab festgelegt.
3. **Gegenseitigkeit:** 0,6 · min + 0,4 · mittel.
4. **Confidence getrennt** aus Vollständigkeit; nie in den Score.
5. **Kein Generalisten-Abschlag**, nur Beobachtung.

### RECOMMENDED CONNECT STRUCTURE

1. **Gate:** Angebot aktiv, nicht abgelaufen; regional-vor-Ort verlangt denselben konkreten Ort. Unbekannt = uncertain.
2. **Relevanz (C1):**
   - 0,55 Thema + 0,20 Text + 0,15 Branche + 0,10 Kategorie,
   - ohne Themen- oder Textbezug höchstens 0,10,
   - Normalisierung: Wörterbuch + generische Schicht.
3. **Gleichstände ehrlich zeigen:** Gleiche Scores sind gleich. Aktualität ist nur sekundäre Anzeige, keine Relevanz.
4. **Gerichtet, ohne Gegenseitigkeit.** Confidence getrennt.

Weiterhin **keine Produktimplementierung**. **HOLDOUT STATUS: UNOPENED.**
