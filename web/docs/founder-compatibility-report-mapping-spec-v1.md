# Founder-Compatibility Report-Mapping Spec v1

Stand: 31.03.2026

Dieses Dokument definiert die Mapping-Schicht zwischen:

- Scoring
- Insight-Hinweisen
- Reporttexten
- Executive Summary
- Workbook-Prioritäten

Ziel ist eine **kohärente Interpretationslogik**, die das Messmodell nicht überdehnt.

Die Grundregel lautet:

- Scores beschreiben **Passung und Differenz**
- Support-Items liefern **Kontext und Konkretion**
- Pattern-Flags liefern **Reflexionshinweise**
- Workbook-Handoffs priorisieren **Gesprächsbedarf**

---

## 1. Globale Report-Prinzipien

## 1.1 Sprachprinzip

Reporttexte müssen:

- interpretiv
- vorsichtig
- alltagsnah
- nicht-deterministisch

sein.

Bevorzugte Formulierungen:

- `deutet darauf hin`
- `spricht dafür`
- `kann im Alltag relevant werden`
- `könnte besonders sichtbar werden`
- `legt nahe`

Zu vermeiden:

- `ihr seid`
- `eure Beziehung ist`
- `objektiv`
- `beweist`
- `zeigt eindeutig`

## 1.2 Trennung der Ebenen

### CORE

Steuert:

- overallFit
- conflictRiskIndex
- Dimensionskarten
- Executive Summary
- Workbook-Prioritäten

### SUPPORT

Steuert:

- narrative Anreicherung
- Beispielsituationen
- konkrete Tension-Hinweise

### PATTERN

Steuert:

- zusätzliche Reflexionshinweise
- interne Report-Modulation

Pattern-Flags dürfen keine Scoring-Kategorie überschreiben.

## 1.3 Globale Ausgabestruktur

Empfohlene Report-Reihenfolge:

1. Executive Summary
2. Gesamtbild: Foundations vs. Tension
3. 6 Dimensionskarten
4. Zusätzliche Hinweise
5. Workbook-Fokus

---

## 2. Overall Report Layer

## 2.1 overallFit

### Kategorien

- `85–100` → `sehr hohe Passung`
- `70–84` → `gute Passung`
- `50–69` → `gemischte Passung`
- `0–49` → `deutliche Unterschiede`

### Textlogik

- sehr hohe Passung:
  - `Euer Profil deutet in vielen Bereichen auf eine ähnliche Arbeitslogik hin.`
- gute Passung:
  - `Euer Profil spricht für eine gute gemeinsame Basis mit einzelnen Feldern, die bewusst geklärt werden sollten.`
- gemischte Passung:
  - `Euer Profil zeigt sowohl gemeinsame Grundlagen als auch relevante Unterschiede, die im Alltag spürbar werden können.`
- deutliche Unterschiede:
  - `Euer Profil deutet auf mehrere unterschiedliche Arbeitslogiken hin, die bewusst abgestimmt werden sollten.`

### Tonanforderung

- nie definitiv
- nie pathologisierend
- Fokus auf Zusammenarbeit, nicht auf Personbewertung

## 2.2 conflictRiskIndex / overallTension

### Kategorien

- `0–15` → `gering`
- `16–30` → `moderat`
- `31–50` → `erhöht`
- `51–100` → `hoch`

### Textlogik

- gering:
  - `Im Profil zeigen sich aktuell nur wenige starke Reibungspunkte.`
- moderat:
  - `Einzelne Unterschiede könnten im Alltag relevant werden, vor allem unter Druck oder in Übergangsphasen.`
- erhöht:
  - `Mehrere Unterschiede sprechen dafür, dass bestimmte Themen aktiv geklärt werden sollten, bevor daraus wiederkehrende Reibung entsteht.`
- hoch:
  - `Das Profil legt nahe, dass es mehrere strukturelle Spannungsfelder gibt, die ohne bewusste Absprachen leicht belastend werden können.`

### Tonanforderung

- `Risiko` immer als Kontext- und Abstimmungsrisiko rahmen
- nie als Aussage über Beziehungsqualität oder persönliches Scheitern

