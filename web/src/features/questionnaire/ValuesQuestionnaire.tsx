"use client";

import {
  QuestionnaireClient,
  type QuestionnaireChoice,
  type QuestionnaireQuestion,
  type QuestionnaireResponse,
} from "@/features/questionnaire/QuestionnaireClient";

type Props = {
  assessmentId: string;
  questions: QuestionnaireQuestion[];
  choices: QuestionnaireChoice[];
  responses: QuestionnaireResponse[];
  completeRedirect?: string;
};

export function ValuesQuestionnaire({
  assessmentId,
  questions,
  choices,
  responses,
  completeRedirect = "/dashboard?valuesStatus=completed",
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
    />
  );
}
