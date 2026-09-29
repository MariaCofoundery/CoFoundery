# CoFoundery ALIGN — MVP Report & Visualisierung Spec v0.1

Stand: 29.09.2026  
Zweck: Umsetzungsgrundlage für VS Code / Frontend / Backend  
Status: Produkt- und Entwicklungs-Spezifikation, noch keine empirisch validierte Skalenlogik

---

# 1. Ziel

ALIGN soll zwei unterschiedliche Ergebnisse erzeugen:

1. **Founder Profile**  
   Zeigt, wie eine einzelne Person typischerweise arbeitet.

2. **Team ALIGN Report**  
   Zeigt, wo zwei oder mehr Founder ähnlich antworten, wo sie sich unterscheiden und welche Themen im weiteren Produkt vertieft werden sollten.

Wichtig:

- kein globaler Matchscore
- keine Kompatibilitätsprozentzahl
- keine Ampel "gutes/schlechtes Team"
- keine künstlichen bipolaren Achsen, wenn beide Merkmale gleichzeitig hoch sein können
- keine automatische Vereinbarung im Report
- der Report dient als Diagnose- und Orientierungsraum
- vertiefende Bereiche wie Entscheidungen, Konflikte & Zusammenarbeit, Founder Setup oder eigene Themen sind der Bearbeitungsraum

---

# 2. Produktlogik

## 2.1 Founder Profile

Frage:

> Wie arbeite ich typischerweise?

Bereiche:

- A — Analytische Prüfung
- I — Erfahrungsintuition
- E — Frühes Erproben
- U — Entscheidungsspielraum
- K — Informationsaustausch
- T — Zeitpunkt von Widerspruch
- D — Explizitheit von Widerspruch
- X — Umgang mit offener Informationslage

Ergebnis:

- grafisches Arbeitsprofil
- kurze qualitative Interpretation
- verständliche Beschreibung einzelner Arbeitspräferenzen
- keine Typisierung
- keine Persönlichkeitsdiagnose

---

## 2.2 Venture / ALIGN Profile

Frage:

> Was ist mir bei diesem konkreten Vorhaben wichtig und wie stelle ich mir die Zusammenarbeit vor?

Bereiche:

- S — Ziele & strategische Richtung
- R — Ressourcen & Zusagen
- G — Entscheidungs- und Teamregeln
- B — konkrete Risikogrenzen
- optional W — Prioritäten in Zielkonflikten
- optional L — persönliche Grenzen

Ergebnis:

- strategische Richtung / Vision Map
- konkrete Vergleichswerte
- Erwartungsdifferenzen
- offene Teamthemen
- Verlinkung in passende Vertiefungsbereiche

---

# 3. Grundprinzip der Grafiken

Die alte Version nutzte bipolare Achsen wie:

> substanzorientiert ←→ chancenorientiert

Diese Logik soll im MVP **nicht** weitergeführt werden, wenn die beiden Pole gleichzeitig hoch sein können.

Beispiel:

Eine Person kann gleichzeitig:

- sehr substanzorientiert
- sehr wachstumsorientiert
- wenig exit-orientiert

sein.

Deshalb werden unabhängige Dimensionen verwendet.

---

# 4. Grafik 1 — Founder Work Map

## 4.1 Zweck

Visualisiert das individuelle Arbeitsprofil.

Die Grafik soll schnell erfassbar sein, aber keine falsche psychometrische Präzision suggerieren.

## 4.2 Empfohlene Dimensionen

Für die erste MVP-Grafik:

- Analytische Prüfung
- Erfahrungsintuition
- Frühes Erproben
- Entscheidungsspielraum
- Wohlbefinden bei offener Informationslage

Optional später:

- Informationszeitpunkt
- frühes Ansprechen
- expliziter Widerspruch

K/T/D sind aktuell teilweise nominal oder nicht sauber als Summenskalen interpretierbar. Deshalb zunächst besser als Text-/Tag-Auswertung.

---

## 4.3 Darstellung

Empfohlen:

### Variante A — horizontale Balken

```text
Analytische Prüfung        █████████░  4.4
Erfahrungsintuition        ████████░░  4.0
Frühes Erproben            ███████░░░  3.7
Entscheidungsspielraum     █████████░  4.5
Offene Informationslage    █████░░░░░  2.8
```

### Variante B — Punkt-Skala

