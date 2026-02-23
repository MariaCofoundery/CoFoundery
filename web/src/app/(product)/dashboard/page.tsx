import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { CopyLinkButton } from "@/features/dashboard/CopyLinkButton";
import { DailyQuote } from "@/features/dashboard/DailyQuote";
import { DAILY_QUOTES } from "@/features/dashboard/dailyQuotes";
import { SentInvitationLinkToggle } from "@/features/dashboard/SentInvitationLinkToggle";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { KeyInsights } from "@/features/reporting/KeyInsights";
import {
  debug_invitation_readiness,
  finalizeInvitationIfReady,
  getInvitationDashboardRows,
  getLatestSelfAlignmentReport,
  type InvitationDashboardRow,
  type InvitationReadinessDebug,
} from "@/features/reporting/actions";
import { createClient } from "@/lib/supabase/server";

type DashboardSearchParams = {
  error?: string;
  valuesStatus?: string;
  invite?: string;
  invitationId?: string;
};

type ProfileRow = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
};

type ReportRunRow = {
  id: string;
  invitation_id: string;
  modules: string[];
  created_at: string;
  payload: unknown;
  invitations:
    | {
        id: string;
        label: string | null;
        invitee_email: string;
        status: string;
        created_at: string;
      }
    | Array<{
        id: string;
        label: string | null;
        invitee_email: string;
        status: string;
        created_at: string;
      }>
    | null;
};

const INVITE_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const REPORT_CTA_CLASS =
  "inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";

