# Matching-Experiment 1 (v0.1)

Vergleicht mehrere Modellstrukturen für FIND (Person ↔ Person, gegenseitig) und CONNECT (Suche → Angebot, gerichtet) auf dem synthetischen Datensatz in `docs/research/synthetic/`.

**Ergebnis und Einordnung:** [`report_v01.md`](report_v01.md).

## Dateien

| Datei | Inhalt |
|---|---|
| `run_experiment_v01.py` | Laufskript: Laden → Scoring (Ground Truth gesperrt) → Auswertung → `results_v01.json` |
| `matching_models_v01.py` | Modelle M0–M8 (+ Varianten, Ablationen); liest selbst keine Dateien |
| `normalization_v01.py` | alle Normalisierungsregeln (exact / generic / synonym), vollständig sichtbar |
| `results_v01.json` | alle Kennzahlen, Stresspaare, Bias, Robustheit |
| `report_v01.md` | Bericht |

## Ausführen

Aus der Repository-Wurzel, mit Python 3 ohne Zusatzpakete. Laufzeit etwa 15 s.

```bash
python3 docs/research/synthetic/experiments/run_experiment_v01.py
```

Der Lauf ist deterministisch: `results_v01.json` ist bei jedem Lauf byte-identisch, auch mit anderem `PYTHONHASHSEED`. Es entsteht kein `__pycache__`.

## Regeln, die technisch durchgesetzt sind

- **Ground Truth erst nach dem Scoring.**
  - Während alle Modelle ranken, blockiert ein Wächter jedes Öffnen einer Datei mit `reference_` im Namen. Ein Versuch würde den Lauf abbrechen.
  - Das Skript rankt deshalb für **alle** 156 FIND-aktiven Personen und **alle** 173 Suchen-Einträge, ohne zu wissen, welche davon in Referenzpaaren vorkommen.
  - `results_v01.json → meta.guard_blocked_reads` muss leer sein.
- **Modellcode ohne Dateizugriff.** `matching_models_v01.py` und `normalization_v01.py` enthalten kein `open()` und keinen Import von `os`. Sie bekommen nur die Produktprofile als Objekte.
- **Keine Testannotationen als Eingabe.** Weder `reference_annotations.json` noch Felder wie `scenario`, `canonical_*`, `designed_*` oder `known_constraints` kommen in den Modellen vor.
- **Kein Workstyle im Ranking.** `workstyle_core.json` wird erst nach der Auswertung für eine Demonstration von Gesprächspunkten geladen. Gezeigt wird nur bei beidseitiger Zustimmung, ohne Zahl.
- **Ownership:** Nur `ownership_wish == "own"` ist ein Ownership-Wunsch, `grow_into` deckt nichts ab. Erfahrung (`application_level`) und Wunsch (`ownership_wish`) werden getrennt bewertet.
- **Keine Optimierung:** Es gibt feste Gruppengewichte und genau eine Sensitivität (gleiche Gewichte). Zwei nachträglich entworfene Varianten (`M8s`, CONNECT `M7core`) sind im Bericht als solche markiert.

## Nicht Gegenstand

Keine Produktimplementierung, keine Datenbank, keine Supabase-Daten, keine Änderung unter `web/` oder `supabase/`. Das Skript liest nur Dateien: den synthetischen Datensatz und Migrationsdateien (Capability-Taxonomie, Workstyle-Items).
