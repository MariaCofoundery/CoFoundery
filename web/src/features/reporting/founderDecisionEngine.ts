import type { DimensionMatchResult } from "@/features/reporting/founderMatchingEngine";
import type {
  FounderMatchingSelection,
  MatchingDimensionStatus,
} from "@/features/reporting/founderMatchingSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

export type DecisionCategory = "direction" | "decision" | "commitment" | "collaboration";
export type DecisionCardSeverity = "critical" | "important" | "watch";

export type DecisionEngineCard = {
  id: string;
  dimension: FounderDimensionKey;
  category: DecisionCategory;
  severity: DecisionCardSeverity;
  title: string;
  interpretation: string;
  relevanceMoment: string;
  consequence: string;
  clarificationPoints: string[];
};

type DecisionDimensionInsight = DecisionEngineCard & {
  decisionRiskScore: number;
};

const CATEGORY_BY_DIMENSION: Record<FounderDimensionKey, DecisionCategory> = {
  Unternehmenslogik: "direction",
  Risikoorientierung: "direction",
  Entscheidungslogik: "decision",
  Commitment: "commitment",
  "Arbeitsstruktur & Zusammenarbeit": "collaboration",
  Konfliktstil: "collaboration",
};

const CATEGORY_WEIGHT: Record<DecisionCategory, number> = {
  direction: 3,
  decision: 3,
  commitment: 2,
  collaboration: 1,
};

const JOINT_STATE_WEIGHT: Record<NonNullable<DimensionMatchResult["jointState"]>, number> = {
  OPPOSITE: 3,
  BOTH_HIGH: 2,
  BOTH_LOW: 2,
  BOTH_MID: 1,
  LOW_MID: 1,
  MID_HIGH: 1,
};

const RISK_WEIGHT: Record<NonNullable<DimensionMatchResult["riskLevel"]>, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function getDecisionCategory(dimension: FounderDimensionKey): DecisionCategory {
  return CATEGORY_BY_DIMENSION[dimension];
}

export function getDecisionRiskScore(dimensionState: Pick<
  DimensionMatchResult,
  "dimension" | "jointState" | "riskLevel" | "hasSharedBlindSpotRisk"
>) {
  const category = getDecisionCategory(dimensionState.dimension);
  return (
    JOINT_STATE_WEIGHT[dimensionState.jointState ?? "BOTH_MID"] +
    RISK_WEIGHT[dimensionState.riskLevel ?? "low"] +
    (dimensionState.hasSharedBlindSpotRisk ? 3 : 0) +
    CATEGORY_WEIGHT[category]
  );
}

function getSeverity(score: number): DecisionCardSeverity {
  if (score >= 9) return "critical";
  if (score >= 7) return "important";
  return "watch";
}

function getStatus(
  selection: FounderMatchingSelection,
  dimension: FounderDimensionKey
): MatchingDimensionStatus {
  return selection.dimensionStatuses.find((entry) => entry.dimension === dimension)?.status ?? "nah";
}

function getPriorityTieBreaker(selection: FounderMatchingSelection, dimension: FounderDimensionKey) {
  let score = 0;

  if (selection.biggestTension?.dimension === dimension) score += 4;
  if (selection.agreementFocusDimensions.some((entry) => entry.dimension === dimension)) score += 2;
  if (selection.dailyDynamicsDimensions.some((entry) => entry.dimension === dimension)) score += 1;

  return score;
}

function buildTitle(match: DimensionMatchResult) {
  switch (match.dimension) {
    case "Unternehmenslogik":
      if (match.jointState === "OPPOSITE") {
        return "Wachstum und Absicherung koennten auseinanderlaufen";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Richtung koennte zu schnell auf Hebel kippen";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Richtung koennte zu defensiv gefuehrt werden";
      }
      return "Strategische Prioritaeten brauchen einen klaren Massstab";
    case "Risikoorientierung":
      if (match.jointState === "OPPOSITE") {
        return "Chancen koennten sehr unterschiedlich lesbar werden";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Mut koennte ohne Gegenkraft zum Standard werden";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Absicherung koennte Chancen zu lange blockieren";
      }
      return "Risikogrenzen brauchen eine gemeinsame Schwelle";
    case "Entscheidungslogik":
      if (match.jointState === "OPPOSITE") {
        return "Entscheidungen koennten unterschiedlich schnell reif werden";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Entscheidungen koennten zu frueh geschlossen werden";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Entscheidungen koennten zu lange offen bleiben";
      }
      return "Der Weg zur Entscheidung braucht klare Stop-Regeln";
    case "Commitment":
      if (match.jointState === "OPPOSITE") {
        return "Einsatz und Erwartung koennten sich verschieben";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Hoher Einsatz koennte still zur Pflicht werden";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Verantwortung koennte zu eng gerahmt bleiben";
      }
      return "Commitment braucht eine belastbare Erwartungslinie";
    case "Arbeitsstruktur & Zusammenarbeit":
      if (match.jointState === "OPPOSITE") {
        return "Verantwortung und Mitsicht koennten kollidieren";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Eigenraum koennte zu wenig Mitsicht haben";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Abstimmung koennte Tempo aus dem System nehmen";
      }
      return "Zusammenarbeit braucht eine sichtbare Betriebslogik";
    case "Konfliktstil":
      if (match.jointState === "OPPOSITE") {
        return "Spannung koennte im falschen Takt bearbeitet werden";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Klaerung koennte zu schnell in Zuspitzung kippen";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Klaerung koennte zu spaet in Gang kommen";
      }
      return "Spannung braucht einen gemeinsamen Bearbeitungsrahmen";
  }
}

