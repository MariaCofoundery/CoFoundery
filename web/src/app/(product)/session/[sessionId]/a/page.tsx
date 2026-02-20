import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getParticipantA,
  listQuestions,
} from "@/features/questionnaire/actions";
import { DisplayNameStep } from "@/features/questionnaire/DisplayNameStep";
import { QuestionnaireClient } from "@/features/questionnaire/QuestionnaireClient";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ParticipantAPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { participant, error } = await getParticipantA(sessionId);

  if (error || !participant) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
          <h1 className="text-xl font-semibold text-[color:var(--ink)]">
            Zugriff nicht möglich
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Du bist nicht als Person A für diese Session registriert.
          </p>
        </div>
      </main>
    );
  }

  if (!participant.display_name) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <DisplayNameStep sessionId={sessionId} />
      </main>
    );
  }

  const { questions, choices, error: listError } = await listQuestions();

  if (listError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
          Fehler beim Laden der Fragen.
        </div>
      </main>
    );
  }

  const { data: responses } = await supabase
    .from("responses")
    .select("question_id, choice_value")
    .eq("participant_id", participant.id);

  const { data: freeText } = await supabase
    .from("free_text")
    .select("text")
    .eq("participant_id", participant.id)
    .maybeSingle();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <QuestionnaireClient
        sessionId={sessionId}
        displayName={participant.display_name ?? "Teilnehmer"}
        questions={questions}
        choices={choices}
        responses={responses ?? []}
        freeText={freeText?.text ?? null}
        completedAt={participant.completed_at}
      />
    </main>
  );
}
