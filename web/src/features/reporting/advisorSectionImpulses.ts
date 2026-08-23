export const ADVISOR_IMPULSE_SECTION_ORDER = [
  "report_overview",
  "top_tensions",
  "workbook_collaboration",
  "workbook_values",
] as const;

export type AdvisorImpulseSectionKey = (typeof ADVISOR_IMPULSE_SECTION_ORDER)[number];

export type AdvisorSectionImpulse = {
  id: string;
  relationshipId: string;
  advisorUserId: string;
  sectionKey: AdvisorImpulseSectionKey;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type FounderVisibleAdvisorImpulse = {
  id: string;
  sectionKey: AdvisorImpulseSectionKey;
  advisorName: string | null;
  text: string;
  updatedAt: string;
};

type AdvisorImpulseSectionMeta = Record<
  AdvisorImpulseSectionKey,
  { title: string; description: string; placeholder: string }
>;

export const ADVISOR_IMPULSE_SECTION_META: AdvisorImpulseSectionMeta = {
  report_overview: {
    title: "Gesamteindruck",
    description: "Kurzer Advisor-Blick auf die Angaben des Teams und hilfreiche Gesprächsthemen.",
    placeholder: "Notiere eine knappe Beobachtung oder Frage für das Team.",
  },
  top_tensions: {
    title: "Gesprächsthemen",
    description: "Beobachtungen zu Themen, die die Founder gemeinsam betrachten können.",
    placeholder: "Notiere ein Thema oder eine Frage, die im Gespräch hilfreich sein kann.",
  },
  workbook_collaboration: {
    title: "Zusammenarbeit im Workbook",
    description: "Kurzer Impuls dazu, was im gemeinsamen Arbeitsmodus geklärt oder beobachtet werden kann.",
    placeholder: "Notiere eine konkrete Beobachtung oder Rückfrage zur Zusammenarbeit.",
  },
  workbook_values: {
    title: "Werte und Guardrails",
    description: "Hinweis auf Prinzipien, Grenzen oder Prioritäten, die die Founder klären können.",
    placeholder: "Notiere eine neutrale Frage zu Prinzipien, Grenzen oder Prioritäten.",
  },
};

const ADVISOR_IMPULSE_SECTION_META_EN: AdvisorImpulseSectionMeta = {
  report_overview: {
    title: "Overall view",
    description: "A brief advisor perspective on the team's input and useful topics for discussion.",
    placeholder: "Add a concise observation or question for the team.",
  },
  top_tensions: {
    title: "Topics to discuss",
    description: "Observations about topics the founders can examine together.",
    placeholder: "Add a topic or question that may be useful in the conversation.",
  },
  workbook_collaboration: {
    title: "Collaboration in the workbook",
    description: "A brief prompt about what could be clarified or observed in the working process.",
    placeholder: "Add a concrete observation or follow-up question about collaboration.",
  },
  workbook_values: {
    title: "Principles and guardrails",
    description: "A note about principles, boundaries, or priorities the founders can clarify.",
    placeholder: "Add a neutral question about principles, boundaries, or priorities.",
  },
};

export function getAdvisorImpulseSectionMeta(locale: string | null | undefined) {
  return normalizeLocale(locale) === "en"
    ? ADVISOR_IMPULSE_SECTION_META_EN
    : ADVISOR_IMPULSE_SECTION_META;
}
import { normalizeLocale } from "@/i18n/config";