function buildInterpretation(match: DimensionMatchResult, status: MatchingDimensionStatus) {
  switch (match.dimension) {
    case "Unternehmenslogik":
      if (match.jointState === "OPPOSITE") {
        return "Ihr koennt dieselbe Lage unternehmerisch sehr unterschiedlich lesen: eine Person eher ueber Hebel und Bewegung, die andere eher ueber Substanz und Absicherung. Ohne klaren Massstab wirkt Richtung dann schneller geteilt, als sie es ist.";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Ihr bringt beide viel Zug auf Wachstum und strategische Hebel. Das ist nur dann tragfaehig, wenn klar bleibt, wann Reichweite Vorrang hat und wann Stabilitaet vorgeht.";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Ihr schaut beide eher auf Tragfaehigkeit, Aufbau und Begrenzung. Das schuetzt vor Ueberzug, kann aber auch dazu fuehren, dass ihr dieselbe Chance zu spaet freigebt.";
      }
      return status === "kritisch"
        ? "Richtung wirkt bei euch nicht automatisch nach denselben Kriterien entschieden. Der Unterschied sitzt weniger in einzelnen Zielen als in der Logik, wonach ihr Prioritaeten setzt."
        : "Eure strategische Linie ist nicht offen gegeneinander, aber auch nicht selbsterklaerend deckungsgleich. Ohne explizite Priorisierungslogik werden kleine Kursabweichungen schnell strukturell.";
    case "Risikoorientierung":
      if (match.jointState === "OPPOSITE") {
        return "Dieselbe Unsicherheit kann fuer euch komplett anders aussehen: fuer eine Person noch vertretbar, fuer die andere schon zu offen. Dadurch werden Chancen, Sicherungen und Timing unterschiedlich bewertet.";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Ihr seid beide bereit, Unsicherheit offensiv mitzutragen. Das schafft Zug, kann aber dieselbe Wette fuer euch zu schnell normal wirken lassen.";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Ihr priorisiert beide eher Begrenzung und Absicherung. Das stabilisiert, kann aber dazu fuehren, dass ihr Chancen gemeinsam untersteuert.";
      }
      return status === "kritisch"
        ? "Eure Risikoschwelle ist nicht deckungsgleich genug, um sich im Druckfall selbst zu sortieren. Was fuer eine Person vertretbar ist, braucht fuer die andere frueher Absicherung."
        : "Risiko wirkt bei euch nicht dramatisch gegensaetzlich, aber auch nicht still deckungsgleich. Ohne klare Schwelle kippt dieselbe Lage situativ zwischen Bremse und Vorstoss.";
    case "Entscheidungslogik":
      if (match.jointState === "OPPOSITE") {
        return "Ihr habt nicht dieselbe Schwelle dafuer, wann etwas entscheidungsreif ist. Eine Person will eher noch pruefen, waehrend die andere schon vorwaertsgehen will.";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Ihr entscheidet beide eher frueh und mit viel Urteil. Das beschleunigt, kann aber auch dazu fuehren, dass notwendige Prueftiefe zu spaet nachgezogen wird.";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Ihr gebt Entscheidungen beide eher spaeter frei und wollt mehr Reife sehen. Das reduziert Schnellschuesse, kann aber Momentum und Klarheit kosten.";
      }
      return status === "kritisch"
        ? "Der Unterschied liegt weniger in Meinungen als im Entscheidungsprozess selbst. Wenn ihr nicht dieselbe Reifeschwelle teilt, produziert derselbe Fall wiederholte Schleifen."
        : "Entscheidungen laufen bei euch nicht automatisch ueber denselben Takt. Ohne klares Verfahren bleibt oft offen, wann eine Runde abgeschlossen ist und wer sie schliesst.";
    case "Commitment":
      if (match.jointState === "OPPOSITE") {
        return "Ihr verbindet mit Einsatz und Verbindlichkeit nicht automatisch dasselbe. Dadurch koennen Zeit, Verantwortung und Prioritaet unterschiedlich ernst genommen wirken, obwohl beide sich als engagiert erleben.";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Ihr bringt beide viel Einsatzbereitschaft mit. Genau darin liegt das Risiko, dass hohe Verfuegbarkeit und Zusatzlast still zum Normalfall werden.";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Ihr rahmt Commitment beide eher bewusster oder enger. Das kann realistisch sein, braucht aber eine klare Grenze zwischen tragfaehigem Fokus und stiller Unterversorgung des Unternehmens.";
      }
      return status === "kritisch"
        ? "Commitment ist bei euch nicht nur eine Frage von Motivation, sondern von Erwartungslogik. Ohne klare Linie werden Fairness, Prioritaet und Verfuegbarkeit schnell verschieden gelesen."
        : "Einsatz wirkt bei euch grundsaetzlich anschlussfaehig, aber nicht selbsterklaerend. Sobald Lasten steigen, reichen still mitgemeinte Erwartungen nicht mehr aus.";
    case "Arbeitsstruktur & Zusammenarbeit":
      if (match.jointState === "OPPOSITE") {
        return "Ihr habt nicht dieselbe Vorstellung davon, wie sichtbar Arbeit sein muss und wie viel Eigenraum gut funktioniert. Dadurch koennen dieselben Prozesse fuer eine Person zu eng und fuer die andere zu lose wirken.";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Ihr gebt beide eher Tempo, Eigenraum und direkte Bewegung nach vorn. Das kann stark sein, braucht aber sichtbarere Uebergaben, damit Mitsicht nicht verlorengeht.";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Ihr wollt beide eher mehr Rueckkopplung und gemeinsames Bild. Das stabilisiert Zusammenarbeit, kann aber Verantwortung und Geschwindigkeit unnoetig festhalten.";
      }
      return status === "kritisch"
        ? "Die Reibung liegt hier direkt im Betriebsmodell des Alltags. Wenn Mitsicht, Eigenraum und Abstimmung anders gelesen werden, entsteht nicht nur Missverstaendnis, sondern operative Unklarheit."
        : "Zusammenarbeit ist bei euch nicht instabil, aber auch nicht selbsterlaerend geregelt. Ohne explizite Arbeitslogik werden Uebergaenge und Sichtbarkeit zum wiederkehrenden Reibungspunkt.";
    case "Konfliktstil":
      if (match.jointState === "OPPOSITE") {
        return "Ihr oeffnet Spannung nicht im selben Takt und nicht in derselben Form. Was fuer eine Person klaerend ist, kann fuer die andere zu frueh, zu direkt oder zu spaet wirken.";
      }
      if (match.jointState === "BOTH_HIGH") {
        return "Ihr sprecht Spannung beide eher frueh und direkt an. Das kann Klarheit schaffen, braucht aber einen Rahmen, damit aus Zug keine Eskalation wird.";
      }
      if (match.jointState === "BOTH_LOW") {
        return "Ihr sortiert Spannung beide eher laenger vor. Das haelt Gespraeche ruhig, kann aber dazu fuehren, dass wichtige Reibung zu spaet sichtbar wird.";
      }
      return status === "kritisch"
        ? "Der Unterschied sitzt nicht nur in einzelnen Meinungsverschiedenheiten, sondern in der Form der Klaerung. Ohne gemeinsamen Rahmen wird schon die Bearbeitung von Spannung selbst zum Problem."
        : "Spannung ist bei euch nicht automatisch eskalativ, aber auch nicht still kompatibel. Unter Druck wird relevant, wann ihr ein Thema oeffnet und wie direkt ihr es fuehrt.";
  }
}