```text
niedrig                         hoch
Analytische Prüfung       ─────────●──
Erfahrungsintuition       ───────●────
Frühes Erproben           ──────●─────
Entscheidungsspielraum    ─────────●──
Offene Informationslage   ────●───────
```

Empfehlung für MVP: **horizontale Balken oder Punkt-Skalen**, kein Radar für das Arbeitsprofil.

---

# 5. Berechnungslogik Founder Work Map

Wichtig: Diese Logik ist eine **vorläufige Produktdarstellung**, keine validierte psychometrische Skala.

## 5.1 A — Analytische Prüfung

CORE:

- A01
- A02

Antworten intern codieren:

- nie = 1
- selten = 2
- manchmal = 3
- häufig = 4
- fast immer = 5

Vorläufiger Darstellungswert:

```ts
A_score = mean(A01, A02)
```

Nur für visuelle Darstellung im MVP.

Kennzeichnung intern:

```ts
score_status = "provisional"
```

---

## 5.2 I — Erfahrungsintuition

CORE:

- I01
- I02
- I03

Codierung:

- gar nicht = 1
- eher wenig = 2
- mittel = 3
- stark = 4
- sehr stark = 5

```ts
I_score = mean(I01, I02, I03)
```

A und I niemals gegeneinander verrechnen.

Eine Person kann bei beiden hoch sein.

---

## 5.3 E — Frühes Erproben

CORE:

- E01
- E02
- E03

Codierung:

- sehr unwahrscheinlich = 1
- eher unwahrscheinlich = 2
- teils/teils = 3
- eher wahrscheinlich = 4
- sehr wahrscheinlich = 5

```ts
E_score = mean(E01, E02, E03)
```

---

## 5.4 U — Entscheidungsspielraum

CORE:

- U01
- U03
- U04
- U05

Codierung auf 1–5.

```ts
U_score = mean(U01, U03, U04, U05)
```

---

## 5.5 X — Wohlbefinden bei offener Informationslage

CORE:

- X01
- X02
- X03
- X04

Codierung:

- sehr unwohl = 1
- eher unwohl = 2
- weder wohl noch unwohl = 3
- eher wohl = 4
- sehr wohl = 5

```ts
X_score = mean(X01, X02, X03, X04)
```

Darstellungstitel nicht:

> Ambiguitätstoleranz

sondern zunächst:

> Wohlbefinden bei offener Informationslage

---

# 6. Qualitative Founder-Profilelemente

Nicht jede Information soll in einer Zahl landen.

## 6.1 K — Informationsaustausch

Beispielausgabe:

> Du möchtest über wichtige Richtungsänderungen eher früh informiert werden.

Zusatz:

> Eigene Zwischenstände teilst Du typischerweise, wenn die Richtung klarer wird, aber noch nicht alles fertig ist.

---

## 6.2 T — Zeitpunkt von Widerspruch

Beispiel:

> Du machst Einwände eher früh sichtbar.

oder:

> Du sortierst Deine Sicht häufig zunächst und sprichst sie danach an.

Keine Bewertung:

- nicht "konfliktstark"
- nicht "konfliktschwach"
- nicht "vermeidend"

---

## 6.3 D — Art des Widerspruchs

D01 soll nominal ausgewertet werden.

Beispiel:

> Dein bevorzugter Gesprächseinstieg:
> "Ich habe bei dem Punkt noch Bedenken …"

D02 kann ergänzen:

> Wenn Du einem Vorschlag nicht zustimmst, sagst Du das eher ausdrücklich.

---

# 7. Individueller Founder Profile Report

## 7.1 Reihenfolge

### Header

- Name
- Datum / Instrumentversion
- optional Profilbild
- Hinweis: Entwicklungsprofil, keine Persönlichkeitsdiagnose

### Block 1 — Founder Work Map

Grafik mit A / I / E / U / X.

### Block 2 — Kurzprofil

Beispiel:

> Du verbindest strukturiertes Abwägen mit Erfahrungsintuition.  
> Bei begrenzten und korrigierbaren Entscheidungen probierst Du Dinge eher praktisch aus, statt lange auf vollständige Sicherheit zu warten.  
> In Deinem Verantwortungsbereich möchtest Du weitgehend selbstständig arbeiten. Gleichzeitig möchtest Du über wichtige Entwicklungen in anderen Bereichen früh informiert werden.

### Block 3 — Entscheidungen

