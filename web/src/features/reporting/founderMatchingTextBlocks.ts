import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type {
  FounderMatchingSelection,
  MatchingDimensionStatus,
  MatchingSelectionEntry,
} from "@/features/reporting/founderMatchingSelection";

type DimensionTextMap = Record<FounderDimensionKey, string>;

export type MatchingFallbackBlock = {
  title: string;
  body: string;
};

export type MatchingInteractionPatternId =
  | "blind_spot_similarity_drift"
  | "commitment_workmode_pressure"
  | "workmode_conflict_friction"
  | "decision_commitment_drag"
  | "decision_workmode_loop"
  | "risk_direction_tradeoff"
  | "risk_commitment_push"
  | "complement_under_pressure"
  | "coordination_hidden_cost"
  | "alignment_edge_guard";

export type MatchingInteractionPattern = {
  id: MatchingInteractionPatternId;
  strength: "watch" | "moderate" | "strong";
  dimensions: FounderDimensionKey[];
  reason: string;
};

export const MATCHING_BASE_TITLES: DimensionTextMap = {
  Unternehmenslogik: "Gleiche Richtung im Kern",
  Entscheidungslogik: "Ähnliche Art zu entscheiden",
  Risikoorientierung: "Ähnliche Haltung zu Risiko",
  "Arbeitsstruktur & Zusammenarbeit": "Ähnlicher Arbeitsmodus",
  Commitment: "Gleicher Ernst im Alltag",
  Konfliktstil: "Ähnlicher Umgang mit Reibung",
};

export const MATCHING_COMPLEMENT_TITLES: DimensionTextMap = {
  Unternehmenslogik: "Unterschiedliche Richtungshebel",
  Entscheidungslogik: "Prüfung trifft Zuspitzung",
  Risikoorientierung: "Mut trifft Leitplanken",
  "Arbeitsstruktur & Zusammenarbeit": "Nähe trifft Eigenraum",
  Commitment: "Fokus trifft Begrenzung",
  Konfliktstil: "Direktheit trifft Timing",
};

export const MATCHING_TENSION_TITLES: DimensionTextMap = {
  Unternehmenslogik: "Wenn Richtung strittig wird",
  Entscheidungslogik: "Wenn Entscheidungen auseinanderlaufen",
  Risikoorientierung: "Wenn Risiko anders zählt",
  "Arbeitsstruktur & Zusammenarbeit": "Wenn der Arbeitsmodus kollidiert",
  Commitment: "Wenn Einsatz auseinanderläuft",
  Konfliktstil: "Wenn Konflikte unterschiedlich angesprochen werden",
};

export const MATCHING_BASE_SENTENCES: Record<FounderDimensionKey, string[]> = {
  Unternehmenslogik: [
    "Wenn es um Grundfragen geht, schaut ihr oft in dieselbe Richtung.",
    "Dadurch müsst ihr seltener neu klären, was gerade zuerst zählt.",
    "Zum Beispiel ist bei Wachstum, Produkt oder Aufbau schneller klar, warum ihr euch für einen Schritt entscheidet.",
  ],
  Entscheidungslogik: [
    "Ihr trefft Entscheidungen auf ähnliche Weise.",
    "Dadurch bleibt seltener offen, wann genug besprochen wurde und wer am Ende entscheidet.",
    "Das hilft besonders bei offenen Fragen, in denen ihr sonst erst lange über den Entscheidungsweg reden würdet.",
  ],
  Risikoorientierung: [
    "Ihr schätzt Chancen und Absicherung ähnlich ein.",
    "Dadurch ist im Alltag eher klar, wann ihr einen Schritt wagt und wann ihr erst absichert.",
    "Das merkt ihr besonders, wenn ihr euch zwischen zwei Wegen entscheiden müsst.",
  ],
  "Arbeitsstruktur & Zusammenarbeit": [
    "Ihr habt ein ähnliches Gefühl dafür, wie eng ihr zusammenarbeiten wollt.",
    "Dadurch werden Übergaben und Zwischenstände seltener zum Streitpunkt.",
    "Ihr seid euch eher einig, wer worüber Bescheid wissen muss und wann jemand allein weiterarbeiten kann.",
  ],
  Commitment: [
    "Ihr habt ein ähnliches Verständnis von Priorität, Verfügbarkeit und Einsatz.",
    "Dadurch entsteht seltener stiller Druck darüber, wer gerade wie viel übernehmen soll.",
    "Vor allem in intensiven Phasen ist eher klar, was ihr gerade voneinander erwartet.",
  ],
  Konfliktstil: [
    "Ihr sprecht schwierige Themen in einem ähnlichen Tempo an.",
    "Dadurch laufen solche Gespräche oft geordneter.",
    "Unter Druck ist eher klar, wann etwas sofort angesprochen werden muss und wie ihr das Gespräch führt.",
  ],
};

export const MATCHING_FALLBACK_BLOCKS = {
  stableBase: {
    title: "Keine klare Basislinie",
    body: "Es gibt kein einzelnes Feld, das eure Zusammenarbeit von selbst stabil hält. Das muss kein schlechtes Match heißen. Es heißt aber, dass Reibung schneller in Tempoverlust und Zusatzabstimmung kippt.",
  },
  strongestComplement: {
    title: "Keine klare Ergänzungsachse",
    body: "Dieses Duo gewinnt nicht über einen klaren produktiven Gegenpol. Wenn es gut läuft, dann eher, weil ihr Reibung klein haltet und unnötige Schleifen verhindert.",
  },
  biggestTension: {
    title: "Kein klares Konfliktfeld",
    body: "Es gibt kein einzelnes Feld, das alles sofort dominiert. Der Preis liegt eher im Schleichenden: kleine Unklarheiten bleiben länger liegen und kosten mit der Zeit Tempo und Energie.",
  },
  blindSpot: {
    title: "Was ihr leicht überseht",
    body: "Hier gibt es keinen offenen Konflikt. Genau deshalb kann sich ein blinder Fleck festsetzen. Zwei ähnliche Erwartungen verschieben sich dann leise und werden erst sichtbar, wenn schon unterschiedliche Standards gelten.",
  },
} satisfies Record<string, MatchingFallbackBlock>;