function buildRelevanceMoment(match: DimensionMatchResult) {
  switch (match.dimension) {
    case "Unternehmenslogik":
      return match.jointState === "OPPOSITE" || match.jointState === "BOTH_HIGH"
        ? "Sichtbar unter Unsicherheit und bei grossen Richtungsentscheidungen."
        : "Sichtbar waehrend Wachstum neue Prioritaeten und Zielkonflikte erzeugt.";
    case "Risikoorientierung":
      return match.jointState === "BOTH_HIGH" || match.jointState === "BOTH_LOW"
        ? "Sichtbar, wenn der Druck steigt und Wetten oder Sicherungen ploetzlich konkret werden."
        : "Sichtbar unter Unsicherheit, wenn ihr dieselbe Chance unterschiedlich vertretbar findet.";
    case "Entscheidungslogik":
      return match.jointState === "BOTH_LOW"
        ? "Sichtbar, wenn Tempo noetig ist und Entscheidungen nicht noch eine Runde warten koennen."
        : "Sichtbar unter Zeitdruck und sobald mehrere Entscheidungen parallel anstehen.";
    case "Commitment":
      return "Sichtbar, wenn Druck zunimmt, Verantwortung waechst oder Zusatzlast nicht mehr nebenbei tragbar ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Sichtbar, wenn neue Leute dazukommen, Arbeit parallel laeuft oder Verantwortungen breiter verteilt werden.";
    case "Konfliktstil":
      return "Sichtbar, wenn Druck steigt, etwas schieflaeuft oder heikle Themen nicht mehr aufschiebbar sind.";
  }
}