## 2.3 Dimension-Level teamFit

### Nutzung

Steuert:

- Summary line pro Dimension
- Ranking für Foundations
- Helligkeit / Gewichtung im UI

## 2.4 Dimension-Level tensionScore

### Nutzung

Steuert:

- Interpretationsschärfe
- Workbook-Priorität
- Auswahl relevanter Support-Enrichments

## 2.5 Pattern Flags

### Nutzung

- nie scorewirksam
- nur als zusätzliche Nuance
- bei Executive Summary nur dann sichtbar, wenn sie Reflexion fördern

---

## 3. Dimension Report Mapping

Jede Dimension nutzt drei Kern-Buckets:

- `high_alignment` = `teamFit >= 85`
- `moderate_difference` = `teamFit 50–84`
- `strong_difference` = `teamFit < 50`

Optional können Pattern-Flags den Ton leicht modulieren, aber nicht den Bucket wechseln.

---

## 3.1 Unternehmenslogik

### A. Core interpretation buckets

#### High alignment

- **Summary line:** `Ihr bewertet strategische Chancen in ähnlicher Weise.`
- **Interpretation:** `Eure Antworten deuten darauf hin, dass ihr unternehmerische Optionen nach ähnlichen Kriterien bewertet. Das spricht für weniger Grundsatzreibung bei Fragen wie Fokus, Ausbau und strategischer Richtung.`
- **Likely implication:** Richtungsentscheidungen wirken eher anschlussfähig als gegensätzlich.

#### Moderate difference

- **Summary line:** `Ihr setzt bei strategischen Optionen teilweise andere Schwerpunkte.`
- **Interpretation:** `Eure Antworten sprechen dafür, dass ihr Chancen nicht völlig gleich bewertet. Das kann produktiv sein, wenn klar bleibt, wann eher Hebel und wann eher Tragfähigkeit den Ausschlag geben soll.`
- **Likely implication:** Diskussionen über Fokus, Wachstum und Richtungswechsel können wiederkehrend werden.

#### Strong difference

- **Summary line:** `Ihr bewertet strategische Optionen deutlich unterschiedlich.`
- **Interpretation:** `Euer Profil deutet darauf hin, dass ihr unternehmerische Optionen nach teils gegensätzlichen Kriterien beurteilt. Das kann vor allem dann relevant werden, wenn Marktchancen und langfristiger Aufbau in unterschiedliche Richtungen zeigen.`
- **Likely implication:** erhöhte Gefahr von Richtungs- und Priorisierungskonflikten.

### B. Support-item enrichment

- `Investor / Skalierungshebel`
  - **Nuance:** zeigt, wie stark Opportunitätslogik unter Wachstumsdruck kippt
  - **Enrichment:** `Besonders in Situationen mit starkem externem Hebel könnte eure Differenz sichtbarer werden.`

- `Richtungswechsel / neuer Markt`
  - **Nuance:** zeigt Toleranz für strategische Neuausrichtung
  - **Enrichment:** `Die Unterschiede scheinen vor allem dann relevant zu werden, wenn eine neue Marktchance eine echte Neugewichtung verlangt.`

### C. Workbook handoff

- **Priorisieren bei erhöhter Tension:** `Strategische Prioritäten und Richtungsentscheidungen`
- **Gesprächsfoki:**
  - `Woran erkennen wir beide, dass eine neue Chance wirklich relevant ist?`
  - `Wann schützen wir Aufbau und Stabilität, und wann gehen wir bewusst in Hebel und Wachstum?`

---

## 3.2 Entscheidungslogik

### A. Core interpretation buckets

#### High alignment

- **Summary line:** `Ihr kommt auf ähnliche Weise zu Entscheidungen.`
- **Interpretation:** `Eure Antworten deuten darauf hin, dass ihr eine ähnliche Schwelle dafür habt, wann etwas entscheidungsreif ist. Das spricht für weniger Friktion bei Tempo, Informationsbedarf und Begründungstiefe.`
- **Likely implication:** geringere Reibung in Entscheidungsprozessen und Meetings.

#### Moderate difference

