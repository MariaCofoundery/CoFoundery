import Link from "next/link";
import {
  resendAdvisorTeamInviteFounderAction,
  revokeAdvisorPendingTeamInviteAction,
} from "@/features/dashboard/advisorTeamInviteActions";
import { type AdvisorPendingTeamInvite } from "@/features/dashboard/advisorTeamInviteData";
import { type AdvisorDashboardTeam } from "@/features/dashboard/dashboardRoleData";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { describeAdvisorFounderSetupPause } from "@/features/teams/founderSetupAdvisorAccessModel";
import type { getTranslations } from "next-intl/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";

/**
 * Die Teams, die ein Advisor begleitet, und die offenen Team-Einladungen.
 *
 * HERAUSGEZOGEN AM 21.10.2026 aus der Startseite des Advisors: Die Liste
 * steht jetzt unter „Begleitung", die Startseite zeigt nur, was wartet. Der
 * Inhalt ist unveraendert.
 */
const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const TERTIARY_CTA_CLASS =
  "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";
const DISABLED_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400";

export type AdvisorT = Awaited<ReturnType<typeof getTranslations>>;

function accessStatusClassName(status: AdvisorDashboardTeam["accessStatus"]) {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50/80 text-emerald-800";
  }

  if (status === "paused") {
    return "border-amber-200 bg-amber-50/80 text-amber-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function progressToneClassName(params: { active: boolean; tone: "default" | "success" | "warning" }) {
  if (!params.active) {
    return "border-slate-200 bg-slate-50 text-slate-400";
  }

  if (params.tone === "success") {
    return "border-emerald-200 bg-emerald-50/80 text-emerald-800";
  }

  if (params.tone === "warning") {
    return "border-amber-200 bg-amber-50/80 text-amber-800";
  }

  return "border-sky-200 bg-sky-50/80 text-sky-800";
}

function reportStatusLabel(team: AdvisorDashboardTeam, t: AdvisorT) {
  if (team.accessStatus !== "ready") {
    return t("dashboard.statuses.noAccess");
  }

  if (team.reportReady) {
    return t("dashboard.statuses.ready");
  }

  return t("dashboard.statuses.preparing");
}

function teamStandLabel(team: AdvisorDashboardTeam, t: AdvisorT) {
  if (team.accessStatus === "paused" || team.accessStatus === "revoked") {
    return t("dashboard.statuses.advisorPaused");
  }

  if (team.accessStatus === "waiting_for_approval") {
    return t("dashboard.statuses.waitingApproval");
  }

  if (team.reportReady) {
    return t("dashboard.statuses.reportReady");
  }

  if (team.activityStatus === "founder_reaction_ready") {
    return t("dashboard.statuses.founderReactionReady");
  }

  if (team.activityStatus === "founder_reaction_open") {
    return t("dashboard.statuses.founderReactionOpen");
  }

  return t("dashboard.statuses.currentStatus");
}

function teamAttentionLabel(team: AdvisorDashboardTeam, t: AdvisorT) {
  if (team.accessStatus !== "ready") {
    return team.accessStatus === "paused" || team.accessStatus === "revoked"
      ? t("dashboard.statuses.checkApproval")
      : t("dashboard.statuses.waitingSecondApproval");
  }

  if (!team.reportReady) {
    return t("dashboard.statuses.waitReport");
  }

  if (team.activityStatus === "founder_reaction_ready") {
    return t("dashboard.statuses.viewFounderReaction");
  }

  if (team.activityStatus === "founder_reaction_open") {
    return t("dashboard.statuses.checkNewReaction");
  }

  return t("dashboard.statuses.openReport");
}

function founderSetupStatusLabel(team: AdvisorDashboardTeam, t: AdvisorT) {
  const { status, confirmedItemCount } = team.founderSetupAccess;
  if (status === "active" && confirmedItemCount === 0) {
    return t("dashboard.setupStatuses.activeEmpty");
  }
  return t(`dashboard.setupStatuses.${status}`);
}

function teamLastActivityLabel(team: AdvisorDashboardTeam, t: AdvisorT, locale: string) {
  const teamContext =
    team.teamContext === "existing_team"
      ? t("teamContext.existingTeam")
      : t("teamContext.preFounder");
  const timestamp = team.lastActivityAt
    ? formatPendingTimestamp(team.lastActivityAt, locale)
    : t("dashboard.statuses.noActivity");

  return `${teamContext} · ${t("dashboard.lastActivityPrefix")} ${timestamp}`;
}

