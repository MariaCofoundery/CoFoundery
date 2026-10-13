# Matching-Experiment 2 (v0.2)

Prüft die führenden Hypothesen aus Experiment 1 – **FIND: M7**, **CONNECT: M7core** – gegen gezielte Varianten für:
- Generalisten-Bias,
- Asymmetrie,
- fehlende Daten,
- Ort/Remote,
- Normalisierung,
- neue CONNECT-Stressfälle.

**Keine Produktentscheidung, keine Produktimplementierung.**

Experiment 1 (`../`) bleibt unverändert; seine Module werden nur importiert.

## Dateien

| Datei | Inhalt |
|---|---|
| `run_experiment_v02.py` | Laufskript; `--smoke` prüft nur Lauffähigkeit und exakte Baseline-Gleichheit (ohne Ground Truth) |
| `matching_models_v02.py` | alle Varianten (unten), Baseline aus v01 importiert |
| `normalization_v02.py` | neue generische Normalisierung `generic2` + Kombination mit dem eingefrorenen Wörterbuch |
| `connect_stress_v02.json` | 13 neue CONNECT-Stressfälle (`v02_connect_stress`) mit Erwartung und Prüfkriterium |
| `preregistration_v02.json` | SHA-256 der vier obigen Festlegungsdateien vor dem Volllauf |
| `results_v02.json` | alle Kennzahlen |
| `report_v02.md` | Bericht |
| `build_human_label_sample_v02.py` | baut die Stichprobe für menschliche Labels (nutzt keine Modellergebnisse) |
| `human_label_sample_v02.json` | 120 Paare in Reviewer-Sicht, ohne Klasse und ohne Score |
| `human_label_sample_key_v02.json` | interne Zuordnung Stichprobe → Referenzpaar; **nicht an Reviewer geben** |
| `human_label_protocol_v02.md` | Review-Fragen und Ablauf |

## Ausführen

```bash
python3 docs/research/synthetic/experiments/v02/run_experiment_v02.py --smoke
python3 docs/research/synthetic/experiments/v02/run_experiment_v02.py
python3 docs/research/synthetic/experiments/v02/build_human_label_sample_v02.py
```

## Vorab-Festlegung

Die Festlegung ist durch Hashes in `preregistration_v02.json` belegt. `results_v02.json → meta.preregistration` zeigt, ob die Dateien seit der Festlegung verändert wurden.

### Baseline (eingefroren)

- **FIND `M7`** = v01 M7, exakt:
  - Gate auf die ausdrücklichen Must-haves beider Seiten plus „beide onsite an verschiedenen Orten“,
  - gerichtete Relevanz `need×2 + context + complement + intent`, fehlende Gruppen = 0,
  - Gegenseitigkeit `0,6·min + 0,4·mittel`.
- **CONNECT `M7core`** = v01 M7core: Gate plus Thema×2, Kategorie, Branche, fehlende Komponenten herausgerechnet.
- **Rauchtest:** Die v02-Maschinerie liefert mit Baseline-Einstellungen für alle 24.180 FIND- und 29.774 CONNECT-Paare exakt dieselben Scores und Zulassungen wie v01. Das wurde vor der Festlegung geprüft.

### Varianten (je genau ein Baustein geändert)

**Generalisten (Bedarf A → B)**

| Name | Regel |
|---|---|
| `G1_best_match` | Exklusive Zuordnung: Jeder Eintrag von B (exakt oder gleiche Familie) bedient höchstens einen Bedarf von A; gierig nach Wert. |
| `G2_saturation` | Je Bedarf werden mehrere passende Einträge von B addiert, aber bei 1 gekappt (Sättigung statt Maximum). |
| `G3_breadth_evidence` | Eine angebotene Rolle zählt nur so viel, wie Bereichstiefe in ihrer Capability-Familie sie belegt: `own` und Stufe ≥ 3 = 1, `contribute` und Stufe ≥ 3 = 0,6, sonst 0,4; ohne sichtbare Capabilities 0,5. Rolle → Familie: siehe `ROLE_FAMILIES`. |
| `G4_rare_need` | Bedarf als gewichtetes Mittel; Gewicht je Rolle/Bereich = 1 + ln((N+1)/(Anbietende+1)) im Pool. Seltener Bedarf zählt mehr. |

**Gegenseitigkeit (FIND)**

| Name | Regel |
|---|---|
| `A1_threshold_t` (t = 0,20 / 0,30 / 0,40) | Paare mit min(A→B, B→A) < t rutschen in eine zweite Stufe hinter alle anderen; sie werden nicht entfernt. |
| `A2_geometric` | √(x·y) |
| `A3_harmonic` | 2xy/(x + y) |
| A4 | = `M7` (0,6·min + 0,4·mittel), kein eigener Lauf |
| `A5_min_0.75` | 0,75·min + 0,25·mittel |
| `A6_need_only_mutual` | Gegenseitigkeit nur über den Bedarf (min-betont); Branche und Absicht als symmetrische Paarfaktoren; ohne `complement` |

**Fehlende Daten** (Confidence immer getrennt)

