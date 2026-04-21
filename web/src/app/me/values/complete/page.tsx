import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestSubmittedAssessment } from "@/features/assessments/actions";
import { QuestionnaireCompletionShell } from "@/features/questionnaire/QuestionnaireCompletionShell";

export default async function MeValuesCompletePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/values/complete");
  }

  const submittedValues = await getLatestSubmittedAssessment("values");

  if (!submittedValues) {
    redirect("/me/values");
  }

  const { data: latestAcceptedInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("invitee_user_id", user.id)
    .eq("status", "accepted")
    .is("revoked_at", null)
    .order("accepted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const inviteCompletionId = (latestAcceptedInvite as { id?: string } | null)?.id?.trim() ?? "";
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
