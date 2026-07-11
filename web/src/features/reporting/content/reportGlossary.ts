export type ReportGlossaryEntry = {
  key: string;
  de: string;
  en: string;
  notes?: string;
  avoidEn?: readonly string[];
};

export const REPORT_GLOSSARY = [
  {
    key: "dynamics_report",
    de: "Dynamik-Report",
    en: "Founder dynamics report",
    notes: "Use for the product report, not as a psychological diagnosis.",
  },
  {
    key: "working_dynamics",
    de: "Arbeitsdynamik",
    en: "working dynamics",
    notes: "Describes observable collaboration patterns.",
  },
  {
    key: "tension_field",
    de: "Spannungsfeld",
    en: "tension field",
    notes: "Use as a neutral area to clarify, not as a defect.",
    avoidEn: ["conflict diagnosis", "problem area"],
  },
  {
    key: "conversation_prompts",
    de: "Gesprächsimpulse",
    en: "conversation prompts",
  },
  {
    key: "clarification",
    de: "Klärung",
    en: "clarification",
  },
  {
    key: "complement",
    de: "Ergänzung",
    en: "complement",
    notes: "Prefer complement or complementary strength over idealizing language.",
    avoidEn: ["perfect match"],
  },
  {
    key: "founding_team",
    de: "Gründerteam",
    en: "founding team",
  },
  {
    key: "co_founder",
    de: "Co-Founder",
    en: "co-founder",
  },
  {
    key: "operating_agreement",
    de: "Operating Agreement",
    en: "Operating Agreement",
    notes: "Keep the English term in both locales.",
  },
  {
    key: "cofoundery_check",
    de: "Cofoundery Check",
    en: "Cofoundery Check",
    notes: "Product term; do not describe as a psychometric diagnosis.",
  },
  {
    key: "matching_session",
    de: "Matching Session",
    en: "matching session",
  },
  {
    key: "workspace",
    de: "Workspace",
    en: "workspace",
  },
  {
    key: "risk",
    de: "Risiko",
    en: "risk",
    notes: "Frame as a collaboration risk to discuss, not as a personal flaw.",
  },
  {
    key: "opportunity",
    de: "Chance",
    en: "opportunity",
    notes: "Use for constructive potential, not certainty.",
  },
  {
    key: "pattern",
    de: "Muster",
    en: "pattern",
    notes: "Use for repeated tendencies; avoid clinical wording.",
  },
] as const satisfies readonly ReportGlossaryEntry[];

export type ReportGlossaryKey = (typeof REPORT_GLOSSARY)[number]["key"];

export function getReportGlossaryEntry(key: ReportGlossaryKey) {
  return REPORT_GLOSSARY.find((entry) => entry.key === key) ?? null;
}
