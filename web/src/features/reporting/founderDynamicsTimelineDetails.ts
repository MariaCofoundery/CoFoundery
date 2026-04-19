import type {
  CompareFoundersResult,
  DimensionMatchResult,
} from "@/features/reporting/founderMatchingEngine";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { FounderDynamicsTimelinePhaseId } from "@/features/reporting/timelineLogic";

export type FounderDynamicsTimelineDetailPhase = {
  id: FounderDynamicsTimelinePhaseId;
  step: string;
  title: string;
  description: string;
  drivers: FounderDimensionKey[];
  watchpoints: string[];
  guidingQuestion?: string;
};

function getDimension(
  compareResult: CompareFoundersResult,
  dimension: FounderDimensionKey
) {
  return compareResult.dimensions.find((entry) => entry.dimension === dimension) ?? null;
}

function isHighTension(match: DimensionMatchResult | null) {
  return match?.jointState === "OPPOSITE" || match?.riskLevel === "high";
}

function isComplementary(match: DimensionMatchResult | null) {
  return match?.category === "complementary";
}

function isSharedBlindSpot(match: DimensionMatchResult | null) {
  return Boolean(match?.hasSharedBlindSpotRisk);
}

function isSharedHighBlindSpot(match: DimensionMatchResult | null) {
  return isSharedBlindSpot(match) && match?.jointState === "BOTH_HIGH";
}

function isSharedLowBlindSpot(match: DimensionMatchResult | null) {
  return isSharedBlindSpot(match) && match?.jointState === "BOTH_LOW";
}

function companyAlignmentWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Wenn ihr beide stark in Hebel und Öffnung denkt, kann Fokus früh mit Bewegung verwechselt werden. Prüft bewusst, was gerade nicht parallel läuft.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Wenn ihr beide stark auf Tragfähigkeit und Absicherung schaut, werden Chancen eher zu spät geöffnet als zu früh. Das ist stabilisierend, kann euch aber auch ausbremsen.";
  }
  if (isHighTension(match)) {
    return "Schon bei der Ausrichtung kann Reibung entstehen, wenn eine Person stärker nach Reichweite sortiert und die andere stärker nach Tragfähigkeit.";
  }
  if (isComplementary(match)) {
    return "In eurer Ausrichtung liegt Potenzial, wenn klar bleibt, wann Substanz Vorrang hat und wann ihr bewusst Hebel nutzt.";
  }

  return "Die Grundrichtung wirkt derzeit tragfähig. Relevant wird, ob ihr dieselben Prioritäten haltet, sobald echte Trade-offs auftauchen.";
}

function commitmentSetupWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Hoher gemeinsamer Zug trägt am Anfang viel. Gerade deshalb solltet ihr früh klären, was ihr einander nicht still voraussetzt.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Ein bewusst begrenzter Einsatz ist nicht das Problem. Kritisch wird es erst, wenn das nach außen anders klingt als intern gelebt.";
  }
  if (isHighTension(match)) {
    return "Unterschiedliche Einsatzlogiken bleiben anfangs oft unsichtbar. Spätestens bei Zusagen nach außen werden sie konkret.";
  }

  return "Eure Einsatzlogik wirkt derzeit anschlussfähig. Unter realem Takt wird wichtig, ob dieselbe Verbindlichkeit auch praktisch getragen wird.";
}

function decisionPressureWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Unter Druck könnt ihr beide schneller entscheiden, als die Folgen sauber eingeordnet sind. Legt vorher fest, wann Tempo bewusst gebremst wird.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Unter Druck könnt ihr beide mehr Absicherung wollen. Dann bleiben Entscheidungen eher zu lange offen als zu früh entschieden.";
  }
  if (isHighTension(match)) {
    return "Zeitdruck macht hier unterschiedliche Entscheidungsschwellen sichtbar: Die eine Seite will früher Klarheit, die andere früher loslaufen.";
  }
  if (isComplementary(match)) {
    return "Die unterschiedliche Entscheidungslogik kann stark sein, wenn klar ist, wer vorbereitet, wer widerspricht und wann der Punkt für eine Entscheidung erreicht ist.";
  }

  return "Eure Entscheidungslogik wirkt moderat tragfähig. Prüft sie trotzdem dort, wo Informationen unvollständig und Konsequenzen real sind.";
}

function riskPressureWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Wenn ihr beide Unsicherheit eher tragt, verschwimmen Eingriffsschwellen leicht. Sichtbarkeit braucht hier mehr Disziplin als noch mehr Mut.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Wenn ihr beide stark absichert, wird Risiko selten eskalieren. Chancen können aber so lange geprüft werden, bis sie faktisch vorbei sind.";
  }
  if (isHighTension(match)) {
    return "Unterschiedliche Risikoschwellen werden unter Druck sofort operativ: Was für eine Person noch testbar ist, ist für die andere schon zu viel.";
  }
  if (isComplementary(match)) {
    return "Eure Ergänzung kann helfen, wenn sichtbar bleibt, wer früh öffnet und wer bewusst absichert.";
  }

  return "Eure Risikologik wirkt aktuell gut handhabbar. Spannend wird, ob sie auch in unklaren Situationen denselben Rahmen behält.";
}

function workStructureWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Viel gemeinsamer Austausch kann Nähe schaffen und zugleich Zuständigkeit verwischen. Gerade im Alltag braucht ihr trotzdem klare Führungspunkte.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Viel Eigenlauf spart Reibung, bis Mitsicht fehlt. Sichtbarkeit wird hier wichtiger als noch mehr Autonomie.";
  }
  if (isHighTension(match)) {
    return "Im Alltag kann Reibung weniger an Inhalten als an Abstimmungsdichte entstehen: Für eine Person ist etwas klar, für die andere zu spät sichtbar.";
  }
  if (isComplementary(match)) {
    return "Die Arbeitslogik kann sich ergänzen, wenn klar bleibt, was jemand eigenständig führt und was früh in den gemeinsamen Raum muss.";
  }

  return "Eure Abstimmungslogik wirkt derzeit tragfähig. Relevant wird, ob sie auch dann ruhig bleibt, wenn mehr Themen parallel laufen.";
}

function conflictStyleWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Direkte Klärung kann euch schnell wieder auf Linie bringen. Unter Dauerlast kann sie aber härter wirken, als sie gemeint ist.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Wenn ihr Spannungen eher erst sortiert, bleiben Themen länger ruhig und können gerade deshalb später schwerer werden.";
  }
  if (isHighTension(match)) {
    return "Unterschiedliche Konfliktstile werden oft erst im Timing sichtbar: Eine Person spricht früh an, die andere erst nach innerer Sortierung.";
  }

  return "Euer Umgang mit Reibung wirkt aktuell moderat anschlussfähig. Unter Stress entscheidet vor allem das Timing, nicht nur der Inhalt.";
}

function companyGrowthWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Mit mehr Optionen kann euer gemeinsamer Zug parallel zu viel öffnen. Wachstum braucht dann eher Stop-Regeln als noch mehr Energie.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Mit mehr Komplexität könnt ihr Chancen länger vertagen, weil erst alles tragfähig wirken soll. Das schützt Qualität, kann aber Tempo kosten.";
  }
  if (isHighTension(match)) {
    return "Sobald mehr Wege gleichzeitig möglich sind, werden unterschiedliche Maßstäbe für Richtung und Priorität deutlicher sichtbar.";
  }
  if (isComplementary(match)) {
    return "Mit wachsender Komplexität kann eure Ergänzung stark sein, wenn ihr Priorität und Freigabe nicht jedes Mal neu verhandeln müsst.";
  }

  return "Mit mehr Komplexität wirkt eure Richtungslogik derzeit tragfähig. Trotzdem lohnt sich ein klarer Review-Rahmen für neue Chancen.";
}

function commitmentLoadWatch(match: DimensionMatchResult | null) {
  if (!match) return null;
  if (isSharedHighBlindSpot(match)) {
    return "Hoher gemeinsamer Einsatz kann Überlast lange wie Normalität aussehen lassen. Frühwarnsignale müssen hier bewusst gesetzt werden.";
  }
  if (isSharedLowBlindSpot(match)) {
    return "Mit begrenztem gemeinsamen Einsatz wird Priorisierung zur eigentlichen Führungsaufgabe. Sonst entsteht stilles Hinterherlaufen.";
  }
  if (isHighTension(match)) {
    return "Ungleiche Verfügbarkeit kippt selten an einem Tag. Kritisch wird es, wenn Prioritäten nicht früh sichtbar neu sortiert werden.";
  }
  if (isComplementary(match)) {
    return "Unterschiedliche Einsatzlogiken können tragfähig sein, wenn Erwartungen nicht moralisch, sondern operativ geklärt werden.";
  }

  return "Euer Commitment wirkt derzeit handhabbar. Unter Spitzenlast sollte trotzdem klar bleiben, was zuerst runtergeht und was nicht still mitschwingt.";
}

