import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type JoinPageProps = {
  searchParams: Promise<{ sessionId?: string; inviteToken?: string; token?: string }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const sessionId = params.sessionId?.trim() ?? "";
  const inviteToken = params.inviteToken?.trim() ?? params.token?.trim() ?? "";

  if (!sessionId && !inviteToken) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Ungültiger Join-Link</h1>
          <p className="mt-2 text-sm text-slate-600">
            Es fehlt eine `sessionId` oder ein `inviteToken` in der URL.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextParams = new URLSearchParams();
    if (sessionId) nextParams.set("sessionId", sessionId);
    if (inviteToken) nextParams.set("inviteToken", inviteToken);
    redirect(`/login?next=${encodeURIComponent(`/join?${nextParams.toString()}`)}`);
  }

  let resolvedSessionId = sessionId;
  const useRelationshipAccept =
    (process.env.ENABLE_RELATIONSHIP_ACCEPT_FALLBACK ?? "true").toLowerCase() !== "false";

  if (inviteToken && useRelationshipAccept) {
    const { data: acceptRows, error: acceptError } = await supabase.rpc("accept_invitation", {
      p_token: inviteToken,
    });
    const accepted = Array.isArray(acceptRows) ? acceptRows[0] : acceptRows;

    if (!acceptError && accepted?.relationship_id) {
      if (accepted.session_id) {
        resolvedSessionId = String(accepted.session_id);
      }
      if (!resolvedSessionId) {
        redirect("/dashboard");
      }
    } else if (!resolvedSessionId) {
      return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-slate-900">Einladung ungültig</h1>
            <p className="mt-2 text-sm text-slate-600">
              Diese Einladung konnte nicht angenommen werden. Bitte fordere eine neue Einladung an.
            </p>
            {acceptError?.message ? (
              <p className="mt-2 text-xs text-slate-500">Hinweis: {acceptError.message}</p>
            ) : null}
          </div>
        </main>
      );
    }
  }

  if (!resolvedSessionId) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Session nicht verfügbar</h1>
          <p className="mt-2 text-sm text-slate-600">
            Für diese Einladung konnte keine Session ermittelt werden.
          </p>
        </div>
      </main>
    );
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", resolvedSessionId)
    .maybeSingle();

  if (!session) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Session nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-600">
            Bitte prüfe den Link oder fordere eine neue Einladung an.
          </p>
        </div>
      </main>
    );
  }

  const { data: existingMembership } = await supabase
    .from("participants")
    .select("id, role")
    .eq("session_id", resolvedSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMembership) {
    const { data: invitedSlots } = await supabase
      .from("participants")
      .select("id, created_at")
      .eq("session_id", resolvedSessionId)
      .in("role", ["B", "partner"])
      .is("user_id", null)
      .eq("invited_email", user.email?.toLowerCase() ?? "")
      .order("created_at", { ascending: false });

    const invitedSlot = (invitedSlots ?? [])[0] ?? null;

    if (!invitedSlot) {
      return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-slate-900">Einladung erforderlich</h1>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Link ist nicht (mehr) einer offenen Einladung für deine E-Mail-Adresse zugeordnet.
              Bitte fordere eine neue Einladung an.
            </p>
          </div>
        </main>
      );
    }

    const { error } = await supabase
      .from("participants")
      .update({ user_id: user.id })
      .eq("id", invitedSlot.id);

    if (error) {
      return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-slate-900">Join fehlgeschlagen</h1>
            <p className="mt-2 text-sm text-slate-600">{error.message}</p>
          </div>
        </main>
      );
    }
  }

  redirect(`/session/${resolvedSessionId}/b`);
}