- **Summary line:** `Ihr trefft Entscheidungen mit teilweise unterschiedlichen Logiken.`
- **Interpretation:** `Eure Antworten sprechen dafür, dass ihr unterschiedliche Erwartungen an Analyse, Verdichtung und Entscheidungstempo habt. Das muss kein Nachteil sein, wird aber ohne klare Regeln schnell prozessrelevant.`
- **Likely implication:** Debatten über Tempo und Entscheidungsreife.

#### Strong difference

- **Summary line:** `Ihr verarbeitet Entscheidungen deutlich unterschiedlich.`
- **Interpretation:** `Euer Profil deutet auf klare Unterschiede darin hin, wann etwas für euch als ausreichend geklärt gilt. Das kann unter Zeitdruck besonders sichtbar werden und Metakonflikte über den Prozess auslösen.`
- **Likely implication:** Reibung über Datenbedarf, Timing und Nachjustierung.

### B. Support-item enrichment

- `Zeitdruck-Entscheidung`
  - **Nuance:** zeigt, wie sich die Differenz unter knapper Zeit verschärft
  - **Enrichment:** `Unter Zeitdruck könnte diese Differenz stärker sichtbar werden als in Routineentscheidungen.`

- `Richtung funktioniert nicht`
  - **Nuance:** zeigt Analyse- versus Iterationsmodus bei Kurskorrekturen
  - **Enrichment:** `Besonders bei notwendigen Kurswechseln scheint ihr unterschiedliche Schwellen für Analyse und Handeln zu haben.`

### C. Workbook handoff

- **Priorisieren bei erhöhter Tension:** `Wie wir Entscheidungen treffen`
- **Gesprächsfoki:**
  - `Wann ist eine Entscheidung für uns beide ausreichend geklärt?`
  - `Welche Entscheidungen brauchen Analyse, welche eher Tempo und spätere Nachschärfung?`

---

## 3.3 Arbeitsstruktur & Zusammenarbeit

### A. Core interpretation buckets

#### High alignment

- **Summary line:** `Ihr habt ähnliche Erwartungen an Mitsicht und Abstimmung.`
- **Interpretation:** `Eure Antworten deuten darauf hin, dass ihr Zusammenarbeit in ähnlicher Weise koordiniert. Das spricht für weniger Alltagsreibung bei Übergaben, Updates und Zuständigkeiten.`
- **Likely implication:** besser anschlussfähiger Arbeitsrhythmus.

#### Moderate difference

- **Summary line:** `Ihr braucht teilweise unterschiedlich viel Abstimmung im Alltag.`
- **Interpretation:** `Eure Antworten sprechen dafür, dass ihr bei Mitsicht, Zwischenständen und Eigenraum nicht immer dieselben Erwartungen habt. Das kann gut funktionieren, wenn Checkpoints und Freiheitsgrade bewusst geregelt sind.`
- **Likely implication:** punktuelle Reibung über Transparenz und Eigenständigkeit.

#### Strong difference

- **Summary line:** `Ihr organisiert Zusammenarbeit deutlich unterschiedlich.`
- **Interpretation:** `Euer Profil deutet darauf hin, dass ihr im Alltag unterschiedlich viel Abstimmung, Sichtbarkeit und Eigenraum braucht. Ohne klare Vereinbarungen kann daraus schnell Frust über zu viel oder zu wenig Einbindung entstehen.`
- **Likely implication:** häufige Reibung über Updates, Ownership und Übergaben.

### B. Support-item enrichment

- `Unterschiedliche Arbeitszeiten`
  - **Nuance:** macht Synchronisationsbedarf konkret
  - **Enrichment:** `Die Unterschiede könnten vor allem dann sichtbar werden, wenn euer Alltag zeitlich asynchron läuft.`

- `Späte Information`
  - **Nuance:** zeigt Toleranz für autonome Arbeitsweise
  - **Enrichment:** `Ein möglicher Spannungsfokus liegt darin, wie früh wichtige Zwischenstände geteilt werden sollten.`

### C. Workbook handoff

- **Priorisieren bei erhöhter Tension:** `Zusammenarbeit, Sichtbarkeit und Zuständigkeiten`
- **Gesprächsfoki:**
  - `Wann brauchen wir Mitsicht, und wann bewusst Eigenraum?`
  - `Welche Updates sind Pflicht, und was darf eigenständig laufen?`

