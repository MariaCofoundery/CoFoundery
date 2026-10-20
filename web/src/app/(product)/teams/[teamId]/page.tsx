import { loadTeamJourneyStatus } from "@/features/teams/TeamJourneyStatus";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ReadMyMindHomebaseCard } from "@/features/collaborationLab/ReadMyMindHomebaseCard";
import { FounderInTheWildHomebaseCard } from "@/features/founderInTheWild/FounderInTheWildHomebaseCard";
import { FounderLibraryHomebaseCard } from "@/features/founderLibrary/FounderLibraryHomebaseCard";
import { TeamPageHeader } from "@/features/teams/TeamPageHeader";
import { TeamOverview } from "@/features/teams/TeamOverview";
import { TeamShareCard } from "@/features/teams/TeamShareCard";
import { BetaTeamCard } from "@/features/modules/ui/BetaTeamCard";
import { TradeoffsTeamCard } from "@/features/modules/ui/TradeoffsTeamCard";
import { LeaveTeamSection } from "@/features/teams/LeaveTeamSection";
import { parseTeamReadiness } from "@/features/reporting/workstyle/teamReadiness";
import { FounderRelationshipAdvisorPanel } from "@/features/teams/FounderRelationshipAdvisorPanel";
import {
  getFounderTeamHomebase,
  type FounderTeamHomebase,
} from "@/features/teams/founderTeamHomebaseData";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { countFounderSetupStatuses } from "@/features/teams/founderSetupModel";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";

type TeamHomebasePageProps = {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ teamfreigabe?: string; verlassen?: string }>;
};

const SECTION_CLASS =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6";
const CARD_CLASS = "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5";
const CARD_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const GROUP_TITLE_CLASS = "text-lg font-semibold text-slate-950";
const GROUP_TEXT_CLASS = "mt-1 max-w-3xl text-sm leading-6 text-slate-600";
const LINK_CLASS =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

function memberNames(
  team: FounderTeamHomebase,
  fallback: (index: number) => string
) {
  return new Map(
    team.members.map((member, index) => [
      member.userId,
      member.displayName ?? fallback(index + 1),
    ])
  );
}

function pairName(
  userIds: [string, string],
  names: Map<string, string>,
  fallback: (index: number) => string
) {
  return userIds
    .map((userId, index) => names.get(userId) ?? fallback(index + 1))
    .join(" & ");
}

