import type { ReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";

export const REPORT_BUILDER_COPY_DE = {
  executiveSummary: {
    dimensionLabels: {
      Unternehmenslogik: "Unternehmenslogik",
      Entscheidungslogik: "Entscheidungslogik",
      Risikoorientierung: "Risikoorientierung",
      "Arbeitsstruktur & Zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
      Commitment: "Commitment",
      Konfliktstil: "Konfliktstil",
    },
    dimensionPrefix: {
      withDimension: "im Bereich {dimension}",
      fallback: "in eurer Zusammenarbeit",
    },
    headlines: {
      insufficientData: "Noch keine belastbare Gesamteinschaetzung",
      sharedBlindSpot: "Viel gemeinsame Basis mit stillen Watchpoints",
      strongBase: "Strategisch und operativ tragfaehige Basis",
      strategicCloseOperationalClarify: "Strategisch nah, operativ mit Klaerungsbedarf",
      everydayCloseStrategicTension: "Im Alltag anschlussfaehig, strategisch mit Spannungsfeld",
      highClarification: "Strategisch und operativ mit hohem Klaerungsbedarf",
      partial: "Teilweise tragfaehig, aber nicht in denselben Feldern",
    },
    intro: {
      fit: {
        insufficientData:
          "Die aktuelle Datenlage erlaubt noch keine belastbare Gesamteinschaetzung eurer Zusammenarbeit.",
        sharedBlindSpot:
          "Strategisch und im Arbeitsalltag habt ihr eine tragfaehige gemeinsame Basis.",
        strongBase:
          "Strategisch und im Arbeitsalltag habt ihr eine tragfaehige gemeinsame Basis.",
        strategicCloseOperationalClarify:
          "Strategisch seid ihr naeher beieinander als im Alltag; Reibung entsteht eher aus Zusammenarbeit als aus Richtung.",
        everydayCloseStrategicTension:
          "Im Alltag koennt ihr gut anschliessen, aber strategisch lest ihr zentrale Fragen noch nicht nach denselben Massstaeben.",
        highClarification:
          "Strategische Richtung und operative Zusammenarbeit brauchen beide deutlich mehr bewusste Klaerung.",
        partial: "Ihr habt belastbare Anknuepfungspunkte, aber nicht in denselben Feldern.",
      },
      strengthWithDimension: "Eine klare Staerke liegt derzeit {dimensionPrefix}.",
      strengthFallback: "Einige gemeinsame Staerken sind bereits gut erkennbar.",
      complementaryWithDimension:
        "Gerade Unterschiede {dimensionPrefix} koennen eine produktive Ergaenzung sein.",
      sharedBlindSpotWithDimension:
        "Besonders aufmerksam solltet ihr auf {dimensionPrefix} schauen, weil gemeinsame Tendenzen dort leicht still mitlaufen koennen.",
      sharedBlindSpotFallback:
        "Gerade Felder mit hoher gemeinsamer Naehe verdienen Aufmerksamkeit, damit aus Gleichlauf kein stiller Blind Spot wird.",
      tensionOppositeWithDimension:
        "Besonders aufmerksam solltet ihr auf die Abstimmung {dimensionPrefix} schauen.",
      tensionCoordinationWithDimension:
        "Besonders bewusst fuehren solltet ihr {dimensionPrefix}, weil dort wiederkehrende Koordination noetig wird.",
      tensionFallback: "Die wichtigsten Abstimmungsthemen wirken derzeit gut besprechbar.",
      closing: {
        preFounder:
          "Vor einer gemeinsamen Gruendung ist jetzt vor allem relevant, welche Unterschiede ihr gut nutzen koennt und was ihr vorher klar miteinander besprecht.",
        existingTeam:
          "Fuer eure bestehende Zusammenarbeit ist jetzt besonders relevant, was euch bereits traegt und an welchen Stellen eine klarere gemeinsame Linie entlastend wirken kann.",
      },
    },
    topMessages: {
      strength:
        "Staerke eurer Zusammenarbeit liegt aktuell vor allem {dimensionPrefix}: {title}",
      complementaryDynamic:
        "Ergaenzend wirkt bei euch besonders {dimensionPrefix}: {title}",
      tension:
        "Bewusst besprechen solltet ihr vor allem {dimensionPrefix}: {title}",
      sharedBlindSpotTension:
        "Aufmerksam beobachten solltet ihr vor allem {dimensionPrefix}: {title}",
    },
    fallbackFocus: [
      "Welche Erwartungen habt ihr an gemeinsame Verantwortung und Entscheidungswege?",
      "Wo braucht ihr frueh Klarheit, damit Zusammenarbeit unter Druck stabil bleibt?",
    ],
    focusPromptsByDimension: {
      Unternehmenslogik: [
        "Woran richtet ihr unternehmerische Entscheidungen aus: eher an strategischer Wirkung oder eher an Tragfähigkeit und Aufbau?",
        "Woran wuerdet ihr frueh merken, dass ihr Marktchance und Substanz nicht mehr gleich gewichtet?",
      ],
      Entscheidungslogik: [
        "Wie wollt ihr Entscheidungen treffen, wenn Tempo und Sorgfalt in Spannung geraten?",
        "Bei welchen Themen braucht ihr klare Entscheidungsrechte statt laengerer Abstimmung?",
      ],
      Risikoorientierung: [
        "Wo wollt ihr bewusst mutig sein und wo klare Sicherheitslinien ziehen?",
        "Wie nutzt ihr unterschiedliche Risikoperspektiven fuer bessere strategische Entscheidungen?",
      ],
      "Arbeitsstruktur & Zusammenarbeit": [
        "Wie eng wollt ihr im Alltag abgestimmt arbeiten und wo braucht ihr bewusst mehr Eigenraum?",
        "Wie sichtbar sollen Fortschritt, Entscheidungen und offene Punkte fuereinander sein?",
      ],
      Commitment: [
        "Welche Erwartungen habt ihr an Priorisierung, Verfuegbarkeit und Einsatzniveau im Alltag?",
        "Woran erkennt ihr frueh, wenn eure Arbeitsrealitaeten in Intensitaet oder Prioritaet auseinanderlaufen?",
      ],
      Konfliktstil: [
        "Wie wollt ihr Meinungsverschiedenheiten ansprechen, bevor sie sich verfestigen?",
        "Welche Regeln helfen euch, Spannung produktiv statt persoenlich zu verarbeiten?",
      ],
    },
    dynamicFocus: {
      complementaryFallback:
        "Welche Unterschiede sind fuer euch produktiv und welche brauchen klare Moderation?",
      protectStrengthPreFounder:
        "Was muesstet ihr bewusst schuetzen, damit eure aktuelle Staerke {dimensionPrefix} auch in der Gruendungsphase tragfaehig bleibt?",
      protectStrengthExistingTeam:
        "Wie koennt ihr eure aktuelle Staerke {dimensionPrefix} im Alltag gezielt stabil halten?",
    },
  },
  sections: {
    commitment: {
      dimension: "Commitment",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, welchen Stellenwert das Startup im Alltag haben soll und welches Einsatzniveau ihr erwartet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Fuer die Frage, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eure Zusammenarbeit tragen soll, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Frage, welchen Stellenwert das Startup im Alltag haben soll, seid ihr derzeit sehr nah beieinander. Das ist eine stabile Grundlage fuer eine moegliche Zusammenarbeit, weil Priorisierung und erwartetes Einsatzniveau aehnlich ausfallen.",
          existing_team:
            "In der Frage, wie stark das Startup im Alltag priorisiert wird, seid ihr derzeit sehr nah beieinander. Fuer die bestehende Zusammenarbeit ist das eine stabile Basis, weil Verfuegbarkeit und Intensitaet aehnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich in Prioritaet, Verfuegbarkeit oder Intensitaet Unterschiede abzeichnen. Fuer eine moegliche Zusammenarbeit ist das gut anschlussfaehig, solange diese Unterschiede frueh angesprochen werden.",
          existing_team:
            "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich bei Prioritaet, Verfuegbarkeit oder Intensitaet Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn Erwartungen im Alltag klar benannt bleiben.",
        },
        mixed: {
          pre_founder:
            "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfuegbarkeit oder dem erwarteten Einsatzniveau im Alltag. Vor einer gemeinsamen Zusammenarbeit lohnt es sich, darueber offen zu sprechen, bevor daraus stille Erwartungen entstehen.",
          existing_team:
            "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfuegbarkeit oder dem erwarteten Einsatzniveau im Alltag. Fuer ein bestehendes Team ist das ein Bereich, in dem unausgesprochene Annahmen schnell Reibung erzeugen koennen, wenn sie nicht besprochen werden.",
        },
        low: {
          pre_founder:
            "Beim Commitment liegen deutliche Unterschiede vor. Das kann sich spaeter stark darauf auswirken, wie ihr Verfuegbarkeit, Intensitaet und Priorisierung im Alltag erlebt. Vor einer gemeinsamen Gruendung lohnt sich hier eine sehr offene Klaerung.",
          existing_team:
            "Beim Commitment liegen deutliche Unterschiede vor. Im Alltag kann das Verfuegbarkeit, Intensitaet und Zusammenarbeit spuerbar beeinflussen. Fuer ein bestehendes Team ist das ein Thema, das klare Sprache und gemeinsame Erwartungen braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich viel Verfuegbarkeit erwartet, dem Startup einen anderen Stellenwert im Alltag gebt oder Intensitaet in verschiedenen Phasen nicht gleich einordnet.",
        existing_team:
          "Im Alltag merkt man das oft daran, dass Verfuegbarkeit, Einsatzniveau und Prioritaeten nicht gleich verstanden werden oder still vorausgesetzt wird, wie viel Fokus gerade selbstverstaendlich sein sollte.",
      },
      tensionCards: {
        startupPriority: {
          topic: "Prioritaet des Startups",
          explanation:
            "Unterschiedliche Vorstellungen darueber, welchen Stellenwert das Startup im Verhaeltnis zu anderen Lebens- oder Arbeitsthemen haben soll.",
        },
        dayToDayCommitment: {
          topic: "Einsatzniveau im Alltag",
          explanation:
            "Abweichende Erwartungen daran, wie viel Zeit, Energie und Praesenz eine Zusammenarbeit im Alltag tragen soll.",
        },
        handlingPressure: {
          topic: "Umgang mit Belastung",
          explanation:
            "Unterschiedliche Haltungen dazu, wie intensive Phasen begrenzt, abgestimmt und wieder heruntergefahren werden.",
        },
        focusAndSideProjects: {
          topic: "Fokus und Nebenprojekte",
          explanation:
            "Spannungen koennen entstehen, wenn eine Person klare Priorisierung des Startups erwartet, waehrend die andere bewusst Raum fuer weitere Themen oder Projekte behaelt.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Welche Rolle soll das Startup aktuell in eurem Alltag und in eurem Leben spielen?",
          "Woran wuerdet ihr merken, dass eure Erwartungen an Einsatz und Verfuegbarkeit auseinanderlaufen?",
          "Wie viel Fokus auf das Unternehmen erwartet ihr voneinander und was ist dabei fuer euch beide realistisch?",
          "Wie wollt ihr mit Phasen umgehen, in denen Belastung, Energie oder Kapazitaet spuerbar auseinandergehen?",
        ],
        existing_team: [
          "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Einsatzniveau, Priorisierung oder Verfuegbarkeit?",
          "Welche unausgesprochenen Erwartungen an Verbindlichkeit gibt es vielleicht schon zwischen euch?",
          "Wie sprecht ihr darueber, wenn Belastung oder Prioritaeten sich veraendern?",
          "Was braucht ihr, damit Commitment nicht zur stillen Reibungsquelle wird?",
        ],
      },
    },
  },
  enPilotExamples: {
    fallbackSummary:
      "Dieser Platzhalter bleibt deutsch, weil produktive englische Builder-Narrative noch nicht freigeschaltet sind.",
    focusPrompt:
      "Welche konkrete Abstimmung wuerde euch helfen, die naechste Entscheidung bewusster zu fuehren?",
    sectionInterpretation:
      "Diese Beispielzeile schuetzt den spaeteren Migrationspfad, ohne aktuelle Reporttexte zu veraendern.",
  },
} as const satisfies ReportBuilderCopy;
