"use client";

import { useTranslations } from "next-intl";
import {
  QuestionnaireClient,
  type QuestionnaireChoice,
  type QuestionnaireResponse,
} from "@/features/questionnaire/QuestionnaireClient";
import { type QuestionnaireQuestion } from "@/features/questionnaire/questionnaireShared";

type Props = {
  assessmentId: string;
  questions: QuestionnaireQuestion[];
  choices: QuestionnaireChoice[];
  responses: QuestionnaireResponse[];
  completeRedirect?: string;
  title?: string | null;
  subtitle?: string | null;
  trackingContext?: {
    module: "base" | "values";
    instrumentVersion?: string | null;
    invitationId?: string | null;
    teamContext?: "pre_founder" | "existing_team" | null;
  };
};

export function ValuesQuestionnaire({
  assessmentId,
  questions,
  choices,
  responses,
  completeRedirect = "/dashboard?valuesStatus=completed",
  title,
  subtitle,
  trackingContext,
}: Props) {
  const t = useTranslations("assessment.values");

  return (
    <QuestionnaireClient
      assessmentId={assessmentId}
      title={title ?? t("title")}
      subtitle={subtitle ?? t("subtitle")}
      questions={questions}
      choices={choices}
      responses={responses}
      completeRedirect={completeRedirect}
      trackingContext={trackingContext}
    />
  );
}
