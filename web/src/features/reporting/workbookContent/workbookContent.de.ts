import { FOUNDER_ALIGNMENT_WORKBOOK_STEPS } from "@/features/reporting/founderAlignmentWorkbook";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import type { WorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

export const WORKBOOK_CONTENT_DE: WorkbookContent = {
  steps: FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  stepContent: WORKBOOK_STEP_CONTENT,
  premiumSteps: {
    vision_direction: {
      collectHelper: "Startet mit zwei oder drei klaren Prioritaets- oder Fokusbeobachtungen.",
      agreementTitle: "Richtungsregel",
      reviewSummary: "Review-Punkt optional ergaenzen",
    },
    roles_responsibility: {
      collectHelper: "Ein guter Punkt nennt Thema, Fuehrung und wann die andere Person reinmuss.",
      agreementTitle: "Verantwortungsregel",
      reviewSummary: "Ownership-Signal optional ergaenzen",
    },
    decision_rules: {
      collectHelper: "Startet mit zwei oder drei Punkten, nicht mit einem perfekten Text.",
      agreementTitle: "Entscheidungsregel",
      reviewSummary: "Review-Trigger optional ergaenzen",
    },
    commitment_load: {
      collectHelper:
        "Ein guter Punkt nennt Erwartung, Grenze oder fruehes Signal. Kein Rechtfertigungstext noetig.",
      agreementTitle: "Commitment-Regel",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
    },
    collaboration_conflict: {
      collectHelper: "Startet mit konkreten Situationen, nicht mit langen Erklaerungen.",
      agreementTitle: "Klaerungsregel",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
    },
    ownership_risk: {
      collectHelper: "Ein guter Punkt nennt Risiko, Schwelle und wer spaetestens dazu muss.",
      agreementTitle: "Fuehrungsregel fuer Risiken",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
    },
    values_guardrails: {
      collectHelper: "Ein guter Punkt beschreibt einen echten Fall, keine abstrakte Werteformel.",
      agreementTitle: "Leitplankenregel",
      reviewSummary: "Prueffrage optional ergaenzen",
    },
    alignment_90_days: {
      collectHelper:
        "Ein guter Punkt ist kein To-do, sondern eine Fokusentscheidung fuer die naechste Phase.",
      agreementTitle: "90-Tage-Fokus",
      reviewSummary: "Fortschritts- und Review-Punkt festlegen",
    },
  },
};