function buildConsequence(match: DimensionMatchResult) {
  switch (match.dimension) {
    case "Unternehmenslogik":
      if (match.jointState === "OPPOSITE") return "Prioritaeten werden unterschiedlich gelesen und Kurswechsel spaeter als Sachfrage, aber frueh als Fuehrungsfrage erlebt.";
      if (match.jointState === "BOTH_HIGH") return "Chancen werden schnell geoeffnet, waehrend Gegenpruefung und Absicherung zu spaet kommen.";
      if (match.jointState === "BOTH_LOW") return "Gute Gelegenheiten bleiben laenger liegen oder werden mehrfach vertagt.";
      return "Richtung wirkt nach aussen uneinheitlich, obwohl intern niemand einen offenen Grundsatzkonflikt benennen wuerde.";
    case "Risikoorientierung":
      if (match.jointState === "OPPOSITE") return "Dieselbe Option wird parallel als mutiger Schritt und als unnoetiges Risiko behandelt.";
      if (match.jointState === "BOTH_HIGH") return "Wetten werden leichter eingegangen, waehrend Begrenzungen und Rueckfallpunkte unscharf bleiben.";
      if (match.jointState === "BOTH_LOW") return "Optionen werden zu frueh gebremst und Wachstumsspielraeume systematisch kleiner gemacht.";
      return "Opportunitaeten und Sicherungen werden situativ neu verhandelt, statt auf einer klaren Risikoschwelle zu beruhen.";
    case "Entscheidungslogik":
      if (match.jointState === "OPPOSITE") return "Entscheidungen werden vertagt oder doppelt gefuehrt, weil nicht dieselbe Schwelle fuer Reife gilt.";
      if (match.jointState === "BOTH_HIGH") return "Entscheidungen wirken schnell klar, muessen spaeter aber korrigiert oder nachprueft werden.";
      if (match.jointState === "BOTH_LOW") return "Tempo geht verloren, weil sich Verantwortung zu lange an weitere Klaerung bindet.";
      return "Der Prozess bleibt unscharf: Wer vorbereitet, wer schliesst und wann eine Entscheidung gilt, bleibt zu offen.";
    case "Commitment":
      if (match.jointState === "OPPOSITE") return "Verantwortung und Verfuegbarkeit fuehlen sich ungleich verteilt an, obwohl niemand explizit aussteigt.";
      if (match.jointState === "BOTH_HIGH") return "Ueberlast und Zusatzaufwand bleiben zu lange unausgesprochen, weil hoher Einsatz als selbstverstaendlich gilt.";
      if (match.jointState === "BOTH_LOW") return "Wichtige Aufgaben bleiben liegen oder werden nur teilweise getragen, ohne dass frueh nachgesteuert wird.";
      return "Zusatzlasten und Erwartungen werden erst dann besprochen, wenn bereits Frust ueber Fairness oder Tempo entstanden ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      if (match.jointState === "OPPOSITE") return "Zustaendigkeit, Sichtbarkeit und Mitsicht werden unterschiedlich verstanden; dadurch werden Uebergaben fehleranfaellig.";
      if (match.jointState === "BOTH_HIGH") return "Arbeit laeuft schnell, aber Wissen und Nebenwirkungen tauchen zu spaet im gemeinsamen Blick auf.";
      if (match.jointState === "BOTH_LOW") return "Abstimmung wird so eng, dass Entscheidungen und Umsetzung zu viel Reibung im Tagesgeschaeft sammeln.";
      return "Operative Klarheit sinkt: Verantwortung bleibt formal verteilt, praktisch aber nicht sauber anschlussfaehig.";
    case "Konfliktstil":
      if (match.jointState === "OPPOSITE") return "Schon die Form der Klaerung erzeugt Reibung; Themen werden entweder zu hart oder zu spaet erlebt.";
      if (match.jointState === "BOTH_HIGH") return "Diskussionen werden schnell deutlich, koennen aber unter Druck unnötig zuspitzen.";
      if (match.jointState === "BOTH_LOW") return "Relevante Spannung bleibt laenger im System und kommt erst hoch, wenn sie bereits Folgekosten erzeugt.";
      return "Offene Punkte bleiben laenger unklar oder werden im falschen Moment angesprochen, obwohl beide eigentlich klaeren wollen.";
  }
}

