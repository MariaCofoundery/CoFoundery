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
  matchHeadlines: {
    session: "Your founder dynamics report is ready.",
    tension_led: "A few dynamics are worth aligning on early.",
    complement_led: "Complementary dynamics worth exploring.",
    coordination_led: "Aligned foundations with a few coordination points.",
    blind_spot_watch: "A close foundation with shared assumptions to keep visible.",
    alignment_led: "A strong starting point for your working dynamics.",
  },
  introSummaries: {
    session:
      "This snapshot shows your shared patterns, differences, and alignment points as a visual moment in time.",
    tension_led:
      "The main friction is less about tone and more about how you read direction, decisions, or collaboration under pressure.",
    complement_led:
      "Your difference is neither automatically a problem nor automatically a strength. It becomes useful when you know where it broadens the team and where it needs clear leadership.",
    coordination_led:
      "Your profiles point less to open disagreement and more to follow-up work, loops, and quiet coordination that should be made explicit.",
    blind_spot_watch:
      "The first risk is not open opposition, but a shared tendency that may become visible too late unless you invite a counter-perspective.",
    alignment_led:
      "Many things look workable between you. It is still worth clarifying where shared direction ends and explicit agreements should begin.",
  },
  statusLabels: {
    nah: "Close foundation",
    ergänzend: "Complementary",
    abstimmung_nötig: "Needs alignment",
    kritisch: "Needs clarification",
  },
  dimensionReadings: {
    insufficientData:
      "There is not enough data for this dimension yet to give a reliable shared reading.",
    sharedBlindSpot:
      "Your positions are close. That closeness can still make shared assumptions stay untested for too long.",
    kritisch:
      "This is a clear area to align on. You may not read this dimension through the same working logic.",
    abstimmung_nötig:
      "You are not fundamentally opposed here, but day-to-day work will benefit from explicit alignment.",
    ergänzend:
      "This could create useful complementarity when roles, timing, and decision rights are handled clearly.",
    nah: "This area looks broadly aligned and may reduce friction in day-to-day work.",
  },
  dimensionBusinessMeanings: {
    Unternehmenslogik: {
      critical:
        "If you do not clarify this, you may work on the same company with different underlying logics.",
      default:
        "If this stays implicit, the same priority can still lead to different target pictures.",
    },
    Entscheidungslogik: {
      critical:
        "Without a clear rule, you may decide past each other or read decisions as closed at different moments.",
      default:
        "If this stays implicit, loops can emerge even when both of you are ready to move on.",
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      critical:
        "Without clear rules, day-to-day work can create friction around visibility, autonomy, and shared context.",
      default:
        "If you do not clarify this, the same collaboration can feel too tight for one person and too loose for the other.",
    },
    Commitment: {
      critical:
        "Without a clear agreement, commitment can become a recurring topic around pace, availability, and fairness.",
      default:
        "If you do not clarify this, frustration can build around pace, availability, and responsibility.",
    },
    Risikoorientierung: {
      critical:
        "Without clear guardrails, one person may keep pulling forward while the other wants to slow down earlier.",
      default:
        "If this stays implicit, opportunities may be stopped too early or pushed too far.",
    },
    Konfliktstil: {
      critical:
        "Without a rule for this, small issues can escalate or stay under the surface for too long.",
      default:
        "If this stays implicit, one person may feel overrun while the other feels slowed down.",
    },
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