- Analytische Prüfung
- Erfahrungsintuition
- Frühes Erproben

### Block 4 — Zusammenarbeit

- Entscheidungsspielraum
- Informationsaustausch

### Block 5 — Meinungsverschiedenheiten

- Zeitpunkt
- sprachlicher Einstieg
- expliziter Widerspruch

### Block 6 — Offene Situationen

- X-Auswertung

### Block 7 — Für andere hilfreich zu wissen

3–5 automatisch generierte Sätze.

Beispiel:

- Du möchtest eigenständig arbeiten, aber bei relevanten Änderungen früh informiert werden.
- Kleine Tests verstehst Du eher als Lernschritt als als endgültige Richtungsentscheidung.
- Einwände machst Du eher früh sichtbar.

---

# 8. Grafik 2 — Venture Direction / Vision Map

## 8.1 Zweck

Die alte "Vision"-Dimension wird nicht als eine bipolare Achse weitergeführt.

Stattdessen werden mehrere unabhängige Zielprioritäten angezeigt.

## 8.2 Dimensionen

Empfohlen:

1. Tragfähige Substanz
2. Wachstum & Skalierung
3. Exit-Orientierung
4. Impact
5. Unabhängigkeit
6. Fachliche / technologische Verwirklichung

---

# 9. Anpassung S01 für die Grafik

Aktuell:

- Mehrfachauswahl
- danach 1–2 wichtigste Ziele

Für eine gute Grafik sollte zusätzlich jede Dimension mit derselben Skala bewertet werden.

Neue Frage:

> Wie wichtig sind Dir für dieses konkrete Vorhaben die folgenden Ziele?

Skala:

- gar nicht wichtig = 1
- wenig wichtig = 2
- mittel = 3
- ziemlich wichtig = 4
- sehr wichtig = 5

Items:

```text
S01a Tragfähige Substanz
Ein wirtschaftlich tragfähiges Unternehmen aufbauen, das verlässlich funktioniert.

S01b Wachstum & Skalierung
Das Unternehmen deutlich wachsen lassen und einen größeren Markt erreichen.

S01c Exit
Ein Unternehmen aufbauen, das perspektivisch teilweise oder vollständig verkauft werden kann.

S01d Impact
Einen konkreten gesellschaftlichen oder ökologischen Beitrag leisten.

S01e Unabhängigkeit
Mehr unternehmerische und persönliche Unabhängigkeit erreichen.

S01f Fachliche Verwirklichung
Eine fachlich oder technologisch anspruchsvolle Idee verwirklichen.
```

Danach weiterhin:

> Welche ein oder zwei Ziele sind Dir aktuell am wichtigsten?

Damit bleiben sowohl Intensität als auch Priorisierung sichtbar.

---

# 10. Darstellung Venture Direction

Empfohlen:

### Variante A — Radar Chart

Geeignet, weil alle sechs Dimensionen dieselbe Antwortskala verwenden.

### Variante B — horizontale Balken

Für Mobile und Accessibility besser.

Beispiel:

```text
Tragfähige Substanz      ██████████  5
Wachstum                 ████████░░  4
Exit                     ███░░░░░░░  2
Impact                   █████████░  5
Unabhängigkeit           █████████░  5
Verwirklichung           ████████░░  4
```

Empfehlung:

- Desktop: Radar + Text
- Mobile: Balken

---

# 11. Individuelle Vision-Auswertung

Beispiel:

> Dir sind sowohl ein tragfähiger Aufbau als auch deutliches Wachstum wichtig.  
> Ein späterer Exit spielt für Dich aktuell eine untergeordnete Rolle.  
> Gleichzeitig gewichtest Du gesellschaftliche Wirkung und unternehmerische Unabhängigkeit hoch.

Nicht:

> Du bist substanzorientiert.

Besser:

> Deine aktuelle strategische Richtung verbindet Substanz, Wachstum und Unabhängigkeit.

---

# 12. Team ALIGN Report

Der Teamreport enthält **keine Vereinbarungsfunktion**.

Er soll:

- Orientierung geben
- Unterschiede sichtbar machen
- relevante Themen priorisieren
- in passende Vertiefungsbereiche weiterleiten

---

# 13. Grafik 3 — Team Difference Map

## 13.1 Zweck

Vergleicht zwei Founder auf derselben Dimension.

Empfohlene Darstellung:

**Dumbbell Chart**

