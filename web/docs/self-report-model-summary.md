# Self Report Model – Summary

## Überblick

Das Self-Report-Modell ist ein heuristisches Auswahl- und Priorisierungssystem für den Individual Report. Es interpretiert sechs vorhandene Dimensionen nicht als Diagnostik, sondern als arbeitsbezogene Präferenzmuster im Founder-Alltag.

## Die 6 Dimensionen

- `Unternehmenslogik`
  Beschreibt, ob unternehmerische Entscheidungen stärker an strategischer Wirkung und Verwertbarkeit oder stärker an Substanz und Aufbau orientiert werden.
- `Entscheidungslogik`
  Beschreibt, ob Entscheidungen eher analytisch und begründet oder eher intuitiv und situativ getroffen werden.
- `Risikoorientierung`
  Beschreibt, wie Unsicherheit und Wagnis eher vorsichtig abgesichert oder chancenorientiert eingeordnet werden.
- `Arbeitsstruktur & Zusammenarbeit`
  Beschreibt, wie eng jemand im Alltag mit anderen abgestimmt arbeiten und sichtbar verbunden bleiben will.
- `Commitment`
  Beschreibt, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau jemand für sich und das Team erwartet.
- `Konfliktstil`
  Beschreibt, wie Spannungen eher reflektiert und dosiert oder direkt und früh angesprochen werden.

## Gewichte

| Dimension | Social Impact | Coordination Risk |
| --- | ---: | ---: |
| Unternehmenslogik | 2 | 2 |
| Entscheidungslogik | 2 | 2 |
| Risikoorientierung | 2 | 1 |
| Arbeitsstruktur & Zusammenarbeit | 3 | 3 |
| Commitment | 3 | 3 |
| Konfliktstil | 3 | 3 |

Kurzlogik:
- `socialImpactWeight` beschreibt, wie schnell eine Dimension interpersonal spürbar wird.
- `coordinationRiskWeight` beschreibt, wie stark eine Dimension laufende Abstimmungsprobleme erzeugen kann.

## Friction-Logik

- `clear`
  Reibung wird über den sichtbaren Pol modelliert:
  `orientationStrength * socialImpactWeight`
- `moderate`
  Reibung wird entweder über den Pol oder über Koordinationslast modelliert:
  - bei koordinativ starken, noch nicht klaren Feldern eher über Unklarheit
  - sonst eher über den schon sichtbaren Pol
- `balanced`
  Reibung wird als offenes Koordinationsfeld modelliert:
  `coordinationRiskWeight * 10`

Leitidee:
- Klarheit kann Reibung erzeugen, wenn sie Verhalten stabil macht.
- Unklarheit kann Reibung erzeugen, wenn Teams nicht wissen, worauf sie sich einstellen sollen.

## Selection-Logik

- `primarySignal`
  Kernsignal des Profils, bevorzugt aus klaren Ausprägungen.
- `workModeSignal`
  Zweites starkes Signal aus einer anderen Familie.
- `tensionCarrier`
  Der Bereich mit der stärksten wahrscheinlichen Reibung.
- `patternDimensions`
  Drei verdichtete Muster, maximal eins pro Familie.
- `challengeDimensions`
  Relevante Reibungsstellen aus Primärsignal, Friktion und offenen Feldern.
- `complementDimensions`
  Funktionale Ergänzungsrollen:
  - `counterweight`
  - `regulator`
  - `rhythm_partner`

## Familien

- `direction`
  Unternehmenslogik, Commitment
- `decision_under_uncertainty`
  Entscheidungslogik, Risikoorientierung
- `collaboration_under_pressure`
  Arbeitsstruktur & Zusammenarbeit, Konfliktstil

## Duplication Groups

- `direction_drive`
  Unternehmenslogik, Commitment
- `uncertainty_control`
  Entscheidungslogik, Risikoorientierung
- `pressure_coupling`
  Arbeitsstruktur & Zusammenarbeit, Konfliktstil

Diese Gruppen reduzieren semantische Dopplungen im Report, können aber reale Komplexität sichtbar verkürzen.

## Wichtige Vorsicht

- Das Modell ist heuristisch, nicht diagnostisch.
- Ein hoher `frictionScore` bedeutet keine sichere Teamstörung.
- Balancierte Profile sind nicht automatisch konfliktarm.
- Outputs sind als strukturierte Hypothesen für Interpretation zu lesen, nicht als endgültige Wahrheit.
