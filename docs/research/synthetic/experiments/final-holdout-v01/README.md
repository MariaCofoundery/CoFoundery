# final-holdout-v01 – Einmalige Holdout-Auswertung Matching Engine v0.1

**HOLDOUT STATUS: CONSUMED.** Die 38 sauberen Holdout-Paare sind einmal ausgewertet und sind damit kein Holdout mehr. RP-001 und RP-002 sind kontaminiert und wurden ungelesen verworfen. Ergebnis und Einordnung: [`report_holdout_v01.md`](report_holdout_v01.md).

| Datei | Inhalt |
|---|---|
| `run_holdout_v01.py` | prüft Spec-Hash und eingefrorenen Code, Festlegung, Scoring, einmalige Öffnung, Auswertung |
| `preregistration_holdout_v01.json` | vor dem Laden der Labels: Modelle, Versionen, Kennzahlen, Kriterien, Urteilsregel |
| `holdout_scores_prelabel_v01.json` | Scores aller 38 Ziele, festgeschrieben **vor** dem Laden der Labels |
| `holdout_access_log_v01.json` | Protokoll der Öffnung; blockiert jede zweite Auswertung |
| `holdout_evaluation_v01.json` | Ergebnisse: FIND, CONNECT, Synthetic der Holdout-Paare, Development-Vergleich, Kriterien, Urteil |
| `diagnostics_holdout_v01.json` | je Paar Score, Gate, Gründe, Consensus-Labels |
| `report_holdout_v01.md` | Bericht |

```bash
# aus dem Repo-Root – nur zur Nachvollziehbarkeit; ein echter Lauf bricht ab (CONSUMED)
python3 -I docs/research/synthetic/experiments/final-holdout-v01/run_holdout_v01.py --dry-run <ordner-mit-fake-csv>
```

**Grundlage (eingefroren):** `docs/research/matching-engine-v0.1-spec.{md,json}` (Hashes in `matching-engine-v0.1-spec.sha256`, Freeze `matching-engine-v0.1-freeze.md`). Der Code kommt aus `../v03/`, `../v02/`, `../matching_models_v01.py` und `../normalization_v01.py`; die Hashes stehen in der Spec-JSON und wurden vor dem Lauf geprüft.

Silver ist eine Referenz aus Modell-Review-Pässen, keine menschliche Ground Truth.
