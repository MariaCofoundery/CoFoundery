import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestSubmittedAssessment } from "@/features/assessments/actions";
import { QuestionnaireCompletionShell } from "@/features/questionnaire/QuestionnaireCompletionShell";

export default async function MeBaseCompletePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/base/complete");
  }

  const [submittedBase, submittedValues] = await Promise.all([
    getLatestSubmittedAssessment("base"),
    getLatestSubmittedAssessment("values"),
  ]);

  if (!submittedBase) {
    redirect("/me/base");
  }

  const valuesCompleted = Boolean(submittedValues);

  return (
    <QuestionnaireCompletionShell
      eyebrow="Basisprofil"
      title="Stark. Dein Basisprofil steht."
      description="Deine Antworten sind gespeichert und bilden jetzt die Grundlage für dein Founder-Profil. Du kannst direkt weitermachen oder dir zuerst schon deinen individuellen Report ansehen."
      supportingText={
        valuesCompleted
          ? "Dein Werteprofil ist bereits vorhanden. Damit ist dein Profil gerade besonders aussagekräftig."
          : "Das Werteprofil ist der nächste optionale Layer. Es macht sichtbar, welche inneren Prioritäten deine Entscheidungen als Founder prägen."
      }
      highlight={
        valuesCompleted
          ? "Alles Wichtige ist da: Basisprofil und Werteprofil sind beide verfügbar."
          : "Wenn du direkt weitermachst, ist das Werteprofil in wenigen Minuten abgeschlossen."
      }
      actions={
        valuesCompleted
          ? [
              { href: "/me/report", label: "Individuellen Report ansehen" },
              { href: "/dashboard", label: "Zum Dashboard", variant: "secondary" },
            ]
          : [
              { href: "/me/values", label: "Werteprofil starten" },
              { href: "/me/report", label: "Report jetzt ansehen", variant: "secondary" },
              { href: "/dashboard", label: "Später weitermachen", variant: "ghost" },
            ]
      }
    />
  );
}