---

## 3.4 Commitment

### A. Core interpretation buckets

#### High alignment

- **Summary line:** `Ihr priorisiert das Startup in ähnlicher Weise.`
- **Interpretation:** `Eure Antworten deuten darauf hin, dass ihr ein ähnliches Verständnis davon habt, wie viel Raum, Energie und Priorität das Unternehmen im Alltag bekommen soll.`
- **Likely implication:** geringere Reibung über Einsatzniveau und Verfügbarkeit.

#### Moderate difference

- **Summary line:** `Ihr setzt unterschiedliche Prioritäten beim persönlichen Einsatz.`
- **Interpretation:** `Eure Antworten sprechen dafür, dass ihr das Startup nicht in gleichem Maß priorisiert. Das kann gut tragfähig sein, braucht aber explizite Erwartungen an Verfügbarkeit, Belastung und Intensitätsphasen.`
- **Likely implication:** mögliche Missverständnisse über Verbindlichkeit und Einsatz.

#### Strong difference

- **Summary line:** `Ihr habt deutlich unterschiedliche Erwartungen an Priorität und Einsatz.`
- **Interpretation:** `Euer Profil deutet darauf hin, dass ihr das Startup in sehr unterschiedlichem Maß priorisiert. Das kann im Alltag schnell als Fairness- oder Ernsthaftigkeitsfrage gelesen werden, obwohl es zunächst eine Unterschiedlichkeit in Prioritätslogik ist.`
- **Likely implication:** erhöhtes Konfliktrisiko rund um Verfügbarkeit, Intensität und Nebenprioritäten.

### B. Support-item enrichment

- `Parallele Projekte / Verpflichtungen`
  - **Nuance:** zeigt Toleranz gegenüber geteilter Priorität
  - **Enrichment:** `Die Unterschiede scheinen besonders dort relevant zu werden, wo neben dem Startup weitere Verpflichtungen Raum einnehmen.`

- `Mehr Zeit als geplant`
  - **Nuance:** zeigt Reaktion auf Intensitätsanstieg
  - **Enrichment:** `Vor allem in Phasen steigender Belastung könnte eure unterschiedliche Einsatzlogik spürbar werden.`

### C. Workbook handoff

- **Priorisieren bei erhöhter Tension:** `Verfügbarkeit, Prioritäten und Belastungsphasen`
- **Gesprächsfoki:**
  - `Was erwarten wir realistisch voneinander in intensiven Phasen?`
  - `Wo liegen legitime Grenzen, und wann braucht das Startup bewusst mehr Priorität?`

---

## 3.5 Risikoorientierung

### A. Core interpretation buckets

#### High alignment

- **Summary line:** `Ihr geht mit Unsicherheit in ähnlicher Weise um.`
- **Interpretation:** `Eure Antworten deuten darauf hin, dass ihr Risiko, Belastung und Unsicherheit ähnlich bewertet. Das spricht für weniger Grundsatzspannung bei Tempo, Launch-Reife und Downside-Management.`
- **Likely implication:** ähnliche Sicherheits- und Wachstumslogik in unsicheren Situationen.

#### Moderate difference

- **Summary line:** `Ihr bewertet Unsicherheit teilweise unterschiedlich.`
- **Interpretation:** `Eure Antworten sprechen dafür, dass ihr bei Unsicherheit und Risiko nicht immer denselben Schwellen folgt. Das kann produktiv sein, wenn klar ist, wann Leitplanken gelten und wann bewusst mehr Wagnis getragen wird.`
- **Likely implication:** wiederkehrende Debatten über Vorsicht versus Chance.

#### Strong difference

- **Summary line:** `Ihr geht mit Risiko deutlich unterschiedlich um.`
- **Interpretation:** `Euer Profil deutet darauf hin, dass ihr Unsicherheit und potenzielle Belastung sehr unterschiedlich reguliert. Das kann besonders relevant werden, wenn knappe Ressourcen, Launch-Fragen oder Wachstumsentscheidungen unter Druck anstehen.`
- **Likely implication:** erhöhte Spannung bei Unsicherheit, Kapital, Tempo und Experimenten.

