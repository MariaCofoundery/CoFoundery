import type { ReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";

export const REPORT_BUILDER_COPY_EN = {
  executiveSummary: {
    dimensionLabels: {
      Unternehmenslogik: "company logic",
      Entscheidungslogik: "decision logic",
      Risikoorientierung: "risk orientation",
      "Arbeitsstruktur & Zusammenarbeit": "work structure and collaboration",
      Commitment: "commitment",
      Konfliktstil: "conflict style",
    },
    dimensionPrefix: {
      withDimension: "around {dimension}",
      fallback: "in your collaboration",
    },
    headlines: {
      insufficientData: "Not enough signal for a reliable overall reading yet",
      sharedBlindSpot: "A strong shared basis with assumptions to keep visible",
      strongBase: "Strategically and operationally workable foundations",
      strategicCloseOperationalClarify:
        "Strategically aligned, with operational points to clarify",
      everydayCloseStrategicTension:
        "Workable day to day, with strategic areas to align on",
      highClarification:
        "Strategic direction and day-to-day collaboration need clearer alignment",
      partial: "Workable starting points, but not in the same areas",
    },
    intro: {
      fit: {
        insufficientData:
          "The current data does not yet support a reliable shared reading of your collaboration.",
        sharedBlindSpot:
          "Strategically and in day-to-day work, your profiles point to a workable shared basis.",
        strongBase:
          "Strategically and in day-to-day work, your profiles point to a workable shared basis.",
        strategicCloseOperationalClarify:
          "Strategically, you appear closer than you are in day-to-day collaboration; friction is more likely to come from how you work together than from overall direction.",
        everydayCloseStrategicTension:
          "Day to day, you can connect well, but you may still read central strategic questions through different criteria.",
        highClarification:
          "Both strategic direction and day-to-day collaboration need more deliberate clarification before pressure builds.",
        partial:
          "There are useful starting points, but they do not all sit in the same areas of collaboration.",
      },
      strengthWithDimension: "A clear current strength sits {dimensionPrefix}.",
      strengthFallback: "Some shared strengths are already visible.",
      complementaryWithDimension:
        "The differences {dimensionPrefix} can become useful complementarity if you work with them deliberately.",
      sharedBlindSpotWithDimension:
        "Pay particular attention to {dimensionPrefix}, because shared tendencies there can remain untested for too long.",
      sharedBlindSpotFallback:
        "Areas where you feel close still deserve attention, so shared assumptions do not remain untested.",
      tensionOppositeWithDimension:
        "The most important area to align on is {dimensionPrefix}.",
      tensionCoordinationWithDimension:
        "Lead {dimensionPrefix} deliberately, because this is where recurring coordination may be needed.",
      tensionFallback: "The most important alignment topics currently look discussable.",
      closing: {
        preFounder:
          "Before founding together, focus on which differences you can use well and what you should clarify explicitly first.",
        existingTeam:
          "For your existing collaboration, focus on what already carries you and where a clearer shared line would reduce friction.",
      },
    },
    topMessages: {
      strength:
        "The strongest current signal in your collaboration is {dimensionPrefix}.",
      complementaryDynamic:
        "Your strongest complementary signal is {dimensionPrefix}.",
      tension:
        "The most important area to discuss deliberately is {dimensionPrefix}.",
      sharedBlindSpotTension:
        "The main area to keep visible is {dimensionPrefix}.",
    },
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
    dynamicFocus: {
      complementaryFallback:
        "Which differences could become useful for you, and which ones need clear facilitation?",
      protectStrengthPreFounder:
        "What would you need to protect deliberately so your current strength {dimensionPrefix} remains useful during the founding phase?",
      protectStrengthExistingTeam:
        "How can you keep your current strength {dimensionPrefix} stable in day-to-day work?",
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
