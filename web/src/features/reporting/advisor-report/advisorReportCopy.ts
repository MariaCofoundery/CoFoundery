import type {
  AdvisorDimensionKey,
  AdvisorInterventionType,
} from "@/features/reporting/advisor-report/advisorReportTypes";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export interface AdvisorDimensionCopy {
  title: string;
  tensionRisk: {
    opposite: string;
    mixed: string;
    blindSpot: string;
    alignedExtreme: string;
  };
  strengthPotential: {
    complementary: string;
    aligned: string;
  };
  tippingPoint: {
    highRisk: string;
    mediumRisk: string;
    blindSpot: string;
  };
  moderationQuestion: {
    default: string;
  };
  observationMarkers: {
    opposite: string[];
    mixed: string[];
    blindSpot: string[];
    aligned: string[];
  };
  missingData: {
    observation: string;
    possibleContribution: string;
    revisitWhen: string;
    moderationQuestion: string;
    observationMarkers: string[];
  };
  interventionTitle: string;
  interventionObjective: string;
  interventionPrompt: string;
  interventionType: AdvisorInterventionType;
  stabilityRationale: string;
  stabilityConstraint: string;
}

export interface AdvisorNarrativeCopy {
  topTensionSummary: {
    missing: (title: string) => string;
    difference: (title: string) => string;
    markedDifference: (title: string) => string;
    similar: (title: string) => string;
  };
  leadStatement: {
    missing: (title: string) => string;
    similar: (title: string) => string;
    noPriority: string;
    discussion: (title: string) => string;
  };
}

type DimensionDefinition = {
  title: string;
  subject: string;
  question: string;
  interventionType: AdvisorInterventionType;
};

const DIMENSIONS: Record<AppLocale, Record<AdvisorDimensionKey, DimensionDefinition>> = {
  de: {
    Unternehmenslogik: {
      title: "Strategische Richtung",
      subject: "strategischer Richtung und Priorisierung",
      question: "Nach welchen Kriterien wollt ihr priorisieren, wenn mehrere Ziele gleichzeitig wichtig sind?",
      interventionType: "prioritization_system",
    },
    Risikoorientierung: {
      title: "Umgang mit Unsicherheit",
      subject: "Unsicherheit, Chancen und Begrenzungen",
      question: "Welche Annahmen, Grenzen und Signale sollen bei Entscheidungen unter Unsicherheit gelten?",
      interventionType: "risk_guardrails",
    },
    Entscheidungslogik: {
      title: "Entscheidungen",
      subject: "Vorbereitung und Abschluss von Entscheidungen",
      question: "Woran wollt ihr erkennen, dass eine Entscheidung ausreichend vorbereitet ist?",
      interventionType: "decision_rules",
    },
    Commitment: {
      title: "Verfügbarkeit und Erwartungen",
      subject: "Verfügbarkeit, Arbeitsbelastung und Erwartungen",
      question: "Welche Verfügbarkeit könnt ihr jeweils einbringen, und wie wollt ihr Veränderungen früh ansprechen?",
      interventionType: "roles_clarity",
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      title: "Arbeitsstruktur und Zusammenarbeit",
      subject: "Eigenverantwortung, Abstimmung und Informationsfluss",
      question: "Was soll gemeinsam sichtbar sein, und was kann eigenverantwortlich laufen?",
      interventionType: "collaboration_rules",
    },
    Konfliktstil: {
      title: "Umgang mit Meinungsverschiedenheiten",
      subject: "Timing und Form bei Meinungsverschiedenheiten",
      question: "Wie wollt ihr ansprechen, dass eine Person zu einem Thema Gesprächsbedarf hat?",
      interventionType: "conflict_rules",
    },
  },
  en: {
    Unternehmenslogik: {
      title: "Strategic direction",
      subject: "strategic direction and prioritization",
      question: "Which criteria do you want to use when several goals matter at the same time?",
      interventionType: "prioritization_system",
    },
    Risikoorientierung: {
      title: "Approach to uncertainty",
      subject: "uncertainty, opportunities, and boundaries",
      question: "Which assumptions, boundaries, and signals should guide decisions under uncertainty?",
      interventionType: "risk_guardrails",
    },
    Entscheidungslogik: {
      title: "Decision-making",
      subject: "preparing and concluding decisions",
      question: "How do you want to determine that a decision is sufficiently prepared?",
      interventionType: "decision_rules",
    },
    Commitment: {
      title: "Availability and expectations",
      subject: "availability, workload, and expectations",
      question: "What availability can each of you offer, and how do you want to raise changes early?",
      interventionType: "roles_clarity",
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      title: "Work structure and collaboration",
      subject: "ownership, coordination, and information flow",
      question: "What should be visible to both of you, and what can be handled independently?",
      interventionType: "collaboration_rules",
    },
    Konfliktstil: {
      title: "Handling disagreements",
      subject: "the timing and form of addressing disagreements",
      question: "How do you want to raise that one of you would like to discuss a topic further?",
      interventionType: "conflict_rules",
    },
  },
};