function uniqueWatchpoints(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

export function buildFounderDynamicsTimelineDetailPhases(
  compareResult: CompareFoundersResult
): FounderDynamicsTimelineDetailPhase[] {
  const company = getDimension(compareResult, "Unternehmenslogik");
  const decision = getDimension(compareResult, "Entscheidungslogik");
  const risk = getDimension(compareResult, "Risikoorientierung");
  const work = getDimension(compareResult, "Arbeitsstruktur & Zusammenarbeit");
  const commitment = getDimension(compareResult, "Commitment");
  const conflict = getDimension(compareResult, "Konfliktstil");

  return [
    {
      id: "start_alignment",
      step: "Phase 1",
      title: "Start & Ausrichtung",
      description:
        "Zu Beginn zeigt sich, nach welchen Maßstäben ihr Richtung, Chancen und erste Zusagen sortiert.",
      drivers: ["Unternehmenslogik", "Commitment"],
      watchpoints: uniqueWatchpoints([companyAlignmentWatch(company), commitmentSetupWatch(commitment)]).slice(0, 2),
      guidingQuestion: "Woran merkt ihr früh, dass ihr gerade dieselbe Richtung meint – und nicht nur dieselben Wörter benutzt?",
    },
    {
      id: "decision_pressure",
      step: "Phase 2",
      title: "Erste Entscheidungen unter Druck",
      description:
        "Sobald Tempo, Unsicherheit und begrenzte Zeit zusammenkommen, wird eure Entscheidungslogik wirklich sichtbar.",
      drivers: ["Entscheidungslogik", "Risikoorientierung"],
      watchpoints: uniqueWatchpoints([decisionPressureWatch(decision), riskPressureWatch(risk)]).slice(0, 2),
      guidingQuestion: "Welche Schwelle macht aus einer laufenden Abwägung eine gemeinsame Entscheidung?",
    },
    {
      id: "daily_collaboration",
      step: "Phase 3",
      title: "Zusammenarbeit im Alltag",
      description:
        "Im Alltag entscheidet sich, wie viel Eigenlauf, Mitsicht und direkte Klärung ihr tatsächlich braucht.",
      drivers: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
      watchpoints: uniqueWatchpoints([workStructureWatch(work), conflictStyleWatch(conflict)]).slice(0, 2),
      guidingQuestion: "Was muss früh sichtbar sein, damit Eigenverantwortung nicht in Blindflug kippt?",
    },
    {
      id: "growth_complexity",
      step: "Phase 4",
      title: "Wachstum & neue Komplexität",
      description:
        "Mit mehr Optionen, Erwartungen und Parallelität werden aus Tendenzen schnell Führungs- und Priorisierungsfragen.",
      drivers: ["Unternehmenslogik", "Risikoorientierung"],
      watchpoints: uniqueWatchpoints([companyGrowthWatch(company), riskPressureWatch(risk)]).slice(0, 2),
      guidingQuestion: "Woran erkennt ihr, dass mehr Möglichkeiten gerade nicht mehr Klarheit bedeuten?",
    },
    {
      id: "load_and_recalibration",
      step: "Phase 5",
      title: "Belastung, Rollen & Nachschärfung",
      description:
        "Spitzenlast macht sichtbar, ob Verfügbarkeit, Rollen und Nachschärfung bewusst geregelt sind oder nur still mitlaufen.",
      drivers: ["Commitment", "Arbeitsstruktur & Zusammenarbeit"],
      watchpoints: uniqueWatchpoints([commitmentLoadWatch(commitment), workStructureWatch(work)]).slice(0, 2),
      guidingQuestion: "Welche Regel hilft euch, wenn Einsatz, Zuständigkeit oder Tempo nicht mehr zur Realität passen?",
    },
  ];
}