const INTERACTION_PATTERN_PRIORITY: MatchingInteractionPatternId[] = [
  "blind_spot_similarity_drift",
  "commitment_workmode_pressure",
  "workmode_conflict_friction",
  "decision_commitment_drag",
  "decision_workmode_loop",
  "risk_direction_tradeoff",
  "risk_commitment_push",
  "complement_under_pressure",
  "coordination_hidden_cost",
  "alignment_edge_guard",
];

function getSelectionStatus(
  selection: FounderMatchingSelection,
  dimension: FounderDimensionKey
): MatchingDimensionStatus | null {
  return (
    selection.dimensionStatuses.find((entry) => entry.dimension === dimension)?.status ?? null
  );
}

function isActiveStatus(status: MatchingDimensionStatus | null) {
  return status === "kritisch" || status === "abstimmung_nötig" || status === "ergänzend";
}

function isPressureStatus(status: MatchingDimensionStatus | null) {
  return status === "kritisch" || status === "abstimmung_nötig";
}

function getPatternStrength(statuses: Array<MatchingDimensionStatus | null>) {
  if (statuses.some((status) => status === "kritisch")) return "strong" as const;
  if (statuses.some((status) => status === "abstimmung_nötig")) return "moderate" as const;
  return "watch" as const;
}

function pushInteractionPattern(
  patterns: MatchingInteractionPattern[],
  pattern: MatchingInteractionPattern
) {
  if (patterns.some((entry) => entry.id === pattern.id)) return;
  patterns.push(pattern);
}

export function detectMatchingInteractionPatterns(
  selection: FounderMatchingSelection
): MatchingInteractionPattern[] {
  const commitment = getSelectionStatus(selection, "Commitment");
  const workmode = getSelectionStatus(selection, "Arbeitsstruktur & Zusammenarbeit");
  const conflict = getSelectionStatus(selection, "Konfliktstil");
  const decision = getSelectionStatus(selection, "Entscheidungslogik");
  const direction = getSelectionStatus(selection, "Unternehmenslogik");
  const risk = getSelectionStatus(selection, "Risikoorientierung");

  const patterns: MatchingInteractionPattern[] = [];

  if (selection.meta.highSimilarityBlindSpotRisk) {
    pushInteractionPattern(patterns, {
      id: "blind_spot_similarity_drift",
      strength: "watch",
      dimensions: ["Unternehmenslogik", "Commitment"],
      reason: "sehr hohe Nähe ohne offenes Konfliktfeld; das Risiko liegt eher in stillen Verschiebungen als in lautem Streit",
    });
  }

  if (isPressureStatus(commitment) && isActiveStatus(workmode)) {
    pushInteractionPattern(patterns, {
      id: "commitment_workmode_pressure",
      strength: getPatternStrength([commitment, workmode]),
      dimensions: ["Commitment", "Arbeitsstruktur & Zusammenarbeit"],
      reason: "Einsatz und Arbeitsmodus greifen ineinander; dadurch entsteht im Alltag schnell Druck über Präsenz, Abstimmung und Einblick.",
    });
  }

  if (isActiveStatus(workmode) && isActiveStatus(conflict)) {
    pushInteractionPattern(patterns, {
      id: "workmode_conflict_friction",
      strength: getPatternStrength([workmode, conflict]),
      dimensions: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
      reason: "Arbeitsmodus und Klärungstempo greifen ineinander; Reibung entsteht nicht nur am Thema, sondern schon an Form und Zeitpunkt.",
    });
  }

  if (isActiveStatus(decision) && isPressureStatus(commitment)) {
    pushInteractionPattern(patterns, {
      id: "decision_commitment_drag",
      strength: getPatternStrength([decision, commitment]),
      dimensions: ["Entscheidungslogik", "Commitment"],
      reason: "Unterschiedliches Entscheiden wird durch unterschiedliche Verfügbarkeit oder Zug verstärkt.",
    });
  }

  if (isActiveStatus(decision) && isActiveStatus(workmode)) {
    pushInteractionPattern(patterns, {
      id: "decision_workmode_loop",
      strength: getPatternStrength([decision, workmode]),
      dimensions: ["Entscheidungslogik", "Arbeitsstruktur & Zusammenarbeit"],
      reason: "Entscheidungsstil und Mitsichtbedarf greifen ineinander; dadurch drehen Schleifen oder Entscheidungen kippen zu früh.",
    });
  }

  if (isActiveStatus(risk) && isActiveStatus(direction)) {
    pushInteractionPattern(patterns, {
      id: "risk_direction_tradeoff",
      strength: getPatternStrength([risk, direction]),
      dimensions: ["Risikoorientierung", "Unternehmenslogik"],
      reason: "Risikowahrnehmung und Priorisierung greifen ineinander; dieselbe Chance wird schnell zur Richtungsfrage.",
    });
  }

  if (isActiveStatus(risk) && isPressureStatus(commitment)) {
    pushInteractionPattern(patterns, {
      id: "risk_commitment_push",
      strength: getPatternStrength([risk, commitment]),
      dimensions: ["Risikoorientierung", "Commitment"],
      reason: "Risikowahl und Einsatzniveau verstärken sich; Wagnis wird schnell zu einer Frage darüber, wie viel Zug jetzt gelten soll.",
    });
  }

  if (
    selection.heroSelection.mode === "complement_led" &&
    selection.biggestTension?.status === "kritisch"
  ) {
    pushInteractionPattern(patterns, {
      id: "complement_under_pressure",
      strength: "strong",
      dimensions: [
        selection.strongestComplement?.dimension ?? "Entscheidungslogik",
        selection.biggestTension.dimension,
      ],
      reason: "Eine produktive Ergänzung ist sichtbar, steht aber unter Druck eines gleichzeitig kritischen Alltagsfelds.",
    });
  }

  if (selection.heroSelection.mode === "coordination_led") {
    pushInteractionPattern(patterns, {
      id: "coordination_hidden_cost",
      strength: "moderate",
      dimensions: [
        selection.biggestTension?.dimension ?? "Arbeitsstruktur & Zusammenarbeit",
        selection.stableBase?.dimension ?? "Entscheidungslogik",
      ],
      reason: "Das Duo wirkt grundsätzlich tragfähig, aber Koordinationskosten bleiben leicht länger unsichtbar als nötig.",
    });
  }

  if (
    selection.heroSelection.mode === "alignment_led" &&
    !selection.meta.highSimilarityBlindSpotRisk &&
    Boolean(selection.biggestTension || selection.agreementFocusDimensions[0])
  ) {
    pushInteractionPattern(patterns, {
      id: "alignment_edge_guard",
      strength: getPatternStrength([selection.biggestTension?.status ?? null]),
      dimensions: [
        selection.stableBase?.dimension ?? "Unternehmenslogik",
        selection.biggestTension?.dimension ?? "Entscheidungslogik",
      ],
      reason: "Es gibt eine tragende Basis, aber ein offenes Randfeld, das ohne Regel zu spät sichtbar werden kann.",
    });
  }

  return patterns.sort(
    (a, b) =>
      INTERACTION_PATTERN_PRIORITY.indexOf(a.id) - INTERACTION_PATTERN_PRIORITY.indexOf(b.id)
  );
}

