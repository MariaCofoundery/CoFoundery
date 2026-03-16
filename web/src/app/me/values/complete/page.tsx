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

  return (
    <QuestionnaireCompletionShell
      eyebrow="Werteprofil"
      title="Sehr gut. Dein Werteprofil ist komplett."
      description="Damit ist jetzt auch der zweite Profil-Layer ausgefuellt. Dein Report kann nicht nur zeigen, wie du als Founder arbeitest, sondern auch, welche Leitplanken und Prioritaeten deine Entscheidungen mitpraegen."
      supportingText="Gerade im spaeteren Matching, im Gespraech und im Workbook ist das oft der Teil, der die spannendsten Unterschiede sichtbar macht."
      highlight="Basisprofil und Werteprofil greifen jetzt sauber ineinander."
      actions={[
        { href: "/me/report", label: "Individuellen Report ansehen" },
        { href: "/dashboard", label: "Zum Dashboard", variant: "secondary" },
      ]}
    />
  );
}
