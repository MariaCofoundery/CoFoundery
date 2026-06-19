import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DISCOVERY_COMMITMENT_LABELS,
  DISCOVERY_REMOTE_MODE_LABELS,
  DISCOVERY_ROLE_LABELS,
  DISCOVERY_VENTURE_GOAL_LABELS,
} from "@/features/discovery/discoveryConfig";
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

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function matchingPreparationResultUrl(
  introRequestId: string,
  result: DiscoveryMatchingStartActionState
) {
  const params = new URLSearchParams();
  params.set("matchingMessage", result.message ?? "Die Matching-Vorbereitung wurde verarbeitet.");
  params.set("matchingOk", result.ok ? "1" : "0");
  return `/discovery/intros/${introRequestId}/matching?${params.toString()}`;
}

function formatRoleList(values: DiscoveryFounderRole[]) {
  return values.length > 0
    ? values.map((value) => DISCOVERY_ROLE_LABELS[value]).join(", ")
    : "Noch nicht angegeben";
}

function profileDetailUrl(profile: DiscoveryProfilePreview) {
  return `/discovery/${profile.id}`;
}

function ProfileCard({
  eyebrow,
  profile,
}: {
  eyebrow: string;
  profile: DiscoveryProfilePreview;
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
          <dt className="font-semibold text-slate-900">Bringt mit</dt>
          <dd className="mt-1">{formatRoleList(profile.ownRoles)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Sucht</dt>
          <dd className="mt-1">{formatRoleList(profile.seekingRoles)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Arbeitsrahmen</dt>
          <dd className="mt-1">
            {profile.locationLabel ? `${profile.locationLabel} · ` : ""}
            {DISCOVERY_REMOTE_MODE_LABELS[profile.remoteMode]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Commitment / Zielbild</dt>
          <dd className="mt-1">
            {DISCOVERY_COMMITMENT_LABELS[profile.commitmentLevel]} ·{" "}
            {DISCOVERY_VENTURE_GOAL_LABELS[profile.ventureGoal]}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <Link href={profileDetailUrl(profile)} className={SECONDARY_CTA_CLASS}>
          Profil ansehen
        </Link>
      </div>
    </article>
  );
}

function MatchingSessionReadinessCard({
  summary,
  currentUserId,
  reportRun,
}: {
  summary: MatchingSessionSummary;
  currentUserId: string;
  reportRun: MatchingReportRunSummary | null;
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
        Matching-Core
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        Matching-Session vorbereitet
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Cofoundery hat einen gemeinsamen Matching-Kontext angelegt und geprüft, ob eure
        Basis-Antworten schon vorhanden sind. Es wurde kein Report, keine Relationship und kein
        Workbook erstellt.
      </p>
      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        Status:{" "}
        {isReportReady
          ? "Dynamik-Report erstellt"
          : isReadyForReport
            ? "Bereit für Report"
            : "Wartet auf Antworten"}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {summary.participants.map((participant) => (
          <article key={participant.userId} className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {participant.userId === currentUserId ? "Du" : "Gegenüber"}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              {participant.profile?.displayName ?? "Discovery-Profil nicht sichtbar"}
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
                ? "Basis-Fragen vorhanden"
                : "Basis-Fragen fehlen"}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {currentUserBaseMissing ? (
          <Link href="/me/base" className={PRIMARY_CTA_CLASS}>
            Basis-Fragen ausfüllen
          </Link>
        ) : null}
        {isReportReady ? (
          <Link href={`/matching/${summary.session.id}/report`} className={PRIMARY_CTA_CLASS}>
            Dynamik-Report ansehen
          </Link>
        ) : null}
        {isReadyForReport && !isReportReady ? (
          <p className="w-full max-w-3xl text-sm leading-6 text-slate-600">
            Beide Basis-Antworten sind vorhanden. Ihr könnt jetzt einen gemeinsamen Dynamik-Report
            als unveränderlichen Snapshot erstellen.
          </p>
        ) : null}
      </div>
    </>
  );
}

function UnavailableState() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link
          href="/discovery/intros"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Zurück zu meinen Intros
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Dieser Matching-Schritt ist aktuell nicht verfügbar.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Das Intro ist nicht verfügbar, nicht mehr angenommen oder gehört nicht zu deinem
          Account. Private Details werden hier bewusst nicht angezeigt.
        </p>
        <div className="mt-6">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            Zurück zu meinen Intros
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
}: {
  introRequestId: string;
  matchingStart: DiscoveryMatchingStart;
  currentUserId: string;
  matchingSession: MatchingSessionSummary | null;
  reportRun: MatchingReportRunSummary | null;
}) {
  async function requestFullMatching() {
    "use server";
    const result = await requestFullDiscoveryMatchingAction(introRequestId, matchingStart.id);
    redirect(matchingPreparationResultUrl(introRequestId, result));
  }

  async function confirmFullMatching() {
    "use server";
    const result = await confirmFullDiscoveryMatchingAction(introRequestId, matchingStart.id);
    redirect(matchingPreparationResultUrl(introRequestId, result));
  }

  async function createMatchingSession() {
    "use server";
    const result = await createMatchingSessionFromDiscoveryStartAction(introRequestId, matchingStart.id);
    redirect(matchingPreparationResultUrl(introRequestId, result));
  }

  async function createMatchingReport() {
    "use server";
    if (!matchingSession) {
      redirect(
        matchingPreparationResultUrl(introRequestId, {
          ok: false,
          message: "Die Matching-Session ist aktuell nicht verfügbar.",
        })
      );
    }

    const result = await createMatchingReportRunFromSessionAction(matchingSession.session.id);
    if (result.ok && result.reportHref) {
      redirect(result.reportHref);
    }
    redirect(matchingPreparationResultUrl(introRequestId, result));
  }

  if (matchingStart.status === "canceled") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Vorbereitung beendet
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Matching-Vorbereitung beendet
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Diese Matching-Vorbereitung wurde beendet.
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
          />
          {matchingSession.session.status === "ready_for_report" && !reportRun ? (
            <div className="mt-6">
              <form action={createMatchingReport}>
                <button type="submit" className={PRIMARY_CTA_CLASS}>
                  Dynamik-Report erstellen
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
          Bereit
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Bereit für das gemeinsame Matching
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Ihr habt beide bestätigt, dass ihr das vollständige Cofoundery-Matching starten
          möchtet. Als nächstes kann Cofoundery einen gemeinsamen Matching-Kontext anlegen und
          prüfen, ob eure Basis-Antworten schon vorhanden sind.
        </p>
        <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            Intro angenommen
          </li>
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            Matching-Vorbereitung erstellt
          </li>
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            Beide haben den gemeinsamen Matching-Start bestätigt
          </li>
        </ul>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
          Cofoundery legt einen gemeinsamen Matching-Kontext an und prüft, ob eure Basis-Antworten
          schon vorhanden sind. Es wird noch kein Report, keine Relationship und kein Workbook
          erstellt.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={createMatchingSession}>
            <button type="submit" className={PRIMARY_CTA_CLASS}>
              Matching-Session vorbereiten
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
          Bestätigung
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {isRequester ? "Bestätigung angefragt" : "Cofoundery-Matching bestätigen"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {isRequester
            ? "Die andere Person muss den gemeinsamen Matching-Start noch bestätigen."
            : "Die andere Person möchte das vollständige gemeinsame Matching starten. Wenn du bestätigst, seid ihr bereit für den nächsten Schritt."}
        </p>
        <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            Intro angenommen
          </li>
          <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            Matching-Vorbereitung erstellt
          </li>
          <li className="rounded-2xl bg-amber-50 px-4 py-3 font-medium text-amber-900">
            Gemeinsamer Matching-Start wartet auf zweite Bestätigung
          </li>
        </ul>
        <div className="mt-6">
          {isRequester ? (
            <button type="button" disabled className={PRIMARY_DISABLED_CTA_CLASS}>
              Warte auf Bestätigung
            </button>
          ) : (
            <form action={confirmFullMatching}>
              <button type="submit" className={PRIMARY_CTA_CLASS}>
                Matching bestätigen
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
        Vorbereitung gestartet
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        Matching-Vorbereitung gestartet
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Wenn du bereit bist, kannst du den gemeinsamen Matching-Start anfragen. Die andere Person
        muss anschließend bestätigen.
      </p>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
        <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
          Intro angenommen
        </li>
        <li className="rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
          Matching-Vorbereitung erstellt
        </li>
        <li className="rounded-2xl bg-slate-50 px-4 py-3">
          Vollständiger Cofoundery-Matching-Start braucht beide Bestätigungen
        </li>
      </ul>
      <div className="mt-6">
        <form action={requestFullMatching}>
          <button type="submit" className={PRIMARY_CTA_CLASS}>
            Vollständiges Matching anfragen
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
    return <UnavailableState />;
  }

  async function startMatchingPreparation() {
    "use server";
    const result = await startDiscoveryMatchingPreparationAction(introRequestId);
    redirect(matchingPreparationResultUrl(introRequestId, result));
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
            Zurück zu meinen Intros
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Discovery Intro
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Gemeinsames Cofoundery-Matching vorbereiten
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Ihr habt beide Interesse signalisiert. Der nächste sinnvolle Schritt ist ein
            vollständiges Cofoundery-Matching, damit ihr Rollen, Commitment, Arbeitsweise und
            Erwartungen gemeinsam reflektieren könnt.
          </p>
        </header>

        <PageMessage message={matchingMessage} ok={matchingOk} />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-6 text-amber-950">
            Hier wird noch nichts automatisch erstellt: keine Einladung, keine Relationship,
            kein Report und kein Workbook.
          </p>
        </section>

        {preparation.relationshipExists || preparation.invitationExists ? (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Es gibt bereits einen bestehenden Cofoundery-Kontext
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Für euch scheint bereits ein Matching- oder Verbindungsstand zu existieren. Damit
              nichts doppelt angelegt wird, startet diese Vorbereitungsseite keinen neuen Prozess.
            </p>
          </section>
        ) : null}

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Beteiligte Profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Öffentliche Discovery-Projektion
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Angezeigt werden nur Angaben, die ihr bewusst über Discovery veröffentlicht habt.
            E-Mail-Adressen, private Suchprioritäten und Assessment-Daten bleiben verborgen.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ProfileCard eyebrow="Du" profile={currentUserProfile} />
            <ProfileCard eyebrow="Gegenüber" profile={otherProfile} />
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
            />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Nächster Schritt
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Matching-Vorbereitung starten
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Damit merkt Cofoundery sich, dass ihr aus diesem angenommenen Intro gemeinsam
                weitergehen möchtet. Dabei wird noch keine Einladung, keine Relationship, kein
                Report und kein Workbook erstellt.
              </p>
              <ol className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  1. Ihr startet das vollständige Cofoundery-Matching.
                </li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  2. Beide füllen die relevanten Cofoundery-Fragen aus oder bestätigen vorhandene
                  Antworten.
                </li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">
                  3. Danach entsteht ein gemeinsamer Dynamik-Report und ihr könnt mit dem Workbook
                  weiterarbeiten.
                </li>
              </ol>
              <div className="mt-6">
                <form action={startMatchingPreparation}>
                  <button type="submit" className={PRIMARY_CTA_CLASS}>
                    Matching-Vorbereitung starten
                  </button>
                </form>
              </div>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
              Zurück zu meinen Intros
            </Link>
            <Link href={profileDetailUrl(otherProfile)} className={SECONDARY_CTA_CLASS}>
              Profil ansehen
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
