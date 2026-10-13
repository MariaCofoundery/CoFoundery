# FINAL HOLDOUT EVALUATION – Matching Engine v0.1

| | |
|---|---|
| **SPEC STATUS** | **FROZEN** |
| **SPEC HASH** | `matching-engine-v0.1-spec.md` `9d3c44b7927d96055354666eeba6fe4325eb2e1d6fd6c2e7d7928e455d0e2e6e`<br>`matching-engine-v0.1-spec.json` `d6d70cd6d27f9f9c20a67aa42b7c60e83c54516ccd615dad09a5f9cd1b63e646` |
| **CLEAN HOLDOUT** | **38** (23 FIND, 14 CONNECT, 1 CONNECT-Stressfall C4) |
| **EXCLUDED** | **RP-001**, **RP-002** – kontaminiert; vor dem Lesen verworfen, nicht in Metriken, nicht analysiert |
| **HOLDOUT STATUS AFTER RUN** | **CONSUMED** |
| Urteil | **PASS** nach vorab festgelegter Regel, mit benannten Schwächen (Abschnitt 6) |

Silver ist eine Referenz aus zwei Modell-Review-Pässen (SILVER_R1, SILVER_R2). Es gibt **keine** menschliche Ground Truth. Bewertet wird nur, wie sinnvoll ein Vorschlag aufgrund der verfügbaren Daten ist. Über Founder-Kompatibilität oder späteren Erfolg sagt diese Auswertung nichts.

## 1. Ablauf und Integrität

1. **Spec-Hash** gegen `matching-engine-v0.1-spec.sha256` geprüft: beide Dateien stimmen. Sie sind unverändert gegenüber Commit `7afb4825`.
2. **Eingefrorener Code:** alle 14 Dateien aus `research_basis.frozen_files_sha256` stimmen, darunter die v03-Modelle, die Normalisierung und das Wörterbuch (v01/v02/v03).
3. **Modelle unverändert:**
   - FIND: `F3_PH1_min60_DICT`. Gate v03, PH1 A→B und B→A, Familien-Halbwert wie eingefroren, Gegenseitigkeit 0,6·min + 0,4·mean, Confidence getrennt.
   - CONNECT: `C1_topic_required_DICT`. Gate, 0,55 topic + 0,20 text + 0,15 industry + 0,10 category, Themenpflicht-Deckel 0,10, generic2 + Wörterbuch, Confidence getrennt.
4. **Versionen:**
   - `matching-v0.1`
   - `matching-normalization-v0.1`
   - `idf_corpus_version = synthetic-v03-all-listings` (Datensatz-Korpus wie v03, Spec §11.2)
5. **Vorab-Festlegung** `preregistration_holdout_v01.json` (SHA-256 `44dbdd08d4cf656b322b59530dec978b870adf3246f41e73c7d2ab45908d80c6`):
   - Inhalt: Modelle, Versionen, Kennzahlen, Bewertungskriterien und Urteilsregel.
   - Sie wurde vor dem Laden jedes Holdout-Labels geschrieben.
   - Davor lief der Pipeline-Test ausschließlich mit Fake-Labels im Scratchpad.
6. **Scores vor den Labels festgeschrieben:** `holdout_scores_prelabel_v01.json` (SHA-256 im Ergebnis).
7. **Einmalige Öffnung:**
   - Je CSV wurden 38 Holdout-Zeilen gelesen.
   - 2 kontaminierte Zeilen wurden ungelesen verworfen.
   - 80 Development-Zeilen wurden übersprungen.
   - `holdout_access_log_v01.json` sperrt eine zweite Auswertung.
8. **Consensus:**
   - Die Regeln von v03 gelten unverändert.
   - Es gab keine neue Adjudication. Die v03-Datei enthält keinen Holdout-Code.
   - Keine yes/no-Konflikte im Holdout (Consensus-Hinweise: 0).
9. Während des Scorings waren die Referenzen gesperrt; kein Zugriff wurde blockiert. Keine Modell-, Gewichts-, Gate-, Normalisierungs- oder Schwellenänderung.