function buildGermanDimensionCopy(definition: DimensionDefinition): AdvisorDimensionCopy {
  const { title, subject, question, interventionType } = definition;
  return {
    title,
    tensionRisk: {
      opposite: `Die Angaben der Founder zu ${subject} liegen weiter auseinander.`,
      mixed: `Die Angaben der Founder zu ${subject} unterscheiden sich in einzelnen Punkten.`,
      blindSpot: `Die Angaben der Founder zu ${subject} liegen näher beieinander. Ähnliche Antworten können dennoch unterschiedliche Gründe haben.`,
      alignedExtreme: `Die Angaben der Founder zu ${subject} liegen näher beieinander. Das beschreibt die Antworten, nicht die künftige Zusammenarbeit.`,
    },
    strengthPotential: {
      complementary: "Die unterschiedlichen Perspektiven können als Ausgangspunkt für ein konkretes Gespräch dienen.",
      aligned: "Die ähnlichen Antworten können als Ausgangspunkt dienen, um Erwartungen ausdrücklich festzuhalten.",
    },
    tippingPoint: {
      highRisk: "Erneut betrachten, wenn eine konkrete Entscheidung unterschiedliche Erwartungen sichtbar macht.",
      mediumRisk: "Erneut betrachten, wenn der Punkt im Alltag unterschiedlich verstanden wird.",
      blindSpot: "Erneut betrachten, wenn ähnliche Antworten in konkreten Situationen unterschiedlich begründet werden.",
    },
    moderationQuestion: { default: question },
    observationMarkers: {
      opposite: [
        `Die Angaben zu ${subject} liegen weiter auseinander.`,
        "Für das Gespräch kann interessant sein, welche Erwartungen hinter den jeweiligen Antworten stehen.",
      ],
      mixed: [
        `Die Angaben zu ${subject} unterscheiden sich in einzelnen Punkten.`,
        "Konkrete Beispiele können helfen, die jeweiligen Erwartungen sichtbar zu machen.",
      ],
      blindSpot: [
        `Die Angaben zu ${subject} liegen näher beieinander.`,
        "Es bleibt offen, ob hinter ähnlichen Antworten auch ähnliche Gründe stehen.",
      ],
      aligned: [
        `Die Angaben zu ${subject} liegen näher beieinander.`,
      ],
    },
    missingData: {
      observation: `Für eine Gegenüberstellung zu ${subject} fehlen Angaben.`,
      possibleContribution: "Die fehlenden Angaben können ergänzt werden, bevor daraus ein Gesprächspunkt abgeleitet wird.",
      revisitWhen: "Erneut betrachten, sobald beide Founder geantwortet haben.",
      moderationQuestion: "Welche Perspektive fehlt noch, um diesen Punkt gemeinsam zu betrachten?",
      observationMarkers: [`Für eine Gegenüberstellung zu ${subject} fehlen Angaben.`],
    },
    interventionTitle: `Gespräch zu ${title} strukturieren`,
    interventionObjective: "Die jeweiligen Perspektiven und Erwartungen sichtbar machen, ohne daraus eine Bewertung des Teams abzuleiten.",
    interventionPrompt: question,
    interventionType,
    stabilityRationale: "Die Angaben liegen hier näher beieinander.",
    stabilityConstraint: "Ähnliche Antworten belegen nicht automatisch gleiche Gründe oder Erwartungen.",
  };
}