export function getPrimaryMatchingInteractionPattern(selection: FounderMatchingSelection) {
  return detectMatchingInteractionPatterns(selection)[0] ?? null;
}

export function getMatchingHeroInteractionSentence(
  _selection: FounderMatchingSelection,
  pattern: MatchingInteractionPattern | null
) {
  if (!pattern) return null;

  switch (pattern.id) {
    case "blind_spot_similarity_drift":
      return "Das Risiko liegt dann nicht in offenem Streit. Ihr merkt es eher daran, dass kleine Veränderungen lange niemand anspricht.";
    case "commitment_workmode_pressure":
      return pattern.strength === "strong"
        ? "Schwierig wird es vor allem dann, wenn ihr gleichzeitig unterschiedlich viel Einsatz zeigt und unterschiedlich eng zusammenarbeiten wollt."
        : "Schwierig wird es vor allem dann, wenn Einsatz und Arbeitsweise gleichzeitig auseinanderlaufen.";
    case "workmode_conflict_friction":
      return "Reibung entsteht dann nicht nur am Thema. Ihr merkt sie schon daran, wann etwas angesprochen wird und wie eng ihr dazu im Austausch bleiben wollt.";
    case "decision_commitment_drag":
      return "Der Unterschied beim Entscheiden wird vor allem dann schwierig, wenn gleichzeitig nicht dieselbe Verfügbarkeit und nicht derselbe Einsatz gelten.";
    case "decision_workmode_loop":
      return "Schwierig wird es vor allem dann, wenn ihr gleichzeitig entscheiden und den Arbeitsablauf klären müsst.";
    case "risk_direction_tradeoff":
      return "Dann geht es nicht nur darum, wie viel Risiko ihr eingeht. Ihr müsst auch klären, wofür dieselbe Entscheidung gerade gut sein soll.";
    case "risk_commitment_push":
      return "Sobald ein Schritt mehr Einsatz verlangt, wird aus der Risiko-Frage schnell auch die Frage, wer gerade wie viel übernimmt.";
    case "complement_under_pressure":
      return "Eure Ergänzung ist real. Sie hilft euch aber nur, wenn ein anderes kritisches Feld nicht gleichzeitig alles überlagert.";
    case "coordination_hidden_cost":
      return "Von außen wirkt das oft stabiler, als es sich im Alltag anfühlt. Geschwindigkeit geht dann nicht im Streit verloren, sondern in zusätzlicher Abstimmung, die zu spät sichtbar wird.";
    case "alignment_edge_guard":
      return "Die gemeinsame Basis ist stark. Trotzdem kann euch ein offenes Randthema spät treffen, wenn ihr es zu lange laufen lasst.";
  }
}

