import type { AppLocale } from "@/i18n/config";
import { normalizeLocale } from "@/i18n/config";
import type {
  FounderAlignmentWorkbookStepDefinition,
  FounderAlignmentWorkbookStepId,
} from "@/features/reporting/founderAlignmentWorkbook";
import type { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import { WORKBOOK_CONTENT_DE } from "@/features/reporting/workbookContent/workbookContent.de";
import { WORKBOOK_CONTENT_EN } from "@/features/reporting/workbookContent/workbookContent.en";

export type WorkbookContent = {
  steps: FounderAlignmentWorkbookStepDefinition[];
  stepContent: typeof WORKBOOK_STEP_CONTENT;
};

const workbookContentByLocale: Record<AppLocale, WorkbookContent> = {
  de: WORKBOOK_CONTENT_DE,
  en: WORKBOOK_CONTENT_EN,
};

export function getWorkbookContent(locale: string | null | undefined): WorkbookContent {
  return workbookContentByLocale[normalizeLocale(locale)] ?? WORKBOOK_CONTENT_DE;
}

export function resolveWorkbookContentSteps(
  content: WorkbookContent,
  includeValuesStep: boolean,
  includeAdvisorStep = false
) {
  return content.steps.filter((step) => {
    if (!includeValuesStep && step.id === "values_guardrails") {
      return false;
    }

    if (!includeAdvisorStep && step.id === "advisor_closing") {
      return false;
    }

    return true;
  });
}

export function getWorkbookContentStep(
  content: WorkbookContent,
  stepId: FounderAlignmentWorkbookStepId
) {
  return content.steps.find((step) => step.id === stepId) ?? WORKBOOK_CONTENT_DE.steps[0];
}
