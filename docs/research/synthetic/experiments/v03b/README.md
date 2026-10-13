# v03b – Capability-Family-Ablation

Kleiner vorab festgelegter Development-Test für Matching Engine v0.1, offener Punkt 2 („Familien-Halbwert“). Ergebnis und Einordnung: [`report_v03b.md`](report_v03b.md).

| Datei | Inhalt |
|---|---|
| `models_v03b.py` | `F3_BASELINE` (= v03 `F3_PH1_min60_DICT`, importiert) und `F3_NO_FAMILY` (nur `family_credit=False`) |
| `run_experiment_v03b.py` | Rauchtest, Festlegung, Lauf |
| `preregistration_v03b.json` | Vorab-Festlegung: Modelle, Kennzahlen, Entscheidungsregel, Toleranzen, Hashes |
| `results_v03b.json` | Ergebnisse (deterministisch) |
| `report_v03b.md` | Bericht |

```bash
# aus dem Repo-Root
python3 -I docs/research/synthetic/experiments/v03b/run_experiment_v03b.py --smoke   # ohne Referenzen
python3 -I docs/research/synthetic/experiments/v03b/run_experiment_v03b.py           # prüft Festlegung, rechnet
```

`--preregister` überschreibt keine vorhandene Festlegung. `--unlock-holdout` bricht ab.

**Abhängigkeiten (eingefroren):** `../v03/matching_models_v03.py`, `normalization_v03.py`, `silver_reference_v03.py`, `silver_adjudication_v03.json` sowie die v01/v02-Module, die diese importieren. Die Eingaben sind `profiles.json`, `reference_pairs.json`, `reference_annotations.json`, die Silver-CSV-Dateien und Split-/Sample-Keys aus `v02/`.

**HOLDOUT STATUS: 38 CLEAN / UNOPENED.** RP-001/RP-002 sind kontaminiert und ausgeschlossen. Silver ist eine Development-Referenz aus Modell-Review-Pässen, keine menschliche Ground Truth.
