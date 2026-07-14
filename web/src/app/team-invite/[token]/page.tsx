import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildInvitationQuestionnaireHref } from "@/features/onboarding/invitationFlow";
import {
  claimAdvisorTeamInviteFounderAction,
} from "@/features/dashboard/advisorTeamInviteActions";
import {
  fallbackLabelFromEmail,
  finalizeAdvisorTeamInviteIfPossible,
  getAdvisorTeamInviteByToken,
  normalizeEmail,
  normalizeTeamName,
} from "@/features/dashboard/advisorTeamInviteData";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

type TeamInviteT = Awaited<ReturnType<typeof getTranslations>>;

function statusCopy(error: string | undefined, t: TeamInviteT) {
  if (error === "email_mismatch") {
    return t("statusErrors.emailMismatch");
  }
  if (error === "already_claimed") {
    return t("statusErrors.alreadyClaimed");
  }
  if (error === "activation_failed") {
    return t("statusErrors.activationFailed");
  }
  if (error === "invalid_token") {
    return t("statusErrors.invalidToken");
  }
  return null;
}

export default async function AdvisorTeamInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("invite.teamInvite");
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  let invite = await getAdvisorTeamInviteByToken(token);

  if (
    invite.status === "ready" &&
    invite.row.invitation_id &&
    invite.row.status !== "activated"
  ) {
    await finalizeAdvisorTeamInviteIfPossible(invite.row);
    invite = await getAdvisorTeamInviteByToken(token);
  }

  if (invite.status !== "ready") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <div className="mb-5 flex justify-end">
          <PublicLanguageSwitcher />
        </div>
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("eyebrow")}</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">{t("notFoundTitle")}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
            {t("notFoundText")}
          </p>
          <div className="mt-8">
            <Link href="/login" className={SECONDARY_CTA_CLASS}>
              {t("toLogin")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { row, founderSlot, slotEmail } = invite;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/login?next=${encodeURIComponent(`/team-invite/${token}`)}`;
  const teamName = normalizeTeamName(row.team_name);
  const counterpartLabel =
    founderSlot === "founderA"
      ? fallbackLabelFromEmail(row.founder_b_email)
      : fallbackLabelFromEmail(row.founder_a_email);
  const founderALinked = Boolean(row.founder_a_claimed_at);
  const founderBLinked = Boolean(row.founder_b_claimed_at);
  const currentUserMatchesInvite = normalizeEmail(user?.email) === normalizeEmail(slotEmail);
  const slotAlreadyClaimed =
    founderSlot === "founderA"
      ? row.founder_a_user_id === user?.id
      : row.founder_b_user_id === user?.id;
  const slotNeedsActivation =
    Boolean(user?.id) &&
    currentUserMatchesInvite &&
    !slotAlreadyClaimed &&
    (founderSlot === "founderA" ? !row.founder_a_user_id : !row.founder_b_user_id);
  const invitationReadyForCurrentSlot = Boolean(row.invitation_id) && slotAlreadyClaimed;
  const questionnaireHref = row.invitation_id
    ? buildInvitationQuestionnaireHref(row.invitation_id, "base")
    : null;
  const errorMessage = statusCopy(resolvedSearchParams.error, t);

  if (invitationReadyForCurrentSlot && questionnaireHref) {
    redirect(questionnaireHref);
  }

  async function claimAction() {
    "use server";

    const result = await claimAdvisorTeamInviteFounderAction({ token });
    if (!result.ok) {
      redirect(`/team-invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.reason)}`);
    }

    redirect(buildInvitationQuestionnaireHref(result.invitationId, "base"));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 md:px-10">
      <div className="mb-5 flex justify-end">
        <PublicLanguageSwitcher />
      </div>
      <section className="rounded-[36px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              {row.advisor_name?.trim()
                ? t("invitedByAdvisor", { advisorName: row.advisor_name.trim() })
                : t("invitedGeneric")}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("intro", { counterpart: counterpartLabel })}
            </p>
            {teamName ? (
              <p className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {t("teamProject", { teamName })}
              </p>
            ) : null}
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("currentStatus")}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <StatusRow
                label={t("founderA")}
                value={founderALinked ? t("started") : t("open")}
              />
              <StatusRow
                label={t("founderB")}
                value={founderBLinked ? t("started") : t("open")}
              />
              <StatusRow
                label={t("yourSlot")}
                value={slotEmail}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {!user ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">{t("signInTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t("signInText", { email: slotEmail })}
              </p>
              <div className="mt-6">
                <Link href={loginHref} className={PRIMARY_CTA_CLASS}>
                  {t("signInCta")}
                </Link>
              </div>
            </>
          ) : !currentUserMatchesInvite ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">{t("wrongEmailTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t("wrongEmailText", { slotEmail, currentEmail: user.email ?? "" })}
              </p>
            </>
          ) : slotNeedsActivation ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">{t("activateTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t("activateText", { email: slotEmail })}
              </p>
              <form action={claimAction} className="mt-6">
                <button type="submit" className={PRIMARY_CTA_CLASS}>
                  {t("activateCta")}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-950">{t("waitingTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t("waitingText", { counterpart: counterpartLabel })}
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