/**
 * BEHOBEN am 19.09.2026.
 *
 * Hier stand `team.canOpenWorkbook ? accessPaused : accessRevoked` - und
 * canOpenWorkbook war bei pausiert UND bei widerrufen false. Also bekam jeder
 * pausierte Advisor die Meldung ueber einen Widerruf zu sehen, und die
 * Beschriftung fuer "pausiert" war unerreichbar. Wer nur darauf wartete, dass
 * eine Zustimmung zurueckkommt, las, die Founder haetten ihn abgesetzt.
 *
 * Jetzt entscheidet der Status selbst, weil er beides unterscheidet.
 */
function accessStatusLabel(team: AdvisorDashboardTeam, t: AdvisorT) {
  if (team.accessStatus === "revoked") {
    return t("dashboard.statuses.accessRevoked");
  }

  if (team.accessStatus === "paused") {
    return t("dashboard.statuses.accessPaused");
  }

  if (team.accessStatus === "ready") {
    return t("dashboard.statuses.accessGranted");
  }

  return t("dashboard.statuses.accessWaiting");
}

function accessStatusDescription(team: AdvisorDashboardTeam, t: AdvisorT) {
  if (team.accessStatus === "revoked") {
    return t("dashboard.accessDescription.revoked");
  }

  if (team.accessStatus === "paused") {
    return t("dashboard.accessDescription.paused");
  }

  if (team.accessStatus === "ready") {
    return t("dashboard.accessDescription.ready");
  }

  return t("dashboard.accessDescription.waiting");
}

function approvalSummary(team: AdvisorDashboardTeam, t: AdvisorT) {
  // Vorher baute die Datenschicht "1 von 2 Freigaben" und hier wurde die Zahl
  // mit einem Regex zurueckgeholt. Eine Formulierungsaenderung haette daraus
  // still eine 0 gemacht.
  return t("dashboard.approvals", { count: team.approvalCount });
}

function advisorFollowUpLabel(followUp: AdvisorDashboardTeam["followUp"], t: AdvisorT) {
  if (followUp === "four_weeks") return t("dashboard.followUps.fourWeeks");
  if (followUp === "three_months") return t("dashboard.followUps.threeMonths");
  return t("dashboard.followUps.none");
}

function pendingStandLabel(invite: AdvisorPendingTeamInvite, t: AdvisorT) {
  if (invite.founderAStarted && invite.founderBStarted) {
    return t("dashboard.statuses.bothStarted");
  }
  if (invite.founderAStarted || invite.founderBStarted) {
    return t("dashboard.statuses.oneStarted");
  }
  return t("dashboard.statuses.teamStarting");
}

function pendingAttentionLabel(invite: AdvisorPendingTeamInvite, t: AdvisorT) {
  if (!invite.founderAStarted && !invite.founderBStarted) {
    return t("dashboard.statuses.waitingFirstStart");
  }

  const openFounder = !invite.founderAStarted
    ? invite.founderALabel
    : !invite.founderBStarted
      ? invite.founderBLabel
      : null;

  if (openFounder) {
    return t("dashboard.statuses.founderOpen", { name: openFounder });
  }

  return t("dashboard.statuses.movesToTeams");
}

function pendingFounderProgressLabel(invite: AdvisorPendingTeamInvite, founder: "A" | "B", t: AdvisorT) {
  const isStarted = founder === "A" ? invite.founderAStarted : invite.founderBStarted;
  if (isStarted) return t("dashboard.statuses.accepted");
  const sendStatus = founder === "A" ? invite.founderASendStatus : invite.founderBSendStatus;
  if (sendStatus === "failed") return t("dashboard.statuses.sendFailed");
  if (sendStatus === "sent") return t("dashboard.statuses.invitationSent");
  return t("dashboard.statuses.notSent");
}

