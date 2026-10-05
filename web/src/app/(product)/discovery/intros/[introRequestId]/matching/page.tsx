import { currentTeamForPeople } from "@/features/teams/currentJourneyData";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  confirmFullDiscoveryMatchingAction,
  requestDiscoveryJointCheckAction,
  requestFullDiscoveryMatchingAction,
} from "@/features/discovery/discoveryMatchingStartActions";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { getDiscoveryMatchingPreparation } from "@/features/discovery/discoveryMatchingStartData";
import {
  resolveDiscoveryMatchingStartFeedback,
  type DiscoveryMatchingStartResult,
} from "@/features/discovery/discoveryMatchingStartFeedback";
import type { DiscoveryMatchingStart } from "@/features/discovery/discoveryMatchingStartTypes";
import type {
  DiscoveryFounderRole,
  DiscoveryProfilePreview,
} from "@/features/discovery/discoveryTypes";
import { createClient, getRequestUser } from "@/lib/supabase/server";

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
  matchingStartResult?: string | string[];
  matchingStartError?: string | string[];
  currentTeamError?: string | string[];
};

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function matchingStartResultUrl(
  introRequestId: string,
  result: DiscoveryMatchingStartResult
) {
  const params = new URLSearchParams();

  if (result.ok) {
    params.set("matchingStartResult", result.reason);
  } else {
    params.set("matchingStartError", result.reason);
  }

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
            {profile.locationRegion ? `${profile.locationRegion} · ` : ""}
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
  counterpartName,
  t,
}: {
  introRequestId: string;
  matchingStart: DiscoveryMatchingStart;
  currentUserId: string;
  counterpartName: string;
  t: DiscoveryT;
}) {
  async function requestFullMatching() {
    "use server";
    const result = await requestFullDiscoveryMatchingAction(introRequestId, matchingStart.id);
    redirect(matchingStartResultUrl(introRequestId, result));
  }

  async function confirmFullMatching() {
    "use server";
    const result = await confirmFullDiscoveryMatchingAction(introRequestId, matchingStart.id);
    // Phase 10: Nach der zweiten Zustimmung KEINE fruehere Matching-Session
    // mehr anlegen. Die Seite fuehrt danach in den aktuellen Teamweg
    // ("Euer Zusammenspiel oeffnen", open_discovery_workstyle_team).
    redirect(matchingStartResultUrl(introRequestId, result));
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

  if (matchingStart.status === "awaiting_other_confirmation") {
    const isRequester = matchingStart.requestedByUserId === currentUserId;

    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {t("matchingPreparation.states.confirmationEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {isRequester
            ? t("matchingPreparation.states.confirmationRequestedTitle", {
                name: counterpartName,
              })
            : t("matchingPreparation.states.confirmTitle", { name: counterpartName })}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {isRequester
            ? t("matchingPreparation.states.confirmationRequestedText", {
                name: counterpartName,
              })
            : t("matchingPreparation.states.confirmText", { name: counterpartName })}
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
  } = await getRequestUser();

  if (!user?.id) {
    const next = `/discovery/intros/${introRequestId}/matching`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!(await hasFounderDiscoveryAccess(user.id, supabase))) {
    redirect("/advisor/dashboard");
  }

  // ---------------------------------------------------------------------
  // DIESER try/catch IST DER FEHLER, DEN MARIA AM 20.09.2026 GEMELDET HAT.
  //
  // "Gemeinsam prüfen" lieferte eine weisse Fehlerseite (Digest 1326995352).
  // Der Grund war strukturell und nicht ein einzelner Bug: Diese Seite laedt
  // drei Dinge ueber Funktionen, die bei JEDEM Datenbankfehler `throw`en -
  // getDiscoveryMatchingPreparation, getMatchingSessionForDiscoveryStart,
  // getMatchingReportRunForSession, und darunter ein Dutzend Abfragen mit
  // `throw new Error(...load_failed)`. Nichts davon wurde gefangen. Ein
  // Schluckauf, eine nicht eingespielte Migration, eine Zeile, die eine
  // Richtlinie nicht hergibt - alles endete in einem Absturz.
  //
  // Die Seite hatte den ehrlichen Zustand dafuer schon: `UnavailableState`. Er
  // wurde nur fuer den null-Fall benutzt, nicht fuer den Wurf.
  //
  // Und das console.error ist kein Ueberrest, sondern der Zweck: Beim naechsten
  // Mal steht im Serverprotokoll, WELCHE der Abfragen es war. Ohne Kennungen -
  // nur der Vorgang und die Meldung.
  // ---------------------------------------------------------------------
  // Phase 11: Keine Matching-Session und kein Matching-Report der frueheren
  // Fassung mehr laden - der Weg fuehrt nach beidseitiger Zustimmung in den
  // aktuellen Teambereich (open_discovery_workstyle_team). Fruehere Reports
  // bleiben ueber ihre eigenen Seiten lesbar.
  let preparation: Awaited<ReturnType<typeof getDiscoveryMatchingPreparation>> = null;
  try {
    preparation = await getDiscoveryMatchingPreparation(introRequestId, user.id);
  } catch (error) {
    console.error("[discovery-matching] preparation_load_failed", {
      operation: "load_matching_preparation",
      reason: error instanceof Error ? error.message : "unknown",
    });
    return <UnavailableState t={t} />;
  }

  if (!preparation) {
    return <UnavailableState t={t} />;
  }
  async function requestJointCheck() {
    "use server";
    const result = await requestDiscoveryJointCheckAction(introRequestId);
    redirect(matchingStartResultUrl(introRequestId, result));
  }

  const currentUserProfile =
    preparation.currentUserRole === "requester"
      ? preparation.requesterProfile
      : preparation.recipientProfile;
  const otherProfile =
    preparation.currentUserRole === "requester"
      ? preparation.recipientProfile
      : preparation.requesterProfile;
  const currentTeam = await currentTeamForPeople(await createClient(), user.id, otherProfile.userId);
  if (currentTeam) redirect(`/teams/${currentTeam}/workstyle`);
  if (preparation.matchingStart?.status === "ready_for_matching") {
    const startId = preparation.matchingStart.id;
    async function openCurrentTeam() {
      "use server";
      const { data, error } = await (await createClient()).rpc("open_discovery_workstyle_team", { p_start_id: startId });
      if (error || !data) redirect(`/discovery/intros/${introRequestId}/matching?currentTeamError=1`);
      redirect(`/teams/${data}/workstyle`);
    }
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <section className={CARD_CLASS}>
            <Link className="text-sm font-medium text-slate-500 hover:text-slate-900" href="/discovery/intros">
              {t("matchingPreparation.backToIntros")}
            </Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {t("matchingPreparation.team.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
              {t("matchingPreparation.team.title", { name: otherProfile.displayName })}
            </h1>
            <p className="mt-4 leading-7 text-slate-700">{t("matchingPreparation.team.text")}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("matchingPreparation.team.boundary")}</p>
            {searchParamValue(resolvedSearchParams.currentTeamError) ? (
              <p role="alert" className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("matchingPreparation.team.error")}
              </p>
            ) : null}
            <form action={openCurrentTeam} className="mt-6">
              <button className={`${PRIMARY_CTA_CLASS} min-h-11`}>{t("matchingPreparation.team.open")}</button>
            </form>
          </section>
        </div>
      </main>
    );
  }
  const matchingStart = preparation.matchingStart;
  // Gibt es zwischen diesen beiden schon einen gemeinsamen Bereich? Dann ist
  // "Gemeinsam pruefen" nicht der naechste Schritt, sondern bereits passiert -
  // und `canCreateDiscoveryMatchingStart` laesst es ohnehin nicht zu.
  const existingSharedContext = preparation.relationshipExists || preparation.invitationExists;
  const matchingStartError = searchParamValue(resolvedSearchParams.matchingStartError);
  const matchingStartResult = searchParamValue(resolvedSearchParams.matchingStartResult);
  const matchingFeedback = matchingStartError
    ? resolveDiscoveryMatchingStartFeedback({ error: matchingStartError })
    : matchingStartResult
      ? resolveDiscoveryMatchingStartFeedback({ result: matchingStartResult })
      : null;
  const feedbackMessage = matchingFeedback ? t(matchingFeedback.messageKey) : null;
  const feedbackOk = matchingFeedback?.ok ?? false;

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

        <PageMessage message={feedbackMessage} ok={feedbackOk} />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            {t("matchingPreparation.safetyNote")}
          </p>
        </section>

        {/* ------------------------------------------------------------------
            DER FALL, DEN MARIA AM 20.09.2026 GEMELDET HAT.

            Zwei Menschen kennen sich schon aus dem Co-Founder-Matching - es
            gibt also eine Beziehung -, und danach finden sie sich NOCH EINMAL
            ueber Find und nehmen dort ein Intro an. Selten, aber es kommt vor.

            Hier stand dann dieser Hinweis: "Oeffnet eure bestehende
            Verbindung, um dort weiterzumachen" - ohne irgendetwas zum
            Anklicken. Und darunter stand weiterhin der Knopf "Gemeinsam
            pruefen", obwohl `canCreateDiscoveryMatchingStart` bei einer
            bestehenden Beziehung immer false ergibt: Die Aktion MUSSTE
            scheitern. Eine Handlung anzubieten, die nicht gehen kann, und
            daneben einen Weg zu nennen, den man nicht gehen kann - das war
            die Sackgasse.
            ------------------------------------------------------------------ */}
        {existingSharedContext ? (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5">
            <h2 className="text-xl font-semibold text-slate-950">
              {t("matchingPreparation.existingContextTitle")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {t("matchingPreparation.existingContextText")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/connections" className={PRIMARY_CTA_CLASS}>
                {t("matchingPreparation.actions.openExistingConnection")}
              </Link>
              <Link href={profileDetailUrl(otherProfile)} className={SECONDARY_CTA_CLASS}>
                {t("common.viewProfile")}
              </Link>
            </div>
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
              counterpartName={otherProfile.displayName}
              t={t}
            />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("matchingPreparation.states.nextStepEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {existingSharedContext
                  ? t("matchingPreparation.states.alreadyConnectedTitle")
                  : t("matchingPreparation.states.startTitle")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {existingSharedContext
                  ? t("matchingPreparation.states.alreadyConnectedSubtext")
                  : t("matchingPreparation.states.startText")}
              </p>
              {existingSharedContext ? null : (
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
              )}
              {/* Kein Knopf, wo die Aktion nicht gehen kann. Ein
                  abgeblendeter waere auch nichts: Er wuerde erklaeren wollen,
                  was schon darueber steht. */}
              {existingSharedContext ? (
                <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  {t("matchingPreparation.states.alreadyConnectedText")}
                </p>
              ) : (
                <div className="mt-6">
                  <form action={requestJointCheck}>
                    <button type="submit" className={PRIMARY_CTA_CLASS}>
                      {t("matchingPreparation.actions.startPreparation")}
                    </button>
                  </form>
                </div>
              )}
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
