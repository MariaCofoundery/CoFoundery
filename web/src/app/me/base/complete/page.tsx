import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLatestSubmittedAssessment } from "@/features/assessments/actions";
import { resolveActiveInvitationIdForCurrentUser } from "@/features/onboarding/invitationFlow";
import { QuestionnaireCompletionShell } from "@/features/questionnaire/QuestionnaireCompletionShell";

export default async function MeBaseCompletePage() {
  const t = await getTranslations("assessment.baseComplete");
  const [submittedBase, submittedValues] = await Promise.all([
    getLatestSubmittedAssessment("base"),
    getLatestSubmittedAssessment("values"),
  ]);

  if (!submittedBase) {
    redirect("/me/base");
  }

  const inviteCompletionId = (await resolveActiveInvitationIdForCurrentUser()) ?? "";
  if (inviteCompletionId) {
    redirect(`/invite/${encodeURIComponent(inviteCompletionId)}/done`);
  }

  const valuesCompleted = Boolean(submittedValues);

  return (
    <QuestionnaireCompletionShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      supportingText={
        valuesCompleted
          ? t("supportingText.valuesCompleted")
          : t("supportingText.valuesMissing")
      }
      highlight={
        valuesCompleted
          ? t("highlight.valuesCompleted")
          : t("highlight.valuesMissing")
      }
      actions={
        valuesCompleted
          ? [
              { href: "/me/report", label: t("actions.individualReport") },
              { href: "/dashboard", label: t("actions.dashboard"), variant: "secondary" },
            ]
          : [
              { href: "/me/values", label: t("actions.startValues") },
              { href: "/me/report", label: t("actions.viewReportNow"), variant: "secondary" },
              { href: "/dashboard", label: t("actions.continueLater"), variant: "ghost" },
            ]
      }
    />
  );
}