function getDayOfYear(date: Date) {
  const startOfYearUtc = Date.UTC(date.getUTCFullYear(), 0, 0);
  const currentUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((currentUtc - startOfYearUtc) / 86_400_000);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  if (params.invitationId) {
    await finalizeInvitationIfReady(params.invitationId);
  }

  const [selfReport, { data: profile }, invitationRows, runsResult] =
    await Promise.all([
      getLatestSelfAlignmentReport(),
      supabase
        .from("profiles")
        .select("display_name, focus_skill, intention")
        .eq("user_id", user.id)
        .maybeSingle(),
      getInvitationDashboardRows(),
      supabase
        .from("report_runs")
        .select(
          "id, invitation_id, modules, created_at, payload, invitations:invitation_id(id, label, invitee_email, status, created_at)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (runsResult.error) {
    return <main className="p-8">Fehler beim Laden der Report-Runs: {runsResult.error.message}</main>;
  }
  const profileData = (profile as ProfileRow | null) ?? null;
  const needsOnboarding =
    !profileData?.display_name?.trim() || !profileData?.focus_skill || !profileData?.intention;
  const sentInvites = invitationRows.filter((row) => row.direction === "sent");
  const receivedInvites = invitationRows.filter((row) => row.direction === "incoming");
  const groupedSentInvites = groupSentInvitationsByInviteeEmail(sentInvites);
  const isDev = process.env.NODE_ENV !== "production";
  const debugByInvitationId = isDev
    ? new Map<string, InvitationReadinessDebug>(
        await Promise.all(
          invitationRows.map(async (invitation) => [
            invitation.id,
            await debug_invitation_readiness(invitation.id, { attemptFinalize: true }),
          ] as const)
        )
      )
    : new Map<string, InvitationReadinessDebug>();
  const reportRuns = (runsResult.data ?? []) as ReportRunRow[];
  const hasSubmittedBase = Boolean(selfReport);
  const hasSubmittedValues = selfReport?.valuesModuleStatus === "completed";
  const dayOfYear = getDayOfYear(new Date());
  const quoteIndex = DAILY_QUOTES.length > 0 ? (dayOfYear - 1) % DAILY_QUOTES.length : 0;
  const quoteOfDay = DAILY_QUOTES[quoteIndex] ?? "Klarheit schlägt Zufall.";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-8 py-16 md:px-12">
      <DailyQuote displayName={profileData?.display_name ?? null} quote={quoteOfDay} />
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[0.11em] text-slate-900 md:text-4xl">DASHBOARD</h1>
          <p className="mt-2 text-sm tracking-[0.04em] text-slate-500">{user.email}</p>
          {profileData?.focus_skill && profileData?.intention ? (
            <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">
              Fokus: {profileData.focus_skill} · Intention: {profileData.intention}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/invite/new"
            className={INVITE_CTA_CLASS}
          >
            Co-Founder einladen
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Abmelden
            </button>
          </form>
        </div>
      </header>

      <section className="mb-6">
        {needsOnboarding ? (
          <ProfileBasicsForm
            mode="onboarding"
            initialValues={{
              display_name: profileData?.display_name ?? null,
              focus_skill: profileData?.focus_skill ?? null,
              intention: profileData?.intention ?? null,
            }}
            submitLabel="Profil speichern"
            onSuccessRedirectTo="/dashboard"
            variant="accent"
          />
        ) : (
          <details className="rounded-2xl border border-slate-200/80 bg-white/95 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Profil-Basics bearbeiten
            </summary>
            <div className="mt-4">
              <ProfileBasicsForm
                mode="edit"
                initialValues={{
                  display_name: profileData?.display_name ?? null,
                  focus_skill: profileData?.focus_skill ?? null,
                  intention: profileData?.intention ?? null,
                }}
                submitLabel="Profil aktualisieren"
                onSuccessRedirectTo="/dashboard"
              />
            </div>
          </details>
        )}
      </section>

      {params.error ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Hinweis: {params.error}
        </p>
      ) : null}

      <section className="mb-6">
        {selfReport ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-6">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Profil-Snapshot (Basis)</h2>
              <p className="mt-2 text-xs text-slate-500">
                Fragen beantwortet: {selfReport.basisAnsweredA}/{selfReport.basisTotal}
              </p>
              <div className="mt-4">
                <AlignmentRadarChart
                  participants={[
                    {
                      id: "self",
                      label: selfReport.participantAName || "Du",
                      color: "#00BFA5",
                      scores: selfReport.scoresA,
                    },
                  ]}
                />
              </div>
              {process.env.NODE_ENV !== "production" ? (
                <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">
                    Dev Debug: self report
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-slate-700">
                    {JSON.stringify(
                      {
                        baseAssessmentId: selfReport.selfAssessmentMeta?.baseAssessmentId ?? selfReport.sessionId,
                        valuesAssessmentId: selfReport.selfAssessmentMeta?.valuesAssessmentId ?? null,
                        valuesAnsweredA: selfReport.valuesAnsweredA,
                        valuesTotal: selfReport.valuesTotal,
                        scoresA: selfReport.scoresA,
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              ) : null}
            </article>
            <KeyInsights insights={selfReport.keyInsights} />
          </div>
        ) : (
          <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-6">
            <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Profil-Snapshot (Basis)</h2>
            <p className="mt-3 text-sm text-slate-700">Fülle zuerst den Basis-Fragebogen aus.</p>
          </article>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Profilstatus</h2>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Aktive Module</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="flex items-center justify-between gap-4">
                <span>Basis</span>
                <span className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  {hasSubmittedBase ? "abgeschlossen" : "offen"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span>Werte</span>
                <span className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  {hasSubmittedValues ? "abgeschlossen" : "offen"}
                </span>
              </li>
            </ul>
            {!hasSubmittedValues ? (
              <a
                href="/me/values"
                className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                Werte-Add-on starten
              </a>
            ) : null}
          </article>

          <article className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Weitere Module (coming soon)
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-[17px] w-[17px] shrink-0 text-slate-500"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.34 3.94L1.82 18a2.25 2.25 0 001.924 3.375h16.512A2.25 2.25 0 0022.18 18L13.66 3.94a2.25 2.25 0 00-3.32 0z"
                  />
                </svg>
                <span>Stress & Belastung</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-[17px] w-[17px] shrink-0 text-slate-500"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75m-16.5 0h3.75m3 0a2.25 2.25 0 104.5 0m-4.5 0a2.25 2.25 0 014.5 0M10.5 12h9.75m-16.5 0h3.75m3 0a2.25 2.25 0 104.5 0m-4.5 0a2.25 2.25 0 014.5 0M10.5 18h9.75m-16.5 0h3.75m3 0a2.25 2.25 0 104.5 0m-4.5 0a2.25 2.25 0 014.5 0" />
                </svg>
                <span>Arbeitsstil & Entscheidungslogik</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-[17px] w-[17px] shrink-0 text-slate-500"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 10.5h9m-9 3h6m-2.25 7.125l-2.436-2.436a2.25 2.25 0 00-1.59-.659H6A2.25 2.25 0 013.75 15.28V7.875A2.25 2.25 0 016 5.625h12a2.25 2.25 0 012.25 2.25v7.406A2.25 2.25 0 0118 17.53h-1.223a2.25 2.25 0 00-1.59.659l-2.437 2.436z"
                  />
                </svg>
                <span>Konflikt- & Feedback-Dynamiken</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-[17px] w-[17px] shrink-0 text-slate-500"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.125a8.967 8.967 0 01-6 0m6 0a9 9 0 10-6 0m6 0v-1.125a3 3 0 00-3-3h0a3 3 0 00-3 3V19.125m6 0h-6M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Rollenverständnis im Team</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-[17px] w-[17px] shrink-0 text-slate-500"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a8.97 8.97 0 003.742-.478 3 3 0 00-4.682-2.72m.94 3.198a8.965 8.965 0 01-3.758.78m-7.5 0a8.965 8.965 0 01-3.758-.78m0 0a3 3 0 014.682-2.72m-4.682 2.72A8.97 8.97 0 012.25 18.72m15.5-7.22a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-9 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm9-5.25a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Team-Report (3–4 Personen)</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-[17px] w-[17px] shrink-0 text-slate-500"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 8.25h19.5m-18 0v8.625A2.625 2.625 0 006.375 19.5h11.25a2.625 2.625 0 002.625-2.625V8.25m-18 0A2.625 2.625 0 016.375 5.625h11.25A2.625 2.625 0 0120.25 8.25m-8.25 3v4.5m-2.25-2.25h4.5"
                  />
                </svg>
                <span>Investor / Business-Angel Match</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Dein nächster Schritt</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {!hasSubmittedBase ? (
            <a
              href="/me/base"
              className="inline-flex rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Basis-Fragebogen starten
            </a>
          ) : null}
          {hasSubmittedBase && !hasSubmittedValues ? (
            <a
              href="/me/values"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Werte Add-on starten
            </a>
          ) : null}
          {hasSubmittedBase ? (
            <a
              href="/me/report"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Individuellen Report öffnen
            </a>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-6">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Gesendete Einladungen</h2>
          <ul className="mt-4 space-y-3">
            {groupedSentInvites.map(({ primary, additional }) => (
              <li key={primary.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {renderInvitationCard({
                  invite: primary,
                  isDev,
                  debug: debugByInvitationId.get(primary.id) ?? null,
                })}
                {additional.length > 0 ? (
                  <details className="mt-3 rounded-md border border-slate-200 bg-slate-50/70 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-700">
                      Weitere anzeigen ({additional.length})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {additional.map((olderInvite) => (
                        <li key={olderInvite.id} className="rounded-md border border-slate-200 bg-white p-2">
                          {renderInvitationCard({
                            invite: olderInvite,
                            isDev,
                            debug: debugByInvitationId.get(olderInvite.id) ?? null,
                          })}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
            {groupedSentInvites.length === 0 ? (
              <li className="text-sm text-slate-500">Noch keine gesendeten Einladungen.</li>
            ) : null}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-6">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Eingehende Einladungen</h2>
          <ul className="mt-4 space-y-3">
            {receivedInvites.map((invite) => (
              <li key={invite.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {(() => {
                  const requiresValues = invite.requiredModules.includes("values");
                  const inviteeHasAllRequired =
                    invite.inviteeBaseSubmitted && (!requiresValues || invite.inviteeValuesSubmitted);
                  const continueMatchHref = `/join?invitationId=${encodeURIComponent(invite.id)}`;
                  const reportHref = `/report/${invite.id}`;
                  const actionHref = invite.isReportReady
                    ? reportHref
                    : continueMatchHref;
                  return (
                    <>
                      <p className="font-medium text-slate-900">{formatIncomingInviteTitle(invite)}</p>
                      <p className="mt-1">Status: {getIncomingInviteStatusLabel(invite)}</p>
                      <p className="text-xs text-slate-500">
                        Module: {formatInvitationModules(invite.requiredModules)}
                      </p>
                      <p className="text-xs text-slate-500">Erstellt: {formatDate(invite.createdAt)}</p>

                      <div className="mt-2 flex flex-wrap items-start gap-2">
                        <a
                          href={actionHref}
                          className={
                            invite.isReportReady
                              ? REPORT_CTA_CLASS
                              : "inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                          }
                        >
                          {invite.isReportReady
                            ? "Report öffnen"
                            : inviteeHasAllRequired
                              ? "Match starten"
                              : "Jetzt ausfüllen"}
                        </a>
                        <CopyLinkButton url={actionHref} />
                      </div>
                      {isDev ? (
                        <details className="mt-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
                          <summary className="cursor-pointer text-xs text-slate-600">Debug anzeigen</summary>
                          <pre className="mt-2 overflow-auto text-[11px] leading-5 text-slate-700">
                            {JSON.stringify(debugByInvitationId.get(invite.id) ?? null, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </>
                  );
                })()}
              </li>
            ))}
            {receivedInvites.length === 0 ? (
              <li className="text-sm text-slate-500">Keine Einladungen an dich.</li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Report-Runs</h2>
        <ul className="mt-4 space-y-3">
          {reportRuns.map((run) => (
            <li key={run.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
              {(() => {
                const invitation = Array.isArray(run.invitations)
                  ? run.invitations[0] ?? null
                  : run.invitations;
                return (
                  <>
              <p className="font-medium text-slate-900">
                {invitation?.label ?? invitation?.invitee_email ?? run.invitation_id}
              </p>
              <p className="mt-1">Module: {(run.modules ?? []).join(", ") || "base"}</p>
              <p className="text-xs text-slate-500">Erstellt: {formatDate(run.created_at)}</p>
              <a
                href={`/report/${run.invitation_id}`}
                className={`mt-2 ${REPORT_CTA_CLASS}`}
              >
                Report öffnen
              </a>
                  </>
                );
              })()}
            </li>
          ))}
          {reportRuns.length === 0 ? (
            <li className="text-sm text-slate-500">Noch keine Report-Runs verfügbar.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Bereit für den nächsten Matching-Schritt?</p>
          <Link href="/invite/new" className={INVITE_CTA_CLASS}>
            Co-Founder einladen
          </Link>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function resolveIncomingInviterName(invite: InvitationDashboardRow) {
  const inviterDisplayName = invite.inviterDisplayName?.trim();
  if (inviterDisplayName) return inviterDisplayName;
  const inviterEmail = invite.inviterEmail?.trim();
  if (inviterEmail) return inviterEmail;
  return "Co-Founder";
}

function formatIncomingInviteTitle(invite: InvitationDashboardRow) {
  return `${resolveIncomingInviterName(invite)} hat dich eingeladen`;
}

function getIncomingInviteStatusLabel(invite: InvitationDashboardRow) {
  return invite.isReportReady ? "Report bereit" : "gesendet";
}

function getSentInviteStatusLabel(invite: InvitationDashboardRow) {
  return invite.isReportReady ? "Report bereit" : "gesendet";
}

function formatInvitationModules(modules: string[]) {
  const moduleKeys = (modules ?? []).filter((value): value is string => Boolean(value));
  if (moduleKeys.length === 0) return "Basis";

  const labels = moduleKeys.map((key) => {
    if (key === "base") return "Basis";
    if (key === "values") return "Werte";
    return key;
  });
  return [...new Set(labels)].join(", ");
}

function groupSentInvitationsByInviteeEmail(invites: InvitationDashboardRow[]) {
  const groups = new Map<string, InvitationDashboardRow[]>();
  for (const invite of invites) {
    const key = invite.inviteeEmail.trim().toLowerCase();
    const existing = groups.get(key) ?? [];
    existing.push(invite);
    groups.set(key, existing);
  }

  return [...groups.values()].map((rows) => ({
    primary: rows[0],
    additional: rows.slice(1),
  }));
}

function renderInvitationCard(params: {
  invite: InvitationDashboardRow;
  isDev: boolean;
  debug: InvitationReadinessDebug | null;
}) {
  const { invite, isDev, debug } = params;
  const title = invite.label ?? invite.inviteeEmail;
  return (
    <>
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1">Status: {getSentInviteStatusLabel(invite)}</p>
      <p className="text-xs text-slate-500">Module: {formatInvitationModules(invite.requiredModules)}</p>
      <p className="text-xs text-slate-500">Ablauf: {formatDate(invite.expiresAt)}</p>
      <SentInvitationLinkToggle invitationId={invite.id} status={invite.status} />
      {invite.isReportReady ? (
        <a
          href={`/report/${invite.id}`}
          className={`mt-2 ${REPORT_CTA_CLASS}`}
        >
          Report öffnen
        </a>
      ) : null}
      {isDev ? (
        <details className="mt-2 rounded-md border border-slate-200 bg-slate-50/70 p-2">
          <summary className="cursor-pointer text-xs text-slate-600">Debug anzeigen</summary>
          <pre className="mt-2 overflow-auto text-[11px] leading-5 text-slate-700">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      ) : null}
    </>
  );
}
