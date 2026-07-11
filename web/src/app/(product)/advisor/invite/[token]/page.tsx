import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  claimFounderAlignmentAdvisorAccess,
  getFounderAlignmentAdvisorInviteByToken,
} from "@/features/reporting/founderAlignmentWorkbookActions";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

type AdvisorT = Awaited<ReturnType<typeof getTranslations>>;

function teamContextLabel(teamContext: "pre_founder" | "existing_team", t: AdvisorT) {
  return teamContext === "existing_team" ? t("teamContext.existingTeam") : t("teamContext.preFounder");
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
  const t = await getTranslations("advisor");
  const token = rawToken?.trim() ?? "";
  const invite = await getFounderAlignmentAdvisorInviteByToken(token);
  const actionError =
    resolvedSearchParams.error === "already_claimed"
      ? t("invite.errors.alreadyClaimed")
      : resolvedSearchParams.error === "invalid_token"
        ? t("invite.errors.invalidToken")
        : resolvedSearchParams.error === "update_failed"
          ? t("invite.errors.updateFailed")
          : null;

  if (invite.status !== "ready") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("invite.eyebrow")}</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {t("invite.notFoundTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
            {t("invite.notFoundText")}
          </p>
          <div className="mt-8">
            <Link href="/login" className={SECONDARY_CTA_CLASS}>
              {t("invite.toLogin")}
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

  const loginHref = `/advisor/invite/prepare?token=${encodeURIComponent(token)}`;
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

    const advisorProfile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
    const profileName = advisorProfile?.display_name?.trim() ?? "";

    const result = await claimFounderAlignmentAdvisorAccess({
      invitationId: inviteData.invitationId,
      advisorToken: token,
      userId: user.id,
      fallbackName: profileName || (user.email?.split("@")[0] ?? null),
      teamContext: inviteData.teamContext,
    });

    if (!result.ok) {
      redirect(`/advisor/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.reason)}`);
    }

    redirect("/advisor/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 md:px-10">
      <ResearchPageTracker
        eventName="advisor_invite_viewed"
        invitationId={inviteData.invitationId}
        teamContext={inviteData.teamContext}
        properties={{
          advisorLinked: inviteData.advisorLinked,
          reportReady: inviteData.reportReady,
          workbookReady: inviteData.workbookReady,
        }}
      />
      <section className="rounded-[36px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {t("invite.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
              {inviteData.founderAName} x {inviteData.founderBName}
            </h1>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex rounded-full border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/7 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {teamContextLabel(inviteData.teamContext, t)}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {inviteData.reportReady
                  ? t("invite.reportReady")
                  : t("invite.reportPending")}
              </span>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              {t("invite.intro")}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("invite.roleText")}
            </p>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("invite.status")}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <StatusRow
                label={t("invite.founderApprovals")}
                value={
                  inviteData.founderAApproved && inviteData.founderBApproved
                    ? t("invite.bothConfirmed")
                    : t("invite.notComplete")
                }
              />
              <StatusRow
                label={t("invite.baseAssessments")}
                value={statusChip(inviteData.reportReady, t("invite.assessable"), t("invite.inProgress"))}
              />
              <StatusRow
                label={t("invite.founderReport")}
                value={statusChip(inviteData.reportReady, t("invite.available"), t("invite.notReady"))}
              />
              <StatusRow
                label={t("invite.workbook")}
                value={statusChip(inviteData.workbookReady, t("invite.accessible"), t("invite.unlocking"))}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("invite.entry")}</p>
            {actionError ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </p>
            ) : null}
            {isLinkedToOtherUser ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  {t("invite.alreadyLinkedTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t("invite.alreadyLinkedText")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/advisor/dashboard" className={SECONDARY_CTA_CLASS}>
                    {t("invite.toDashboard")}
                  </Link>
                </div>
              </>
            ) : !user ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  {t("invite.linkProfileTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t("invite.linkProfileText")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={loginHref} className={PRIMARY_CTA_CLASS}>
                    {t("invite.loginAndLink")}
                  </Link>
                </div>
              </>
            ) : canClaim ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  {t("invite.activateTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t("invite.activateText")}
                </p>
                <form action={claimAction} className="mt-6 flex flex-wrap gap-3">
                  <button type="submit" className={PRIMARY_CTA_CLASS}>
                    {t("invite.linkProfile")}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">
                  {t("invite.activeTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t("invite.activeText")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/advisor/dashboard" className={PRIMARY_CTA_CLASS}>
                    {t("invite.continueDashboard")}
                  </Link>
                  <Link
                    href={`/founder-alignment/workbook?invitationId=${encodeURIComponent(inviteData.invitationId)}&teamContext=${encodeURIComponent(inviteData.teamContext)}`}
                    className={SECONDARY_CTA_CLASS}
                  >
                    {t("invite.openWorkbook")}
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/6 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t("invite.whatYouSee")}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li>• {t("invite.visibleItems.snapshot")}</li>
              <li>• {t("invite.visibleItems.workbook")}</li>
              <li>• {t("invite.visibleItems.followUp")}</li>
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              {t("invite.notVisible")}
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
