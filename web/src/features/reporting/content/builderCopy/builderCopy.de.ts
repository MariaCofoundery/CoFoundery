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
  enPilotExamples: {
    fallbackSummary:
      "Dieser Platzhalter bleibt deutsch, weil produktive englische Builder-Narrative noch nicht freigeschaltet sind.",
    focusPrompt:
      "Welche konkrete Abstimmung wuerde euch helfen, die naechste Entscheidung bewusster zu fuehren?",
    sectionInterpretation:
      "Diese Beispielzeile schuetzt den spaeteren Migrationspfad, ohne aktuelle Reporttexte zu veraendern.",
  },
} as const satisfies ReportBuilderCopy;