### B. Support-item enrichment

- `Produkt noch nicht perfekt`
  - **Nuance:** zeigt Risiko-Regulation bei Launch-Nähe
  - **Enrichment:** `Die Unterschiede könnten besonders bei Fragen von Reifegrad und frühem Marktfeedback sichtbar werden.`

- `Wachstumschance mit erhöhter Belastung`
  - **Nuance:** zeigt Toleranz für zusätzliche Unsicherheit
  - **Enrichment:** `Vor allem bei Chancen mit spürbar höherer Belastung scheint eure Risikologik auseinanderzugehen.`

### C. Workbook handoff

- **Priorisieren bei erhöhter Tension:** `Umgang mit Unsicherheit und Leitplanken`
- **Gesprächsfoki:**
  - `Welche Risiken tragen wir bewusst, und wo setzen wir klare Stop-Kriterien?`
  - `Wann ist Vorsicht sinnvoll, und wann würden wir eine Chance unnötig kleinhalten?`

---

## 3.6 Konfliktstil

### A. Core interpretation buckets

#### High alignment

- **Summary line:** `Ihr sprecht Spannungen auf ähnliche Weise an.`
- **Interpretation:** `Eure Antworten deuten darauf hin, dass ihr Konflikte mit ähnlichem Timing und ähnlicher Direktheit bearbeitet. Das spricht für weniger Metakonflikt über die Form der Klärung.`
- **Likely implication:** geringere Reibung über Ton, Zeitpunkt und Schärfe von Konflikten.

#### Moderate difference

- **Summary line:** `Ihr bearbeitet Spannungen teilweise unterschiedlich.`
- **Interpretation:** `Eure Antworten sprechen dafür, dass ihr bei Timing und Direktheit von Konflikten nicht immer dieselben Muster habt. Das kann gut tragfähig sein, wenn ihr klärt, wie früh und wie direkt sensible Themen angesprochen werden sollen.`
- **Likely implication:** punktuelle Missverständnisse über zu frühe oder zu späte Ansprache.

#### Strong difference

- **Summary line:** `Ihr geht Konflikte deutlich unterschiedlich an.`
- **Interpretation:** `Euer Profil deutet darauf hin, dass ihr Spannungen mit sehr unterschiedlichem Timing und unterschiedlicher Direktheit bearbeitet. Ohne bewusste Regeln kann daraus leicht ein zusätzlicher Konflikt über die Form des Konflikts selbst entstehen.`
- **Likely implication:** erhöhtes Risiko für Eskalation oder Vermeidung.

### B. Support-item enrichment

- `Fehler mit negativen Auswirkungen`
  - **Nuance:** zeigt Stil unter heiklem Druck
  - **Enrichment:** `Die Unterschiede könnten besonders sichtbar werden, wenn Fehler klar benannt und gleichzeitig Beziehung geschützt werden sollen.`

- `Emotionalere strategische Diskussion`
  - **Nuance:** zeigt Umgang mit affektgeladenen Spannungen
  - **Enrichment:** `Vor allem in emotional aufgeladenen Diskussionen scheint euer Umgang mit Spannung unterschiedlich zu sein.`

### C. Workbook handoff

- **Priorisieren bei erhöhter Tension:** `Wie wir Spannungen ansprechen und klären`
- **Gesprächsfoki:**
  - `Wann sprechen wir Irritationen an, und wann sortieren wir erst?`
  - `Wie direkt wollen wir sein, ohne dass Klärung in Eskalation kippt?`

---

## 4. Executive Summary Logic

## 4.1 Ziel

Die Executive Summary soll:

- 2 stärkste gemeinsame Grundlagen
- 2 wichtigste Spannungsfelder
- 1 Gesamtkategorie

sichtbar machen.

## 4.2 Auswahl der stärksten Grundlagen

Grundlagen werden aus allen Dimensionen mit gültigen Daten gewählt.

Sortierung:

1. höchster `teamFit`
2. bei Gleichstand: niedrigerer `tensionScore`
3. bei weiterem Gleichstand: keine Pattern-Warnung auf der Dimension