function formatPendingTimestamp(value: string, locale: string) {
  return new Intl.DateTimeFormat(getPresentationLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TeamFounderAvatars({ team }: { team: AdvisorDashboardTeam }) {
  return (
    <div className="flex -space-x-2">
      <ProfileAvatar
        displayName={team.founderAName}
        avatarId={team.founderAAvatarId}
        imageUrl={team.founderAAvatarUrl}
        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
        fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-semibold text-slate-700 shadow-sm"
      />
      <ProfileAvatar
        displayName={team.founderBName}
        avatarId={team.founderBAvatarId}
        imageUrl={team.founderBAvatarUrl}
        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
        fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-stone-100 text-[11px] font-semibold text-slate-700 shadow-sm"
      />
    </div>
  );
}

function TeamCard({ team, t, locale }: { team: AdvisorDashboardTeam; t: AdvisorT; locale: string }) {
  return (
    <article className="advisor-card p-4 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <TeamFounderAvatars team={team} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {team.teamContext === "existing_team"
                  ? t("teamContext.existingRelationship")
                  : t("teamContext.exploringRelationship")}
              </p>
              <h3 className="mt-1 break-words text-lg font-semibold text-slate-950 sm:text-xl">
                {team.founderAName} & {team.founderBName}
              </h3>
              {team.teamName ? (
                <p className="mt-1 text-sm text-slate-600">
                  {t("dashboard.teamProject", { name: team.teamName })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3 [&>p]:min-w-0 [&>p]:break-words">
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {t("dashboard.fields.status")}
              </span>
              {teamStandLabel(team, t)}
            </p>
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {t("dashboard.fields.last")}
              </span>
              {teamLastActivityLabel(team, t, locale)}
            </p>
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {t("dashboard.fields.nextLook")}
              </span>
              {teamAttentionLabel(team, t)}
            </p>
          </div>
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm lg:w-64">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("dashboard.fields.teamAccess")}</p>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${accessStatusClassName(team.accessStatus)}`}>
            {accessStatusLabel(team, t)}
          </span>
          <p className="mt-3 font-medium text-slate-900">
            {t("dashboard.fields.approval")}: {approvalSummary(team, t)}
          </p>
          <p className="mt-1 leading-6 text-slate-600">{accessStatusDescription(team, t)}</p>
          <div className="mt-4 grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.fields.report")}</span>
              <span
                // BEHOBEN am 20.09.2026: Hier stand `team.reportReady &&
                // team.workbookAvailable`. Ein fertiger Report sah damit
                // gedaempft aus, solange kein historisches Workbook existierte
                // - und das Workbook ist aus diesem Bereich jetzt ganz weg. Die
                // Ampel haengt an dem, was sie anzeigt.
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${progressToneClassName({
                  active: team.reportReady,
                  tone: team.reportReady ? "success" : "warning",
                })}`}
              >
                {reportStatusLabel(team, t)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Founder Setup</span>
                <span className="text-right text-xs font-medium text-slate-700">
                  {founderSetupStatusLabel(team, t)}
                </span>
              </div>
              {/* "Freigabe pausiert" allein liess raten. Der Grund steht in den
                  Zahlen, die ohnehin mitkommen - und benennt den ZUSTAND, nicht
                  das Ereignis: Ein Team mit einer Person kann eine Loeschung,
                  einen Austritt oder eine Entfernung hinter sich haben. */}
              {describeAdvisorFounderSetupPause(team.founderSetupAccess) ? (
                <p className="mt-1.5 text-left text-xs leading-5 text-slate-500">
                  {t(
                    `dashboard.setupPauseReasons.${describeAdvisorFounderSetupPause(
                      team.founderSetupAccess
                    )}`
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          DIE REIHE HATTE VIER GLEICH LAUTE KNOEPFE und darunter, im Kasten
          mit dem Zustand des Teams, die eigene Wiedervorlage. Das war die
          unlogische Optik: Was das TEAM angeht und was man sich SELBST
          vorgenommen hat, stand durcheinander, und kein Knopf war der
          naechste Schritt.

          Jetzt: Das Sitzungsblatt ist der eine hervorgehobene Weg - dort
          liegt die eigene Arbeit, und von dort geht es weiter zum Report.
          Der Report daneben, der Snapshot als stiller Export. Und die
          eigene Wiedervorlage steht rechts, abgesetzt von allem, was das
          Team betrifft.
          ----------------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          {team.reportAvailable ? (
            <>
              <Link href={team.sessionHref} className={PRIMARY_CTA_CLASS}>
                {t("dashboard.openSession")}
              </Link>
              <Link href={team.reportHref} className={SECONDARY_CTA_CLASS}>
                {t("dashboard.viewReport")}
              </Link>
            </>
          ) : (
            <span className={DISABLED_CTA_CLASS}>
              {team.accessStatus === "ready"
                ? t("dashboard.reportNotReady")
                : accessStatusLabel(team, t)}
            </span>
          )}
          {team.snapshotAvailable ? (
            <Link href={team.snapshotHref} className={TERTIARY_CTA_CLASS}>
              {t("dashboard.exportSnapshot")}
            </Link>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          <span className="uppercase tracking-[0.14em] text-slate-400">
            {t("dashboard.fields.followUp")}
          </span>{" "}
          {advisorFollowUpLabel(team.followUp, t)}
        </p>
      </div>

    </article>
  );
}

export function TeamSection({
  title,
  description,
  teams,
  t,
  locale,
}: {
  title: string;
  description: string;
  teams: AdvisorDashboardTeam[];
  t: AdvisorT;
  locale: string;
}) {
  if (teams.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
          {t("dashboard.teamCount", { count: teams.length })}
        </span>
      </div>
      <div className="grid gap-5">
        {teams.map((team) => (
          <TeamCard key={team.invitationId} team={team} t={t} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function PendingInviteCard({
  invite,
  t,
  locale,
}: {
  invite: AdvisorPendingTeamInvite;
  t: AdvisorT;
  locale: string;
}) {
  return (
    <article className="advisor-card p-4 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("dashboard.pending.type")}</p>
          <h3 className="mt-1 break-words text-lg font-semibold text-slate-950 sm:text-xl">
            {invite.teamName || `${invite.founderALabel} & ${invite.founderBLabel}`}
          </h3>
          {invite.teamName ? (
            <p className="mt-1 text-sm text-slate-600">
              {invite.founderALabel} & {invite.founderBLabel}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3 [&>p]:min-w-0 [&>p]:break-words">
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {t("dashboard.fields.status")}
              </span>
              {pendingStandLabel(invite, t)}
            </p>
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {t("dashboard.fields.last")}
              </span>
              {formatPendingTimestamp(invite.lastActivityAt, locale)}
            </p>
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {t("dashboard.fields.nextLook")}
              </span>
              {pendingAttentionLabel(invite, t)}
            </p>
          </div>
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm lg:w-72">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            {invite.founderAStarted && invite.founderBStarted
              ? t("dashboard.statuses.accepted")
              : invite.status === "expired"
                ? t("dashboard.statuses.invitationExpired")
                : t("dashboard.statuses.founderInvited")}
          </span>
          <div className="mt-4 grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2">
              <span className="min-w-0 break-all text-xs uppercase tracking-[0.14em] text-slate-500">{invite.founderALabel}</span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                  invite.founderAStarted
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {pendingFounderProgressLabel(invite, "A", t)}
              </span>
              {!invite.founderAStarted && invite.status === "pending" ? (
                <form action={resendAdvisorTeamInviteFounderAction}>
                  <input type="hidden" name="pendingTeamId" value={invite.id} />
                  <input type="hidden" name="founderSlot" value="founderA" />
                  <button type="submit" className="text-xs font-medium text-slate-700 underline underline-offset-4">{t("dashboard.pending.resend")}</button>
                </form>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2">
              <span className="min-w-0 break-all text-xs uppercase tracking-[0.14em] text-slate-500">{invite.founderBLabel}</span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                  invite.founderBStarted
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {pendingFounderProgressLabel(invite, "B", t)}
              </span>
              {!invite.founderBStarted && invite.status === "pending" ? (
                <form action={resendAdvisorTeamInviteFounderAction}>
                  <input type="hidden" name="pendingTeamId" value={invite.id} />
                  <input type="hidden" name="founderSlot" value="founderB" />
                  <button type="submit" className="text-xs font-medium text-slate-700 underline underline-offset-4">{t("dashboard.pending.resend")}</button>
                </form>
              ) : null}
            </div>
          </div>
          {invite.status === "pending" ? (
            <form action={revokeAdvisorPendingTeamInviteAction} className="mt-4">
              <input type="hidden" name="pendingTeamId" value={invite.id} />
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                {t("dashboard.pending.remove")}
              </button>
            </form>
          ) : null}
          {invite.status === "expired" && !(invite.founderAStarted && invite.founderBStarted) ? (
            <a href="#advisor-invite-form" className="mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100">
              {t("dashboard.pending.createNew")}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PendingInviteSection({
  invites,
  t,
  locale,
}: {
  invites: AdvisorPendingTeamInvite[];
  t: AdvisorT;
  locale: string;
}) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{t("dashboard.pending.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {t("dashboard.pending.description")}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
          {t("dashboard.pending.openCount", { count: invites.length })}
        </span>
      </div>
      <div className="grid gap-5">
        {invites.map((invite) => (
          <PendingInviteCard key={invite.id} invite={invite} t={t} locale={locale} />
        ))}
      </div>
    </section>
  );
}

