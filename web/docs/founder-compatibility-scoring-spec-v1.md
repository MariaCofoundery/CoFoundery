# Founder-Compatibility Scoring Spec v1

Stand: 31.03.2026

Dieses Dokument übersetzt die inhaltliche Architektur des Founder-Compatibility-Modells in eine **implementierbare technische Spezifikation**.

Ziel:

- klare Datenstruktur
- eindeutige Rechenreihenfolge
- saubere Trennung zwischen `CORE`, `SUPPORT` und `PATTERN`
- gute Grundlage für Backend, Analytics und Reporting

Dieses Dokument beschreibt **keinen finalen Produktcode**, sondern eine belastbare V1-Schnittstelle.

---

## 1. Scope von v1

### In Scope

- 24 `CORE`-Items für Scoring
- 12 `SUPPORT`-Items für Interpretation
- personbezogene Profilwerte
- teambezogene Matchingwerte
- regelbasierte Pattern-Hinweise

### Out of Scope

- adaptive Gewichtung
- IRT / latente Modellierung
- automatische Korrektur von Antworttendenzen
- Echtzeit-Co-Editing-Logik
- finale UI-Formulierungen

---

## 2. Kanonische Dimensions-IDs

```ts
type DimensionId =
  | "company_logic"
  | "decision_logic"
  | "work_structure"
  | "commitment"
  | "risk_orientation"
  | "conflict_style";
```

Zuordnung:

- `company_logic` = Unternehmenslogik
- `decision_logic` = Entscheidungslogik
- `work_structure` = Arbeitsstruktur & Zusammenarbeit
- `commitment` = Commitment
- `risk_orientation` = Risikoorientierung
- `conflict_style` = Konfliktstil

---

## 3. Item-IDs und Layer

## 3.1 CORE-Item-IDs

Empfohlenes V1-Schema:

```ts
type CoreItemId =
  | "cl_core_1"
  | "cl_core_2"
  | "cl_core_3"
  | "cl_core_4"
  | "dl_core_1"
  | "dl_core_2"
  | "dl_core_3"
  | "dl_core_4"
  | "ws_core_1"
  | "ws_core_2"
  | "ws_core_3"
  | "ws_core_4"
  | "cm_core_1"
  | "cm_core_2"
  | "cm_core_3"
  | "cm_core_4"
  | "ro_core_1"
  | "ro_core_2"
  | "ro_core_3"
  | "ro_core_4"
  | "cs_core_1"
  | "cs_core_2"
  | "cs_core_3"
  | "cs_core_4";
```

Prefixe:

- `cl` = company logic
- `dl` = decision logic
- `ws` = work structure
- `cm` = commitment
- `ro` = risk orientation
- `cs` = conflict style

## 3.2 SUPPORT-Item-IDs

```ts
type SupportItemId =
  | "cl_support_1"
  | "cl_support_2"
  | "dl_support_1"
  | "dl_support_2"
  | "ws_support_1"
  | "ws_support_2"
  | "cm_support_1"
  | "cm_support_2"
  | "ro_support_1"
  | "ro_support_2"
  | "cs_support_1"
  | "cs_support_2";
```

---

## 4. Item-Metadatenstruktur

Jedes Item sollte in einer zentralen Konfiguration beschrieben sein.

```ts
type ItemLayer = "core" | "support";
type ItemType = "likert" | "forced_choice" | "scenario";

type ItemMeta = {
  id: string;
  layer: ItemLayer;
  dimensionId: DimensionId;
  type: ItemType;
  prompt: string;
  polarity: "left_to_right";
  scoreValues: number[];
  requiredForScoring: boolean;
};
```

Wichtige V1-Regel:

- alle Items müssen bei Auswertung bereits auf eine **einheitliche Polrichtung** normiert sein
- `0 = linker Pol`
- `100 = rechter Pol`

Dadurch entfällt kompliziertes Reverse-Coding im späteren Matching.

---

## 5. Response-Datenstruktur

## 5.1 Einzelantwort

```ts
type ItemResponse = {
  itemId: string;
  rawValue: number;
  normalizedValue: number;
  answeredAt: string; // ISO timestamp
};
```

`normalizedValue` muss auf der gemeinsamen `0–100`-Skala liegen.

## 5.2 Personenset

```ts
type PersonAssessment = {
  personId: string;
  submittedAt: string; // ISO timestamp
  coreResponses: ItemResponse[];
  supportResponses: ItemResponse[];
};
```

---

## 6. Berechnungsreihenfolge

Die Berechnung soll immer in dieser Reihenfolge laufen:

1. Antworten laden
2. Normalisierung prüfen
3. CORE-Items pro Dimension aggregieren
4. personenbezogene Dimensionsscores berechnen
5. Teamvergleich berechnen
6. SUPPORT-Items separat für Narrativ lesen
7. Pattern-Logik ausführen
8. Gesamtobjekt persistieren