export function buildMatchingTensionSentences(
  entry: MatchingSelectionEntry,
  selection?: FounderMatchingSelection
): string[] {
  const critical = entry.status === "kritisch" || entry.tensionType === "critical";
  const noStableBase = !selection?.stableBase;
  const primaryPattern = selection ? getPrimaryMatchingInteractionPattern(selection) : null;

  switch (entry.dimension) {
    case "Unternehmenslogik":
      return [
        "Hier wird es schnell schwierig, wenn dieselbe Entscheidung für euch zwei verschiedene Ziele erfüllt.",
        "Im Alltag merkt ihr das daran, dass ihr bei derselben Priorität plötzlich über zwei verschiedene Ziele sprecht.",
        critical
          ? noStableBase
            ? "Gerade wenn sonst wenig stabil ist, zieht dieses Thema schnell mehrere Entscheidungen gleichzeitig auseinander."
            : "Ohne feste Regel bleibt ihr hier leicht bei verschiedenen Vorstellungen davon, was gerade wichtiger ist."
          : "Ohne klare Priorisierungsregel zieht ihr hier leicht in verschiedene Richtungen.",
      ];
    case "Entscheidungslogik":
      return [
        "Hier wird es schnell langsam, wenn ihr unter Druck unterschiedlich entscheidet.",
        primaryPattern?.id === "decision_commitment_drag"
          ? "Eine Person will noch prüfen und Informationen sammeln. Die andere will schneller entscheiden und rechnet dabei schon mit mehr Einsatz."
          : "Eine Person will noch prüfen und Informationen sammeln. Die andere will schneller entscheiden und ins Handeln kommen.",
        critical
          ? "Ohne festen Entscheidungsweg wird daraus schnell gegenseitiger Frust."
          : "Ohne klaren Ablauf bleibt dieselbe Frage leicht länger offen als nötig.",
      ];
    case "Risikoorientierung":
      return [
        "Hier wird es unruhig, sobald dieselbe Chance für euch nicht gleich viel Risiko bedeutet.",
        primaryPattern?.id === "risk_direction_tradeoff"
          ? "Dann wirkt dieselbe Chance für euch nicht nur unterschiedlich riskant, sondern auch unterschiedlich wichtig."
          : "Dann unterscheidet sich bei euch eher, wann ihr etwas testet, zusagt oder lieber noch absichert.",
        critical
          ? "Wenn diese Schwelle nicht ausdrücklich geklärt ist, wird das Risiko selbst zum Streitpunkt."
          : "Ohne gemeinsame Regel müsst ihr hier größere Schritte schnell jedes Mal neu verhandeln.",
      ];
    case "Arbeitsstruktur & Zusammenarbeit":
      return [
        "Hier wird nicht nur die Arbeit schwierig, sondern schon die Frage, wie ihr zusammenarbeitet.",
        primaryPattern?.id === "workmode_conflict_friction"
          ? "Reibung entsteht, wenn eine Person mehr Einblick und mehr Abstimmung braucht, während die andere Themen früher ansprechen oder schneller wieder abschließen will."
          : "Reibung entsteht, wenn eine Person mehr Einblick und Abstimmung braucht, während die andere mehr Raum und klare Zuständigkeit will.",
        critical
          ? noStableBase
            ? "Gerade dann geht es schnell nicht mehr nur um die Aufgabe, sondern um Kontrolle, Nähe und fehlenden Anschluss."
            : "Ohne feste Regeln fühlt sich Arbeit schnell nach Einengung oder nach zu viel Abstand an."
          : "Ohne sichtbare Regeln entsteht daraus schnell zu viel Abstimmung.",
      ];
    case "Commitment":
      return [
        "Hier wird es schnell schwierig, wenn ihr Priorität, Verfügbarkeit und Einsatz unterschiedlich versteht.",
        primaryPattern?.id === "commitment_workmode_pressure"
          ? "Das fällt oft nicht zuerst in Worten auf. Ihr merkt es daran, wie viel Verfügbarkeit, Einblick und schnelle Reaktion still erwartet werden."
          : primaryPattern?.id === "decision_commitment_drag"
            ? "Ihr merkt das daran, dass eine Person beim Entscheiden schon mehr Tempo und Einsatz erwartet, obwohl die andere noch gar nicht so weit ist."
            : "Das fällt oft nicht zuerst in Worten auf. Ihr merkt es daran, wer wie verfügbar ist und wie viel Einsatz als normal gilt.",
        critical
          ? noStableBase
            ? "Gerade wenn sonst wenig stabil ist, prägt dieser Unterschied schnell den ganzen Alltag."
            : "Ohne klare Regel entstehen daraus schnell Druck, Rechtfertigung oder stiller Ärger."
          : "Ohne klare Regel entsteht daraus schnell ein Konflikt über Erwartungen.",
      ];
    case "Konfliktstil":
      return [
        "Hier hakt es oft weniger am Thema als am richtigen Zeitpunkt.",
        "Eine Person spricht Probleme früher an. Die andere braucht erst Abstand oder mehr Einordnung.",
        critical
          ? "Ohne klare Gesprächsregeln wirkt direkte Klarheit schnell hart. Umgekehrt wirkt Zurückhaltung schnell wie Ausweichen."
          : "Ohne Absprachen stauen sich Themen hier leicht an oder kommen im falschen Moment hoch.",
      ];
  }
}

export function getMatchingGroundArenaSentence(entry: MatchingSelectionEntry | null) {
  if (!entry) {
    return "Im Alltag fällt das noch nicht an einem einzelnen Schwerpunkt klar nach vorn.";
  }

  switch (entry.dimension) {
    case "Unternehmenslogik":
      return entry.status === "kritisch"
        ? "Am deutlichsten sieht man das dort, wo ihr Prioritäten setzt und dieselbe Entscheidung für euch etwas anderes erreichen soll."
        : "Das sieht man vor allem dann, wenn ihr Prioritäten setzt und schnell klären müsst, wofür eine Entscheidung gerade gut sein soll.";
    case "Entscheidungslogik":
      return entry.status === "ergänzend"
        ? "Am deutlichsten sieht man das unter Zeitdruck: Eine Person fasst früher zusammen, die andere prüft länger."
        : "Das sieht man vor allem dort, wo offen ist, wann genug geklärt wurde und wer am Ende entscheidet.";
    case "Risikoorientierung":
      return entry.status === "ergänzend"
        ? "Am deutlichsten sieht man das, wenn ihr euch zwischen zwei Wegen entscheiden müsst: Eine Person sieht früher die Chance, die andere früher die Kosten."
        : "Das sieht man dort, wo offen ist, wie weit ihr bei einer Chance wirklich gehen wollt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return entry.status === "kritisch"
        ? "Am deutlichsten spürt man das bei Übergaben, Zwischenständen und bei der Frage, wer worüber Bescheid wissen muss."
        : "Das zeigt sich vor allem im Takt eurer Arbeit: wie eng ihr zusammenarbeitet und wie viel Eigenraum für euch normal ist.";
    case "Commitment":
      return entry.status === "kritisch"
        ? "Am deutlichsten spürt man das daran, wie viel Präsenz, Verfügbarkeit und Einsatz im Alltag für euch jeweils normal sind."
        : "Das sieht man vor allem daran, wie ähnlich ihr Verfügbarkeit, Einsatz und Priorität versteht.";
    case "Konfliktstil":
      return entry.status === "kritisch"
        ? "Am stärksten sieht man das in Momenten, in denen etwas schiefläuft und eine Person früher in die Klärung will als die andere."
        : "Im Alltag sieht man das daran, wie ihr schwierige Punkte ansprecht und wieder zurück in die Sache findet.";
  }
}