function buildEnglishDimensionCopy(definition: DimensionDefinition): AdvisorDimensionCopy {
  const { title, subject, question, interventionType } = definition;
  return {
    title,
    tensionRisk: {
      opposite: `The founders' responses on ${subject} are further apart.`,
      mixed: `The founders' responses on ${subject} differ on some points.`,
      blindSpot: `The founders' responses on ${subject} are closer together. Similar responses can still have different reasons.`,
      alignedExtreme: `The founders' responses on ${subject} are closer together. This describes their responses, not their future collaboration.`,
    },
    strengthPotential: {
      complementary: "The different perspectives can serve as a starting point for a concrete conversation.",
      aligned: "The similar responses can serve as a starting point for recording expectations explicitly.",
    },
    tippingPoint: {
      highRisk: "Revisit this when a concrete decision reveals different expectations.",
      mediumRisk: "Revisit this when the point is understood differently in day-to-day work.",
      blindSpot: "Revisit this when similar responses are based on different reasons in a concrete situation.",
    },
    moderationQuestion: { default: question },
    observationMarkers: {
      opposite: [
        `The responses on ${subject} are further apart.`,
        "For the conversation, it may be useful to explore the expectations behind each response.",
      ],
      mixed: [
        `The responses on ${subject} differ on some points.`,
        "Concrete examples can help make each founder's expectations visible.",
      ],
      blindSpot: [
        `The responses on ${subject} are closer together.`,
        "It remains open whether similar responses are based on similar reasons.",
      ],
      aligned: [
        `The responses on ${subject} are closer together.`,
      ],
    },
    missingData: {
      observation: `Information is missing for a comparison on ${subject}.`,
      possibleContribution: "The missing information can be added before a discussion point is derived from it.",
      revisitWhen: "Revisit this once both founders have responded.",
      moderationQuestion: "Which perspective is still missing before you review this point together?",
      observationMarkers: [`Information is missing for a comparison on ${subject}.`],
    },
    interventionTitle: `Structure a conversation about ${title.toLowerCase()}`,
    interventionObjective: "Make each perspective and expectation visible without turning them into an evaluation of the team.",
    interventionPrompt: question,
    interventionType,
    stabilityRationale: "The responses are closer together here.",
    stabilityConstraint: "Similar responses do not automatically demonstrate the same reasons or expectations.",
  };
}

export function getAdvisorDimensionCopy(
  locale: string | null | undefined
): Record<AdvisorDimensionKey, AdvisorDimensionCopy> {
  const normalized = normalizeLocale(locale);
  const definitions = DIMENSIONS[normalized];
  return Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => [
      key,
      normalized === "en"
        ? buildEnglishDimensionCopy(definition)
        : buildGermanDimensionCopy(definition),
    ])
  ) as Record<AdvisorDimensionKey, AdvisorDimensionCopy>;
}

export function getAdvisorNarrativeCopy(
  locale: string | null | undefined
): AdvisorNarrativeCopy {
  return normalizeLocale(locale) === "en"
    ? {
        topTensionSummary: {
          missing: (title) => `${title}: information is still missing for a comparison.`,
          difference: (title) => `${title}: the responses differ and provide a topic for discussion.`,
          markedDifference: (title) => `${title}: the responses differ more clearly and are suitable for focused clarification.`,
          similar: (title) => `${title}: the responses are closer together; the reasons behind them may still differ.`,
        },
        leadStatement: {
          missing: (title) => `Information is still missing for a comparison on ${title}.`,
          similar: (title) => `The responses are currently closest on ${title}. This can be a starting point for making expectations explicit.`,
          noPriority: "The available responses do not identify a single priority topic. The report can still support a structured conversation.",
          discussion: (title) => `The clearest discussion point in the available responses concerns ${title}.`,
        },
      }
    : {
        topTensionSummary: {
          missing: (title) => `${title}: Für eine Gegenüberstellung fehlen noch Angaben.`,
          difference: (title) => `${title}: Die Angaben unterscheiden sich und bieten einen Gesprächspunkt.`,
          markedDifference: (title) => `${title}: Die Angaben unterscheiden sich deutlicher und eignen sich für eine gezielte Klärung.`,
          similar: (title) => `${title}: Die Angaben liegen näher beieinander; die Gründe dahinter können dennoch verschieden sein.`,
        },
        leadStatement: {
          missing: (title) => `Für eine Gegenüberstellung zu ${title} fehlen noch Angaben.`,
          similar: (title) => `Bei ${title} liegen die Angaben derzeit am nächsten beieinander. Das kann ein Ausgangspunkt sein, um Erwartungen ausdrücklich festzuhalten.`,
          noPriority: "Aus den verfügbaren Angaben ergibt sich kein einzelnes vorrangiges Gesprächsthema. Der Report kann dennoch ein strukturiertes Gespräch unterstützen.",
          discussion: (title) => `Der deutlichste Gesprächspunkt in den verfügbaren Angaben betrifft ${title}.`,
        },
      };
}

export const ADVISOR_DIMENSION_COPY = getAdvisorDimensionCopy("de");
export const ADVISOR_NARRATIVE_COPY = getAdvisorNarrativeCopy("de");
