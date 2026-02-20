import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ValuesQuestionnaire } from "@/features/questionnaire/ValuesQuestionnaire";
import { upsertResponse } from "@/features/questionnaire/actions";
import { upsertResponseB } from "@/features/questionnaire/actionsB";
import {
  buildResponseCountByParticipant,
  selectParticipantA,
  selectParticipantB,
} from "@/features/participants/selection";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ValuesQuestionnairePage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/session/${sessionId}/values`);
  }

  const { data: myParticipantRows } = await supabase
    .from("participants")
    .select("id, role, user_id, invited_email, completed_at, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  const participantRows = myParticipantRows ?? [];
  let me = participantRows[0] ?? null;
  if (participantRows.length > 1) {
    const participantIds = participantRows.map((row) => row.id);
    const { data: responseRows } = await supabase
      .from("responses")
      .select("participant_id")
      .eq("session_id", sessionId)
      .in("participant_id", participantIds);

    const responseCountByParticipant = buildResponseCountByParticipant(responseRows ?? []);
    const participantA = selectParticipantA(participantRows, { responseCountByParticipant });
    const participantB = selectParticipantB(participantRows, {
      primary: participantA,
      responseCountByParticipant,
    });
    me = participantB ?? participantA ?? participantRows[0] ?? null;
  }

  if (!me) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h1 className="text-xl font-semibold text-slate-900">Zugriff nicht möglich</h1>
          <p className="mt-3 text-sm text-slate-600">
            Du bist nicht als Teilnehmer:in dieser Session registriert.
          </p>
        </section>
      </main>
    );
  }

  const onSaveResponse =
    me.role === "B" || me.role === "partner" ? upsertResponseB : upsertResponse;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <div className="mb-5 flex items-center justify-between">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium tracking-[0.1em] text-slate-700"
        >
          Zurück zum Dashboard
        </a>
      </div>
      <ValuesQuestionnaire
        sessionId={sessionId}
        participantId={me.id}
        onSaveResponse={onSaveResponse}
      />
    </main>
  );
}
