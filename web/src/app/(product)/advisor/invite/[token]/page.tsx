import Link from "next/link";
import { redirect } from "next/navigation";
import {
  claimFounderAlignmentAdvisorAccess,
  getFounderAlignmentAdvisorInviteByToken,
} from "@/features/reporting/founderAlignmentWorkbookActions";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

function teamContextLabel(teamContext: "pre_founder" | "existing_team") {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder";
}

function statusChip(ready: boolean, readyLabel: string, pendingLabel: string) {
  return ready ? readyLabel : pendingLabel;
}

export default async function AdvisorInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token: rawToken } = await params;
  const resolvedSearchParams = await searchParams;
  const token = rawToken?.trim() ?? "";
  const invite = await getFounderAlignmentAdvisorInviteByToken(token);
  const actionError =
    resolvedSearchParams.error === "already_claimed"
      ? "Dieser Advisor-Link ist bereits mit einem anderen Profil verknüpft."
      : resolvedSearchParams.error === "invalid_token"
        ? "Der Advisor-Link konnte nicht bestätigt werden."
        : resolvedSearchParams.error === "update_failed"
          ? "Die Verknüpfung konnte gerade nicht gespeichert werden."
          : null;

  if (invite.status !== "ready") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Advisor-Einladung</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            Einladung nicht gefunden
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
            Dieser Advisor-Link ist nicht mehr gültig oder konnte keinem Team zugeordnet werden.
          </p>
          <div className="mt-8">
            <Link href="/login" className={SECONDARY_CTA_CLASS}>
              Zur Anmeldung
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const inviteData = invite;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/login?next=${encodeURIComponent(`/advisor/invite/${token}`)}`;
  const isLinkedToOtherUser = Boolean(
    user?.id && inviteData.advisorUserId && inviteData.advisorUserId !== user.id
  );
  const canClaim = Boolean(user?.id && !inviteData.advisorUserId);

  async function claimAction() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(loginHref);
    }

    const result = await claimFounderAlignmentAdvisorAccess({
      invitationId: inviteData.invitationId,
      advisorToken: token,
      userId: user.id,
      fallbackName: user.email?.split("@")[0] ?? null,
    });

    if (!result.ok) {
      redirect(`/advisor/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.reason)}`);
    }

    redirect("/advisor/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 md:px-10">
      <section className="rounded-[36px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Advisor-Einladung
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
              {inviteData.founderAName} x {inviteData.founderBName}
            </h1>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex rounded-full border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/7 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {teamContextLabel(inviteData.teamContext)}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {inviteData.reportReady
                  ? "Founder-Report vorhanden"
                  : "Founder-Report in Vorbereitung"}
              </span>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              Als Advisor siehst du den Founder-Snapshot, die Fokusfelder und das Alignment
              Workbook. Rohantworten der Assessments bleiben dabei geschützt.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Deine Rolle ist eine strukturierte Außenperspektive: Beobachtungen festhalten,
              Rückfragen ergänzen und nächste sinnvolle Schritte mitgeben.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Status</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <StatusRow
                label="Founder-Freigaben"
                value={
                  inviteData.founderAApproved && inviteData.founderBApproved
                    ? "beide bestätigt"
                    : "noch nicht vollständig"
                }
              />
              <StatusRow
                label="Base Assessments"
                value={statusChip(inviteData.reportReady, "auswertbar", "noch in Arbeit")}
              />
              <StatusRow
                label="Founder-Report"
                value={statusChip(inviteData.reportReady, "verfügbar", "noch nicht bereit")}
              />
              <StatusRow
                label="Workbook"
                value={statusChip(inviteData.workbookReady, "zugänglich", "wird freigeschaltet")}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dein Einstieg</p>
            {actionError ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </p>
            ) : null}
            {isLinkedToOtherUser ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  Diese Einladung ist bereits verknüpft
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Der Advisor-Link wurde schon mit einem anderen Profil verbunden. Wenn das nicht
                  beabsichtigt war, braucht ihr einen neuen Advisor-Link aus dem Workbook.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/advisor/dashboard" className={SECONDARY_CTA_CLASS}>
                    Zum Advisor Dashboard
                  </Link>
                </div>
              </>
            ) : !user ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  Mit deinem Profil verknüpfen
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Melde dich an, damit dein Advisor-Profil sauber mit diesem Team verknüpft werden
                  kann. Danach landest du direkt im Advisor-Bereich.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={loginHref} className={PRIMARY_CTA_CLASS}>
                    Login / Profil verknüpfen
                  </Link>
                </div>
              </>
            ) : canClaim ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  Advisor-Zugriff jetzt aktivieren
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Dein Profil ist angemeldet. Mit einem Klick verknüpfst du dich als Advisor mit
                  diesem Team und bekommst Zugriff auf Snapshot, Fokusfelder und Workbook.
                </p>
                <form action={claimAction} className="mt-6 flex flex-wrap gap-3">
                  <button type="submit" className={PRIMARY_CTA_CLASS}>
                    Profil verknüpfen
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  Advisor-Zugriff ist aktiv
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Dein Profil ist bereits mit diesem Team verknüpft. Du kannst direkt ins Advisor
                  Dashboard wechseln oder sofort ins Workbook springen.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/advisor/dashboard" className={PRIMARY_CTA_CLASS}>
                    Weiter zum Dashboard
                  </Link>
                  <Link
                    href={`/founder-alignment/workbook?invitationId=${encodeURIComponent(inviteData.invitationId)}&teamContext=${encodeURIComponent(inviteData.teamContext)}`}
                    className={SECONDARY_CTA_CLASS}
                  >
                    Workbook öffnen
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/6 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Was du als Advisor siehst
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li>• Founder-Snapshot und priorisierte Spannungs- bzw. Fokusfelder</li>
              <li>• das gemeinsame Alignment Workbook inklusive Advisor-Impulse</li>
              <li>• Founder-Reaktionen und Follow-up-Status</li>
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Nicht Teil des Advisor-Zugriffs sind rohe Assessment-Antworten oder die komplette
              Antworthistorie der beiden Founder.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