export function getMatchingStrongestQualitySentence(entry: MatchingSelectionEntry | null) {
  if (!entry) {
    return "Eine einzelne, klar sichtbare Stärke springt hier noch nicht heraus.";
  }

  switch (entry.status) {
    case "nah":
      return `Stabil ist dieses Feld vor allem dann, wenn ${entry.dimension} nicht jedes Mal neu verhandelt werden muss.`;
    case "ergänzend":
      return `Hilfreich wird es dort, wo Unterschied in ${entry.dimension} nicht sofort wie Widerspruch gelesen wird.`;
    case "abstimmung_nötig":
      return `Hilfreich ist, dass ${entry.dimension} bei euch sichtbar ist und nicht lange unausgesprochen bleibt.`;
    case "kritisch":
      return "Hilfreich ist hier vor allem, wenn ihr klar benennt, woran es tatsächlich hängt.";
  }
}

export function getMatchingBiggestRiskSentence(
  entry: MatchingSelectionEntry | null,
  blindSpotRisk: boolean
) {
  if (!entry) {
    return blindSpotRisk
      ? "Das Risiko liegt eher darin, dass ihr zu schnell davon ausgeht, ohnehin gleich zu ticken."
      : "Ein einzelnes, klar dominantes Risikofeld springt hier nicht heraus.";
  }

  if (blindSpotRisk && entry.status === "nah") {
    return `Spät schwierig wird es dort, wo ihr ${entry.dimension} für so selbstverständlich haltet, dass kleine Veränderungen lange niemand anspricht.`;
  }

  switch (entry.dimension) {
    case "Commitment":
      return "Sonst geht jede Person in derselben Phase von etwas anderem aus, wenn es um Einsatz und Verfügbarkeit geht.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Sonst arbeitet ihr schnell aneinander vorbei oder dieselbe Aufgabe braucht zu viele Abstimmungsschleifen.";
    case "Konfliktstil":
      return "Sonst wird nicht nur das Thema schwierig, sondern schon die Art, wie ihr es ansprecht.";
    case "Unternehmenslogik":
      return "Sonst führt dieselbe Priorisierungsfrage euch schnell in verschiedene Richtungen.";
    case "Entscheidungslogik":
      return "Sonst wird dieselbe Entscheidung mehrfach wieder aufgerollt oder eine Person fühlt sich schon übergangen, während die andere noch nicht so weit ist.";
    case "Risikoorientierung":
      return "Sonst wird dieselbe Chance schnell zum Streitpunkt darüber, wie weit ihr wirklich gehen wollt.";
  }
}

export function getMatchingConditionSentence(
  selection: FounderMatchingSelection,
  groundDynamic: MatchingSelectionEntry | null,
  strongestQuality: MatchingSelectionEntry | null,
  biggestRisk: MatchingSelectionEntry | null
) {
  const primaryPattern = getPrimaryMatchingInteractionPattern(selection);

  switch (primaryPattern?.id) {
    case "commitment_workmode_pressure":
      return "Dann müsst ihr Einsatz und Arbeitsweise getrennt besprechen und für intensive Phasen klare Regeln haben.";
    case "workmode_conflict_friction":
      return "Dann muss klar sein, wann etwas sofort angesprochen wird und in welchem Rahmen ihr es besprecht.";
    case "decision_commitment_drag":
      return "Dann müsst ihr gleichzeitig klären, wie entschieden wird und wie viel Einsatz in dieser Phase erwartet ist.";
    case "decision_workmode_loop":
      return "Dann muss klar sein, wann andere eingebunden werden müssen und wann trotzdem entschieden wird.";
    case "risk_direction_tradeoff":
      return "Dann müsst ihr bei größeren Schritten gleichzeitig klären, wie viel Risiko okay ist und wofür die Entscheidung gerade gut sein soll.";
    case "risk_commitment_push":
      return "Dann dürfen neue Chancen nicht automatisch mehr Einsatz auslösen. Dieser Schritt muss bewusst vereinbart werden.";
    case "complement_under_pressure":
      return "Dann müsst ihr die Ergänzung bewusst nutzen und verhindern, dass das kritische Alltagsfeld alles andere überdeckt.";
    case "coordination_hidden_cost":
      return "Dann muss der zusätzliche Abstimmungsaufwand sichtbar bleiben und darf nicht erst auffallen, wenn schon Frust da ist.";
    case "alignment_edge_guard":
      return "Dann solltet ihr die stabile Basis nutzen und das offene Feld früh regeln, statt es laufen zu lassen.";
  }

  if (selection.meta.highSimilarityBlindSpotRisk) {
    return "Dann dürft ihr Ähnlichkeit nicht mit Klarheit verwechseln und solltet Annahmen früh aussprechen.";
  }

  switch (selection.heroSelection.mode) {
    case "alignment_led":
      return "Das funktioniert gut, solange ihr kleine Unterschiede früh ansprecht und nicht zu lange laufen lasst.";
    case "complement_led":
      return "Dafür muss klar sein, wann euer Unterschied hilft und wann er euch langsamer macht.";
    case "tension_led":
      return "Ohne klare Regel wird genau dieses Feld im Alltag schnell zum Problem.";
    case "coordination_led":
      return "Dann müsst ihr sichtbar regeln, wo Abstimmung wirklich nötig ist und wo sie euch nur still Zeit kostet.";
    case "blind_spot_watch":
      return "Das bleibt nur stabil, wenn ihr Nähe nicht mit Klarheit verwechselt und kleine Unstimmigkeiten früh ansprecht.";
    default:
      return groundDynamic && strongestQuality && biggestRisk
        ? "Am besten läuft es, wenn ihr Stärke und Risiko gleichzeitig im Blick behaltet."
        : "Es hilft, wenn ihr Unterschiede früh sichtbar macht.";
  }
}

