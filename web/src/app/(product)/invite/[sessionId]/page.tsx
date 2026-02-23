import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, invitee_email, status, created_at, expires_at, accepted_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !invitation) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-900">Einladung nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-600">Diese Einladung ist nicht verfügbar.</p>
          <a
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            Zum Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Einladung</h1>
        <p className="mt-2 text-sm text-slate-600">E-Mail: {invitation.invitee_email}</p>
        <p className="mt-1 text-sm text-slate-600">Status: {invitation.status}</p>
        <p className="mt-1 text-xs text-slate-500">Erstellt: {formatDate(invitation.created_at)}</p>
        <p className="mt-1 text-xs text-slate-500">Ablauf: {formatDate(invitation.expires_at)}</p>
        {invitation.accepted_at ? (
          <p className="mt-1 text-xs text-slate-500">Angenommen: {formatDate(invitation.accepted_at)}</p>
        ) : null}
        <p className="mt-4 text-sm text-slate-700">
          TEMP: Der alte Session-basierte Invite-Flow ist deaktiviert. Einladungen werden über `/join?token=...`
          angenommen.
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Zum Dashboard
        </a>
      </div>
    </main>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}