---

## 7. Personenscores

## 7.1 CORE-Responses nach Dimension gruppieren

```ts
type DimensionCoreResponses = Record<DimensionId, number[]>;
```

## 7.2 Score-Regel

Für jede Dimension:

```ts
dimensionScore = mean(validCoreResponsesForDimension)
```

## 7.3 Mindestdaten

- `4/4` beantwortet: voll gültig
- `3/4` beantwortet: gültig
- `<=2/4` beantwortet: `insufficient_data`

## 7.4 Personenscore-Objekt

```ts
type PersonDimensionScore = {
  dimensionId: DimensionId;
  score: number | null;
  answeredCoreItems: number;
  sufficientData: boolean;
};

type PersonProfileScores = {
  personId: string;
  dimensions: PersonDimensionScore[];
  patternMetrics: PersonPatternMetrics;
};
```

---

## 8. Teamvergleich

## 8.1 Basisformeln

Für jede Dimension mit gültigen Daten bei beiden Personen:

```ts
scoreA = personA.dimensionScore
scoreB = personB.dimensionScore
distance = abs(scoreA - scoreB)
alignment = 100 - distance
teamFit = alignment
tensionScore = distance
```

## 8.2 Teamscore-Objekt pro Dimension

```ts
type TeamDimensionScore = {
  dimensionId: DimensionId;
  scoreA: number | null;
  scoreB: number | null;
  distance: number | null;
  alignment: number | null;
  teamFit: number | null;
  tensionScore: number | null;
  sufficientData: boolean;
};
```

## 8.3 Kategorien

```ts
type AlignmentCategory = "very_high" | "high" | "mixed" | "low";
type TensionCategory = "low" | "moderate" | "elevated" | "high";
```

Regeln:

- `alignment >= 85` → `very_high`
- `alignment >= 70` → `high`
- `alignment >= 50` → `mixed`
- sonst → `low`

- `tensionScore <= 15` → `low`
- `tensionScore <= 30` → `moderate`
- `tensionScore <= 50` → `elevated`
- sonst → `high`

## 8.4 Gesamtwerte

Nur über Dimensionen mit `sufficientData = true`.

```ts
overallFit = mean(teamFit values)
overallTension = mean(tensionScore values)
```

Mindestregel:

- mindestens `4` gültige Dimensionen

Sonst:

- kein stabiler Gesamtscore

## 8.5 Teamresultat

```ts
type TeamCompatibilityScores = {
  personAId: string;
  personBId: string;
  dimensions: TeamDimensionScore[];
  validDimensionCount: number;
  overallFit: number | null;
  overallTension: number | null;
  supportInsights: TeamSupportInsights;
  patternFlags: TeamPatternFlags;
};
```

---

## 9. SUPPORT-Layer

## 9.1 Regel

SUPPORT-Items fließen **nie** in:

- `dimensionScore`
- `overallFit`
- `overallTension`

ein.

## 9.2 Technische Nutzung

```ts
type SupportInsight = {
  dimensionId: DimensionId;
  itemId: SupportItemId;
  scoreA: number | null;
  scoreB: number | null;
  distance: number | null;
  hintKey: string;
};
```

## 9.3 Typische Outputs

- Szenario mit hoher Differenz
- Szenario mit ähnlicher Tendenz
- Hinweis auf konkret sichtbare Alltagsspannung

```ts
type TeamSupportInsights = {
  insights: SupportInsight[];
};
```

---

## 10. Pattern-Metriken pro Person

## 10.1 Consistency Score

Berechnet über CORE-Items innerhalb jeder Dimension.

```ts
consistencyDimension = clamp(100 - (sd(itemValues) / 50) * 100, 0, 100)
consistencyOverall = mean(consistencyDimension values)
```

## 10.2 Extremeness Score

```ts
extremeAnswers = count(normalizedValue <= 10 || normalizedValue >= 90)
extremenessScore = (extremeAnswers / answeredCoreItems) * 100
```

## 10.3 Flatness Indicator

```ts
dimensionRange = max(validDimensionScores) - min(validDimensionScores)
```

Kategorien:

- `<= 12` → `very_flat`
- `13–20` → `somewhat_flat`
- `> 20` → `differentiated`

## 10.4 Contradictions

Regelbasiert, nicht statistisch.

```ts
type ContradictionHit = {
  ruleId: string;
  dimensionId: DimensionId;
  severity: "light" | "moderate";
};
```

V1-Regelstruktur:

```ts
type ContradictionRule = {
  id: string;
  description: string;
  applies: (profile: PersonProfileScores, support: ItemResponse[]) => boolean;
};
```

## 10.5 Person-Pattern-Objekt

