# Founder Dynamics Model - Technical Brief

Stand: aktive Implementierung auf Basis der Registry `1.0.0`, Modellversion `founder-compatibility-v1-core24-support12`, erstellt am `2026-04-01`

## 1. Zweck und Einordnung

Das Founder-Matching-Tool ist ein regelbasiertes Founder-Dynamics-Modell. Es soll keine Persoenlichkeit im klinischen Sinn messen und auch keine endgültigen Urteile ueber Teamqualitaet faellen. Sein Zweck ist enger und praktischer:

- zwei Founder-Profile auf sechs arbeits- und entscheidungsrelevanten Dimensionen vergleichbar machen
- gemeinsame Lage und Unterschiede sichtbar machen
- daraus plausible Spannungen, Ergaenzungen und Blind-Spot-Risiken ableiten
- ein strukturiertes Gespraech ueber Zusammenarbeit vorbereiten
- in ein Workbook ueberfuehren, in dem Regeln, Leitplanken und Vereinbarungen festgehalten werden

Das Modell ist fuer Gruendungsteams, Matching-Situationen vor einer Gruendung und fuer bestehende Founder-Teams gedacht. Es ist damit ein heuristisches Gespraechs-, Reflexions- und Strukturierungsinstrument fuer Zusammenarbeit unter Unsicherheit.

### Was das Modell leisten soll

- typische Unterschiede in strategischer und operativer Logik sichtbar machen
- gemeinsame Extreme nicht nur als "Naehe", sondern auch als moegliche Blind Spots lesbar machen
- aus sechs Dimensionslagen eine nachvollziehbare Matching-Logik ableiten
- Report- und Workbook-Logik mit derselben Produktwahrheit speisen

### Was das Modell nicht leisten soll

- keine klinische Diagnostik
- kein psychometrisch voll validierter Persoenlichkeitstest
- keine harte Vorhersage von Unternehmenserfolg oder Teambruch
- keine automatische Wahrheit ueber Personen oder Beziehungen
- kein Ersatz fuer Gespraech, Beobachtung, Verlauf und Kontext

## 2. Modellueberblick

Das System arbeitet in vier Schichten:

1. Item-Ebene  
   Antworten auf dimensionenspezifische Basisitems werden auf eine gemeinsame 0-100-Logik normiert.

2. Dimensions-Ebene  
   Pro Person entsteht fuer jede der sechs Dimensionen ein Dimensionsscore.

3. Matching-Ebene  
   Zwei Founder-Scores werden pro Dimension nicht nur als Distanz, sondern als gemeinsame Lage (`jointState`) plus Extrem- und Risikosignale interpretiert.

4. Produkt-Ebene  
   Executive Summary, Matching Report und Workbook erhalten ihre Signale aus derselben state-first Matching-Logik.

## 3. Die sechs aktiven Dimensionen

| Dimension | Erfasst vor allem | Pole | Relevanz im Founder-Kontext |
| --- | --- | --- | --- |
| Unternehmenslogik | woran unternehmerische Prioritaeten, Chancen und Richtung ausgerichtet werden | `substanz & aufbauorientiert` <-> `chancen & hebelorientiert` | founder muessen nicht nur dieselbe Vision wollen, sondern Optionen nach aehnlichen Massstaeben sortieren |
| Entscheidungslogik | wie viel Analyse, Urteil, Tempo und Prueftiefe fuer eine tragfaehige Entscheidung noetig sind | `analytisch abwaegend` <-> `intuitiv handlungsorientiert` | Unterschiedliche Kriterien fuer "entscheidungsreif" fuehren schnell zu Schleifen oder vorschnellen Commitments |
| Arbeitsstruktur & Zusammenarbeit | wie viel Eigenraum, Sichtbarkeit, Abstimmung und Mitsicht im Alltag erwartet wird | `autonom` <-> `abgestimmt` | Founder scheitern oft nicht an Zielen, sondern an ungeklaerten Erwartungen zu Sichtbarkeit, Ownership und Abstimmung |
| Commitment | welches Einsatzniveau, welche Priorisierung und welche Verbindlichkeit implizit und explizit erwartet werden | `klar begrenzt` <-> `hoch priorisiert` | unterschiedliche Einsatzrealitaeten erzeugen leicht moralische Fehlinterpretationen und stille Ueberlast |
| Risikoorientierung | wie Unsicherheit, Wagnis und Absicherung gelesen werden | `sicherheitsorientiert` <-> `unsicherheitsbereit` | dieselbe Chance kann fuer eine Person vertretbar und fuer die andere unnoetige Exposition sein |
| Konfliktstil | wie frueh, direkt oder sortierend Unterschiede angesprochen und bearbeitet werden | `sortierend` <-> `direkt` | Spannungen eskalieren nicht nur am Thema, sondern an Rhythmus, Direktheit und Klaerungsstil |

