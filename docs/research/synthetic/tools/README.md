# Synthetischer Matching-Datensatz v0.1 – Werkzeuge

Generator und Validator für die synthetische Testpopulation der Made2Found Matching Engine v0.1.

## Zweck

Die Werkzeuge erzeugen und prüfen einen **vollständig synthetischen** Datensatz:

- 200 Profile in der heutigen Produktstruktur,
- 439 Referenzpaare mit Klasse, Einzeldimensionen und Begründung.

Damit lassen sich FIND- und CONNECT-Matching gegen eine unabhängige Referenz prüfen. Beide Skripte sind deterministisch: Derselbe Aufruf erzeugt byte-identische Dateien.

- Methodik: [`../../matching-v0.1-synthetic-methodology.md`](../../matching-v0.1-synthetic-methodology.md)
- Referenzpaare: [`../../matching-v0.1-reference-pairs.md`](../../matching-v0.1-reference-pairs.md)

## Source of Truth

**Datenstruktur, Felder und Wertelisten:** [`docs/research/matching-v0.1-data-inventory.md`](../../matching-v0.1-data-inventory.md).

**Aus den Migrationen gelesen, nicht abgeschrieben:**

- die 54 Capability-Bereiche (`insert into public.capability_areas` in `supabase/migrations/`),
- die 29 Workstyle-Kernitems (`supabase/migrations/20261113121000_workstyle_v3_item_seed.sql`, `usage = core`).

Ändern sich diese Migrationen, ändert sich der Datensatz. Der Validator meldet das dann.

## Seeds

| Zufallsstrom | Seed | steuert |
|---|---|---|
| Profile und Referenzpaare | `20261013` | alles außer Workstyle |
| Workstyle | `9029` | nur `workstyle_core.json` |

Beide stehen als Konstanten (`SEED_PROFILES`, `SEED_WORKSTYLE`) am Anfang von `generate_profiles.py`. Der Workstyle-Seed lässt sich mit `--workstyle-seed` überschreiben. Das ist nur für den Unabhängigkeitsnachweis gedacht.

Die Ausgabe hängt nicht von `PYTHONHASHSEED` ab.

## Erzeugte Dateien

Alle Dateien liegen in `docs/research/synthetic/`.

| Datei | Inhalt | Eingabe für eine Engine? |
|---|---|---|
| `profiles.json` | 200 Rohprofile (person_core, Capability, FIND, CONNECT) | ja |
| `workstyle_core.json` | 29 Workstyle-Kernantworten je Profil | nur für Erklärungen |
| `reference_annotations.json` | Testannotation je Profil (kanonische Werte, Szenario) | **nein** |
| `reference_pairs.json` | 439 Referenzpaare | **nein** |
| `profiles.csv`, `reference_pairs.csv` | flache Übersichten | – |

## Ausführung

Voraussetzung ist Python 3 ohne Zusatzpakete. Der Referenzlauf wurde mit Python 3.14.7 gemacht. Alle Befehle werden aus der Repository-Wurzel aufgerufen.

**Generator.** Ohne `--out` überschreibt er die Dateien in `docs/research/synthetic/`:

```bash
python3 docs/research/synthetic/tools/generate_profiles.py
```

Zum Vergleichen ohne Überschreiben erst in einen anderen Ordner erzeugen, dann vergleichen:

```bash
python3 docs/research/synthetic/tools/generate_profiles.py --out /tmp/m2f-synthetic
for f in profiles.json reference_annotations.json reference_pairs.json workstyle_core.json profiles.csv reference_pairs.csv; do
  cmp -s /tmp/m2f-synthetic/$f docs/research/synthetic/$f && echo "$f identisch" || echo "$f ABWEICHUNG"
done
```

**Validator.** Er gibt einen JSON-Bericht auf stdout aus und endet mit Exit-Code 1, wenn er einen Fehler findet:

```bash
python3 docs/research/synthetic/tools/validate_dataset.py
python3 docs/research/synthetic/tools/validate_dataset.py --data-dir /tmp/m2f-synthetic --report /tmp/m2f-report.json
```

Der Validator teilt keinen Code mit dem Generator. Er prüft die Dateien unabhängig gegen die Produktregeln aus der Inventur:

- Enums, Längen, Pflichtregeln aktiver Profile,
- nur reale Capability-IDs und Workstyle-Items,
- `grow_into` nie als Ownership,
- keine Research-Items,
- keine Referenzfelder im Produktprofil,
- Konsistenz der Paare.

## Erwartete Kennzahlen

| Kennzahl | Wert |
|---|---|
| Profile | **200** |
| Referenzpaare | **439** |
| Validierungsfehler | **0** |
| verworfene Paare (Generator) | 0 |
| Szenarien | normal 110 · komplementär 30 · asymmetrisch 15 · Constraint-Konflikt 15 · sparse 10 · Generalisten 5 · Spezialistinnen 5 · Noise/Edge 10 |
| Paare je Klasse | excellent 77 · promising 77 · worth_exploring 55 · asymmetric 44 · low_relevance 90 · exclude 55 · insufficient_data 41 |
| FIND aktiv / CONNECT aktiv | 156 / 127 |

SHA-256 der Referenzartefakte:

```text
4b3c97a82cf7c43a7c85fffbce5a6e3a7e9498067fda72d1e8954081169dbbec  profiles.json
866fc90259b6a18f9b053734f75f7a7be474862cd2edcec6eadf962c515eec8a  reference_annotations.json
b8ad1cbe46d11a8ae7195ae0c01f4af612dbcdd8537a3ac9adebcf36a826408b  reference_pairs.json
b2629b322155bd8d2554baafc6b6d1283cb50b4f1cd4919d77d489e03b515690  workstyle_core.json
ee4b15d7407a2589565c3d77edae1b88f8d21b7d5fec083f51e22f3f7e6345c1  profiles.csv
bd3e0f50eea46bbc478c343e551bf5955c84273b5c0652f3f79417e5f29a1e5e  reference_pairs.csv
```

## Zusagen

- **Keine echten Nutzerdaten.** Alle Personen heißen `Vorname Synth-NNN`, alle Kennungen beginnen mit `syn-`. Es gibt keine E-Mails und keine UUIDs; der Validator prüft beides.
- **Keine Schreibvorgänge in Supabase oder einer Produktdatenbank.** Die Skripte lesen nur Migrationsdateien von der Platte und schreiben nur JSON/CSV in den Zielordner. Es gibt keinen Netzwerkzugriff und keinen Datenbank-Client.
- **Workstyle ist getrennt und ohne Ranking-Einfluss.** Die Antworten stehen in einer eigenen Datei und kommen aus einem eigenen Zufallsstrom, der erst nach Abschluss aller Paare läuft. Nachweis: Mit `--workstyle-seed 1` bleiben `reference_pairs.json`, `profiles.json` und `reference_annotations.json` byte-identisch, nur `workstyle_core.json` ändert sich.
- **Die Ground Truth ist unabhängig von späteren Matchingformeln.**
  - Die Klasse eines konstruierten Paares wird festgelegt, bevor seine Profile gebaut werden.
  - Die Einzeldimensionen werden auf der kanonischen Referenzschicht annotiert, nie auf Freitext und nie mit Workstyle.
  - Es gibt keine Gewichte und keine Gesamtzahl.

  Eine Matching-Engine darf `reference_annotations.json` und `reference_pairs.json` nicht als Eingabe verwenden.

## Änderungen

Wer Generator oder Validator ändert, ändert den Referenzdatensatz. Dann gilt:

- Generator laufen lassen und Validator auf 0 Fehler bringen,
- Kennzahlen und SHA-256 in dieser README aktualisieren,
- Methodik und Referenzpaar-Dokument nachziehen.

Kennzahlen eines alten Laufs sind mit einem neuen nicht vergleichbar.
