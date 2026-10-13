# Matching-Experiment 3 (v0.3)

Prüft die Hypothesen aus Experiment 1 und 2 gegen **zwei getrennte Referenzschichten**:

| Referenz | Was sie ist |
|---|---|
| **SYNTHETIC REFERENCE** | die konstruktiv erzeugte Ground Truth des synthetischen Datensatzes |
| **SILVER DEVELOPMENT REFERENCE** | qualitative Gegenprüfung durch zwei getrennte **Modell**-Review-Pässe (SILVER_R1, SILVER_R2) auf den 80 Development-Paaren |

Keine der beiden ist „wahre Founder-Kompatibilität“. Bewertet wird nur, wie sinnvoll es aufgrund der verfügbaren Daten wäre, einen Kontakt vorzuschlagen.

**Die Silver Labels sind keine unabhängige menschliche Ground Truth.**

**HOLDOUT STATUS: UNOPENED.** Keine Produktimplementierung, keine Datenbank, keine Änderungen unter `web/` oder `supabase/`.

## Ablauf (technisch erzwungen)

```bash
python3 docs/research/synthetic/experiments/v03/run_experiment_v03.py --smoke        # Lauffähigkeit, exakte Baselines
python3 docs/research/synthetic/experiments/v03/run_experiment_v03.py --dry-run DIR  # nur mit Platzhalter-Labels in DIR
python3 docs/research/synthetic/experiments/v03/run_experiment_v03.py --preregister  # Festlegung schreiben (einmalig)
python3 docs/research/synthetic/experiments/v03/run_experiment_v03.py                # Lauf
```

**Festlegung:**
- `--preregister` schreibt `preregistration_v03.json`: Modelle, Formeln, Gewichte, Gates, Normalisierung, Schwellen, Metriken, Entscheidungsregeln sowie die SHA-256 aller Modell-, Normalisierungs-, Silver- und Laufdateien und der eingefrorenen Vorgänger-Dateien.
- Eine vorhandene Datei wird nicht überschrieben.
- Der Lauf vergleicht die Festlegung vollständig mit dem aktuellen Stand und bricht bei jeder Abweichung ab.

**Sperren:**
- Während des Scorings blockiert ein Wächter jede Datei mit `reference_` oder `silver_labels` im Namen.
- Silver Labels werden nur danach und nur für Development gelesen. Holdout-Zeilen werden verworfen, **bevor** ihre Antwortspalten gelesen werden.
- `--unlock-holdout` bricht in v03 immer ab.
- Die Referenzpaare der 40 Holdout-Stichprobenpaare werden auch aus der SYNTHETIC-Auswertung entfernt, ebenso ein Stressfall, der im Holdout steht.

## Modelle

| FIND | Struktur |
|---|---|
| F0_M7 | M7 aus v02, unverändert |
| F1_PH1_exact | `posthoc_v02.score_ph1`, unverändert (M7-Gate, v01-Wörterbuch) |
| F2_PH1_min75_{DICT,GENERIC} | PH1-Richtungsrelevanz, 0,75·min + 0,25·mittel, Gate v03 |
| F3_PH1_min60_{DICT,GENERIC} | PH1-Richtungsrelevanz, 0,60·min + 0,40·mittel, Gate v03 |

| CONNECT | Struktur |
|---|---|
| C0_M7core | M7core aus v01, unverändert |
| C1_topic_required_{DICT,GENERIC} | Gate v03 → 0,55 topic + 0,20 text + 0,15 industry + 0,10 category; ohne Themenbezug höchstens 0,10 |
| C2_coverage_{DICT,GENERIC} | Gate v03 → 0,75 coverage (bester Angebotsaspekt je Bedarf, Spezifität über IDF) + 0,15 industry + 0,10 category; ohne Coverage höchstens 0,10 |

**PH1-Richtungsrelevanz:** `rel(X→Y) = need(X→Y) × (0,5 + 0,5·mod)`.
- `need` ist der v01-Bedarf: best match je Bedarf; nur `own` mit Stufe ≥ 3 zählt voll; `grow_into` deckt nichts ab.
- `mod` ist das Mittel aus gleicher Branche und Absicht, soweit bekannt.

**Vorab vermerkt:** `mod` ist symmetrisch, deshalb ist F3 rechnerisch PH1. F3 unterscheidet sich von F1 nur durch das Gate v03 und die Normalisierung und ist damit der Kontrollfall für den Gate-Effekt.

**Gate v03 (FIND):** Must-haves beider Seiten. Ort nur, wenn alle drei Bedingungen gelten:
1. Es gibt ein **konkretes** Orts-Must-have,
2. das Gegenüber ist eindeutig anderswo (ein Platzhalter wie „DACH“ erfüllt keinen Ort),
3. die Must-Seite ist nicht remote/flexibel und lässt remote nicht zu.

Dazu kommt „beide onsite an verschiedenen Orten“. Unbekannt heißt `uncertain`, nie Konflikt. Das Gate gibt keinen Bonus.

**Normalisierung:**
- N-GENERIC = `generic2` (v02).
- N-DICTIONARY = eingefrorenes v01-Wörterbuch + `generic2`.
- Neu ist nur ein IDF-gewichteter Textvergleich für Titel und Beschreibung in CONNECT, berechnet aus den Produktdaten.

## Silver Consensus

| Art | Regel |
|---|---|
| ordinal | Mittelwert von R1 und R2 |
| kategorial, gleich | dieser Wert |
| kategorial, mit maybe/unclear | maybe/unclear |
| kategorial, yes/no | nur adjudiziert |

Einzige Adjudication: RP-081 (`silver_adjudication_v03.json`). Confidence-Antworten werden nur deskriptiv verwendet.

Alle Silver-Kennzahlen werden gegen **R1, R2 und Consensus getrennt** berichtet.

## Entscheidungsregeln

Die Regeln stehen vollständig in `preregistration_v03.json → decision_rules`. Ein Kandidat schlägt die Baseline nur, wenn **alle** fünf Kriterien erfüllt sind.
