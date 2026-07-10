import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  confirmFullDiscoveryMatchingAction,
  requestFullDiscoveryMatchingAction,
  startDiscoveryMatchingPreparationAction,
  type DiscoveryMatchingStartActionState,
} from "@/features/discovery/discoveryMatchingStartActions";
import { getDiscoveryMatchingPreparation } from "@/features/discovery/discoveryMatchingStartData";
import type { DiscoveryMatchingStart } from "@/features/discovery/discoveryMatchingStartTypes";
import type {
  DiscoveryFounderRole,
  DiscoveryProfilePreview,
} from "@/features/discovery/discoveryTypes";
import { createMatchingSessionFromDiscoveryStartAction } from "@/features/matchingCore/matchingCoreActions";
import { getMatchingSessionForDiscoveryStart } from "@/features/matchingCore/matchingCoreData";
import { createMatchingReportRunFromSessionAction } from "@/features/matchingCore/matchingCoreReportActions";
import { getMatchingReportRunForSession } from "@/features/matchingCore/matchingCoreReportData";
import type { MatchingReportRunSummary } from "@/features/matchingCore/matchingCoreReportTypes";
import type { MatchingSessionSummary } from "@/features/matchingCore/matchingCoreTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_DISABLED_CTA_CLASS =
  "inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

type MatchingPreparationPageParams = {
  introRequestId: string;
};

type MatchingPreparationSearchParams = {
  matchingMessage?: string | string[];
  matchingOk?: string | string[];
};

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function matchingPreparationResultUrl(
  introRequestId: string,
  result: DiscoveryMatchingStartActionState,
  fallbackMessage: string
) {
  const params = new URLSearchParams();
  params.set("matchingMessage", result.message ?? fallbackMessage);
  params.set("matchingOk", result.ok ? "1" : "0");
  return `/discovery/intros/${introRequestId}/matching?${params.toString()}`;
}

function formatRoleList(values: DiscoveryFounderRole[], t: DiscoveryT) {
  return values.length > 0
    ? values.map((value) => t(`roles.${value}`)).join(", ")
    : t("common.notProvided");
}

function profileDetailUrl(profile: DiscoveryProfilePreview) {
  return `/discovery/${profile.id}`;
}

