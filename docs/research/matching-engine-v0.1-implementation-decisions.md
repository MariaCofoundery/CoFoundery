# Matching Engine v0.1 – Implementierungsentscheidungen

| | |
|---|---|
| Bezug | `matching-engine-v0.1-spec.md` / `.json`, eingefroren (Hashes in `matching-engine-v0.1-spec.sha256`, unverändert) |
| Implementierung | nicht-produktiver Prototyp `web/src/lib/matching/v01/` |
| Stand | 13.10.2026 |

Diese Datei hält fest, wie der Prototyp Stellen umsetzt, die die eingefrorene Spezifikation offen lässt oder in sich uneinheitlich beschreibt. Sie ändert keine Formel, kein Gewicht, kein Gate und keine Normalisierung. Die Freeze-Dateien bleiben aus Reproduzierbarkeitsgründen unverändert. Bei Widerspruch gilt die Markdown-Spec (Spec, Kopf).

## 1. Capability-Matching-Freigabe

- `capability_disclosure` steuert ausschließlich die **Sichtbarkeit** (`private`, `areas`, `areas_depth_on_contact`).
- `capability_disclosure` ist **weder Matching-Consent noch Matching-Verbot**.
- Capability-Bereich, `application_level` und `ownership_wish` werden nur verwendet, wenn eine **separate, ausdrückliche Matching-Freigabe** vorliegt. Im Prototyp ist das das Pflichtfeld `capabilities.matchingAllowed`. Die Produkt-Adapter setzen es auf `false`, solange es im Produkt keine solche Freigabe gibt.
- **Ohne Matching-Freigabe** behandelt der Matcher die Capability-Daten der Person als **nicht verfügbar**:
  - `cap_cover` ist UNKNOWN, also `need = role_cover`;
  - das Feld fehlt in der Confidence;
  - ein `requiredCapabilityAreasAny` der Gegenseite ergibt `uncertain`, nie `ineligible`.
- **Reasons** legen nur offen, was für die Gegenseite sichtbar sein darf. Capability-Reasons erscheinen nur, wenn die Freigabe vorliegt **und** Bereich und Tiefe für die Gegenseite sichtbar sind. Sonst entfällt der Reason ganz, ohne generischen Ersatz.
- Diese Auslegung folgt der verbindlichen Markdown-Spec (§5, §14, §18).
- **Dokumentationsinkonsistenz:** Die eingefrorene JSON-Datei nennt unter `never_inputs` noch `capabilities_with_disclosure_private`. Das stammt aus einer Fassung vor der Entscheidung „Zustimmung ≠ Sichtbarkeit“. Es wird als Inkonsistenz der Dokumentation behandelt und nicht umgesetzt. Die JSON-Datei bleibt unverändert.

## 2. `idf_corpus_version` im FIND-Ergebnis

- FIND verwendet kein IDF und braucht keinen IDF-Snapshot. Kein FIND-Modul importiert die IDF-Schicht.
- Das FIND-Ergebnis trägt `idfCorpusVersion` trotzdem mit, als vom Aufrufer übergebene Zeichenkette. So verlangt es die Spec: §11.2 („Jedes Ergebnis, FIND wie CONNECT, enthält … `idf_corpus_version`. FIND nutzt kein IDF, führt die Version aber zur Rekonstruierbarkeit mit“), §16, §17 und in der JSON `result_versions_required_in_every_result`.
- CONNECT übernimmt `idfCorpusVersion` aus dem übergebenen, Hash-geprüften Snapshot.

## 3. Bekannte v0.1-Limitation: Ortsvergleich mit gemischter Darstellung

- Ein Ort mit Wörterbuch-Schlüssel (z. B. „Leipzig“ → `loc:leipzig`) und ein Ort, der nur als Token dargestellt wird (z. B. „Leipzig / Mitteldeutschland“ → Token `leipzig`, `mitteldeutschland`), gelten in `matching-normalization-v0.1` **nie als derselbe Ort** (`same_place` → `False`).
- **Folge:** Ein Must-have `desiredLocationRegion = "Leipzig / Mitteldeutschland"` schließt eine Person mit Ort „Leipzig“ aus, sofern die suchende Person nicht remote-kompatibel ist. „Leipzig-Plagwitz“ dagegen passt (Token-Vergleich).
- Der eingefrorene Python-Code verhält sich identisch. Der Prototyp übernimmt das unverändert. Ein Test in `findEngine.test.ts` hält das Verhalten fest.
- **Nicht korrigiert.** Eine Änderung wäre `matching-normalization-v0.2` und braucht eine neue, unabhängige Evaluation.

## 4. Must-haves, die nicht zur v0.1-Engine gehören

Das Produkt kennt in `DiscoveryMustHaves` zusätzlich:

- `requiredIndustriesAny`
- `acceptedCommitmentLevels`
- `acceptedVentureStages`
- `acceptedVentureGoals`

Diese Felder existieren im Produkt, sind aber **nicht Bestandteil der eingefrorenen, validierten v0.1-Engine**. Das Gate v03 prüft genau die acht Kriterien aus Spec §7. Die Adapter übernehmen die vier Felder nicht. Eine Aufnahme wäre eine neue `matching_version` mit eigener Evaluation. (Die heutige Such-RPC wertet sie ebenfalls nicht aus.)

## 5. Weitere Festlegungen ohne Wirkung auf die getesteten Daten

| Stelle | Prototyp | Begründung |
|---|---|---|
| Bereich ohne bekannte Familie | keine Familien-Teilgutschrift | Spec §8.1 „derselben Capability-Familie“. Der Python-Code würde zwei unbekannte Familien als gleich werten; im synthetischen Datensatz ist jeder Bereich zugeordnet. |
| unbekannter Enum-Wert (Suchstand, Start, Ziel) | Teil gilt als UNKNOWN | Der Python-Code bricht hier ab. |
| `expires_at = null` | läuft nicht ab | Spec §10 „expires_at ≥ jetzt“; ein fehlendes Ablaufdatum ist keine Laufzeitgrenze. |
| `*_LIMITED_EVIDENCE` | wird nicht erzeugt | Spec §14: Anzeigeregel außerhalb des Matchings, noch nicht festgelegt. |
| `FIND_UNKNOWN_LOCATION` | nur für die Person, deren Bedingung offen ist | Sonst würde ein privates Must-have der Gegenseite sichtbar (Spec §5). |
| Gleichstände | `tieGroup` bei identischem Wert; Anzeige nach Veröffentlichung, dann ID | Spec §11.1 |

## 6. Prüfung

- Paritätstests gegen den eingefrorenen Python-Code (`docs/research/synthetic/experiments/prototype-parity-v01/`): FIND-, CONNECT- und Normalisierungsausgaben identisch.
- Keine Holdout-Paare, keine Holdout-Labels.