```ts
type PersonPatternMetrics = {
  consistencyOverall: number | null;
  consistencyByDimension: Partial<Record<DimensionId, number>>;
  extremenessScore: number | null;
  flatnessRange: number | null;
  flatnessCategory: "very_flat" | "somewhat_flat" | "differentiated" | null;
  contradictionHits: ContradictionHit[];
};
```

---

## 11. Team-Pattern-Flags

## 11.1 Personbasierte Flags

```ts
type PersonPatternFlag =
  | "very_smooth_profile"
  | "low_differentiation"
  | "high_extremeness"
  | "possible_internal_tension"
  | "uneven_confidence_pattern";
```

## 11.2 Teambasierte Flags

```ts
type TeamPatternFlag =
  | "smooth_alignment_with_scenario_differences"
  | "polarized_difference_pattern";
```

## 11.3 Regeldefinitionen

### `very_smooth_profile`

- `consistencyOverall >= 85`
- und `flatnessRange <= 12`

### `low_differentiation`

- mindestens 4 von 6 Dimensionen im Bereich von `±8` um den persönlichen Mittelwert

### `high_extremeness`

- `extremenessScore >= 45`

### `possible_internal_tension`

- `contradictionHits.length >= 2`

### `uneven_confidence_pattern`

- mindestens 2 Dimensionen mit `consistency >= 85`
- und mindestens 2 Dimensionen mit `consistency <= 55`

### `smooth_alignment_with_scenario_differences`

- `overallFit >= 85`
- und in mindestens 2 SUPPORT-Items `distance >= 34`

### `polarized_difference_pattern`

- mindestens 2 Dimensionen mit `distance >= 40`
- und mindestens 2 Dimensionen mit `distance <= 10`

## 11.4 Team-Flag-Struktur

```ts
type TeamPatternFlags = {
  personAFlags: PersonPatternFlag[];
  personBFlags: PersonPatternFlag[];
  teamFlags: TeamPatternFlag[];
};
```

---

## 12. Persistierbares Ergebnisobjekt

```ts
type FounderCompatibilityResultV1 = {
  version: "v1";
  generatedAt: string;
  modelVersion: string; // e.g. "core24-support12-v1"
  personA: PersonProfileScores;
  personB: PersonProfileScores;
  team: TeamCompatibilityScores;
};
```

---

## 13. Rechenbeispiel

## 13.1 Personenscore

`decision_logic` Person A:

- `dl_core_1 = 20`
- `dl_core_2 = 35`
- `dl_core_3 = 15`
- `dl_core_4 = 30`

```ts
scoreA_decision_logic = (20 + 35 + 15 + 30) / 4 = 25
```

`decision_logic` Person B:

- `60, 55, 70, 50`

```ts
scoreB_decision_logic = 58.75
```

## 13.2 Teamvergleich

```ts
distance = abs(25 - 58.75) = 33.75
alignment = 100 - 33.75 = 66.25
teamFit = 66.25
tensionScore = 33.75
```

Kategorien:

- `alignment = mixed`
- `tension = elevated`

---

## 14. API- / Service-Empfehlung

V1 sollte Berechnung in drei getrennten Services organisieren:

### 14.1 `scoreCoreAssessment()`

Input:

- `PersonAssessment`

Output:

- `PersonProfileScores`

### 14.2 `compareFounderProfiles()`

Input:

- `PersonProfileScores`
- `PersonProfileScores`
- SUPPORT-Responses beider Personen

Output:

- `TeamCompatibilityScores`

### 14.3 `buildFounderCompatibilityResult()`

Input:

- beide Personprofile
- Teamresultat

Output:

- `FounderCompatibilityResultV1`

Diese Trennung hält:

- Personscoring
- Matching
- Reportaufbereitung

sauber auseinander.

---

## 15. Harte Implementierungsregeln

1. `CORE` und `SUPPORT` nie in derselben Scorefunktion mischen
2. Pattern-Flags nie in Scores zurückschreiben
3. fehlende Daten immer explizit als `null` / `insufficient_data` markieren
4. alle Rundungen erst bei Anzeige, nicht in Zwischenrechnungen
5. jede Regel versionieren, damit spätere Modellupdates nachvollziehbar bleiben

---

## 16. Empfohlene nächste Schritte

1. finale Zuordnung der 24 CORE-Itemtexte zu den `*_core_*`-IDs festziehen
2. finale Zuordnung der 12 SUPPORT-Itemtexte zu den `*_support_*`-IDs festziehen
3. zentrale `itemMeta`-Registry anlegen
4. Testfälle für:
   - vollständige Antworten
   - fehlende Antworten
   - extreme Profile
   - glatte Profile
   - polarisierte Teams
5. erst danach Report-Texte auf diese technische V1 hängen

Diese Spezifikation ist bewusst einfach genug, um robust implementiert und später sauber weiterentwickelt zu werden.