Beispiel:

```text
Analytische Prüfung

1 ─────────●──────●──────── 5
          Alex   Maria
```

oder:

```text
Analytische Prüfung      Alex 4.1 ───●─●── Maria 4.4
Erfahrungsintuition      Alex 2.7 ─●──────● Maria 4.2
Frühes Erproben          Alex 4.4 ─────●●── Maria 4.1
Entscheidungsspielraum   Alex 4.5 ──────●●─ Maria 4.7
Offene Informationslage  Maria 2.4 ─●──────● Alex 4.1
```

Wichtig:

- keine rote/grüne Bewertung
- keine Match-Prozentzahl
- Abstand nur sichtbar machen
- Text erklärt die Bedeutung

---

# 14. Team Venture Direction

Für zwei Founder werden die Vision-Dimensionen übereinandergelegt.

## 14.1 Radar

Zwei Linien / Flächen:

- Maria
- Alex

## 14.2 Alternative

Besser für Mobile:

```text
Substanz
Maria  ██████████ 5
Alex   ██████████ 5

Wachstum
Maria  ████████░░ 4
Alex   ██████████ 5

Exit
Maria  ███░░░░░░░ 2
Alex   ████████░░ 4
```

---

# 15. Teamreport — empfohlene Struktur

## Header

```text
ALIGN Report
Maria × Alex
Venture: [Name]
Stand: [Datum]
```

## Sektion 1 — Auf einen Blick

Automatisch generierter Kurztext:

> Ihr habt in mehreren Bereichen ein ähnliches Grundverständnis.  
> Größere Unterschiede zeigen sich aktuell vor allem bei [Thema 1], [Thema 2] und [Thema 3].

Keine Bewertung.

---

## Sektion 2 — How We Work

### Grafik

Team Difference Map.

### Text

Beispiel:

> Eure Antworten zur analytischen Prüfung liegen nah beieinander.  
> Bei Erfahrungsintuition unterscheiden sie sich stärker: Maria bezieht Erfahrungswissen deutlich stärker in Entscheidungen ein als Alex.

---

## Sektion 3 — Our Venture Direction

### Grafik

Radar oder Balkenvergleich.

### Text

Beispiel:

> Euch beiden sind tragfähiger Aufbau und Wachstum wichtig.  
> Maria gewichtet Impact und Unabhängigkeit höher. Alex misst einem möglichen Exit derzeit größere Bedeutung bei.

---

## Sektion 4 — Ziele & Finanzierung

Vergleich von:

- Exit-Vorstellung
- externes Eigenkapital
- 12-Monats-Ziel
- gewünschte Rolle

Nicht alles numerisch visualisieren.

---

## Sektion 5 — Ressourcen & Erwartungen

Hier werden konkrete Zahlen direkt verglichen.

Beispiel:

```text
Maria kann zusagen:
12–16 Stunden / Woche

Alex erwartet von Maria:
ca. 25 Stunden / Woche
```

Kennzeichnung:

> Erwartungsdifferenz

Nicht:

> geringes Commitment

---

## Sektion 6 — Teamregeln

Vergleich von G01 / G04 / G05.

Beispiel:

> Ihr bevorzugt beide klare Entscheidungsverantwortung in zugeordneten Bereichen.

oder:

> Bei grundlegenden Richtungsänderungen habt Ihr unterschiedliche Vorstellungen über gemeinsame Zustimmung.

---

## Sektion 7 — Risikorahmen

Beispiel:

```text
Mindestreserve:
Maria: 6 Monate
Alex: 3 Monate
```

Text:

> Ihr habt unterschiedliche Vorstellungen darüber, wie groß der finanzielle Puffer vor größeren Investitionen sein sollte.

---

# 16. Relevanzlogik im Teamreport

Themen werden nicht nur nach numerischem Abstand sortiert.

Priorisierung:

## Priorität 1 — konkrete Erwartungsdifferenzen

Beispiel:

- R01 vs. R02
- tatsächliche Zeit vs. erwartete Zeit

## Priorität 2 — unterschiedliche konkrete Ziele oder Regeln

Beispiel:

- Exit
- Finanzierung
- Zustimmungsregeln
- Risikogrenzen

## Priorität 3 — Unterschiede in Arbeitspräferenzen

Beispiel:

- Analytische Prüfung
- Intuition
- Informationszeitpunkt
- Umgang mit Unsicherheit