function buildClarificationPoints(match: DimensionMatchResult) {
  switch (match.dimension) {
    case "Unternehmenslogik":
      return [
        "Woran entscheidet ihr im Zweifel, ob Reichweite oder Stabilitaet Vorrang hat?",
        "Welche Kennzeichen loesen fuer euch einen echten Kurswechsel aus?",
        "Wer darf Prioritaeten verschieben, bevor ihr beide explizit zugestimmt habt?",
      ];
    case "Risikoorientierung":
      return [
        "Welche Art von Wette ist fuer euch noch vertretbar und welche nicht mehr?",
        "Welche Absicherung muss stehen, bevor ihr ein Risiko gemeinsam tragt?",
        "Wer zieht die Bremse, wenn Tempo und Begrenzung kollidieren?",
      ];
    case "Entscheidungslogik":
      return [
        "Was muss vorliegen, damit eine Entscheidung fuer euch wirklich reif ist?",
        "Wer bereitet Entscheidungen vor und wer schliesst sie verbindlich?",
        "Woran merkt ihr, dass eine weitere Runde keine Qualitaet mehr bringt?",
      ];
    case "Commitment":
      return [
        "Was ist fuer euch realistisch verbindlich bei Zeit, Verantwortung und Erreichbarkeit?",
        "Welche Zusatzlast gilt als Ausnahme und nicht als stiller Standard?",
        "Wie merkt ihr frueh, dass Einsatz fuer eine Person kippt?",
      ];
    case "Arbeitsstruktur & Zusammenarbeit":
      return [
        "Was muss im gemeinsamen Blick sein und was darf eigenstaendig laufen?",
        "Wann ist Rueckkopplung Pflicht und wann stoert sie eher?",
        "Wie werden Uebergaben sichtbar, bevor daraus Nacharbeit entsteht?",
      ];
    case "Konfliktstil":
      return [
        "Was sprecht ihr sofort an und was erst nach kurzer Sortierung?",
        "Wie direkt darf Klaerung unter Druck werden, ohne zu kippen?",
        "Woran merkt ihr, dass ein Thema nicht laenger im Hintergrund bleiben sollte?",
      ];
  }
}

function buildDecisionCard(
  match: DimensionMatchResult,
  selection: FounderMatchingSelection
): DecisionDimensionInsight {
  const decisionRiskScore = getDecisionRiskScore(match);
  return {
    id: `decision-engine-${match.dimension}`,
    dimension: match.dimension,
    category: getDecisionCategory(match.dimension),
    severity: getSeverity(decisionRiskScore),
    title: buildTitle(match),
    interpretation: buildInterpretation(match, getStatus(selection, match.dimension)),
    relevanceMoment: buildRelevanceMoment(match),
    consequence: buildConsequence(match),
    clarificationPoints: buildClarificationPoints(match).slice(0, 3),
    decisionRiskScore,
  };
}

export function buildFounderDecisionEngine(
  compareResult: { dimensions: DimensionMatchResult[] },
  selection: FounderMatchingSelection
): DecisionEngineCard[] {
  return [...compareResult.dimensions]
    .sort((left, right) => {
      const scoreDelta = getDecisionRiskScore(right) - getDecisionRiskScore(left);
      if (scoreDelta !== 0) return scoreDelta;

      const tieBreakerDelta =
        getPriorityTieBreaker(selection, right.dimension) -
        getPriorityTieBreaker(selection, left.dimension);
      if (tieBreakerDelta !== 0) return tieBreakerDelta;

      return left.dimension.localeCompare(right.dimension);
    })
    .slice(0, 3)
    .map((dimension) => buildDecisionCard(dimension, selection));
}
