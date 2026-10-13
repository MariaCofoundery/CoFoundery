# Experiment v03b – Capability-Family-Ablation

| | |
|---|---|
| Frage | Kann der Familien-Halbwert (same-family partial credit × 0,5) aus F3 entfernt werden? |
| Vorab-Festlegung | `preregistration_v03b.json`, SHA-256 `95197de95f0c85022e6089e5ad075fdf7af48fd66229805c700581292e0a51a1` |
| Datengrundlage | SYNTHETIC (400 Development-Referenzpaare, Holdout-Paare ausgeschlossen) und SILVER DEVELOPMENT REFERENCE (50 FIND-Paare) |
| Holdout | **38 CLEAN / UNOPENED**; RP-001, RP-002 kontaminiert und ausgeschlossen. Je 40 Holdout-Zeilen in R1/R2 vor dem Lesen verworfen. |
| Ergebnis | **F3_NO_FAMILY wird nicht übernommen.** Der Familien-Halbwert bleibt wie getestet. |

Silver ist keine menschliche Ground Truth, sondern zwei Modell-Review-Pässe.

## Modelle

| Modell | Definition |
|---|---|
| `F3_BASELINE` | v03 `F3_PH1_min60_DICT`, unverändert importiert. Der Rauchtest bestätigt Gleichheit mit v03 für alle 24 180 Pool-Paare. |
| `F3_NO_FAMILY` | identisch; einzige Änderung `family_credit=False`. Ein Eintrag derselben Capability-Familie bringt 0 statt 0,5 × Wert. |

Annahme: Alle synthetischen Personen haben der Matching-Nutzung von Capability-Bereich, Erfahrung und Verantwortungswunsch zugestimmt (volle Sicht wie v03).

## Vorab festgelegte Entscheidungsregel

`F3_NO_FAMILY` wird nur übernommen, wenn **alle** Kriterien gelten:

| Kriterium | Schwelle |
|---|---|
| Silver Q1 (Spearman, Consensus) | ≥ Baseline − 0,02 |
| Silver Q2 und Q3 | je ≥ Baseline − 0,02 |
| Gate | identischer Zustand für alle Paare und identische Silver-Gate-Kennzahlen |
| Synthetic Kontrast-NDCG@10 | ≥ Baseline − 0,02 |
| Asymmetrie erhalten (konstruiert, Seite ohne Bedarf in Top 10) | ≤ Baseline + 0,05 **und** ≤ M7 (0,9231) − 0,10 |

Der M7-Referenzwert wurde vor der Festlegung aus `results_v03.json` übernommen. Ein zunächst eingetragener Wert von 0,9167 war falsch und wurde vor dem Schreiben der Festlegung korrigiert.

## Ergebnis

**Wirkung:** 6 836 von 24 180 Pool-Paaren (28 %) haben einen anderen Score. Kein Gate-Zustand ändert sich.

### Silver (50 FIND-Paare, Development)

| | Baseline | NO_FAMILY | Δ |
|---|---|---|---|
| Q1 Spearman Consensus | 0,8588 | 0,8643 | +0,006 |
| Q1 Spearman R1 / R2 | 0,8395 / 0,8494 | 0,8549 / 0,8435 | +0,015 / −0,006 |
| Q1 Kendall Consensus | 0,7093 | 0,7191 | +0,010 |
| Q1 paarweise (Gleichstände) | 0,852 (3,9 %) | 0,849 (4,9 %) | −0,003 |
| Q2 (A→B) | 0,7861 | 0,7874 | +0,001 |
| Q3 (B→A) | 0,8869 | 0,8908 | +0,004 |
| Gate vs. Q4 F1 Consensus | 1,0 | 1,0 | 0 |

### Synthetic (Development)