## Priorität 4 — Gemeinsamkeiten

Gemeinsamkeiten ebenfalls aktiv zeigen.

---

# 17. Weiterleitung in bestehende Plattformbereiche

Der Report soll keine Vereinbarung erzeugen.

Stattdessen CTA-Karten.

## Entscheidungen

Wenn relevant:

```text
Ihr unterscheidet Euch darin, wie früh andere in Entscheidungen einbezogen werden sollen.

[In Entscheidungen vertiefen]
```

## Konflikte & Zusammenarbeit

```text
Ihr sprecht Einwände typischerweise zu unterschiedlichen Zeitpunkten an.

[Zusammenarbeit vertiefen]
```

## Founder Setup

```text
Eure Erwartungen an Zeitbudget oder Finanzierung unterscheiden sich.

[Im Founder Setup besprechen]
```

## Eigenes Thema

```text
Eure Exit-Vorstellungen liegen aktuell deutlich auseinander.

[Als eigenes Thema öffnen]
```

---

# 18. Routing-Logik

Pseudo-Code:

```ts
function getSuggestedDeepDive(topic) {
  switch (topic.category) {
    case "decision_process":
      return "/align/decisions"

    case "conflict":
    case "communication":
      return "/align/collaboration"

    case "time":
    case "roles":
    case "equity":
    case "funding":
    case "commitment":
      return "/founder-setup"

    default:
      return "/align/topic/new"
  }
}
```

Routes an bestehende App-Struktur anpassen.

---

# 19. Datenmodell — Vorschlag

## assessment_response

```ts
type AssessmentResponse = {
  id: string
  userId: string
  assessmentVersion: string
  ventureId?: string
  itemId: string

  valueNumeric?: number
  valueText?: string
  valueOption?: string
  valueOptions?: string[]

  visibility: "private" | "team" | "advisor"
  answeredAt: string
}
```

---

## founder_profile_snapshot

```ts
type FounderProfileSnapshot = {
  userId: string
  assessmentVersion: string

  workMap: {
    analyticalReview?: number
    experientialIntuition?: number
    earlyExperimentation?: number
    decisionAutonomy?: number
    opennessComfort?: number
  }

  qualitative: {
    informationStyle?: string
    objectionTiming?: string
    disagreementStyle?: string
  }

  generatedAt: string
}
```

---

## venture_direction_snapshot

```ts
type VentureDirectionSnapshot = {
  userId: string
  ventureId: string
  assessmentVersion: string

  priorities: {
    substance?: number
    growth?: number
    exit?: number
    impact?: number
    independence?: number
    realization?: number
  }

  topPriorities: string[]
}
```

---

# 20. Team Comparison Model

```ts
type TeamComparison = {
  ventureId: string
  assessmentVersion: string
  members: string[]

  workMapComparison: {
    dimension: string
    values: {
      userId: string
      value: number
    }[]
  }[]

  ventureDirectionComparison: {
    dimension: string
    values: {
      userId: string
      value: number
    }[]
  }[]

  expectationDifferences: ComparisonFinding[]
  strategicDifferences: ComparisonFinding[]
  workStyleDifferences: ComparisonFinding[]
  similarities: ComparisonFinding[]

  suggestedDeepDives: DeepDiveSuggestion[]
}
```

---

# 21. Comparison Finding

```ts
type ComparisonFinding = {
  id: string
  category:
    | "expectation_difference"
    | "strategic_difference"
    | "workstyle_difference"
    | "similarity"

  topic: string

  evidence: {
    userId: string
    label: string
    value: string | number
  }[]

  summary: string
  interpretation?: string

  suggestedModule?:
    | "decisions"
    | "collaboration"
    | "founder_setup"
    | "custom_topic"
}
```

---

# 22. Abstand in Grafiken

Für bereits gleichartig codierte 1–5-Dimensionen:

```ts
difference = Math.abs(valueA - valueB)
```

Nur für Visualisierung / Sortierung.

Vorläufige UI-Klassen:

```ts
if (difference < 0.5) {
  visualDistance = "close"
} else if (difference < 1.5) {
  visualDistance = "noticeable"
} else {
  visualDistance = "large"
}
```

Wichtig:

Diese Klassen dürfen im UI **nicht** als:

- kompatibel
- riskant
- problematisch
- inkompatibel

beschriftet werden.

Besser:

- ähnlich
- unterschiedlich
- deutlich unterschiedlich

Später empirisch prüfen.

---

# 23. Teamgrößen > 2

Bei drei oder mehr Foundern kein Dumbbell Chart.

Stattdessen:

## Option A

Dot Plot mit mehreren Punkten je Dimension.

```text
Analytische Prüfung
1 ─────●──●────●──── 5
      A  B    C
```

## Option B

Mini-Balken pro Founder.

## Option C

Heatmap.

Empfehlung für MVP:

- 2 Founder: Dumbbell
- 3–5 Founder: Dot Plot
- >5 Founder: Heatmap / Advisor View

---

# 24. Privacy

Sensible Felder:

- B01 persönlicher Geldverlust
- R05 persönlicher Mindestbedarf
- L persönliche Grenzen
- ggf. B02 persönliche Haftung

Jede Antwort hat Sichtbarkeit:

```ts
visibility = "private" | "team" | "advisor"
```

Wichtig:

"private" / "not shared" niemals als fehlend interpretieren.

Teamreport:

```ts
if (!shared) {
  doNotCompare()
  doNotInfer()
}
```

---

# 25. UI-Komponenten

Vorschlag:

```text
/components/align/report/
  FounderWorkMap.tsx
  FounderProfileSummary.tsx
  VentureDirectionRadar.tsx
  VentureDirectionBars.tsx
  TeamDumbbellChart.tsx
  TeamDotPlot.tsx
  ComparisonFindingCard.tsx
  ExpectationDifferenceCard.tsx
  SimilarityCard.tsx
  DeepDiveSuggestionCard.tsx
  PrivacyBadge.tsx
```

---

# 26. Report-Seiten

```text
/app/profile/founder-report
/app/align/[ventureId]/report
```

oder entsprechend bestehender Route-Struktur.

---

# 27. Founder Report — Komponentenreihenfolge

```tsx
<FounderReport>
  <ReportHeader />
  <FounderWorkMap />
  <FounderProfileSummary />

  <DecisionProfile />
  <CollaborationProfile />
  <DisagreementProfile />
  <UncertaintyProfile />

  <HelpfulToKnow />
  <RawAnswersAccordion />
</FounderReport>
```

---

# 28. Team ALIGN Report — Komponentenreihenfolge

```tsx
<TeamAlignReport>
  <ReportHeader />

  <TeamSummary />

  <TeamWorkMap />
  <VentureDirectionComparison />

  <ExpectationDifferences />
  <StrategicDifferences />
  <WorkStyleDifferences />
  <Similarities />

  <DeepDiveSuggestions />
</TeamAlignReport>
```

---

# 29. KI-generierte Texte

KI darf:

- Antworten in verständliche Sprache übersetzen
- Unterschiede zusammenfassen
- neutrale Gesprächsimpulse generieren
- passende Vertiefungsmodule vorschlagen

KI darf nicht:

- Motive erfinden
- Persönlichkeit diagnostizieren
- Konfliktrisiko behaupten, wenn nur Antworten unterschiedlich sind
- Kompatibilität berechnen
- "Du bist ..." aus einzelnen Items ableiten
- fehlende/private Antworten interpretieren

---

# 30. Prompt-Grundregel für Report-KI

Systemlogik sinngemäß:

```text
Du interpretierst Founder-Assessment-Antworten beschreibend.

Regeln:
1. Beschreibe nur, was aus den Antworten ableitbar ist.
2. Unterschiede sind keine Defizite.
3. Ähnlichkeit ist nicht automatisch positiv.
4. Keine Persönlichkeitsdiagnosen.
5. Keine Motive unterstellen.
6. Keine Kompatibilitätsprozentwerte.
7. Keine Konfliktprognose allein aus Präferenzunterschieden.
8. Unterscheide Arbeitspräferenzen, Ziele, Ressourcen und Regeln.
9. Bei konkreten Erwartungsdifferenzen benenne die Differenz direkt.
10. Verweise passende Themen an das entsprechende Vertiefungsmodul.
```

---

# 31. Beispiel Founder Report

## Dein Founder Work Profile

### Kurzprofil

> Du verbindest strukturiertes Abwägen mit Erfahrungsintuition.  
> Bei begrenzten und korrigierbaren Entscheidungen probierst Du Dinge eher praktisch aus.  
> In Deinem Verantwortungsbereich möchtest Du weitgehend selbstständig arbeiten. Gleichzeitig möchtest Du über wichtige Entwicklungen früh informiert werden.