## 2. FIND (23 Paare)

| | Development (v03, n = 50) | **Holdout** (n = 23) | Δ |
|---|---|---|---|
| Q1 Spearman Consensus | 0,859 | **0,826** (Bootstrap-95 % 0,61–0,96) | −0,03 |
| Q1 Kendall τ-b | 0,709 | 0,709 | 0 |
| Q1 NDCG | 0,968 | 0,973 | +0,004 |
| Q1 paarweise korrekt (Gleichstände) | – | 0,833 (6,3 %) | |
| A→B vs. Q2 | 0,786 | **0,773** | −0,01 |
| B→A vs. Q3 | 0,887 | **0,837** | −0,05 |
| Gate vs. Q4: TP/FP/FN/TN | 9/0/0/41 | **3/0/0/19** (F1 1,0; 1 Paar „unclear“) | |
| Q1 Spearman R1 / R2 | 0,840 / 0,849 | 0,886 / **0,649** (R2-Intervall 0,24–0,89) | |
| Confidence vs. Q5 (deskriptiv) | 0,52 | 0,19 | |

**Gate:** 4 Ausschlüsse (Ort, Stunden, Suchstand, Remote + Pflichtrolle).

- Drei davon bestätigt Silver mit Q4 = yes.
- Das vierte ist RP-120 = `syn-pair0021`, der bekannte Orts-Stressfall aus v01. Silver ist dort unentschieden (unclear, Q1 4,0), die synthetische Referenz sagt „exclude“. Nach Vorab-Festlegung zählt „unclear“ nicht.
- Kein falscher Ausschluss, kein verpasster Ausschluss.

**Asymmetrie (Consensus |Q2 − Q3| ≥ 2):** 4 Fälle. In **allen 4** hat die Seite mit höherem Silver-Nutzen auch den höheren gerichteten Score.

| Fall | Q1 | Q2 / Q3 | gerichtet A→B / B→A | Score |
|---|---|---|---|---|
| RP-033 | 2,5 | 5 / 1,5 | 1,0 / 0 | 0,20 |
| RP-048 | 3,0 | 5 / 2 | 1,0 / 0 | 0,20 |
| RP-088 | 3,5 | 2,5 / 4,5 | 0,27 / 0,72 | 0,36 |
| RP-014 | 1,5 | 4 / 1,5 | 0,18 / 0 | gesperrt (Remote, Pflichtrolle), von Silver bestätigt |

- Mittlerer Score der asymmetrischen Fälle: −0,06; beidseitig hoher Nutzen (n = 14): 0,22.
- Asymmetrische Paare landen damit wie beabsichtigt unter beidseitig relevanten.

## 3. CONNECT (15 Paare inkl. C4)

| | Development (v03, n = 30) | **Holdout** (n = 15) | Δ |
|---|---|---|---|
| Q1 Spearman Consensus | 0,553 | **0,442** (Bootstrap-95 % −0,20–0,93) | −0,11 |
| Q1 Kendall τ-b | 0,433 | 0,400 | −0,03 |
| Q1 NDCG | 0,970 | 0,958 | −0,01 |
| Q2 AUC yes vs. no | 1,0 | **1,0** (Gleichstände 0) | 0 |
| Q2 monoton yes > maybe > no | ja | ja | |
| Gate vs. Q3: TP/FP/FN/TN | 4/0/7/16 | **2/0/4/7** (F1 0,50) | |
| Tie-Anteil der Scores im Set | 0,233 | 0,267 | +0,03 |
| Confidence vs. Q4 (deskriptiv) | 0,67 | 0,67 | |

**Scoreverteilung nach Q2 (Consensus; gesperrt = −1):**

| Q2 | n | Mittel | Median | Min–Max |
|---|---|---|---|---|
| yes | 5 | 0,76 | 0,83 | 0,59–0,92 |
| maybe | 4 | 0,40 | 0,34 | 0,10–0,84 |
| no | 6 | −0,28 | 0,05 | −1,0–0,13 |

**Gate:**