Ausgewählt werden die Top-2-Dimensionen.

## 4.3 Auswahl der wichtigsten Spannungsfelder

Spannungsfelder werden sortiert nach:

1. höchster `tensionScore`
2. bei Gleichstand: niedrigerer `teamFit`
3. wenn SUPPORT-Items auf derselben Dimension zusätzliche Alltagsschärfe zeigen, darf diese Dimension bei Gleichstand bevorzugt werden

Ausgewählt werden die Top-2-Dimensionen.

## 4.4 Gesamtkategorie

Empfohlene Kategorien:

- `Stabile gemeinsame Basis`
  - `overallFit >= 85` und `conflictRiskIndex <= 15`

- `Gute Basis mit einzelnen Klärungsthemen`
  - `overallFit >= 70` und `conflictRiskIndex <= 30`

- `Gemischtes Profil mit relevantem Abstimmungsbedarf`
  - `overallFit >= 50`

- `Mehrere deutliche Unterschiede mit hohem Klärungsbedarf`
  - sonst

## 4.5 Summary-Bauplan

### Satz 1: Gesamteinordnung

Aus Gesamtkategorie.

### Satz 2: Zwei Foundations

`Besonders anschlussfähig wirkt eure Zusammenarbeit aktuell in den Bereichen X und Y.`

### Satz 3: Zwei Tensions

`Klärungsrelevant könnten vor allem die Bereiche A und B werden.`

### Satz 4: Support-Konkretion optional

Nur wenn ein Support-Item auf einer Tension-Dimension deutlich differiert:

`Das scheint vor allem in Situationen rund um [konkretes Support-Szenario] relevant zu werden.`

---

## 5. Pattern Flags in Reports

## 5.1 Sichtbarkeitsregel

### Sichtbar für Nutzer

- `very_smooth_profile`
- `low_differentiation`
- `possible_internal_tension`
- `uneven_confidence_pattern`
- `smooth_alignment_with_scenario_differences`
- `polarized_difference_pattern`

### Eher intern oder nur sehr zurückhaltend

- `high_extremeness`

Grund:

- zu leicht missverständlich als Antwortstil-Bewertung

## 5.2 Pattern-spezifische Reportlogik

### `very_smooth_profile`

- **Sichtbar:** ja
- **Wording:** `Eure Antworten zeichnen insgesamt ein sehr geschlossenes Bild. Es kann hilfreich sein, in einzelnen Alltagssituationen noch genauer hinzuschauen, wo feine Unterschiede sichtbar werden könnten.`
- **Interne Wirkung:** Report eher weniger kategorisch formulieren; mehr Einladung zur Differenzierung.

### `low_differentiation`

- **Sichtbar:** ja
- **Wording:** `In euren Antworten zeigen sich bisher eher wenige starke Ausschläge zwischen den Themenfeldern. Für das Gespräch kann es hilfreich sein, konkrete Situationen stärker voneinander zu unterscheiden.`
- **Interne Wirkung:** Workbook-Prompts stärker situativ statt abstrakt formulieren.

### `possible_internal_tension`

- **Sichtbar:** ja
- **Wording:** `In einzelnen Themen zeigen sich gemischte Tendenzen. Das kann darauf hindeuten, dass eure Haltung hier stärker vom Kontext abhängt als in anderen Bereichen.`
- **Interne Wirkung:** Report mit vorsichtigem Ton; keine harte Typisierung.

### `uneven_confidence_pattern`

- **Sichtbar:** ja
- **Wording:** `Bei manchen Themen wirkt euer Profil bereits sehr klar, bei anderen noch offener. Genau darin können gute Ansatzpunkte für weitere Klärung liegen.`
- **Interne Wirkung:** unscharfe Dimensionen nicht überinterpretieren.

### `smooth_alignment_with_scenario_differences`

- **Sichtbar:** ja
- **Wording:** `Euer Kernprofil wirkt in vielen Bereichen ähnlich. In einzelnen konkreten Situationen zeigen sich aber Unterschiede, die im Alltag trotzdem relevant werden können.`
- **Interne Wirkung:** Executive Summary ergänzt Support-Konkretion.