| | Baseline | NO_FAMILY | Δ |
|---|---|---|---|
| NDCG@10 gesamt | 0,763 | 0,789 | +0,026 |
| NDCG@10 konstruiert | 0,777 | 0,808 | +0,031 |
| NDCG@10 Kontrast | 0,454 | 0,466 | +0,012 |
| excellent / promising in Top 10 | 0,95 / 0,85 | 0,975 / 0,88 | + |
| falsch gesperrt | 0 | 0 | 0 |
| asym. konstruiert: Seite **mit** Bedarf in Top 10 | 0,846 | 0,962 | +0,115 |
| asym. konstruiert: Seite **ohne** Bedarf in Top 10 | **0,615** | **0,769** | **+0,154** |
| asym. Kontrast: Seite ohne Bedarf in Top 10 | 0,071 | 0,000 | −0,071 |
| Exposition Generalisten / normal | 2,36 | 2,07 | −0,29 |
| Exposition Sparse / normal | 1,37 | 1,58 | +0,21 |
| Exposition Spezialistinnen | 0,006 | 0,000 | − |

### Entscheidung

| Kriterium | erfüllt |
|---|---|
| Silver Q1 | ja |
| Silver Q2/Q3 | ja |
| Gate unverändert | ja |
| Synthetic Kontrast | ja |
| Asymmetrie erhalten | **nein** (+0,154 > +0,05; die zweite Bedingung 0,769 ≤ 0,823 wäre erfüllt) |

**→ `adopt_F3_NO_FAMILY = false`.** Der Familien-Halbwert bleibt in `matching-v0.1`. Die Schwellen werden nachträglich nicht verändert.

## Einordnung

- **Kann der Familien-Halbwert entfernt werden?** Nicht nach der vorab festgelegten Regel. Silver ist neutral, und die Gesamt-Rankings sind synthetisch sogar besser. Ohne Familien-Gutschrift rückt aber die Seite **ohne** Bedarf bei konstruierten asymmetrischen Paaren häufiger in die Top 10. Damit geht ein Teil des PH1-Asymmetriegewinns gegenüber M7 verloren (M7 0,92 → Baseline 0,62 → NO_FAMILY 0,77).
- **Widersprechen sich Silver und Synthetic?** Nein. Silver misst keine Asymmetrie-Ränge und hat nur 6 asymmetrische Paare. Q2/Q3 bleiben praktisch gleich. Die Silver-Unterschiede (+0,006 Consensus, R1 +0,015, R2 −0,006) liegen im Rauschen. Das ausschlaggebende Kriterium wird nur synthetisch gemessen, und dort liegt die Verschlechterung klar über der Toleranz.
- **Nebenbefunde (beschreibend, nicht entscheidungsrelevant):** Ohne Familien-Gutschrift sinkt die Generalisten-Exposition (2,36 → 2,07), dafür steigt die Sparse-Exposition (1,37 → 1,58). Plausible Ursache: Familien-Treffer heben Profile mit vielen Capability-Einträgen; ohne sie gewinnt `mod = 0,5` bei dünnen Profilen relativ an Gewicht. Das ist nicht getestet und rechtfertigt keine Formeländerung.
- Keine Gewichtssuche, keine neue Formel, keine weitere Variante.

## Integrität

- Während des Scorings waren `reference_*` und `silver_labels*` gesperrt. Keine Lesezugriffe wurden blockiert, keine fanden statt.
- Silver nur über `silver_reference_v03.load_silver`: Holdout-Zeilen werden vor dem Lesen verworfen (R1 40, R2 40). `--unlock-holdout` bricht ab.
- Referenzpaare der Holdout-Stichprobe sind auch aus SYNTHETIC ausgeschlossen (400 von 439 verwendet).
- Die Festlegung enthält Hashes von `models_v03b.py`, `run_experiment_v03b.py` und den eingefrorenen v03-Dateien. Der Lauf bricht bei Abweichung ab.
- Ein Lauf ist deterministisch; `results_v03b.json` enthält keine Zeitstempel.