export function buildMatchingComplementSentences(
  strongestComplement: MatchingSelectionEntry,
  selection?: FounderMatchingSelection
) {
  const tensionDimension = selection?.biggestTension?.dimension ?? null;
  const mode = selection?.heroSelection.mode ?? null;
  const noStableBase = !selection?.stableBase;
  const primaryPattern = selection ? getPrimaryMatchingInteractionPattern(selection) : null;

  switch (strongestComplement.dimension) {
    case "Entscheidungslogik":
      if (primaryPattern?.id === "decision_commitment_drag") {
        return [
          "Ihr kommt nicht auf dieselbe Weise zu Entscheidungen.",
          "Das kann hilfreich sein. Unter Druck wird es aber schneller schwierig, wenn gleichzeitig nicht dieselbe Verfügbarkeit und nicht derselbe Einsatz gelten.",
          "Dann muss klar sein, wer noch prüft, wer schon entscheiden will und wie viel Einsatz in dieser Phase erwartet wird.",
        ];
      }

      if (mode === "tension_led" || noStableBase) {
        return [
          "Gerade weil an anderer Stelle wenig stabil ist, wird dieser Unterschied nicht automatisch hilfreich.",
          "Er kann euch davor schützen, zu früh zu entscheiden oder zu lange in der Prüfung zu bleiben.",
          "Dann muss klar sein, wer wann auf eine Entscheidung drängt, wer noch prüft und wann die Entscheidung wirklich steht.",
        ];
      }

      if (
        tensionDimension === "Arbeitsstruktur & Zusammenarbeit" ||
        tensionDimension === "Konfliktstil"
      ) {
        return [
          "Ihr kommt nicht auf dieselbe Weise zu Entscheidungen.",
          "Genau das kann hilfreich sein, weil nicht beide dasselbe Tempo und dieselbe Art von Gründlichkeit mitbringen.",
          "Das hilft nur, wenn dieser Unterschied nicht noch mehr Reibung in Arbeitsablauf oder Gespräche bringt.",
        ];
      }

      return [
        "Ihr kommt nicht auf dieselbe Weise zu Entscheidungen.",
        "Gerade dadurch merkt ihr oft schneller, wann weitere Prüfung sinnvoll ist und wann entschieden werden sollte.",
        "Dann solltet ihr vorher klären, wer wann zusammenfasst und wann noch weiter geprüft wird.",
      ];

    case "Risikoorientierung":
      if (primaryPattern?.id === "risk_direction_tradeoff") {
        return [
          "Ihr habt nicht dieselbe Schwelle dafür, wann sich ein Schritt für euch richtig anfühlt.",
          "Gerade dadurch schaut ihr nicht nur unterschiedlich auf Risiko, sondern auch auf das Ziel der gleichen Chance.",
          "Dann müsst ihr Richtung und Risiko gemeinsam klären, statt beides durcheinander zu besprechen.",
        ];
      }

      if (mode === "complement_led" && selection?.stableBase) {
      return [
        "Ihr habt nicht dieselbe Schwelle dafür, wann sich ein Schritt für euch richtig anfühlt.",
        "Auf einer stabilen Basis kann das hilfreich sein: Eine Person sieht früher die Chance, die andere früher die Kosten.",
        "Dann müsst ihr klar benennen, welches Risiko ihr gerade wirklich eingeht und welche Grenze im Alltag gelten soll.",
      ];
      }

      if (
        tensionDimension === "Commitment" ||
        tensionDimension === "Arbeitsstruktur & Zusammenarbeit"
      ) {
        return [
          "Ihr habt nicht dieselbe Grenze dafür, wie viel Risiko okay ist.",
          "Das kann Entscheidungen schärfen, solange daraus nicht noch mehr Druck im Alltag entsteht.",
          "Dann solltet ihr Risiko nicht nebenbei verhandeln, sondern offen besprechen.",
        ];
      }

      return [
        "Ihr habt nicht dieselbe Schwelle dafür, wann sich ein Schritt für euch richtig anfühlt.",
        "Das kann euch helfen: Eine Person sieht früher die Chance, die andere früher die Kosten.",
        "Dann solltet ihr aussprechen, welches Risiko gerade real ist und wann ihr trotzdem vorangeht.",
      ];

    default:
      return [
        "Hier liegt ein wichtiger Unterschied, der euch auch helfen kann.",
        "Der Nutzen entsteht dort, wo ihr auf dieselbe Lage nicht automatisch gleich reagiert.",
        "Das hilft nur, wenn ihr diesen Unterschied offen besprecht, statt ihn einfach laufen zu lassen.",
      ];
  }
}

export function getMatchingDynamicsSituationSentence(selection: FounderMatchingSelection) {
  const primaryPattern = getPrimaryMatchingInteractionPattern(selection);
  const lead = selection.dailyDynamicsDimensions[0];
  if (!lead) {
    return "Bei euch springt im Alltag kein einzelner Reibungspunkt sofort nach vorn.";
  }

  if (primaryPattern?.id === "blind_spot_similarity_drift") {
    return "Lange wirkt vieles sauber. Erst später merkt ihr, dass ihr längst von unterschiedlichen Standards ausgeht.";
  }

  switch (lead.dimension) {
    case "Commitment":
      return "Wenn das Tempo hochgeht und parallel noch anderes läuft, merkt ihr schnell, wie unterschiedlich viel Präsenz für euch dann normal ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Wenn Arbeit nicht nur weiterlaufen, sondern für beide sichtbar bleiben soll, merkt ihr schnell, dass ihr nicht denselben Takt braucht.";
    case "Konfliktstil":
      return "Wenn etwas schiefläuft und nicht einfach liegen bleiben kann, reagiert ihr nicht im selben Moment.";
    case "Entscheidungslogik":
      return "Wenn etwas schnell entschieden werden muss, seid ihr oft nicht gleich weit.";
    case "Unternehmenslogik":
      return "Wenn Prioritäten unter Druck geraten, wird für euch nicht automatisch dieselbe Frage wichtig.";
    case "Risikoorientierung":
      return "Wenn eine Chance plötzlich auf dem Tisch liegt, habt ihr nicht dieselbe Grenze dafür, ob ihr sie wirklich nehmt.";
  }
}

function buildDimensionPairKey(
  first: MatchingSelectionEntry | undefined,
  second: MatchingSelectionEntry | undefined
) {
  return [first?.dimension, second?.dimension]
    .filter(Boolean)
    .sort()
    .join("|");
}

