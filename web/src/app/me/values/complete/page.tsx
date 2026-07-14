import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLatestSubmittedAssessment } from "@/features/assessments/actions";
import { resolveActiveInvitationIdForCurrentUser } from "@/features/onboarding/invitationFlow";
import { QuestionnaireCompletionShell } from "@/features/questionnaire/QuestionnaireCompletionShell";

export default async function MeValuesCompletePage() {
  const t = await getTranslations("assessment.valuesComplete");
  const submittedValues = await getLatestSubmittedAssessment("values");

  if (!submittedValues) {
    redirect("/me/values");
  }

  const inviteCompletionId = (await resolveActiveInvitationIdForCurrentUser()) ?? "";
  if (inviteCompletionId) {
    redirect(`/invite/${encodeURIComponent(inviteCompletionId)}/done`);
  }

  return (
    <QuestionnaireCompletionShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      supportingText={t("supportingText")}
      highlight={t("highlight")}
      actions={[
        { href: "/me/report", label: t("actions.individualReport") },
        { href: "/dashboard", label: t("actions.dashboard"), variant: "secondary" },
      ]}
    />
  );
}