function ProfileCard({
  eyebrow,
  profile,
  t,
}: {
  eyebrow: string;
  profile: DiscoveryProfilePreview;
  t: DiscoveryT;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">{profile.displayName}</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{profile.headline}</p>
      <dl className="mt-5 grid gap-3 text-sm text-slate-600">
        <div>
          <dt className="font-semibold text-slate-900">{t("matchingPreparation.profile.brings")}</dt>
          <dd className="mt-1">{formatRoleList(profile.ownRoles, t)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">{t("matchingPreparation.profile.seeks")}</dt>
          <dd className="mt-1">{formatRoleList(profile.seekingRoles, t)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">{t("matchingPreparation.profile.workFrame")}</dt>
          <dd className="mt-1">
            {profile.locationLabel ? `${profile.locationLabel} · ` : ""}
            {t(`remoteModes.${profile.remoteMode}`)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">{t("matchingPreparation.profile.commitmentGoal")}</dt>
          <dd className="mt-1">
            {t(`commitmentLevels.${profile.commitmentLevel}`)} ·{" "}
            {t(`ventureGoals.${profile.ventureGoal}`)}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <Link href={profileDetailUrl(profile)} className={SECONDARY_CTA_CLASS}>
          {t("common.viewProfile")}
        </Link>
      </div>
    </article>
  );
}

function MatchingSessionReadinessCard({
  summary,
  currentUserId,
  reportRun,
  t,
}: {
  summary: MatchingSessionSummary;
  currentUserId: string;
  reportRun: MatchingReportRunSummary | null;
  t: DiscoveryT;
}) {
  const currentUserReadiness = summary.participants.find(
    (participant) => participant.userId === currentUserId
  );
  const currentUserBaseMissing = currentUserReadiness?.baseInputStatus === "missing";
  const isReadyForReport = summary.session.status === "ready_for_report";
  const isReportReady = summary.session.status === "report_ready" || Boolean(reportRun);

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        {t("matchingPreparation.readiness.eyebrow")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        {t("matchingPreparation.readiness.title")}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {t("matchingPreparation.readiness.text")}
      </p>
      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        {t("matchingPreparation.readiness.statusPrefix")}{" "}
        {isReportReady
          ? t("matchingPreparation.readiness.reportReady")
          : isReadyForReport
            ? t("matchingPreparation.readiness.readyForReport")
            : t("matchingPreparation.readiness.waitingForAnswers")}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {summary.participants.map((participant) => (
          <article key={participant.userId} className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {participant.userId === currentUserId
                ? t("matchingPreparation.you")
                : t("matchingPreparation.counterpart")}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              {participant.profile?.displayName ?? t("matchingPreparation.readiness.profileHidden")}
            </h3>
            {participant.profile?.headline ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{participant.profile.headline}</p>
            ) : null}
            <p
              className={`mt-4 rounded-full px-3 py-2 text-sm font-semibold ${
                participant.baseInputStatus === "present"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {participant.baseInputStatus === "present"
                ? t("matchingPreparation.readiness.basePresent")
                : t("matchingPreparation.readiness.baseMissing")}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {currentUserBaseMissing ? (
          <Link href="/me/base" className={PRIMARY_CTA_CLASS}>
            {t("common.fillBaseQuestions")}
          </Link>
        ) : null}
        {isReportReady ? (
          <Link href={`/matching/${summary.session.id}/report`} className={PRIMARY_CTA_CLASS}>
            {t("matchingPreparation.readiness.viewReport")}
          </Link>
        ) : null}
        {isReadyForReport && !isReportReady ? (
          <p className="w-full max-w-3xl text-sm leading-6 text-slate-600">
            {t("matchingPreparation.readiness.createReportHint")}
          </p>
        ) : null}
      </div>
    </>
  );
}

function UnavailableState({ t }: { t: DiscoveryT }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link
          href="/discovery/intros"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          {t("matchingPreparation.backToIntros")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {t("matchingPreparation.unavailable.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("matchingPreparation.unavailable.text")}
        </p>
        <div className="mt-6">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("matchingPreparation.backToIntros")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function PageMessage({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <section
      className={`rounded-3xl border p-4 ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className={`text-sm font-semibold ${ok ? "text-emerald-900" : "text-amber-900"}`}>
        {message}
      </p>
    </section>
  );
}

function MatchingStartStatusContent({
  introRequestId,
  matchingStart,
  currentUserId,
  matchingSession,
  reportRun,
  t,
  fallbackMessage,
  matchingSessionUnavailableMessage,
}: {
  introRequestId: string;
  matchingStart: DiscoveryMatchingStart;
  currentUserId: string;
  matchingSession: MatchingSessionSummary | null;
  reportRun: MatchingReportRunSummary | null;
  t: DiscoveryT;
  fallbackMessage: string;
  matchingSessionUnavailableMessage: string;
}) {
  async function requestFullMatching() {
    "use server";
    const result = await requestFullDiscoveryMatchingAction(introRequestId, matchingStart.id);
    redirect(matchingPreparationResultUrl(introRequestId, result, fallbackMessage));
  }

  async function confirmFullMatching() {
    "use server";
    const result = await confirmFullDiscoveryMatchingAction(introRequestId, matchingStart.id);
    redirect(matchingPreparationResultUrl(introRequestId, result, fallbackMessage));
  }

  async function createMatchingSession() {
    "use server";
    const result = await createMatchingSessionFromDiscoveryStartAction(introRequestId, matchingStart.id);
    redirect(matchingPreparationResultUrl(introRequestId, result, fallbackMessage));
  }

  async function createMatchingReport() {
    "use server";
    if (!matchingSession) {
      redirect(
        matchingPreparationResultUrl(
          introRequestId,
          {
            ok: false,
            message: matchingSessionUnavailableMessage,
          },
          fallbackMessage
        )
      );
    }

    const result = await createMatchingReportRunFromSessionAction(matchingSession.session.id);
    if (result.ok && result.reportHref) {
      redirect(result.reportHref);
    }
    redirect(matchingPreparationResultUrl(introRequestId, result, fallbackMessage));
  }

  if (matchingStart.status === "canceled") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("matchingPreparation.states.canceledEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {t("matchingPreparation.states.canceledTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {t("matchingPreparation.states.canceledText")}
        </p>
      </>
    );
  }

  if (matchingStart.status === "ready_for_matching") {
    if (matchingSession) {
      return (
        <>
          <MatchingSessionReadinessCard
            summary={matchingSession}
            currentUserId={currentUserId}
            reportRun={reportRun}
            t={t}
          />
          {matchingSession.session.status === "ready_for_report" && !reportRun ? (
            <div className="mt-6">
              <form action={createMatchingReport}>
                <button type="submit" className={PRIMARY_CTA_CLASS}>
                  {t("matchingPreparation.readiness.createReport")}
                </button>
              </form>
            </div>
          ) : null}
        </>
      );
    }

    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {t("matchingPreparation.states.readyEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {t("matchingPreparation.states.readyTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {t("matchingPreparation.states.readyText")}
        </p>
        <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            {t("matchingPreparation.steps.introAccepted")}
          </li>
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            {t("matchingPreparation.steps.preparationCreated")}
          </li>
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            {t("matchingPreparation.steps.bothConfirmed")}
          </li>
        </ul>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
          {t("matchingPreparation.states.readyFollowup")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={createMatchingSession}>
            <button type="submit" className={PRIMARY_CTA_CLASS}>
              {t("matchingPreparation.actions.prepareSession")}
            </button>
          </form>
        </div>
      </>
    );
  }

  if (matchingStart.status === "awaiting_other_confirmation") {
    const isRequester = matchingStart.requestedByUserId === currentUserId;

    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {t("matchingPreparation.states.confirmationEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {isRequester
            ? t("matchingPreparation.states.confirmationRequestedTitle")
            : t("matchingPreparation.states.confirmTitle")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {isRequester
            ? t("matchingPreparation.states.confirmationRequestedText")
            : t("matchingPreparation.states.confirmText")}
        </p>
        <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            {t("matchingPreparation.steps.introAccepted")}
          </li>
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            {t("matchingPreparation.steps.preparationCreated")}
          </li>
          <li className="rounded-2xl bg-amber-50 px-4 py-3 font-medium text-amber-900">
            {t("matchingPreparation.steps.awaitingSecondConfirmation")}
          </li>
        </ul>
        <div className="mt-6">
          {isRequester ? (
            <button type="button" disabled className={PRIMARY_DISABLED_CTA_CLASS}>
              {t("matchingPreparation.actions.waitingForConfirmation")}
            </button>
          ) : (
            <form action={confirmFullMatching}>
              <button type="submit" className={PRIMARY_CTA_CLASS}>
                {t("matchingPreparation.actions.confirmMatching")}
              </button>
            </form>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t("matchingPreparation.states.startedEyebrow")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        {t("matchingPreparation.states.startedTitle")}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {t("matchingPreparation.states.startedText")}
      </p>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
        <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
          {t("matchingPreparation.steps.introAccepted")}
        </li>
        <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
          {t("matchingPreparation.steps.preparationCreated")}
        </li>
        <li className="rounded-2xl bg-slate-50 px-4 py-3">
          {t("matchingPreparation.steps.needsBothConfirmations")}
        </li>
      </ul>
      <div className="mt-6">
        <form action={requestFullMatching}>
          <button type="submit" className={PRIMARY_CTA_CLASS}>
            {t("matchingPreparation.actions.requestFullMatching")}
          </button>
        </form>
      </div>
    </>
  );
}

export default async function DiscoveryIntroMatchingPreparationPage({
  params,
  searchParams,
}: {
  params: Promise<MatchingPreparationPageParams>;
  searchParams?: Promise<MatchingPreparationSearchParams>;
}) {
  const t = await getTranslations("discovery");
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const introRequestId = resolvedParams.introRequestId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    const next = `/discovery/intros/${introRequestId}/matching`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const preparation = await getDiscoveryMatchingPreparation(introRequestId, user.id);

  if (!preparation) {
    return <UnavailableState t={t} />;
  }
  const fallbackMatchingMessage = t("matchingPreparation.defaultActionMessage");
  const matchingSessionUnavailableMessage = t("matchingPreparation.matchingSessionUnavailable");

  async function startMatchingPreparation() {
    "use server";
    const result = await startDiscoveryMatchingPreparationAction(introRequestId);
    redirect(matchingPreparationResultUrl(introRequestId, result, fallbackMatchingMessage));
  }

  const currentUserProfile =
    preparation.currentUserRole === "requester"
      ? preparation.requesterProfile
      : preparation.recipientProfile;
  const otherProfile =
    preparation.currentUserRole === "requester"
      ? preparation.recipientProfile
      : preparation.requesterProfile;
  const matchingStart = preparation.matchingStart;
  const matchingSession = matchingStart
    ? await getMatchingSessionForDiscoveryStart(matchingStart.id, user.id)
    : null;
  const reportRun = matchingSession
    ? await getMatchingReportRunForSession(matchingSession.session.id, user.id)
    : null;
  const matchingMessage = searchParamValue(resolvedSearchParams.matchingMessage) ?? null;
  const matchingOk = searchParamValue(resolvedSearchParams.matchingOk) !== "0";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link
            href="/discovery/intros"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            {t("matchingPreparation.backToIntros")}
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("matchingPreparation.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            {t("matchingPreparation.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            {t("matchingPreparation.subtitle")}
          </p>
        </header>

        <PageMessage message={matchingMessage} ok={matchingOk} />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            {t("matchingPreparation.safetyNote")}
          </p>
        </section>

        {preparation.relationshipExists || preparation.invitationExists ? (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5">
            <h2 className="text-xl font-semibold text-slate-950">
              {t("matchingPreparation.existingContextTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("matchingPreparation.existingContextText")}
            </p>
          </section>
        ) : null}

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("matchingPreparation.profilesEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t("matchingPreparation.profilesTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t("matchingPreparation.profilesText")}
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ProfileCard eyebrow={t("matchingPreparation.you")} profile={currentUserProfile} t={t} />
            <ProfileCard eyebrow={t("matchingPreparation.counterpart")} profile={otherProfile} t={t} />
          </div>
        </section>

        <section className={CARD_CLASS}>
          {matchingStart ? (
            <MatchingStartStatusContent
              introRequestId={introRequestId}
              matchingStart={matchingStart}
              currentUserId={user.id}
              matchingSession={matchingSession}
              reportRun={reportRun}
              t={t}
              fallbackMessage={fallbackMatchingMessage}
              matchingSessionUnavailableMessage={matchingSessionUnavailableMessage}
            />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("matchingPreparation.states.nextStepEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {t("matchingPreparation.states.startTitle")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {t("matchingPreparation.states.startText")}
              </p>
              <ol className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  {t("matchingPreparation.steps.startFullMatching")}
                </li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  {t("matchingPreparation.steps.answerQuestions")}
                </li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  {t("matchingPreparation.steps.reportAndWorkbook")}
                </li>
              </ol>
              <div className="mt-6">
                <form action={startMatchingPreparation}>
                  <button type="submit" className={PRIMARY_CTA_CLASS}>
                    {t("matchingPreparation.actions.startPreparation")}
                  </button>
                </form>
              </div>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
              {t("matchingPreparation.backToIntros")}
            </Link>
            <Link href={profileDetailUrl(otherProfile)} className={SECONDARY_CTA_CLASS}>
              {t("common.viewProfile")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