| Name | Regel |
|---|---|
| `D1_neutral_0.5` | unbekannte Gruppe = 0,5 |
| `D1_neutral_median` | unbekannte Gruppe = Median dieser Gruppe über alle Paare des Pools (aus Profildaten) |
| `D2_shrink_0.5` | `share·beobachtet + (1 − share)·0,5`; `share` = Gewichtsanteil der bekannten Gruppen |
| `D2_shrink_median` | wie D2, Prior = Median der vollständig beobachteten Scores im Pool |
| `D3_min_evidence` | wie `D2_shrink_0.5`; zusätzlich zweite Stufe („insufficient evidence“), wenn `share` < 0,6 in einer Richtung oder die Profil-Confidence < 0,5 ist |

**Ort / Remote** (nur das Gate ändert sich)

| Name | Regel |
|---|---|
| `L1_strict` | Siehe Tabelle unten. |
| `L2_region` | wie L1; hybrid/flexibel untereinander bzw. mit onsite reicht dieselbe Region (Bundesland/Land). Onsite ↔ onsite braucht denselben Ort. |
| `L3_strict_confidence` | Gate wie L1, zusätzlich eine eigene Orts-Confidence. Sie fließt **nicht** in den Score. |

Semantik von `L1_strict`:

| Kombination | Regel |
|---|---|
| remote ↔ remote / flexible / hybrid | kompatibel |
| remote ↔ onsite | nur kompatibel, wenn die onsite-Seite `remote` in `acceptedRemoteModes` hat |
| onsite ↔ onsite | gleicher normalisierter Ort |
| hybrid oder flexibel ↔ onsite oder hybrid | gleicher Ort |
| flexibel ↔ flexibel | kompatibel |
| Platzhalter („DACH“) | erfüllt keinen konkreten Ort |
| unbekannt | kein Konflikt, kein Bonus |

**Normalisierung** (nur Freitext-Vergleiche ändern sich)

| Name | Regel |
|---|---|
| `N_v01_generic` | v01-Stufe `generic` (ohne Wörterbuch) |
| `N_generic2` | neue generische Schicht `generic2` (siehe `normalization_v02.py`, ohne Begriffswissen) |
| `N_dict+generic2` | Wörterbuch, wo beide Begriffe bekannt sind, sonst `generic2` |

**A priori festgelegte Kombinationen** (aus Begründung gewählt, nicht aus Ergebnissen)

| Name | Bausteine |
|---|---|
| `M7v2a` | G3 + A5 + D2 (0,5) + L1 + dict+generic2 |
| `M7v2b_blind` | wie M7v2a, aber nur `generic2` (ohne Wörterbuch) |

**CONNECT**

| Name | Regel |
|---|---|
| `M7core` | Baseline |
| `C_L1_strict` | regional vor Ort braucht denselben Ort, Platzhalter erfüllen keinen Ort, unbekannt = kein Konflikt |
| `C_v01_generic` | v01 generic |
| `C_generic2` | neue generische Schicht |
| `C_dict+generic2` | Wörterbuch + generische Schicht |
| `C_f1_breadth` | Thema = harmonisches Mittel aus „Anteil der Suchthemen gedeckt“ und „Anteil der Angebotsthemen, die gesucht werden“ (gegen breite Angebote) |
| `M7core_v2` | vorab festgelegte Kombination: dict+generic2 + C_L1 |

### Vorab benannte Erwartungen (Hypothesen, nicht Ergebnisse)

- **Generalisten:** G3 senkt die Exposition von Generalisten am stärksten, ohne excellent/promising zu verlieren. G2 kann sie erhöhen.
- **Asymmetrie:** stärkere Min-Betonung und Schwellen senken den Top-10-Anteil der Seite ohne Bedarf, kosten aber einige promising-Paare.
- **Fehlende Daten:** D2/D3 bringen Sparse-Profile näher an normale Profile als M7 (0 für Unbekanntes) und M8 aus v01 (herausrechnen).
- **Ort:** L1 sperrt `syn-pair0021`-artige Fälle (Platzhalter vs. konkreter Ort), sperrt aber mehr positive Paare fälschlich als L0.
- **Normalisierung:** `generic2` liegt zwischen v01 generic und dem Wörterbuch; in CONNECT ist der Abstand zum Wörterbuch groß.

### CONNECT-Stressfälle

- Die Fälle stehen in `connect_stress_v02.json` und wurden **vor** dem Volllauf geschrieben.
- Jeder Fall hat Erwartungsnoten (3/2/1/0 oder `gate`) und Prüfkriterien (`order`, `top`, `not_top`, `gated`, `eligible`).
- Kandidaten sind alle 172 Angebote des Datensatzes plus die Stress-Angebote; der Datensatz selbst bleibt unverändert.
- Vor dem Schreiben der Fälle lief nur ein Einzeltest des Matchers (Wortpaare, keine Modellergebnisse auf Daten). Ergebnis: „Marketing“ ~ „Marketplace“ ist ein generischer Fehltreffer, „München“ ≠ „Munich“ ohne Wörterbuch. Die Fälle wurden danach nicht angepasst.

## Regeln

- Ground Truth (`reference_*`) ist während des Scorings technisch gesperrt; Modellcode hat keinen Dateizugriff.
- Kein Workstyle, keine Testannotationen als Eingabe.
- Nur `own` ist Ownership; `grow_into` deckt nichts ab.
- Kein Tuning: nur die oben festgelegten Varianten.
- Was nach Sicht auf Ergebnisse entsteht, heißt im Bericht **POST-HOC**.
- Keine Änderungen unter `web/` oder `supabase/`, keine Datenbank.
