import { redirect } from "next/navigation";
import { getLatestSubmittedAssessment } from "@/features/assessments/actions";
import { resolveActiveInvitationIdForCurrentUser } from "@/features/onboarding/invitationFlow";
import { QuestionnaireCompletionShell } from "@/features/questionnaire/QuestionnaireCompletionShell";

export default async function MeValuesCompletePage() {
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
      eyebrow="Werteprofil"
      title="Sehr gut. Dein Werteprofil ist komplett."
      description="Damit ist jetzt auch der zweite Profil-Layer ausgefüllt. Dein Report kann nicht nur zeigen, wie du als Founder arbeitest, sondern auch, welche Leitplanken und Prioritäten deine Entscheidungen mitprägen."
      supportingText="Gerade im späteren Matching, im Gespräch und im Workbook ist das oft der Teil, der die spannendsten Unterschiede sichtbar macht."
      highlight="Basisprofil und Werteprofil greifen jetzt sauber ineinander."
      actions={[
        { href: "/me/report", label: "Individuellen Report ansehen" },
        { href: "/dashboard", label: "Zum Dashboard", variant: "secondary" },
      ]}
    />
  );
}
