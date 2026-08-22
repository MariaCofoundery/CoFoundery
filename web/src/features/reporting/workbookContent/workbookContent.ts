import type { AppLocale } from "@/i18n/config";
import { normalizeLocale } from "@/i18n/config";
import type {
  FounderAlignmentWorkbookDiscussionSignal,
  FounderAlignmentWorkbookStepDefinition,
  FounderAlignmentWorkbookStepId,
} from "@/features/reporting/founderAlignmentWorkbook";
import type { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import { WORKBOOK_CONTENT_DE } from "@/features/reporting/workbookContent/workbookContent.de";
import { WORKBOOK_CONTENT_EN } from "@/features/reporting/workbookContent/workbookContent.en";

export type PremiumWorkbookFieldGuidance = {
  question: string;
  collectHelper: string;
  agreementTitle: string;
  reviewSummary: string;
};

export type PremiumWorkbookWorkflowCopy = {
  readyText: string;
  advisorReadyText: string;
  missingPerspectiveText: (missingLabel: string) => string;
  approval: {
    title: string;
    intro: string;
    confirmButton: string;
    withdrawButton: string;
  };
  guidedFlow: {
    collectIntro: string;
    weightingIntro: string;
    ruleIntro: string;
  };
  reactionPresentation: {
    prompt: string;
    choiceHint: string;
    labels: Record<FounderAlignmentWorkbookDiscussionSignal, string>;
    missingLabel: string;
    legacy: {
      label: string;
      title: string;
      body: string;
    };
    observations: {
      missing: {
        title: string;
        body: string;
      };
      similar: {
        title: string;
        importantBody: string;
        agreeBody: string;
        furtherDiscussionBody: string;
      };
      different: {
        title: string;
        body: string;
        furtherDiscussionBody: string;
      };
    };
    counters: {
      similar: { label: string; body: string };
      different: { label: string; body: string };
      open: { label: string; body: string };
    };
  };
};

export type WorkbookContent = {
  steps: FounderAlignmentWorkbookStepDefinition[];
  stepContent: typeof WORKBOOK_STEP_CONTENT;
  premiumWorkflow: PremiumWorkbookWorkflowCopy;
  premiumSteps: Record<
    Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">,
    PremiumWorkbookFieldGuidance
  >;
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