export function getMatchingDynamicsInteractionSentence(
  first: MatchingSelectionEntry | undefined,
  second: MatchingSelectionEntry | undefined,
  pattern?: MatchingInteractionPattern | null
) {
  if (!first && !second) {
    return "Vieles läuft dadurch erst einmal ruhig, aber noch ohne klaren Schwerpunkt.";
  }

  switch (pattern?.id) {
    case "commitment_workmode_pressure":
      return pattern.strength === "strong"
        ? "Sobald Druck entsteht, geht es nicht nur um Verfügbarkeit. Es geht sofort auch darum, wie eng ihr euch abstimmen müsst."
        : "Sobald Druck entsteht, vermischt sich schnell die Frage nach Verfügbarkeit mit der Frage nach enger Abstimmung.";
    case "workmode_conflict_friction":
      return "Eine Person will früher sehen, wo es hängt. Die andere will erst klären, wie eng ihr dazu überhaupt zusammenarbeiten müsst.";
    case "decision_commitment_drag":
      return "Eine Person will entscheiden. Die andere prüft noch und geht zugleich nicht von demselben Einsatz aus.";
    case "decision_workmode_loop":
      return "Eine Person will mehr Einblick, bevor etwas entschieden wird. Die andere erlebt genau das schnell als Stillstand.";
    case "risk_direction_tradeoff":
      return "Dieselbe Chance wird dann schnell zu zwei Fragen: Geht ihr sie ein und passt sie überhaupt zu eurer Richtung?";
    case "risk_commitment_push":
      return "Sobald ein Schritt mehr Einsatz verlangt, wird aus Risiko schnell auch die Frage, wer gerade wie viel übernimmt.";
    case "blind_spot_similarity_drift":
      return "Weil wenig offen auffällt, merkt ihr Unterschiede oft erst dann, wenn eine Person längst nach einem anderen Standard arbeitet.";
    case "coordination_hidden_cost":
      return "Nach außen sieht das oft sauber aus. Intern zieht dieselbe Aufgabe aber mehr Abstimmung und Rückversicherung, als ihr zuerst merkt.";
    case "alignment_edge_guard":
      return "Vieles läuft stabil. Genau deshalb fällt ein offenes Randthema leicht erst spät auf.";
  }

  const dimensions = buildDimensionPairKey(first, second);

  switch (dimensions) {
    case "Arbeitsstruktur & Zusammenarbeit|Konfliktstil":
      return "Eine Person will dann früher sehen, wo es hängt, und spricht es eher an. Die andere braucht erst mehr Abstand oder weniger Abstimmung.";
    case "Arbeitsstruktur & Zusammenarbeit|Commitment":
      return "Sobald Druck entsteht, vermischt sich schnell die Frage nach Verfügbarkeit mit der Frage, wie eng ihr zusammenarbeiten wollt.";
    case "Arbeitsstruktur & Zusammenarbeit|Entscheidungslogik":
      return "Eine Person will erst mehr Einblick, während die andere schon entscheiden oder weitergehen will.";
    case "Arbeitsstruktur & Zusammenarbeit|Risikoorientierung":
      return "Eine Person will erst den Überblick, während die andere schon wissen will, ob ihr den Schritt geht.";
    case "Commitment|Konfliktstil":
      return "Sobald Druck entsteht, spricht eine Person es direkt an, während die andere noch sortiert, wie viel Einsatz gerade überhaupt gilt.";
    case "Entscheidungslogik|Risikoorientierung":
      return "Eine Person will früher losgehen, während die andere noch klärt, ob das Risiko dafür gerade passt.";
    case "Entscheidungslogik|Unternehmenslogik":
      return "Eine Person will den nächsten Schritt schneller festlegen, während die andere noch prüft, ob diese Entscheidung zur Richtung passt.";
    case "Risikoorientierung|Unternehmenslogik":
      return "Eine Person sieht früher die Marktchance, während die andere zuerst wissen will, ob dieser Schritt noch zu eurer Linie passt.";
    default:
      return "So arbeitet ihr oft am selben Thema, aber nicht aus demselben Stand heraus.";
  }
}

export function getMatchingDynamicsConsequenceSentence(
  selection: FounderMatchingSelection,
  pattern?: MatchingInteractionPattern | null
) {
  switch (pattern?.id) {
    case "commitment_workmode_pressure":
      return pattern.strength === "strong"
        ? "So fühlt sich dieselbe Phase für eine Person schnell nach Druck an und für die andere nach fehlendem Anschluss."
        : "So wird aus einer operativen Frage leicht ein stiller Konflikt über Verfügbarkeit und Anschluss.";
    case "workmode_conflict_friction":
      return "So wird nicht nur das Thema anstrengend, sondern schon die Art, wie ihr es zusammen besprecht.";
    case "decision_commitment_drag":
      return "Dann wirkt eine Person schnell wie eine Bremse. Die andere fühlt sich schon in einen Einsatz gedrückt, der für sie noch gar nicht dran ist.";
    case "decision_workmode_loop":
      return "So bleibt dieselbe Frage leicht länger offen, weil Entscheidung und Einblick gleichzeitig verhandelt werden.";
    case "risk_direction_tradeoff":
      return "Dann hängt derselbe Schritt nicht nur am Risiko, sondern auch daran, welches Ziel in dieser Lage zuerst zählt.";
    case "risk_commitment_push":
      return "Dann wird aus einer Chance schnell Streit darüber, wie viel Einsatz dafür gerade überhaupt vertretbar ist.";
    case "blind_spot_similarity_drift":
      return "So verschieben sich Erwartungen leise, obwohl vorher lange alles ruhig wirkte.";
  }

  if (selection.meta.highSimilarityBlindSpotRisk) {
    return "Gerade weil wenig offen auffällt, merkt ihr Veränderungen oft erst dann, wenn eine Person längst von etwas anderem ausgeht.";
  }

  if (selection.heroSelection.mode === "tension_led") {
    return "So denkt eine Person oft, etwas sei längst klar, während die andere genau an dieser Stelle noch offene Fragen hat.";
  }

  if (selection.heroSelection.mode === "complement_led") {
    return "Das ist nicht automatisch problematisch. Im Alltag ist eine Person aber oft schon weiter, während die andere noch prüft, ob der Schritt schon passt.";
  }

  if (selection.heroSelection.mode === "coordination_led") {
    return "Es hakt nicht ständig. Ihr verliert Geschwindigkeit eher daran, dass dieselbe Aufgabe mehr Rückversicherung braucht, als von außen sichtbar ist.";
  }

  return "So läuft vieles ruhig, bis eine Person merkt, dass die andere längst von etwas anderem ausgeht.";
}