### Inhaltliche Logik

Die sechs Dimensionen sind nicht als stabile Persoenlichkeitstypen formuliert, sondern als arbeits- und fuehrungsnahe Praeferenzachsen. Sie sollen Founder-Dynamiken sichtbar machen, nicht Charaktere typisieren.

## 4. Item-Architektur

Die aktive Registry umfasst 36 aktive Basisitems:

- 6 Dimensionen
- pro Dimension 6 aktive Items
- davon 4 `CORE`
- davon 2 `SUPPORT`

### Verteilung pro Dimension

Pro Dimension gilt aktuell:

- 4 CORE-Items
- 2 SUPPORT-Items
- insgesamt 1 Likert-Item, 1 Forced-Choice-Item und 4 Szenario-Items
- die beiden SUPPORT-Items sind aktuell szenariobasiert

### Warum CORE und SUPPORT getrennt sind

`CORE`-Items sind scoring-relevant. Nur sie gehen numerisch in den Dimensionsscore und damit in Matching, `overallScore`, `alignmentScore` und `workingCompatibilityScore` ein.

`SUPPORT`-Items sind nicht scoring-relevant. Sie dienen der narrativen Anreicherung, der Report-Nuancierung und der Kontextualisierung im Workbook. Damit soll verhindert werden, dass alle Frageinhalte dieselbe numerische Last tragen, obwohl einige eher zur Verdichtung als zur Messung gedacht sind.

### Antwortformate

Das System nutzt drei aktive Antwortformen:

| Typ | Aktuelle Skala |
| --- | --- |
| Likert | `0, 25, 50, 75, 100` |
| Forced Choice | `0, 25, 50, 75, 100` |
| Scenario | `0, 33, 67, 100` |

### Item-Interpretation

Alle Items werden so normiert, dass sie auf denselben Dimensionsraum abgebildet werden koennen:

- `0` entspricht dem linken Pol der Dimension
- `100` entspricht dem rechten Pol der Dimension

Dabei wird die Item-Polarity explizit ueber Registry-Metadaten verarbeitet. Ein hoher Rohwert bedeutet also nicht automatisch "mehr rechts". Er wird zuerst ueber die jeweilige Item-Polarity in den gemeinsamen Founder-Prozentwert uebersetzt.

## 5. Wie aus Antworten Dimensionsscores entstehen

### 5.1 Antwort-Normalisierung

Das Runtime-System uebersetzt Antworten zunaechst in eine V2-Antwortkarte pro Founder. Dabei werden sowohl aktive Registry-Item-IDs als auch die Legacy-Frage-IDs (`q01...q48`) akzeptiert. Die Legacy-IDs werden nur an der Grenze in aktive Registry-Items ueberfuehrt.

### 5.2 Numerischer Dimensionsscore

Pro Founder und Dimension gilt:

1. Nur aktive `CORE`-Items der Dimension werden beruecksichtigt.
2. Die Antworten werden in Founder-Prozentwerte auf `0-100` normiert.
3. Der Dimensionsscore ist der arithmetische Mittelwert der vorhandenen CORE-Itemwerte dieser Dimension.

Formal:

`Dimensionsscore(person, dimension) = Mittelwert aller normierten CORE-Itemwerte dieser Dimension`

Es gibt keine komplexe Itemgewichtung innerhalb einer Dimension. Die unterschiedliche Relevanz entsteht spaeter auf Matching-Ebene ueber Dimensionsgewichte.

## 6. Von Dimensionsscores zu Joint Position

Jeder Dimensionsscore wird zunaechst in eine Lageklasse ueberfuehrt:

- `LOW`: `0-33`
- `MID`: `34-66`
- `HIGH`: `67-100`

