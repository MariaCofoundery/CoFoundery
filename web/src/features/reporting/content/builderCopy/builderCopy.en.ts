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
    vision: {
      dimension: "Unternehmenslogik",
      interpretations: {
        fallback: {
          pre_founder:
            "There is not enough reliable data yet to describe what should guide your entrepreneurial decisions together.",
          existing_team:
            "There is not enough reliable data yet to describe what should guide the company at its core.",
        },
        very_high: {
          pre_founder:
            "Your views on what should guide entrepreneurial decisions look very close. This can be a useful basis for exploring a founding team, because market opportunity, scale, and substance appear to be understood in similar ways.",
          existing_team:
            "Your views on what the company should be guided by look very close. For your existing collaboration, this can be a strong anchor because strategic impact and substance appear to fit together well.",
        },
        high: {
          pre_founder:
            "You seem to orient entrepreneurial decisions in a similar direction, even though some differences are visible. This is a good starting point if you discuss market logic, substance, and priorities early.",
          existing_team:
            "You appear to work from a similar company logic, even though some differences are visible. For your collaboration, this is a useful basis as long as those differences are discussed deliberately.",
        },
        mixed: {
          pre_founder:
            "There are visible differences in what should guide entrepreneurial decisions, for example around market opportunity, scale, or the weight of substance and company building. Before founding together, it is worth making these points explicit.",
          existing_team:
            "There are visible differences in what should guide the company, for example around market impact, scale, or how much substance should come before acceleration. For an existing team, this is an area that needs clear shared orientation.",
        },
        low: {
          pre_founder:
            "There are clear differences in what should guide entrepreneurial decisions. If you want to found together, discuss this openly before making the collaboration more binding.",
          existing_team:
            "There are clear differences in what should guide the company. For an existing team, this is a central area where shared priorities and decision criteria should be sharpened.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Day to day, this may show up in how you evaluate market opportunities or in different assumptions about whether impact and scale or substance and company building should take priority.",
        existing_team:
          "Day to day, this often shows up when you evaluate strategic opportunities differently or do not automatically apply the same criteria to growth, priorities, and company substance.",
      },
      tensionCards: {
        base: {
          topic: "Growth pace",
          explanation:
            "Different assumptions about how much market impact should come before structural company building can later show up in decisions about funding, hiring, or market expansion.",
        },
        extended: [
          {
            topic: "Commercial leverage or company building",
            explanation:
              "One person may orient decisions more strongly toward strategic leverage, while the other puts more weight on substance, build-up, and long-term viability.",
          },
          {
            topic: "Market opportunity vs substance",
            explanation:
              "One person may sort opportunities more by leverage and impact, while the other asks whether they truly strengthen the company being built.",
          },
        ],
        elevated: {
          topic: "Values vs market opportunity",
          explanation:
            "Different assumptions about which opportunities are worth pursuing strategically and where substance or company-building principles should set boundaries.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "What role should this company play in your lives five years from now, and what would matter most to you?",
          "How would you notice early that you are applying different criteria to entrepreneurial decisions despite sharing the same idea?",
          "What should carry more weight for you in trade-off moments: strategic impact, scale, or sustainable company building?",
          "When should market opportunity take priority, and when should substance or long-term viability guide the decision?",
        ],
        existing_team: [
          "Which criteria actually guide your most important entrepreneurial decisions today: impact, scale, or company building?",
          "How do you decide when adapting to the market makes sense without losing substance or viability?",
          "Where do your expectations around market impact, company building, or strategic priority currently differ most?",
          "Which decisions should you measure more deliberately against what the company is meant to be guided by?",
        ],
      },
    },
    decisionLogic: {
      dimension: "Entscheidungslogik",
      interpretations: {
        fallback: {
          pre_founder:
            "There is not enough reliable data yet to describe how you would make decisions and distribute responsibility.",
          existing_team:
            "There is not enough reliable data yet to describe how you make decisions and distribute responsibility in your collaboration.",
        },
        very_high: {
          pre_founder:
            "Your decision logic looks very close. This can create clarity for a potential collaboration because pace, review, and responsibility appear to be understood in similar ways.",
          existing_team:
            "Your decision logic looks very close. For your collaboration, this can create day-to-day clarity because pace, review, and responsibility appear to be understood in similar ways.",
        },
        high: {
          pre_founder:
            "You share a strong basis in how you make decisions, even if some differences around pace or review are visible. This can work well if you use those differences deliberately.",
          existing_team:
            "You share a strong basis in how you make decisions, even if differences around pace or review are visible. This can work well if you build those differences into your alignment routines.",
        },
        mixed: {
          pre_founder:
            "Your decision logic shows noticeably different preferences. This can be useful if one person brings more pace and the other more structure. Without clear agreements, it can also create friction.",
          existing_team:
            "Your decision logic shows noticeably different preferences. In day-to-day work, this can be useful if one person brings more pace and the other more structure. Without clear agreements, it can also create friction.",
        },
        low: {
          pre_founder:
            "Your decision logic shows clear differences around pace, decision criteria, responsibility, and alignment. If you want to found together, this area needs early agreements.",
          existing_team:
            "Your decision logic shows clear differences around pace, decision criteria, responsibility, and alignment. For an existing team, this area needs clearer orientation again.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Day to day, this may show up when you would decide at different speeds or need different levels of data, reassurance, or intuition before moving forward.",
        existing_team:
          "This often becomes visible when decisions need to be made under time pressure, responsibility has to be assigned, or you assess differently when something is sufficiently reviewed.",
      },
      tensionCards: {
        base: {
          topic: "Decision pace",
          explanation:
            "Different expectations about how quickly decisions should be made and when more review is useful.",
        },
        extended: [
          {
            topic: "Data vs intuition",
            explanation:
              "Friction can arise when one person relies more strongly on data and analysis while the other gives more weight to judgment or market feel.",
          },
          {
            topic: "Consensus vs clear ownership",
            explanation:
              "Different assumptions about whether important decisions should be carried jointly or clearly owned by one responsible person.",
          },
        ],
        elevated: {
          topic: "Decisions under uncertainty",
          explanation:
            "Different views on how much uncertainty is acceptable before committing to a direction.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "How quickly do you want to make strategic decisions when not all information is available?",
          "What should a good decision rely on for you: data, experience, intuition, or market feedback?",
          "Which decisions should you make together, and which ones should have clear ownership?",
          "How would you notice that you are reviewing too long or deciding too quickly?",
        ],
        existing_team: [
          "Where do you already notice differences in decision pace or need for review?",
          "Where do you need more shared alignment, and where would clearer ownership help more?",
          "How do you handle moments when data, experience, and intuition point in different directions?",
          "Which types of decisions should be handled more deliberately in the future?",
        ],
      },
    },
    riskOrientation: {
      dimension: "Risikoorientierung",
      interpretations: {
        fallback: {
          pre_founder:
            "There is not enough reliable data yet to describe how you would handle risk, uncertainty, and bold moves together.",
          existing_team:
            "There is not enough reliable data yet to describe how you handle risk, uncertainty, and bold moves in your collaboration.",
        },
        very_high: {
          pre_founder:
            "Your attitudes toward risk and uncertainty look very close. This can create clarity for a potential collaboration because risk, pace, and need for safety appear to be assessed in similar ways.",
          existing_team:
            "Your attitudes toward risk and uncertainty look very close. For your collaboration, this can create day-to-day clarity because risk, pace, and need for safety appear to be assessed in similar ways.",
        },
        high: {
          pre_founder:
            "You share a strong basis in risk orientation, even if differences around opportunity seeking or need for safety are visible. This can work well if you discuss those differences deliberately.",
          existing_team:
            "You share a strong basis in risk orientation, even if differences around opportunity seeking or need for safety are visible. This can work well if you make those differences explicit.",
        },
        mixed: {
          pre_founder:
            "Your risk orientation shows noticeably different perspectives on risk and uncertainty. This can be useful if one person drives opportunities and the other helps safeguard them. Without deliberate alignment, it can also create tension.",
          existing_team:
            "Your risk orientation shows noticeably different perspectives on risk and uncertainty. In day-to-day work, this can be useful if one person drives opportunities and the other helps safeguard them. Without deliberate alignment, it can also create tension.",
        },
        low: {
          pre_founder:
            "Your risk orientation shows clear differences around uncertainty, growth, pace, and bold moves. If you want to found together, this area should be discussed openly early.",
          existing_team:
            "Your risk orientation shows clear differences around uncertainty, growth, pace, and bold moves. For an existing team, this area should be brought back into clearer shared language.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Day to day, this may show up when one person would test or launch earlier while the other wants more clarity, data, or financial safeguards first.",
        existing_team:
          "Day to day, this often shows up in how you prepare launches, tolerate uncertainty, or move at different speeds around funding and growth.",
      },
      tensionCards: {
        base: {
          topic: "Experiment pace",
          explanation:
            "Different assumptions about how early ideas should be tested or products should be brought to market.",
        },
        extended: [
          {
            topic: "Handling uncertainty",
            explanation:
              "Different views on how much ambiguity is workable before a decision or next step feels useful.",
          },
          {
            topic: "Financial risk appetite",
            explanation:
              "Friction can arise when one person would accept noticeably more financial risk than the other.",
          },
        ],
        elevated: {
          topic: "Growth vs safeguards",
          explanation:
            "Different assessments of when an opportunity should be pursued boldly and when more safeguards are needed.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "How much uncertainty feels productive to you, and when does it become too much?",
          "When should an idea be tested early in the market, and when is more safeguarding useful?",
          "Which kinds of risk would you take deliberately, and which ones would you avoid?",
          "How would you notice that one person is pushing too hard or the other is slowing too much?",
        ],
        existing_team: [
          "Where do you already notice differences in risk appetite or need for safety?",
          "Where does your different perspective help you, and where does it slow you down?",
          "How do you decide when to move boldly and when to safeguard deliberately?",
          "Which financial or strategic risks should you assess more clearly together in the future?",
        ],
      },
    },
    workStructure: {
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      interpretations: {
        fallback: {
          pre_founder:
            "There is not enough reliable data yet to describe how closely you would work together day to day or how much ongoing coordination you would need.",
          existing_team:
            "There is not enough reliable data yet to describe how closely you work together day to day or how much ongoing coordination you need.",
        },
        very_high: {
          pre_founder:
            "Your views on autonomy and close coordination in day-to-day work look very close. This can be a strong basis because your working mode would not need to be renegotiated constantly.",
          existing_team:
            "Your views on autonomy and close coordination in day-to-day work look very close. For your collaboration, this can be a strong basis because your working mode does not need to be renegotiated constantly.",
        },
        high: {
          pre_founder:
            "You share a strong basis around preferred working mode, even if differences around coordination or autonomy are visible. This can work well if you make those differences explicit.",
          existing_team:
            "You share a strong basis around preferred working mode, even if differences around coordination or autonomy are visible. This can work well if you make those differences explicit.",
        },
        mixed: {
          pre_founder:
            "Your views on how closely you want to work together day to day show noticeable differences. This can be useful if you use it deliberately. Without clear expectations, it can create small recurring friction.",
          existing_team:
            "Your views on how closely you want to work together day to day show noticeable differences. In day-to-day work, this can be useful if you use it deliberately. Without clear expectations, it can create small recurring friction.",
        },
        low: {
          pre_founder:
            "Your views on how closely day-to-day work should be coupled show clear differences. This affects coordination, visibility, and the exchange around ongoing work. If you want to found together, this area needs concrete rules early.",
          existing_team:
            "Your views on how closely day-to-day work should be coupled show clear differences. This affects coordination, visibility, and the exchange around ongoing work. For an existing team, this area needs concrete rules again.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Day to day, this may show up in different needs for feedback loops, different timing around sharing work in progress, or different expectations for how tightly collaboration should be organized.",
        existing_team:
          "Day to day, this often becomes visible when different expectations around check-ins, visibility, and ongoing exchange meet each other.",
      },
      tensionCards: {
        base: {
          topic: "Coordination needs",
          explanation:
            "Different expectations about how closely you should coordinate day to day and how much ongoing feedback loop each person needs.",
        },
        extended: [
          {
            topic: "Visibility of progress and open points",
            explanation:
              "Friction can arise when one person wants to share interim progress early while the other prefers to work more autonomously before making something visible.",
          },
          {
            topic: "Handoffs and feedback loops",
            explanation:
              "Different assumptions about how often you should reconnect and when ongoing work should be recalibrated together.",
          },
        ],
        elevated: {
          topic: "Day-to-day work coupling",
          explanation:
            "Different expectations around how closely you want to stay connected on progress, decisions, and open points over time.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "How closely do you want to coordinate day to day without slowing each other down?",
          "How visible should progress, open points, and interim states be to the other person?",
          "Where is focused alignment enough, and where do you need ongoing feedback loops?",
          "How would you notice that your collaboration is too tightly or too loosely coupled?",
        ],
        existing_team: [
          "Where do you already notice differences in coordination, visibility, or autonomy?",
          "Where do you need more ongoing feedback loops, and where would less coupling make work easier?",
          "Which kind of visibility around progress or open points actually helps, and where does it feel too tight?",
          "What would make your shared working mode noticeably easier in practice?",
        ],
      },
    },
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
        base: {
          topic: "Startup priority",
          explanation:
            "Different assumptions about the role the startup should play compared with other life or work commitments.",
        },
        extended: [
          {
            topic: "Day-to-day commitment level",
            explanation:
              "Different expectations around how much time, energy, and presence the collaboration can reliably carry.",
          },
          {
            topic: "Handling pressure",
            explanation:
              "Different views on how intense phases should be bounded, aligned, and scaled back again.",
          },
        ],
        elevated: {
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
    conflictStyle: {
      dimension: "Konfliktstil",
      interpretations: {
        fallback: {
          pre_founder:
            "There is not enough reliable data yet to describe how you would handle tension, feedback, and disagreement together.",
          existing_team:
            "There is not enough reliable data yet to describe how you handle tension, feedback, and disagreement in your collaboration.",
        },
        very_high: {
          pre_founder:
            "Your ways of handling tension, feedback, and disagreement look very close. This can be a stabilizing factor for a potential founding team because irritation and clarification are understood in similar ways.",
          existing_team:
            "Your ways of handling tension, feedback, and disagreement look very close. For your existing collaboration, this can be stabilizing because friction and clarification are understood in similar ways.",
        },
        high: {
          pre_founder:
            "You share a strong basis in conflict style, even if some differences are visible. This can work well if the way you handle each other is discussed early, not only the topics themselves.",
          existing_team:
            "You share a strong basis in conflict style, even if differences in style are visible. This can work well if you keep both the topic and the way you handle each other in view.",
        },
        mixed: {
          pre_founder:
            "Your conflict style shows visible differences in how tension is raised and processed. This can be useful, but it can also create friction if each person treats their own style as obvious.",
          existing_team:
            "Your conflict style shows visible differences in how tension is raised and processed. In day-to-day work, this can be useful, but it can also create friction when expectations around timing, directness, or clarification remain implicit.",
        },
        low: {
          pre_founder:
            "Your conflict style shows clear differences. If you want to found together, misunderstandings may later come more from how topics are handled than from the topics themselves.",
          existing_team:
            "Your conflict style shows clear differences. For an existing team, misunderstandings may come less from the topic itself than from how tension is raised, carried, or avoided.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Day to day, this may show up when one person would raise irritation immediately while the other needs distance first, or when directness is experienced very differently.",
        existing_team:
          "This often becomes visible when feedback is given, small irritations are raised early or late, and you experience differently how direct clarification should be.",
      },
      tensionCards: {
        base: {
          topic: "Feedback timing",
          explanation:
            "Different assumptions about whether problems should be raised immediately or reflected on with some distance first.",
        },
        extended: [
          {
            topic: "Directness in communication",
            explanation:
              "One person may prefer very clear and immediate feedback, while the other pays more attention to tone, context, or the relationship.",
          },
          {
            topic: "Handling disagreement",
            explanation:
              "Friction can arise when one person experiences disagreement as productive while the other puts more weight on calm, balance, or de-escalation.",
          },
        ],
        elevated: {
          topic: "Learning from mistakes",
          explanation:
            "Different expectations around how openly mistakes should be named, analyzed, and discussed in the team.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "How quickly do you want to raise tension or irritation?",
          "What does fair and useful feedback mean to each of you?",
          "How would you notice that a conflict is no longer about the topic but becoming personal?",
          "Which kind of directness feels useful to you, and which kind does not?",
        ],
        existing_team: [
          "Where do your expectations around feedback timing and directness already differ in day-to-day work?",
          "Which conflicts do you raise early, and which ones tend to come too late?",
          "How do you want to handle it when one person can tolerate more friction than the other?",
          "What do you need so feedback creates clarity without adding unnecessary relationship tension?",
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