### Work Map

```text
Analytische Prüfung        4.4 / 5
Erfahrungsintuition        4.0 / 5
Frühes Erproben            3.7 / 5
Entscheidungsspielraum     4.5 / 5
Offene Informationslage    2.8 / 5
```

### Für andere hilfreich zu wissen

> Du möchtest eigenständig arbeiten, aber bei relevanten Änderungen früh informiert werden.

> Kleine Tests verstehst Du eher als Lernschritt als als endgültige Richtungsentscheidung.

> Einwände machst Du eher früh sichtbar.

---

# 32. Beispiel Team Report

## Maria × Alex

### Auf einen Blick

> Ihr beschreibt Eure analytische Entscheidungsweise ähnlich.  
> Größere Unterschiede zeigen sich aktuell bei Erfahrungsintuition, länger offener Unsicherheit und Euren Vorstellungen zu Exit und finanzieller Reserve.

### How We Work

```text
Analytische Prüfung
Maria 4.4
Alex  4.1

Erfahrungsintuition
Maria 4.2
Alex  2.7
```

Text:

> Eure Antworten zur analytischen Prüfung liegen nah beieinander. Maria bezieht Erfahrungsintuition stärker in Entscheidungen ein als Alex.

### Our Venture Direction

```text
                 Maria   Alex
Substanz           5       5
Wachstum           4       5
Exit               2       4
Impact             5       3
Unabhängigkeit     5       3
Verwirklichung     4       4
```

Text:

> Euch beiden sind tragfähiger Aufbau und Wachstum wichtig. Maria gewichtet Impact und Unabhängigkeit höher. Alex misst einem möglichen Exit derzeit größere Bedeutung bei.

### Konkrete Erwartungsdifferenz

> Maria kann aktuell 12–16 Stunden pro Woche einplanen. Alex erwartet von Maria ungefähr 25 Stunden pro Woche.

CTA:

> Im Founder Setup besprechen

### Unterschied im Informationszeitpunkt

> Maria möchte von wichtigen Richtungsänderungen früher erfahren, als Alex sie typischerweise teilen würde.

CTA:

> Zusammenarbeit vertiefen

### Gemeinsamkeit

> Ihr bevorzugt beide klare Entscheidungsverantwortung in eindeutig zugeordneten Bereichen.

---

# 33. MVP-Abgrenzung

Für v1 bauen:

- Founder Work Map
- Venture Direction Grafik
- Team Difference Map
- Founder Kurzprofil
- Team Kurzreport
- Erwartungsdifferenzen
- Unterschiede
- Gemeinsamkeiten
- Deep-Dive Routing
- Privacy

Noch nicht bauen:

- globaler Matchscore
- automatische Kompatibilitätsbewertung
- "Red Flags" aus bloßen Antwortunterschieden
- automatische Teamvereinbarungen
- prognostische Aussagen
- Typologien
- Normwerte
- Benchmark gegen andere Founder

---

# 34. Empfohlene Build-Reihenfolge

## Phase 1

Founder Profile:

1. Scoring Helper A/I/E/U/X
2. FounderWorkMap
3. qualitative K/T/D-Auswertung
4. FounderProfileSummary
5. Reportseite

## Phase 2

Venture Direction:

1. S01 auf 6 Wichtigkeitsratings erweitern
2. Daten speichern
3. VentureDirectionBars
4. Radar optional
5. Einzel-Venture-Auswertung

## Phase 3

Team Comparison:

1. Compare Service
2. Dumbbell Chart
3. konkrete Ressourcen-/Erwartungsvergleiche
4. strategische Unterschiede
5. Gemeinsamkeiten
6. Deep-Dive Routing

## Phase 4

3+ Founder:

1. Dot Plot
2. Gruppendarstellung
3. Advisor View

---

# 35. Technische Leitregel

Die Darstellung darf aktuell präziser aussehen als ein reiner Textreport, aber intern muss klar bleiben:

```ts
psychometricValidation = false
```

Bis zur empirischen Prüfung:

```ts
displayAs = "descriptive_profile"
not = "validated_trait_score"
```

Das ermöglicht eine hochwertige, visuelle UX, ohne wissenschaftlich mehr zu behaupten, als die Daten aktuell tragen.
