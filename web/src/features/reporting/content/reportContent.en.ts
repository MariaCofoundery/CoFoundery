import { type ReportContent } from "@/features/reporting/content/reportContent";

export const REPORT_CONTENT_EN = {
  dimensions: {
    Unternehmenslogik: {
      canonicalName: "Company logic",
      shortLabel: "Company logic",
      uiLeftPole: "substance-oriented",
      reportLeftPole: "substance and build-oriented",
      centerLabel: "balanced",
      uiRightPole: "leverage-oriented",
      reportRightPole: "opportunity and leverage-oriented",
      description:
        "Describes what guides entrepreneurial decisions: more substance, building, and long-term viability, or more opportunity, leverage, and strategic reach.",
    },
    Entscheidungslogik: {
      canonicalName: "Decision logic",
      shortLabel: "Decision",
      uiLeftPole: "analytical",
      reportLeftPole: "analytical and weighing options",
      centerLabel: "balanced",
      uiRightPole: "intuitive",
      reportRightPole: "intuitive and action-oriented",
      description:
        "Describes whether decisions are made more through analysis and safeguards, or more through judgment, intuition, and direct interpretation.",
    },
    Risikoorientierung: {
      canonicalName: "Risk orientation",
      shortLabel: "Risk",
      uiLeftPole: "security-oriented",
      reportLeftPole: "security-oriented",
      centerLabel: "balanced",
      uiRightPole: "comfortable with uncertainty",
      reportRightPole: "comfortable with uncertainty",
      description:
        "Describes whether risk and uncertainty are handled more cautiously, or treated as acceptable uncertainty to work with.",
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      canonicalName: "Work structure and collaboration",
      shortLabel: "Collaboration",
      uiLeftPole: "autonomous",
      reportLeftPole: "autonomous",
      centerLabel: "balanced",
      uiRightPole: "aligned",
      reportRightPole: "aligned",
      description:
        "Describes how autonomously or closely aligned someone wants to work day to day: through clear ownership and targeted coordination, or through ongoing exchange and a shared view of the work.",
    },
    Commitment: {
      canonicalName: "Commitment",
      shortLabel: "Commitment",
      uiLeftPole: "clearly bounded",
      reportLeftPole: "clearly bounded",
      centerLabel: "balanced",
      uiRightPole: "highly prioritized",
      reportRightPole: "highly prioritized",
      description:
        "Describes how strongly the startup is prioritized day to day and what level of commitment someone expects from themselves and the team.",
    },
    Konfliktstil: {
      canonicalName: "Conflict style",
      shortLabel: "Conflict",
      uiLeftPole: "sorting first",
      reportLeftPole: "sorting first",
      centerLabel: "balanced",
      uiRightPole: "direct",
      reportRightPole: "direct",
      description:
        "Describes whether tension, feedback, and disagreement are handled by sorting things first or by addressing them more directly.",
    },
  },
  headings: {
    centralPatterns: "Key patterns",
    dynamicsOverview: "Your dynamics at a glance",
    executiveSummary: "Executive summary",
    conversationPrompts: "Conversation prompts",
    conversationPromptsIntro: "Conversation prompts for your next discussion",
    nextStep: "Next step",
    valuesFocus: "Values focus add-on",
  },
  centralPatternLabels: {
    corePattern: "Core pattern",
    everydayImpact: "Day-to-day impact",
    consequence: "What this means",
  },
  statusLabels: {
    nah: "Close foundation",
    ergänzend: "Complementary",
    abstimmung_nötig: "Needs alignment",
    kritisch: "Needs clarification",
  },
  sectionLabels: {
    strength: "Your shared strength",
    complement: "Where you complement each other",
    clarificationField: "Discuss early",
    possibleTensionFields: "Areas to align on",
  },
  valuesLabels: {
    sharedBasis: "Shared basis",
    differenceUnderPressure: "Difference under pressure",
    guardrail: "Guardrail",
  },
} as const satisfies ReportContent;