Zusaetzlich werden Extrembereiche markiert:

- `EXTREME_LOW`: `< 15`
- `EXTREME_HIGH`: `> 85`

Aus den beiden Lageklassen eines Founder-Paars entsteht der `jointState`:

| Joint State | Bedeutung |
| --- | --- |
| `BOTH_LOW` | beide liegen im unteren Bereich der Dimension |
| `BOTH_MID` | beide liegen im mittleren Bereich |
| `BOTH_HIGH` | beide liegen im oberen Bereich |
| `LOW_MID` | eine Person liegt niedrig, die andere mittig |
| `MID_HIGH` | eine Person liegt mittig, die andere hoch |
| `OPPOSITE` | eine Person liegt niedrig, die andere hoch |

Wichtig: Das System behandelt Distanz nicht mehr als primaeres Signal. Primaer ist die gemeinsame Lage. Distanz dient innerhalb desselben Zustands nur noch als Verfeinerung.

## 7. Matching-Logik

## 7.1 State-first statt Distance-first

Die aktive Matching-Logik basiert auf:

- gemeinsamer Lage (`jointState`)
- Distanz zwischen den beiden Scores
- Extrem-Flags
- gemeinsame Extreme
- dimensionsspezifischen Basisannahmen
- regelbasierten Interaktionsregeln zwischen Dimensionen

### Grundklassifikation pro Zustand

Die Basislogik lautet vereinfacht:

- `BOTH_MID` -> primaer `aligned`, niedriges Risiko
- `BOTH_HIGH` -> primaer `aligned`, aber mittleres Risiko
- `BOTH_LOW` -> primaer `aligned`, aber mittleres Risiko
- `LOW_MID` / `MID_HIGH`
  - in strategischen Dimensionen (`Unternehmenslogik`, `Entscheidungslogik`, `Risikoorientierung`) eher `complementary`
  - in operativen Dimensionen (`Arbeitsstruktur`, `Commitment`, `Konfliktstil`) eher `tension`
- `OPPOSITE` -> `tension`, in mehreren Dimensionen mit hoher Risikoeinstufung

### Warum Gleichheit nicht automatisch Staerke bedeutet

Das Modell macht einen zentralen Unterschied:

- `BOTH_MID` kann eine tragfaehige, moderierte gemeinsame Lage sein
- `BOTH_HIGH` und `BOTH_LOW` sind zwar "gleich", aber nicht automatisch stabil

Beispiele:

- `BOTH_HIGH` in Commitment kann gemeinsamen Zug bedeuten, aber auch stille Ueberlast
- `BOTH_LOW` in Risiko kann gemeinsame Vorsicht bedeuten, aber auch verpasste Chancen
- `BOTH_HIGH` in Konfliktstil kann Klarheit schaffen, aber auch Eskalationsdruck erzeugen

Gemeinsame Lage wird also immer inhaltlich gelesen, nicht nur formal als Aehnlichkeit.

## 7.2 Blind-Spot-Risiko

Ein `hasSharedBlindSpotRisk` wird aktuell gesetzt, wenn:

- der `jointState` nicht `BOTH_MID` ist
- der `jointState` nicht `OPPOSITE` ist
- und entweder
  - `BOTH_HIGH` vorliegt
  - `BOTH_LOW` vorliegt
  - oder beide gemeinsam im Extrembereich `EXTREME_HIGH` bzw. `EXTREME_LOW` liegen

Die Logik dahinter:

Offene Gegensaetze sind sichtbar. Problematischer kann hohe Aehnlichkeit in derselben starken Richtung sein, wenn dieselbe Luecke fuer beide unsichtbar bleibt.

## 7.3 Distanz und Feinanpassung

Zur Basislogik kommen Feinanpassungen:

- gleiche Lage wird bei kleiner Distanz leicht positiver gelesen
- angrenzende Lagen erhalten eine moderate Distanzanpassung
- `OPPOSITE` erhaelt eine Distanzstrafe
- gemeinsame Extreme fuehren zu einer zusaetzlichen Blind-Spot-Strafe

Das Modell kombiniert also Lage, Distanz und Extremwerte, ohne Distanz wieder zum Hauptsignal zu machen.

## 7.4 Regelbasierte Eskalationen zwischen Dimensionen