- **Kein falscher Ausschluss.** Die 2 Gate-Ausschlüsse (RP-038, RP-098) bestätigt Silver mit Q3 = yes.
- 4 Paare mit Q3 = yes sind **nicht** vom Gate gesperrt: RP-055, RP-056, RP-082, RP-107. Alle vier haben Score ≤ 0,13 und Q2 = no.
  - Das ist das spezifizierte Verhalten: Themen-Fehlpassung liegt nicht im Gate, sondern im Relevanz-Deckel.
  - Die Fälle sind deshalb deskriptiv, nicht als Gate-Fehler gezählt (vorab festgelegt).
- Q1 ist als Deckungsmaß für korrekt gesperrte Angebote ungeeignet (Spec §19.12). RP-038 und RP-098 haben Q1 4,5, sind aber laut Silver auszuschließen. Das drückt Q1-Spearman; Q2 (anzeigen) ist die passendere Größe.

**Stressfall C4 (RP-073, „gleiche Wörter, falscher Kontext“):**

- Das strenge Kriterium wird erfüllt: das richtige Angebot 0,92 vor dem falschen 0,63.
- Silver: Q1 5, anzeigen yes.
- In v02/v03 war C4 nicht auswertbar, weil er im Holdout lag.

## 4. SYNTHETIC REFERENCE der Holdout-Paare (getrennt von Silver)

| | Development v03 | Holdout-Paare |
|---|---|---|
| FIND excellent / promising in Top 10 | 0,95 / 0,85 | 1,0 / 1,0 (n = 4 / 3) |
| FIND asymmetric in Top 10 | 0,54 | 0,50: Seite mit Bedarf 2/2, Seite ohne Bedarf 0/2 |
| FIND exclude zugelassen | 0,025 | 0 (n = 4) |
| FIND falsch gesperrt | 0 | 0 |
| CONNECT excellent / promising in Top 10 | 0,97 / 0,90 | 1,0 / 1,0 (n = 3 / 3) |
| CONNECT low_relevance in Top 10 | 0,03 | **0,25** (1 von 4) |
| CONNECT exclude zugelassen | 0 | 0 |

## 5. Bewertung nach vorab festgelegten Kriterien

| Kriterium | Wert | Ergebnis |
|---|---|---|
| FIND Q1 Spearman Consensus (PASS ≥ 0,70) | 0,826 | PASS |
| FIND Richtung Q2/Q3 (PASS beide ≥ 0,50) | 0,773 / 0,837 | PASS |
| FIND falsche Gate-Ausschlüsse (PASS 0) | 0 | PASS |
| FIND verpasste Gate-Ausschlüsse (PASS ≤ 1) | 0 | PASS |
| FIND Asymmetrie-Richtung (PASS ≥ 2/3) | 4/4 | PASS |
| FIND Rater-Robustheit (R1 und R2 ≥ 0,40) | 0,886 / 0,649 | PASS |
| CONNECT Q2 AUC yes vs. no (PASS ≥ 0,80) | 1,0 | PASS |
| CONNECT Q1 Spearman (PASS ≥ 0,40) | 0,442 | PASS (knapp) |
| CONNECT falsche Gate-Ausschlüsse (PASS 0) | 0 | PASS |
| CONNECT yes/no-Gleichstände (PASS ≤ 0,10) | 0 | PASS |
| CONNECT Rater-Robustheit (AUC R1 und R2 ≥ 0,60) | 1,0 / 1,0 | PASS |

**Urteilsregel (vorab):** FAIL bei einem FAIL-Kriterium, sonst CONDITIONAL bei einem CONDITIONAL-Kriterium, sonst PASS. → **PASS.**

## 6. Nüchterne Einordnung

**Urteil: A) PASS.** Die Engine ist stabil genug für einen **nicht-produktiven** Produkt-Prototyp. Das Urteil folgt allein der vorab festgelegten Regel; keine Schwelle wurde nach Sicht auf die Ergebnisse gesetzt.

