import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { selectParticipantA, selectParticipantB } from "@/features/participants/selection";
import { createReportRunOnCompletion } from "@/features/reporting/actions";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${sessionId}`);
  }

  if (!user.email) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
          <h1 className="text-xl font-semibold text-[color:var(--ink)]">Invite nicht gueltig</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Dein Konto hat keine E-Mail-Adresse. Bitte nutze einen Magic Link Login.
          </p>
        </div>
      </main>
    );
  }

  const userEmail = user.email.toLowerCase();

  const { data: existingMembership } = await supabase
    .from("participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    redirect(`/session/${sessionId}/b`);
  }

  const { data: participantRows, error } = await supabase
    .from("participants")
    .select("id, role, user_id, invited_email, created_at")
    .eq("session_id", sessionId)
    .in("role", ["B", "partner"])
    .order("created_at", { ascending: false });

  const participant =
    (participantRows ?? []).find((row) => row.invited_email?.toLowerCase() === userEmail) ??
    (participantRows ?? [])[0] ??
    null;

  if (error || !participant) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
          <h1 className="text-xl font-semibold text-[color:var(--ink)]">Invite nicht gefunden</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Der Einladungslink ist ungueltig oder wurde entfernt.
          </p>
        </div>
      </main>
    );
  }

  if (participant.invited_email && participant.invited_email.toLowerCase() !== userEmail) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
          <h1 className="text-xl font-semibold text-[color:var(--ink)]">Falsche E-Mail</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Dieser Invite ist fuer {participant.invited_email} bestimmt.
          </p>
        </div>
      </main>
    );
  }

  if (!participant.user_id) {
    await supabase.from("participants").update({ user_id: user.id }).eq("id", participant.id);
  }

  async function applyExistingProfileAction(formData: FormData) {
    "use server";
    const sourceSessionId = String(formData.get("sourceSessionId") ?? "").trim();
    if (!sourceSessionId) {
      redirect(`/invite/${sessionId}`);
    }

    const innerSupabase = await createClient();
    const {
      data: { user: currentUser },
    } = await innerSupabase.auth.getUser();
    if (!currentUser) {
      redirect(`/login?next=/invite/${sessionId}`);
    }

    const [{ data: sourceMembership, error: sourceMembershipError }, { data: targetMembership, error: targetMembershipError }] =
      await Promise.all([
        innerSupabase
          .from("participants")
          .select("id, completed_at")
          .eq("session_id", sourceSessionId)
          .eq("user_id", currentUser.id)
          .maybeSingle(),
        innerSupabase
          .from("participants")
          .select("id, completed_at")
          .eq("session_id", sessionId)
          .eq("user_id", currentUser.id)
          .in("role", ["B", "partner"])
          .maybeSingle(),
      ]);

    if (sourceMembershipError || !sourceMembership?.id || targetMembershipError || !targetMembership?.id) {
      redirect(`/invite/${sessionId}`);
    }

    const [{ data: sourceResponses }, { data: sourceFreeText }] = await Promise.all([
      innerSupabase
        .from("responses")
        .select("question_id, choice_value")
        .eq("session_id", sourceSessionId)
        .eq("participant_id", sourceMembership.id),
      innerSupabase
        .from("free_text")
        .select("text")
        .eq("session_id", sourceSessionId)
        .eq("participant_id", sourceMembership.id)
        .maybeSingle(),
    ]);

    if (!sourceResponses || sourceResponses.length === 0) {
      redirect(`/invite/${sessionId}`);
    }

    const now = new Date().toISOString();
    await innerSupabase.from("responses").upsert(
      sourceResponses.map((row) => ({
        session_id: sessionId,
        participant_id: targetMembership.id,
        question_id: row.question_id,
        choice_value: row.choice_value,
        updated_at: now,
      })),
      { onConflict: "participant_id,question_id" }
    );

    if (sourceFreeText?.text) {
      await innerSupabase.from("free_text").upsert(
        {
          session_id: sessionId,
          participant_id: targetMembership.id,
          text: sourceFreeText.text,
          updated_at: now,
        },
        { onConflict: "participant_id" }
      );
    }

    await innerSupabase
      .from("participants")
      .update({ completed_at: now })
      .eq("id", targetMembership.id);

    const { data: targetParticipants } = await innerSupabase
      .from("participants")
      .select("id, role, user_id, invited_email, completed_at, created_at")
      .eq("session_id", sessionId);

    const participantA = selectParticipantA(targetParticipants ?? []);
    const participantB = selectParticipantB(targetParticipants ?? [], { primary: participantA });
    const nextStatus =
      participantA?.completed_at && participantB?.completed_at ? "match_ready" : "waiting";
    await innerSupabase.from("sessions").update({ status: nextStatus }).eq("id", sessionId);
    if (nextStatus === "match_ready") {
      await createReportRunOnCompletion(sessionId);
    }

    redirect("/dashboard");
  }

  const { data: reusableSourceRows } = await supabase
    .from("participants")
    .select("session_id, role, completed_at, created_at")
    .eq("user_id", user.id)
    .neq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const reusableSourceOptions = (reusableSourceRows ?? [])
    .filter((row) => Boolean(row.completed_at))
    .map((row) => ({
      sessionId: row.session_id,
      label: `${new Date(row.created_at ?? "").toLocaleDateString("de-DE")} · ${row.session_id.slice(0, 8)}`,
    }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
        <h1 className="text-xl font-semibold text-[color:var(--ink)]">Invite angenommen</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Du bist jetzt als Person B verknuepft. Du kannst den Fragebogen jetzt starten.
        </p>
        <div className="mt-4">
          <Link
            href={`/session/${sessionId}/b`}
            className="rounded-lg bg-[color:var(--ink)] px-4 py-2 text-sm text-white"
          >
            Zum Fragebogen
          </Link>
        </div>
        {reusableSourceOptions.length > 0 ? (
          <form action={applyExistingProfileAction} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.1em] text-slate-700">
              Oder bestehende Auswertung übernehmen
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Nutze eine frühere, bereits abgeschlossene Auswertung statt den Fragebogen erneut zu starten.
            </p>
            <select
              name="sourceSessionId"
              defaultValue={reusableSourceOptions[0]?.sessionId}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              {reusableSourceOptions.map((option) => (
                <option key={option.sessionId} value={option.sessionId}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-3 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800"
            >
              Bestehende Auswertung übernehmen
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