export function getMatchingDynamicsThirdSentence(selection: FounderMatchingSelection) {
  const third = selection.dailyDynamicsDimensions[2];
  if (!third) return null;

  switch (third.dimension) {
    case "Entscheidungslogik":
      return "Gleichzeitig entscheidet ihr nicht im selben Moment.";
    case "Risikoorientierung":
      return "Gleichzeitig habt ihr nicht dieselbe Grenze dafür, wann ihr vorangeht.";
    case "Konfliktstil":
      return "Gleichzeitig sprecht ihr Probleme nicht im selben Moment an.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Gleichzeitig braucht ihr nicht gleich viel Einblick, damit etwas für euch sauber läuft.";
    case "Commitment":
      return "Gleichzeitig ist für euch nicht dieselbe Menge an Präsenz normal.";
    case "Unternehmenslogik":
      return "Gleichzeitig ordnet ihr nicht automatisch nach demselben Ziel.";
  }
}

export function getMatchingDynamicsConditionSentence(
  selection: FounderMatchingSelection,
  pattern?: MatchingInteractionPattern | null
) {
  switch (pattern?.id) {
    case "commitment_workmode_pressure":
      return "Dann muss klar sein, wann hoher Einsatz gilt und wer dabei worüber informiert bleiben muss.";
    case "workmode_conflict_friction":
      return "Dann müsst ihr trennen, was sofort angesprochen werden muss und wann dafür ein ruhigeres Gespräch reicht.";
    case "decision_commitment_drag":
      return "Dann muss klar sein, wer entscheidet und welches Einsatzniveau in dieser Phase wirklich gilt.";
    case "decision_workmode_loop":
      return "Dann muss klar sein, wann andere eingebunden werden müssen und wann eine Entscheidung trotzdem steht.";
    case "risk_direction_tradeoff":
      return "Dann solltet ihr Risiko und Priorität nicht vermischen, sondern klar sagen, warum ihr diesen Schritt gerade geht.";
    case "risk_commitment_push":
      return "Dann muss klar sein, welcher Schritt mehr Einsatz rechtfertigt und wo eure Grenze im Alltag bleibt.";
    case "blind_spot_similarity_drift":
      return "Dann solltet ihr auch in ruhigen Phasen aussprechen, was sich gerade verändert hat.";
    case "complement_under_pressure":
      return "Dann müsst ihr die Ergänzung bewusst nutzen und verhindern, dass das kritische Feld still alles andere bestimmt.";
    case "coordination_hidden_cost":
      return "Dann muss zusätzliche Abstimmung sichtbar bleiben und darf nicht erst auffallen, wenn schon Zeit, Zug oder Klarheit verloren gegangen sind.";
    case "alignment_edge_guard":
      return "Dann solltet ihr das offene Feld nicht wegen der sonst guten Basis zu lange kleinreden.";
  }

  if (selection.meta.highSimilarityBlindSpotRisk) {
    return "Dann solltet ihr auch in ruhigen Phasen sagen, was sich gerade verändert hat.";
  }

  if (selection.biggestTension?.dimension === "Arbeitsstruktur & Zusammenarbeit") {
    return "Dann muss klar sein, wann andere eingebunden werden, wann jemand allein weitergeht und wann etwas zurück ins Team muss.";
  }

  if (selection.biggestTension?.dimension === "Commitment") {
    return "Dann sollte festgelegt sein, wann hoher Einsatz gilt und was im Alltag trotzdem begrenzt bleibt.";
  }

  if (selection.strongestComplement?.dimension === "Entscheidungslogik") {
    return "Dann muss klar sein, wer entscheidet und wann etwas wirklich entschieden ist.";
  }

  if (selection.strongestComplement?.dimension === "Risikoorientierung") {
    return "Dann sollte festgelegt sein, welche Risiken ihr wirklich eingeht und wer bei offenen Chancen den Ausschlag gibt.";
  }

  return "Dann muss sichtbar bleiben, was gerade gilt und wer den nächsten Schritt macht.";
}

export function getMatchingAgreementSentence(
  entry: FounderMatchingSelection["agreementFocusDimensions"][number]
) {
  switch (entry.dimension) {
    case "Commitment":
      return "Ihr braucht eine klare Regel dafür, welches Einsatzniveau im Alltag erwartet ist und wann mehr Einsatz wirklich gilt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Ihr braucht eine klare Regel dafür, welche Zwischenstände geteilt werden, wo Eigenraum beginnt und wann andere eingebunden werden müssen.";
    case "Konfliktstil":
      return "Ihr braucht eine klare Regel dafür, wie Probleme angesprochen werden, was sofort auf den Tisch muss und was erst in einem ruhigeren Gespräch geklärt wird.";
    case "Entscheidungslogik":
      return "Es sollte eindeutig sein, wer eine Entscheidung vorbereitet, wann genug geprüft wurde und wer am Ende entscheidet.";
    case "Unternehmenslogik":
      return "Ihr braucht eine klare Regel dafür, wonach ihr priorisiert, wenn Wachstum, Wirkung oder Aufbau nicht in dieselbe Richtung zeigen.";
    case "Risikoorientierung":
      return "Ihr braucht eine klare Regel dafür, wie viel Risiko für euch okay ist und bei welchen Schritten Absicherung zuerst zählt.";
  }
}
