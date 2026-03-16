"use client";

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
  trackingContext?: {
    module: "base" | "values";
    invitationId?: string | null;
  };
};

export function ValuesQuestionnaire({
  assessmentId,
  questions,
  choices,
  responses,
  completeRedirect = "/dashboard?valuesStatus=completed",
  trackingContext,
}: Props) {
  return (
    <QuestionnaireClient
      assessmentId={assessmentId}
      title="Werte-Fragebogen"
      subtitle="Werte-Vertiefung"
      questions={questions}
      choices={choices}
      responses={responses}
      completeRedirect={completeRedirect}
      trackingContext={trackingContext}
    />
  );
}
