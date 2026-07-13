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
  sections: {
    commitment: {
      dimension: "Commitment",
      interpretations: {
        fallback: {
          pre_founder:
            "There is not enough reliable data yet to describe what role the startup should play in everyday work or what level of commitment each person expects.",
          existing_team:
            "There is not enough reliable data yet to describe how strongly the startup is prioritized in your day-to-day collaboration or what level of commitment the team should carry.",
        },
        very_high: {
          pre_founder:
            "Your views on the role the startup should play day to day look very close. That can be a stable basis for exploring a collaboration, because prioritization and expected level of effort appear similar.",
          existing_team:
            "Your views on how strongly the startup is prioritized day to day look very close. For an existing team, this can create stability because availability and intensity are understood in similar ways.",
        },
        high: {
          pre_founder:
            "You share a strong basis around commitment, even if differences around priority, availability, or intensity are visible. This can work well if those differences are addressed early.",
          existing_team:
            "You share a strong basis around commitment, even if differences around priority, availability, or intensity are visible. For your collaboration, expectations need to stay explicit in day-to-day work.",
        },
        mixed: {
          pre_founder:
            "Commitment shows visible differences, especially around priority, availability, or expected day-to-day effort. Before working together more closely, it is worth discussing this openly so expectations do not remain implicit.",
          existing_team:
            "Commitment shows visible differences, especially around priority, availability, or expected day-to-day effort. In an existing team, unspoken assumptions in this area can create friction if they are not discussed.",
        },
        low: {
          pre_founder:
            "Commitment shows clear differences. This may strongly shape how you experience availability, intensity, and prioritization day to day, so it is worth clarifying openly before founding together.",
          existing_team:
            "Commitment shows clear differences. In everyday work, this can affect availability, intensity, and collaboration, so the team needs clear language and shared expectations around it.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Day to day, this may show up in different expectations around availability, a different sense of how central the startup should be, or different readings of intensity across phases.",
        existing_team:
          "Day to day, this often shows up when availability, level of effort, and priorities are understood differently or silently assumed.",
      },
      tensionCards: {
        startupPriority: {
          topic: "Startup priority",
          explanation:
            "Different assumptions about the role the startup should play compared with other life or work commitments.",
        },
        dayToDayCommitment: {
          topic: "Day-to-day commitment level",
          explanation:
            "Different expectations around how much time, energy, and presence the collaboration can reliably carry.",
        },
        handlingPressure: {
          topic: "Handling pressure",
          explanation:
            "Different views on how intense phases should be bounded, aligned, and scaled back again.",
        },
        focusAndSideProjects: {
          topic: "Focus and side projects",
          explanation:
            "Friction can emerge when one person expects clear startup priority while the other deliberately keeps room for additional work or life topics.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "What role should the startup play in your everyday work and life right now?",
          "How would you notice early that your expectations around effort and availability are diverging?",
          "How much focus on the company do you expect from each other, and what is realistic for both of you?",
          "How do you want to handle phases where pressure, energy, or capacity differ noticeably?",
        ],
        existing_team: [
          "Where do you already notice differences in level of effort, prioritization, or availability?",
          "Which unspoken expectations around commitment may already exist between you?",
          "How do you talk about changes in pressure or priorities?",
          "What do you need so commitment does not become a quiet source of friction?",
        ],
      },
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