export default async function TeamHomebasePage({ params, searchParams }: TeamHomebasePageProps) {
  const { teamId } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}`)}`);
  }

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;
  const [setup, setupAdvisorAccess, labStateResult, shareReadinessResult] = await Promise.all([
    // Das bestehende Setup-Readmodel - dieselbe Quelle wie die Setup-Seite.
    // Nicht lesbar heisst "Status nicht verfuegbar", nicht "offen".
    getFounderSetup(teamId, user.id, supabase).catch(() => null),
    getFounderSetupAdvisorAccess(teamId, supabase),
    team.alignment.length
      ? supabase.from("commitment_labs").select("relationship_id").in("relationship_id", team.alignment.map((entry) => entry.relationshipId))
      : Promise.resolve({ data: [], error: null }),
    // Phase 11.7B: eigene Teamfreigabe (und Bestand) - nur Wahrheitswerte.
    supabase.rpc("get_workstyle_team_share_readiness", { p_team_id: teamId }),
  ]);
  const shareReadiness = parseTeamReadiness(shareReadinessResult.data);
  const viewerShare = shareReadiness?.members.find((member) => member.is_viewer);
  const teamShareActive = Boolean(shareReadiness?.viewer_team_share);
  const labRows = labStateResult.error
    ? []
    : ((labStateResult.data ?? []) as Array<{ relationship_id: string }>);
  const startedLabRelationships = new Set(labRows.map((row) => row.relationship_id));
  const labCompletionResults = await Promise.all(
    labRows.map(async (row) => ({
      relationshipId: row.relationship_id,
      result: await supabase.rpc("is_commitment_lab_complete", {
        p_relationship_id: row.relationship_id,
      }),
    }))
  );
  const completedLabRelationships = new Set(
    labCompletionResults.flatMap(({ relationshipId, result }) =>
      !result.error && result.data ? [relationshipId] : []
    )
  );

  /**
   * Ein Paar, das gerade erst zusammengefunden hat.
   *
   * Absichtlich nur aus dem, was diese Seite ohnehin weiss: kein Report, kein
   * Setup begonnen, kein Lab gestartet. Eine feinere Empfehlung waere geraten -
   * und ein falscher Rat ist schlechter als keiner.
   */
  const isNewPair =
    team.members.length === 2 &&
    team.alignment.every((entry) => !entry.matchingReport && !entry.classicReport) &&
    !setup?.started &&
    startedLabRelationships.size === 0;

  const [t, commitmentT, setupT, journey] = await Promise.all([
    getTranslations("teams.homebase"),
    getTranslations("teams.commitmentLab"),
    getTranslations("teams.setup"),
    loadTeamJourneyStatus({ teamId: team.id, userId: user.id, client: supabase, setup }),
  ]);
  const fallback = (index: number) => t("founders.fallback", { index });
  const names = memberNames(team, fallback);
  const founderNames = team.members.map(
    (member, index) => names.get(member.userId) ?? fallback(index + 1)
  );
  const title = team.name ?? founderNames.join(" + ");
  const context =
    team.teamContext === "existing_team"
      ? t("context.existingTeam")
      : t("context.preFounder");
  const pendingSetupAdvisorTask = setupAdvisorAccess.find(
    (entry) => Boolean(entry.grantId) && !entry.accessActive && !entry.consentedFounderUserIds.includes(user.id)
  );
  // Dieselbe Zaehlung wie auf der Setup-Seite - keine eigene Ableitung, kein
  // Nenner, kein Prozentwert.
  const setupCounts = setup?.started ? countFounderSetupStatuses(setup) : null;
  const rosterChanged = Boolean(setup?.items.some((item) => item.rosterConfirmationMissing));
  const isPairTeam = team.members.length === 2;
  // Nur verbundene Begleitung aus dem bestehenden Paar-Reader - keine neue
  // Advisor-Abfrage, keine Ableitung aus Rollen.
  const linkedAdvisors = [
    ...new Set(
      team.advisors
        .filter((advisor) => advisor.status === "linked")
        .flatMap((advisor) => (advisor.advisorName?.trim() ? [advisor.advisorName.trim()] : []))
    ),
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* -----------------------------------------------------------------
          PHASE 9.4B / 11.7B: EIN GEMEINSAMER ARBEITSRAUM

          Oben der kompakte Teamkopf mit "← Verbindungen" und der lokalen
          Teamnavigation (Phase 11.7B, statt Brotkrume und eigener Leiste
          unter der Karte). Darunter das Team selbst (Menschen, Einladung,
          Status), die Teamfreigabe und drei Ebenen: Verstehen, Vertiefen
          (zu zweit), Vereinbaren. Ganz unten leise: Rueckblick und Team
          verlassen.
          ----------------------------------------------------------------- */}
      <TeamPageHeader teamId={teamId} active="overview" title={title} eyebrow={t("eyebrow")} hideTitle />

      <TeamOverview
        teamId={team.id}
        title={title}
        teamName={team.name}
        members={team.members.map((member, index) => ({
          userId: member.userId,
          displayName: founderNames[index],
          avatarId: member.avatarId,
          avatarUrl: member.avatarUrl,
        }))}
        journey={journey}
        canInvite={team.members.length < 4}
      />
      {linkedAdvisors.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{t("header.advisors", { names: linkedAdvisors.join(", ") })}</p>
      ) : null}

      <div className="mt-5">
        <TeamShareCard
          teamId={team.id}
          active={teamShareActive}
          legacyShared={Boolean(viewerShare?.shared_with_team && !viewerShare.team_share_active)}
          returnTo={`/teams/${encodeURIComponent(team.id)}#teamfreigabe`}
          status={query.teamfreigabe ?? null}
        />
      </div>

      <div className="mt-8 grid gap-10">
        {/* GEMEINSAM VERTIEFEN: Vertiefungen fuer das ganze Team - ein gemeinsamer
            Vergleich erst, wenn alle aktuellen Mitglieder abgeschlossen und
            freigegeben haben. Hier steht nur die eigene Lage. */}
        <BetaTeamCard client={supabase} teamId={teamId} memberCount={team.members.length} />
        <TradeoffsTeamCard client={supabase} teamId={teamId} memberCount={team.members.length} />

        {/* VERTIEFEN: ausdruecklich zu zweit. Nur tatsaechlich vorhandene
            Paare - keine erfundenen Paarungen, keine neuen Relationships. */}
        <details id="team-deep-dives" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white/70 p-4" open={!isPairTeam}>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">{t("deepen.summary")}</summary>
        <section className="mt-4" aria-labelledby="team-deepen-title">
          <h2 id="team-deepen-title" className={GROUP_TITLE_CLASS}>{t("groups.discover.title")}</h2>
          {isNewPair ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm leading-7 text-slate-700">
              {t("groups.whereToStart")}
            </p>
          ) : null}
          {isPairTeam ? (
            <p className="mt-4 text-sm font-semibold text-slate-900">
              {t("deepen.pair", { names: founderNames.join(" & ") })}
            </p>
          ) : (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{t("deepen.twoOnly")}</p>
          )}

          <div className="mt-4 grid gap-4">
            {team.alignment.length > 0 ? (
              <section className={CARD_CLASS} aria-labelledby="commitment-lab-title">
                <h3 id="commitment-lab-title" className="text-base font-semibold text-slate-950">{commitmentT("title")}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{commitmentT("description")}</p>
                <ul className="mt-4 grid gap-3">
                  {team.alignment.map((entry) => {
                    const participants = pairName(entry.participantUserIds, names, fallback);
                    const started = startedLabRelationships.has(entry.relationshipId);
                    const completed = completedLabRelationships.has(entry.relationshipId);
                    return (
                      <li
                        key={entry.relationshipId}
                        className={
                          // Im Zweierteam steht das Paar schon oben - dann
                          // keine leere umrandete Zeile, nur Zustand und Aktion.
                          isPairTeam
                            ? "flex flex-wrap items-center gap-3"
                            : "flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                        }
                      >
                        <div>
                          {/* Im Zweierteam ist das Paar oben genannt; ab drei steht es an jeder Zeile. */}
                          {!isPairTeam ? (
                            <p className="text-sm font-semibold text-slate-900">{commitmentT("pair", { names: participants })}</p>
                          ) : null}
                          {completed ? <p className="mt-1 text-xs font-medium text-slate-600">{commitmentT("completed")}</p> : null}
                        </div>
                        <Link
                          href={`/teams/${encodeURIComponent(teamId)}/commitment-lab/${encodeURIComponent(entry.relationshipId)}`}
                          className={CARD_LINK_CLASS}
                        >
                          {commitmentT(completed ? "view" : started ? "continue" : "start")}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <ReadMyMindHomebaseCard
                currentUserId={user.id}
                team={{
                  id: team.id,
                  name: team.name,
                  members: team.members.map((member) => ({
                    userId: member.userId,
                    displayName: member.displayName,
                    avatarId: member.avatarId,
                    avatarUrl: member.avatarUrl,
                  })),
                }}
              />
              <FounderInTheWildHomebaseCard
                currentUserId={user.id}
                team={{
                  id: team.id,
                  name: team.name,
                  members: team.members.map((member) => ({ userId: member.userId, displayName: member.displayName, avatarId: member.avatarId, avatarUrl: member.avatarUrl })),
                }}
              />
            </div>
          </div>
        </section>
        </details>

        {/* VEREINBAREN: Founder Setup ist der verbindliche Ort. Zahlen nur aus
            dem bestehenden Readmodel; bestaetigt ist, was alle AKTUELLEN
            Mitglieder bestaetigt haben. */}
        <section aria-labelledby="team-agree-title">
          <h2 id="team-agree-title" className={GROUP_TITLE_CLASS}>{t("groups.commit.title")}</h2>
          <article
            className="mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 sm:p-6"
            aria-labelledby="team-setup-title"
          >
            <h3 id="team-setup-title" className="text-lg font-semibold text-slate-950">{t("setup.title")}</h3>
            <p className="mt-4 text-sm font-medium text-slate-800">
              {setupCounts
                ? setupT("summary", {
                    clarified: setupCounts.clarified + setupCounts.documented + setupCounts.not_relevant,
                    discussing: setupCounts.discussing,
                    open: setupCounts.open,
                    pending: setupCounts.confirmation_pending,
                  })
                : setup
                  ? t("setup.notStarted")
                  : t("journey.setup.unavailable")}
            </p>
            {rosterChanged ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-700">{setupT("rosterChanged")}</p>
            ) : null}
            {pendingSetupAdvisorTask ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{t("setup.advisorTask.title")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t("setup.advisorTask.description")}</p>
                <Link href={`/teams/${teamId}/setup#advisor-setup-access`} className={`${CARD_LINK_CLASS} mt-3`}>{t("setup.advisorTask.cta")}</Link>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/teams/${teamId}/setup`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
              >
                {t("setup.open")}
              </Link>
              {setup?.started ? (
                <Link href={`/teams/${teamId}/setup/document`} className={CARD_LINK_CLASS}>
                  {t("setup.document")}
                </Link>
              ) : null}
            </div>
          </article>
        </section>

        <section aria-labelledby="team-resources-title">
          <h2 id="team-resources-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("groups.resources.title")}
          </h2>
          <div className="mt-3">
            <FounderLibraryHomebaseCard teamId={teamId} />
          </div>
        </section>

        {/* Rueckblick: eingeklappt, am Ende, nicht gleichrangig. */}
        <details id="team-alignment" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <summary className="cursor-pointer rounded-lg text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("alignment.history")}</summary>
        <section
          className={`${SECTION_CLASS} scroll-mt-32`}
          aria-labelledby="team-alignment-title"
        >
          <h2 id="team-alignment-title" className="text-xl font-semibold text-slate-950">
            {t("alignment.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {t("alignment.description")}
          </p>

          {team.alignment.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t("alignment.empty")}
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {team.alignment.map((entry) => {
                const participants = pairName(entry.participantUserIds, names, fallback);
                // All links here are historical and never create new drafts.
                const hasLinks = Boolean(
                  entry.workbook ||
                    entry.matchingWorkspace ||
                    entry.classicReport ||
                    entry.matchingReport
                );
                return (
                  <article
                    key={entry.relationshipId}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t("alignment.pair", { names: participants })}
                    </h3>
                    {hasLinks ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {entry.matchingReport ? (
                          <Link href={entry.matchingReport.href} className={LINK_CLASS}>
                            {t("alignment.matchingReport")}
                          </Link>
                        ) : null}
                        {entry.workbook ? (
                          <Link href={entry.workbook.href} className={LINK_CLASS}>
                            {t("alignment.workbook")}
                          </Link>
                        ) : null}
                        {entry.matchingWorkspace ? (
                          <Link href={entry.matchingWorkspace.href} className={LINK_CLASS}>
                            {t("alignment.workspace")}
                          </Link>
                        ) : null}
                        {entry.classicReport ? (
                          <Link
                            href={entry.classicReport.href}
                            className="inline-flex min-h-11 items-center text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800"
                          >
                            {t("alignment.report")}
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {t("alignment.noArtifacts")}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className={SECTION_CLASS} aria-labelledby="team-agreements-title">
          <h2 id="team-agreements-title" className="text-xl font-semibold text-slate-950">
            {t("agreements.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {t("agreements.description")}
          </p>
          {team.agreements.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t("agreements.empty")}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {team.agreements.map((agreement) => {
                const participants = pairName(agreement.participantUserIds, names, fallback);
                return (
                  <li
                    key={`${agreement.source}:${agreement.relationshipId}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {agreement.source === "workbook"
                          ? t("agreements.workbook")
                          : t("agreements.workspace")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("agreements.pair", { names: participants })}
                      </p>
                    </div>
                    <Link href={agreement.href} className={LINK_CLASS}>
                      {t("agreements.open")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        </details>

        <FounderRelationshipAdvisorPanel team={team} currentUserId={user.id} names={names} />

        <LeaveTeamSection teamId={team.id} memberCount={team.members.length} failed={query.verlassen === "fehler"} />
      </div>
    </main>
  );
}