Nach der Grundklassifikation greifen Interaktionsregeln. Beispiele aus der aktiven Implementierung:

- **Commitment-Hard-Penalty**  
  sehr grosse Commitment-Gegensaetze werden direkt als hochriskante Spannung behandelt

- **Work-Structure-Clash**  
  sehr grosse Unterschiede in Abstimmung vs. Eigenraum werden hochriskant eskaliert

- **Company-Logic-Commitment-Dependency**  
  grosse Unterschiede in Unternehmenslogik werden je nach Commitment-Lage als produktive Differenz, mittlere Spannung oder harte strategische Spannung gelesen

- **Decision-Conflict-Escalation**  
  wenn Entscheidungslogik und Konfliktstil gleichzeitig stark auseinanderlaufen, werden beide Risikostufen hochgesetzt

- **Risk-Commitment-Escalation**  
  gegensaetzliche Risikologik plus spannungsvolles Commitment fuehren zu zusaetzlicher Eskalation

Diese Regeln sollen nicht "Psychologie" im engen Sinn abbilden, sondern plausible Eskalationsmuster in Founder-Arbeit.

## 8. Aggregierte Scores

Das Modell berechnet drei aggregierte Scores:

### 8.1 `overallScore`

Gewichteter Mittelwert ueber alle sechs Dimensions-Kompatibilitaeten.

Aktuelle Dimensionsgewichte:

- Commitment: `1.5`
- Arbeitsstruktur & Zusammenarbeit: `1.4`
- Konfliktstil: `1.3`
- Unternehmenslogik: `1.2`
- Entscheidungslogik: `1.0`
- Risikoorientierung: `0.9`

Lesart: globale heuristische Gesamtkompatibilitaet, nicht wissenschaftlicher Summenindex.

### 8.2 `alignmentScore`

Gewichteter Mittelwert ueber die strategischen Dimensionen:

- Unternehmenslogik
- Entscheidungslogik
- Risikoorientierung

Lesart: strategische und richtungsbezogene Anschlussfaehigkeit.

### 8.3 `workingCompatibilityScore`

Gewichteter Mittelwert ueber die operativen Dimensionen:

- Arbeitsstruktur & Zusammenarbeit
- Commitment
- Konfliktstil

Lesart: alltägliche Arbeits- und Fuehrungskompatibilitaet.

### Wie die Scores gelesen werden sollten

- hohe Werte sind nur im Zusammenspiel mit Joint States und Blind-Spot-Signalen sinnvoll
- zwei hohe Subscores koennen trotzdem stille Watchpoints enthalten
- `overallScore` darf strategische und operative Unterschiede nicht plattbuegeln
- die Trennung von `alignmentScore` und `workingCompatibilityScore` ist bewusst wichtiger als ein einzelner Gesamtscore

## 9. Von Matching zu Executive Summary, Report und Workbook

## 9.1 Executive Summary

Die Executive Summary liest nicht nur `overallFit`, sondern vor allem:

- `alignmentScore`
- `workingCompatibilityScore`
- `sharedBlindSpotRisk`
- `topStrength`
- `topComplementaryDynamic`
- `topTension`

Sie erzeugt daraus:

- eine headline zur Grundlage des Duos
- ein Einordnungstext je nach strategischer und operativer Lage
- drei Kernbotschaften: Staerke, Ergaenzung, Spannung
- empfohlene Fokusfragen fuer das weitere Gespraech

## 9.2 Matching Report

Der aktive Founder-Matching-Report arbeitet ueber:

- `compareFounders(...)`
- `buildFounderMatchingSelection(...)`
- `buildFounderMatchingMarkers(...)`
- `FounderMatchingView`

Die zentrale Selektionslogik ist state-first:

- **stableBase**: bevorzugt `BOTH_MID`, aligned, low-risk, ohne Blind Spot
- **strongestComplement**: bevorzugt `LOW_MID` / `MID_HIGH`, komplementaer, nicht hochriskant
- **biggestTension**: priorisiert `OPPOSITE`, regel-eskalierte Hochrisiken, dann weitere Spannungen
- **heroSelection**: entscheidet, ob das Duo eher ueber tragfaehige Basis, produktive Ergaenzung, offene Spannung, Koordinationsbedarf oder Blind-Spot-Watchpoint erzaehlt wird

Der Matching Report leitet daraus ab:

- Einstieg / Grunddynamik
- zentrale Muster
- Alltagsdynamik
- Chancen
- Spannungen
- Steuer- und Klaerungsfragen

## 9.3 Workbook

Das Workbook erhaelt seine Struktur nicht aus Freitext, sondern aus Matching-Signalen:

- `deriveWorkbookStepMarkers(...)` ordnet jedem Workbook-Schritt einen Marker zu
- diese Marker entstehen aus den Dimension-Statusen und aus `highSimilarityBlindSpotRisk`

Aktive Markerklassen:

| Marker | Bedeutung |
| --- | --- |
| `stable_base` | tragende gemeinsame Basis, die geschuetzt werden soll |
| `conditional_complement` | produktive Ergaenzung, die Regeln braucht |
| `high_rule_need` | kein akuter Bruch, aber hoher Regelbedarf |
| `critical_clarification_point` | kritisches Feld mit explizitem Klaerungs- oder Eskalationsbedarf |

Diese Marker wirken downstream auf:

- Priorisierung von Workbook-Schritten
- Ton und Haltung des jeweiligen Schritts
- strukturierte Outputs, die pro Schritt verpflichtend sind
- Matching-bezogene Impulse im Denkraum

### Workbook-Schrittlogik

Die aktiven Founder-Schritte sind:

- vision_direction
- roles_responsibility
- decision_rules
- commitment_load
- collaboration_conflict
- ownership_risk
- values_guardrails
- alignment_90_days

Fuer diese Schritte werden Marker und Matching-Impulse genutzt, damit das Workbook nicht losgeloest vom Report arbeitet, sondern an den relevanten Feldern vertieft.

## 10. Methodische Grenzen

Das System ist ausdruecklich **kein klinisches oder psychometrisch voll validiertes Diagnoseinstrument**. Es ist ein heuristisches Founder-Dynamics-Modell mit regelbasiertem Matching.

Wichtige Grenzen:

- **soziale Erwuenschtheit**  
  Founder koennen Antworten in Richtung idealisierter Selbstbilder geben

- **begrenzte Konstrukttrennung**  
  einige Dimensionen sind arbeitsnah und pragmatisch sinnvoll, aber nicht strikt psychometrisch rein

- **fehlende formale Validierung**  
  es liegt aktuell keine abgeschlossene Validierung zu Reliabilitaet, Faktorstruktur, diskriminanter Validitaet oder Prognosekraft vor

- **gemeinsame Extreme sind interpretativ anspruchsvoll**  
  `BOTH_HIGH` oder `BOTH_LOW` koennen tragfaehig oder riskant sein; die Heuristik adressiert das, aber nicht mit harter empirischer Sicherheit

- **keine Laengsschnittbasis**  
  die aktuelle Logik ist plausibel modelliert, aber noch nicht ueber mehrere Jahre mit realen Founder-Daten kalibriert

- **Kontextabhaengigkeit**  
  dasselbe Duo kann je nach Phase, Markt, Kapitaldruck und Rollenverteilung anders funktionieren

- **kein Wahrheitssystem**  
  die Nutzung ist als Gespraechs-, Reflexions- und Entscheidungsinstrument gedacht, nicht als endgueltige Aussage ueber Personen oder Teams

## 11. Potenzielle Forschungs- und Validierungsfragen

Dieses System hat Forschungspotenzial, gerade weil es bereits strukturiert, aber noch nicht ueberbehauptet ist. Relevante Anschlussfragen waeren:

- Wie stabil sind die sechs Dimensionsscores ueber Zeit?
- Bilden die sechs Dimensionen empirisch trennbare Konstrukte?
- Wie gut sagen `alignmentScore`, `workingCompatibilityScore` und Blind-Spot-Signale spaetere Teamdynamiken voraus?
- Sind gemeinsame Extreme (`BOTH_HIGH`, `BOTH_LOW`) tatsaechlich mit spezifischen Blind-Spot-Risiken verbunden?
- Welche Matching-Muster haengen mit spaeteren Founder-Konflikten, Rollenumbauten oder Trennungen zusammen?
- Wie stark unterscheiden sich Gruendungsteams vor Gruendung gegenueber bereits bestehenden Teams?
- Welche Rolle spielen externe Faktoren wie Kapitaldruck, Rollenverteilung oder Teamphase als Moderatoren?

