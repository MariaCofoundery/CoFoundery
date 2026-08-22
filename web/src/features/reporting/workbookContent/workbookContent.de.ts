import { FOUNDER_ALIGNMENT_WORKBOOK_STEPS } from "@/features/reporting/founderAlignmentWorkbook";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import type { WorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

export const WORKBOOK_CONTENT_DE: WorkbookContent = {
  steps: FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  stepContent: WORKBOOK_STEP_CONTENT,
  premiumWorkflow: {
    readyText:
      "Ihr habt beide eure Perspektive eingebracht. Im naechsten Schritt koennt ihr die Punkte gemeinsam einordnen.",
    advisorReadyText: "Beide Founder haben ihre Perspektive eingebracht.",
    missingPerspectiveText: (missingLabel) =>
      `Bevor ihr gemeinsam weiterarbeitet, fehlt noch die Perspektive von ${missingLabel}.`,
    approval: {
      title: "Diese Fassung bestaetigen",
      intro:
        "Prueft die aktuelle Fassung noch einmal. Bestaetigt sie, wenn sie das festhaelt, worauf ihr euch fuer diesen Punkt verstaendigt habt.",
      confirmButton: "Ich bestaetige diese Fassung",
      withdrawButton: "Bestaetigung zuruecknehmen",
    },
    guidedFlow: {
      collectIntro:
        "Bringt zunaechst eure Perspektiven ein. Ihr muesst euch hier noch nicht auf eine gemeinsame Formulierung einigen.",
      weightingIntro: "Schaut euch die eingebrachten Punkte an und ordnet sie jeweils fuer euch ein.",
      ruleIntro:
        "Formuliert anschliessend, was ihr fuer diesen Punkt konkret festhalten wollt. Die aktuelle Fassung soll eure Vereinbarung verstaendlich festhalten und kann spaeter angepasst werden.",
    },
    reactionPresentation: {
      prompt: "Wie moechtest du diesen Punkt im Moment einordnen?",
      choiceHint: "Waehle die Option, die am ehesten passt.",
      labels: {
        important: "Besonders wichtig",
        agree: "Kann so stehen",
        critical: "Weiter klaeren",
      },
      missingLabel: "Noch offen",
      legacy: {
        label: "Fruehere Einordnung",
        title: "Fruehere Einordnung vorhanden",
        body:
          "Mindestens eine Einordnung stammt aus einer frueheren Version. Bitte ordnet diesen Punkt erneut ein, damit eure aktuelle Einordnung eindeutig ist.",
      },
      observations: {
        missing: {
          title: "Einordnung noch offen",
          body: "Mindestens eine aktuelle Einordnung fehlt noch.",
        },
        similar: {
          title: "Aehnlich eingeordnet",
          importantBody: "Dieser Punkt ist euch beiden besonders wichtig.",
          agreeBody: "Dieser Punkt kann fuer euch beide aktuell so stehen.",
          furtherDiscussionBody: "Ihr moechtet diesen Punkt beide noch weiter klaeren.",
        },
        different: {
          title: "Unterschiedlich eingeordnet",
          body:
            "Ihr habt diesen Punkt unterschiedlich eingeordnet. Sprecht kurz darueber, was hinter euren jeweiligen Einordnungen steht.",
          furtherDiscussionBody: "Mindestens eine Person moechte diesen Punkt noch weiter klaeren.",
        },
      },
      counters: {
        similar: {
          label: "Aehnlich eingeordnet",
          body: "Beide aktuellen Einordnungen verwenden dieselbe Option.",
        },
        different: {
          label: "Unterschiedlich eingeordnet",
          body: "Beide aktuellen Einordnungen verwenden unterschiedliche Optionen.",
        },
        open: {
          label: "Noch offen",
          body: "Mindestens eine Einordnung fehlt oder stammt aus einer frueheren Version.",
        },
      },
    },
  },
  premiumSteps: {
    vision_direction: {
      question:
        "Welche Richtung wollt ihr mit dem Unternehmen verfolgen - und was ist euch dabei jeweils wichtig?",
      collectHelper: "Startet mit zwei oder drei klaren Prioritaets- oder Fokusbeobachtungen.",
      agreementTitle: "Richtungsregel",
      reviewSummary: "Review-Punkt optional ergaenzen",
    },
    roles_responsibility: {
      question: "Wie wollt ihr Rollen, Zustaendigkeiten und Verantwortung im Team verteilen?",
      collectHelper: "Ein guter Punkt nennt Thema, Fuehrung und wann die andere Person reinmuss.",
      agreementTitle: "Verantwortungsregel",
      reviewSummary: "Ownership-Signal optional ergaenzen",
    },
    decision_rules: {
      question: "Wie wollt ihr Entscheidungen treffen, besonders wenn ihr unterschiedlich urteilt?",
      collectHelper: "Startet mit zwei oder drei Punkten, nicht mit einem perfekten Text.",
      agreementTitle: "Entscheidungsregel",
      reviewSummary: "Review-Trigger optional ergaenzen",
    },
    commitment_load: {
      question:
        "Welche zeitliche Verfuegbarkeit und Arbeitsbelastung koennt und wollt ihr aktuell einbringen?",
      collectHelper:
        "Ein guter Punkt nennt Erwartung, Grenze oder fruehes Signal. Kein Rechtfertigungstext noetig.",
      agreementTitle: "Commitment-Regel",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
    },
    collaboration_conflict: {
      question:
        "Wie wollt ihr mit Meinungsverschiedenheiten, Spannungen oder schwierigen Situationen umgehen?",
      collectHelper: "Startet mit konkreten Situationen, nicht mit langen Erklaerungen.",
      agreementTitle: "Klaerungsregel",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
    },
    ownership_risk: {
      question:
        "Wie wollt ihr Verantwortung, Beteiligung und persoenliche oder finanzielle Risiken miteinander klaeren?",
      collectHelper: "Ein guter Punkt nennt Risiko, Schwelle und wer spaetestens dazu muss.",
      agreementTitle: "Fuehrungsregel fuer Risiken",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
    },
    values_guardrails: {
      question:
        "Welche Prinzipien, Grenzen oder Prioritaeten sollen euch bei wichtigen Entscheidungen Orientierung geben?",
      collectHelper: "Ein guter Punkt beschreibt einen echten Fall, keine abstrakte Werteformel.",
      agreementTitle: "Leitplankenregel",
      reviewSummary: "Prueffrage optional ergaenzen",
    },
    alignment_90_days: {
      question: "Worauf wollt ihr euch in den naechsten 90 Tagen konkret konzentrieren?",
      collectHelper:
        "Ein guter Punkt ist kein To-do, sondern eine Fokusentscheidung fuer die naechste Phase.",
      agreementTitle: "90-Tage-Fokus",
      reviewSummary: "Fortschritts- und Review-Punkt festlegen",
    },
  },
};