| Gesichtspunkt | Befund |
|---|---|
| Übereinstimmung mit Development | FIND ist fast deckungsgleich (Q1 −0,03, Q3 −0,05). CONNECT liegt bei Q1 niedriger (−0,11), trennt aber bei Q2 weiterhin perfekt. |
| Richtung der Effekte | Alle Effekte zeigen in dieselbe Richtung wie in Development. Kein Vorzeichenwechsel, Q2 bleibt monoton. |
| Gate-Fehler | Keine falschen Ausschlüsse in FIND und CONNECT. Verpasste CONNECT-Ausschlüsse sind spezifiziert und landen am Listenende. |
| Asymmetrie | 4/4 Fälle mit richtiger Richtung. Synthetisch erscheint die Seite ohne Bedarf in 0/2 Fällen in den Top 10. |
| CONNECT-Ties | Keine Gleichstände zwischen yes und no; im Set 27 %. Die Rang-10-Gleichstände im vollen Pool (82 %, Spec §19.7) bleiben eine bekannte Schwäche und wurden hier nicht neu gemessen. |
| Robustheit | R1 und R2 erfüllen beide Kriterien. Die R2-Übereinstimmung bei FIND-Q1 ist aber schwächer (0,65). |

**Grenzen dieses Ergebnisses (sie ändern das Urteil nicht, gehören aber dazu):**

1. **Kleine Stichprobe.**
   - Die Intervalle sind breit: FIND Q1 0,61–0,96, CONNECT Q1 −0,20–0,93.
   - Das CONNECT-Q1-Kriterium ist nur knapp erfüllt (0,442 vs. 0,40). Für sich genommen schließt es eine Null-Korrelation statistisch nicht aus.
2. **Silver ist keine menschliche Referenz.** Beide Pässe sind Modell-Reviews, und die Daten sind synthetisch. Über echte Schreibweisen, echte Nutzer und echte Outcomes sagt das nichts.
3. **Ein Teil der Daten war vorher bekannt.** `syn-pair0021` (RP-120) und C4 (RP-073) waren aus v01/v02 als Stressfälle bekannt, aber nicht ausgewertet.
4. **Confidence vs. Q5 bei FIND** fällt von 0,52 auf 0,19. Das ist nur beschreibend. Es stützt die Entscheidung, keine nutzerseitigen Confidence-Stufen zu zeigen.

**Verbleibende Fehlerklassen** (dokumentiert, nicht behoben):

- **CONNECT:**
  - Themenfremde Angebote bleiben zugelassen (4 Fälle) und hängen am Deckel 0,0–0,13. Ob sie angezeigt werden, hängt an Listenlänge und Anzeige.
  - Ein low_relevance-Angebot (1 von 4) erreicht synthetisch die Top 10.
  - Zwei unsichere Silver-Fälle (RP-104, RP-109: Q1 3, „maybe“, Reviewer-Sicherheit 1) liegen am Deckel 0,10, möglicherweise unterbewertet.
- **FIND:**
  - Hoch bewertete Paare werden teils nur mittel gerankt: RP-034 (Q1 5,0) erreicht Score 0,31, Platz 11 von 23.
  - Fünf Paare haben Score 0 bei Q1 1,5–2,5, also einen Gleichstand am unteren Ende.
  - Orts-Grenzfall RP-120: Das Gate sperrt, Silver ist unentschieden.
- Bekannte Schwächen aus Spec §19 bleiben bestehen: Generalisten-Exposition, Sparse-Bevorzugung, Wörterbuchabhängigkeit, fehlende Synonyme (C5), CONNECT-Ties im Pool.

## 7. Danach

- Holdout: **CONSUMED**. Eine weitere Auswertung dieser 38 Paare ist kein Holdout mehr. Jede Modelländerung danach wird `matching-v0.2` und braucht neue, unabhängige Daten (Spec §22).
- Die Spec-Dateien wurden nicht verändert. Der Status CONSUMED steht in diesem Ordner, nicht in der eingefrorenen Spec.
- Keine Modelländerung, keine Produktimplementierung, keine DB, keine Änderungen unter `web/` oder `supabase/`.
