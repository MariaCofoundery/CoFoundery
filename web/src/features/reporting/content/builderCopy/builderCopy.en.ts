import type { ReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";

export const REPORT_BUILDER_COPY_EN = {
  executiveSummary: {
    fallbackFocus: [
      "What expectations do you want to set for shared responsibility and decision paths?",
      "Where do you need early clarity so collaboration stays workable under pressure?",
    ],
    focusPromptsByDimension: {
      Unternehmenslogik: [
        "What should guide entrepreneurial decisions for you: strategic leverage, substance, or the balance between both?",
        "How would you notice early that you are weighting market opportunity and substance differently?",
      ],
      Entscheidungslogik: [
        "How do you want to make decisions when pace and careful review pull in different directions?",
        "Which topics need clear decision rights instead of extended alignment loops?",
      ],
      Risikoorientierung: [
        "Where do you want to be deliberately bold, and where do you need clear safety lines?",
        "How can different risk perspectives help you make better strategic decisions?",
      ],
      "Arbeitsstruktur & Zusammenarbeit": [
        "How closely do you want to coordinate day to day, and where do you each need deliberate autonomy?",
        "How visible should progress, decisions, and open points be to each other?",
      ],
      Commitment: [
        "What expectations do you have for prioritization, availability, and level of effort day to day?",
        "How would you notice early that your working realities are diverging in intensity or priority?",
      ],
      Konfliktstil: [
        "How do you want to raise disagreements before they harden?",
        "Which rules help you work with tension constructively instead of making it personal?",
      ],
    },
  },
  enPilotExamples: {
    fallbackSummary:
      "Use this report as a careful starting point for a focused conversation, not as a final verdict.",
    focusPrompt:
      "Which concrete agreement would help you make the next decision more deliberately?",
    sectionInterpretation:
      "This working dynamic can become more useful when expectations are made explicit before pressure builds.",
  },
} as const satisfies ReportBuilderCopy;