Moegliche Kooperationsfelder:

- Wirtschaftspsychologie
- Entrepreneurship-Forschung
- Team- und Organisationspsychologie
- Laengsschnittforschung zu Gruendungsteams
- Mixed-Methods-Studien mit quantitativen Scores und qualitativen Follow-up-Interviews

## 12. Praktische Lesart fuer Gespraeche mit Forschung und Praxis

Die ehrlichste fachliche Kurzbeschreibung des Systems lautet:

> Das Tool ist ein regelbasiertes, dimensionsorientiertes Founder-Dynamics-Modell.  
> Es nutzt normierte Basisitems, CORE-only-Dimensionsscoring, state-first Matching mit Joint Positions, Extrem-Flags und Interaktionsregeln, um plausible strategische und operative Teamdynamiken sichtbar zu machen.  
> Es ist kein validiertes Diagnostikinstrument, aber eine strukturierte heuristische Arbeitsgrundlage fuer Matching, Reflexion und Regelbildung in Founder-Teams.

## 13. Technische Grundlage dieses Briefs

Die aktive Produktlogik in diesem Dokument basiert auf folgenden Pfaden:

- `web/src/features/scoring/founderCompatibilityRegistry.ts`
- `web/docs/founder-compatibility-item-registry-v1.json`
- `web/src/features/scoring/founderCompatibilityAnswerRuntime.ts`
- `web/src/features/scoring/founderCompatibilityScoringV2.ts`
- `web/src/features/scoring/founderMatching.ts`
- `web/src/features/reporting/founderMatchingEngine.ts`
- `web/src/features/reporting/founderMatchingSelection.ts`
- `web/src/features/reporting/buildExecutiveSummary.ts`
- `web/src/features/reporting/founderMatchingMarkers.ts`
- `web/src/features/reporting/founderAlignmentWorkbook.ts`
- `web/src/features/reporting/founderAlignmentWorkbookImpulses.ts`
- `web/src/features/reporting/FounderMatchingView.tsx`

## 14. Offene technische Altlogik und Punkte fuer kritische Gegenpruefung

Es gibt weiterhin einige Legacy- oder Kompatibilitaetsreste, die fuer Forschungsgespraeche offen benannt werden sollten:

- `founderBaseQuestionMeta.ts`  
  dient noch als Legacy-Bridge fuer die alten `q01...q48`-IDs; die aktive Semantik lebt aber in der Registry

- `founderScoring.ts` und `founderCompatibilityScoringV2.ts`  
  enthalten noch Kompatibilitaetsfelder wie `conflictRiskIndex`, `overallFit` oder `hiddenDifferenceScore`, die fuer aktive V2-Logik nicht mehr zentral sind

- `buildFounderAlignmentReport.ts`  
  ist laut Kommentar ein Legacy-Kompatibilitaetspfad; der aktive founder-facing Matching-Report rendert ueber `FounderMatchingView`

- `generateCompareReport.ts`  
  enthaelt noch aeltere Compare-/Archetypen-/Zonenlogik und sollte vor externen methodischen Gespraechen nicht als aktuelle Produktwahrheit dargestellt werden, solange nicht klar ist, welche Teile davon noch aktiv sichtbar sind

### Vor einem Gespraech mit Forschenden kritisch gegenpruefen

- sind wirklich alle sichtbaren Reportflaechen bereits vollstaendig auf state-first Logik umgestellt?
- gibt es noch UI- oder Exportpfade, die alte Archetypen- oder Zonenlogik einblenden?
- sollen `overallScore` und `overallFit` extern ueberhaupt prominent gezeigt werden, oder eher nachrangig hinter Alignment und Working Compatibility?
- ist die Trennung von `CORE` und `SUPPORT` fuer Forschungspartner ausreichend dokumentiert, inklusive Iteminhalt und Layer-Rationale?
- sollen fuer Forschungsgespraeche Itemtexte und Polarity-Mappings als eigener Anhang exportiert werden?

Wenn dieses Dokument fuer externe Forschungsgespraeche genutzt wird, sollte genau diese Offenheit beibehalten werden: sauber modelliert, nachvollziehbar implementiert, aber ohne Anspruch auf bereits abgeschlossene psychometrische Validierung.
