import type { ReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";

export const REPORT_BUILDER_COPY_DE = {
  executiveSummary: {
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