### `polarized_difference_pattern`

- **Sichtbar:** ja
- **Wording:** `Euer Profil ist nicht gleichmäßig ähnlich oder unterschiedlich. Es gibt Bereiche mit hoher Nähe und andere, in denen ihr deutlich verschiedene Arbeitslogiken mitbringt.`
- **Interne Wirkung:** Summary betont gemischtes Muster statt einfachen Fit-Wert.

### `high_extremeness`

- **Sichtbar:** vorzugsweise nein
- **Interne Nutzung:** nur für vorsichtigere Textgenerierung
  - weniger definitive Typisierung
  - mehr Formulierungen wie `sehr klar positioniert`

Wenn sichtbar gemacht:

- **Wording:** `Einige Antworten sind sehr klar positioniert. Das kann helfen, zentrale Orientierungen sichtbar zu machen, lohnt aber besonders dort eine konkrete Übersetzung in euren Alltag.`

---

## 6. Workbook Handoff Rules

## 6.1 Priorisierungslogik

Ein Workbook-Thema wird priorisiert, wenn:

1. `tensionScore >= 31`
2. oder `teamFit < 50`

Wenn mehrere Dimensionen diese Schwelle erfüllen:

- sortiere nach `tensionScore` absteigend
- nimm die Top-2

## 6.2 Verstärkung durch SUPPORT

Support-Items dürfen Workbook-Handoffs **konkretisieren**, aber nicht neu erzeugen.

Beispiel:

- CORE zeigt erhöhte Tension in Risikoorientierung
- SUPPORT zeigt besonders starke Differenz bei Launch-Reife
- Workbook-Fokus wird dann konkret auf `Launch, Unsicherheit und Stop-Kriterien`

## 6.3 Prioritätsstufen

- `P1`: `tensionScore >= 40`
- `P2`: `31–39`
- `P3`: `16–30`

Nutzung:

- `P1` = aktiv in Workbook zuerst bearbeiten
- `P2` = als nächstes Thema
- `P3` = eher als Reflexionsimpuls oder Sekundärthema

## 6.4 Workbook Output-Struktur

```ts
type WorkbookPriority = {
  dimensionId: DimensionId;
  priority: "P1" | "P2" | "P3";
  topicTitle: string;
  conversationFoci: string[];
  supportContext?: string[];
};
```

---

## 7. Technische Mapping-Struktur

Empfehlung für die Implementierung:

```ts
type DimensionReportMapping = {
  dimensionId: DimensionId;
  buckets: {
    highAlignment: {
      summaryLine: string;
      paragraph: string;
      implication: string;
    };
    moderateDifference: {
      summaryLine: string;
      paragraph: string;
      implication: string;
    };
    strongDifference: {
      summaryLine: string;
      paragraph: string;
      implication: string;
    };
  };
  supportItems: {
    itemId: string;
    nuance: string;
    enrichmentTemplate: string;
  }[];
  workbookHandoff: {
    topicTitle: string;
    conversationFoci: string[];
  };
};
```

Zusätzlich:

```ts
type ReportMappingSpecV1 = {
  overall: {
    fitCategories: unknown;
    conflictCategories: unknown;
  };
  dimensions: DimensionReportMapping[];
  executiveSummary: unknown;
  patternFlags: unknown;
};
```

---

## 8. Harte Regeln für die Report Engine

1. CORE-Scores steuern immer die Hauptinterpretation.
2. SUPPORT-Items dürfen nur konkretisieren, nie umdeuten.
3. Pattern-Flags dürfen den Ton modulieren, nie die Kategorie wechseln.
4. Workbook-Prioritäten müssen aus Tension und nicht aus rhetorischer Dramatisierung entstehen.
5. Jede Formulierung bleibt hypothetisch und alltagsbezogen.

---

## 9. Ergebnis

Mit dieser Mapping-Schicht lässt sich aus einem konsistenten System ableiten:

- Executive Summary
- Dimensionskarten
- Support-Hinweise
- Pattern-Hinweise
- Workbook-Prioritäten

ohne dass Messlogik, Interpretation und Gesprächsleitung ineinander verschwimmen.
