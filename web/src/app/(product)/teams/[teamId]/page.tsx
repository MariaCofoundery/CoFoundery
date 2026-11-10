import { loadTeamJourneyStatus } from "@/features/teams/TeamJourneyStatus";
import { testProjectHref } from "@/features/testProject/testProjectModel";
import { getCheckInCardState } from "@/features/checkIn/checkInData";
import { checkInHref } from "@/features/checkIn/checkInModel";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ReadMyMindHomebaseCard } from "@/features/collaborationLab/ReadMyMindHomebaseCard";
import { FounderInTheWildHomebaseCard } from "@/features/founderInTheWild/FounderInTheWildHomebaseCard";
import { FounderLibraryHomebaseCard } from "@/features/founderLibrary/FounderLibraryHomebaseCard";
import { TeamPageHeader } from "@/features/teams/TeamPageHeader";
import { TeamOverview, teamFocus } from "@/features/teams/TeamOverview";
import { ventureHref } from "@/features/teams/TeamJourneyStatus";
import { IconTile } from "@/features/ui/Icons";
import { TeamStrengthsCard } from "@/features/teams/TeamStrengthsCard";
import { TeamShareCard } from "@/features/teams/TeamShareCard";
import { BetaTeamCard } from "@/features/modules/ui/BetaTeamCard";
import { TradeoffsTeamCard } from "@/features/modules/ui/TradeoffsTeamCard";
import { LeaveTeamSection } from "@/features/teams/LeaveTeamSection";
import { financingHref } from "@/features/financing/financingModel";
import { TeamDepartureCard } from "@/features/teams/TeamDepartureCard";
import { getOpenTeamDepartures } from "@/features/teams/teamDepartureData";
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
  searchParams?: Promise<{ teamfreigabe?: string; verlassen?: string; austritt?: string }>;
};

const SECTION_CLASS =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6";
const CARD_CLASS = "flex h-full flex-col rounded-[24px] border border-[#e4e2f0] bg-white p-6";
const CARD_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const GROUP_TITLE_CLASS = "text-2xl font-semibold tracking-tight text-[#0b1f3a]";
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
  // Testprojekt je Paar: nur laufend oder im Entwurf. Fehlt die Tabelle noch
  // (Migration nicht angewendet), bleibt die Karte beim Start-Knopf stehen.
  const testProjectResult = team.alignment.length
    ? await supabase
        .from("relationship_test_projects")
        .select("relationship_id, status")
        .in("relationship_id", team.alignment.map((entry) => entry.relationshipId))
        .in("status", ["draft", "active"])
    : { data: [], error: null };
  const openTestProjects = new Map(
    testProjectResult.error
      ? []
      : ((testProjectResult.data ?? []) as Array<{ relationship_id: string; status: string }>).map(
          (row) => [row.relationship_id, row.status] as const
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

  const locale = await getLocale();
  const openDepartures = await getOpenTeamDepartures(team.id, supabase).catch(() => []);
  const checkInCard = setup ? await getCheckInCardState(teamId, setup.items, supabase).catch(() => null) : null;
  const [t, commitmentT, testProjectT, checkInT, setupT, departureT, financingT, journey] = await Promise.all([
    getTranslations("teams.homebase"),
    getTranslations("teams.commitmentLab"),
    getTranslations("teams.testProject"),
    getTranslations("teams.checkIn"),
    getTranslations("teams.setup"),
    getTranslations("teams.departure"),
    getTranslations("teams.financing"),
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

  const focus = teamFocus(journey);
  const team64 = encodeURIComponent(team.id);
  const waitingCount = (teamShareActive ? 0 : 1) + (pendingSetupAdvisorTask ? 1 : 0) + (rosterChanged ? 1 : 0);
  const coreCard = (on: boolean) =>
    `card-lift flex h-full flex-col gap-3 rounded-[24px] bg-white p-6 ${
      on ? "border-2 border-[#6d49e0] shadow-[0_0_0_4px_rgba(109,73,224,0.10)]" : "border border-[#e4e2f0]"
    }`;
  const chip = (tone: "done" | "doing" | "open") =>
    `inline-flex items-center self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
      tone === "done" ? "bg-[#e3f6ec] text-[#17794a]" : tone === "doing" ? "bg-[#efeafd] text-[#4a2fb8]" : "bg-[#f1f0f7] text-[#33325e]"
    }`;
  const reportTone = journey.work !== "present" ? "open" : journey.report === "available" ? "done" : journey.report === "shareMissing" ? "doing" : "open";
  const ventureTone = journey.venture === "present" ? "done" : journey.venture === "inProgress" ? "doing" : "open";
  const PRIMARY_LINK =
    "mt-auto inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
  const QUIET_LINK =
    "mt-auto inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4]";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* -----------------------------------------------------------------
          SEIT 04.11.2026: KERN, ERGAENZUNG, HINTERGRUND (Entwurf "Teamseite, Profil, Menü").

          Oben der Teamkopf mit dem naechsten Schritt und "Euer Weg". Darunter, nur wenn etwas offen
          ist, "Wartet auf euch". Dann die drei Grundlagen (Zusammenspiel, Vorhaben, Founder Setup)
          als grosse Karten, "Im Alltag" (Testprojekt, Check-in), "Wenn ihr mögt" als kleine Karten
          und ganz unten eingeklappt: Uebungen zu zweit, fruehere Auswertungen, Teamfreigabe.
          ----------------------------------------------------------------- */}
      <TeamPageHeader teamId={teamId} active="overview" title={title} eyebrow={t("eyebrow")} hideTitle />

      <TeamOverview
        teamId={team.id}
        title={title}
        teamName={team.name}
        teamDescription={team.description ?? null}
        members={team.members.map((member, index) => ({
          userId: member.userId,
          displayName: founderNames[index],
          avatarId: member.avatarId,
          avatarUrl: member.avatarUrl,
        }))}
        journey={journey}
        canInvite={team.members.length < 4}
      />
      {/* Nach einem Austritt: die Verbleibenden entscheiden gemeinsam, wie es weitergeht. */}
      <TeamDepartureCard
        teamId={team.id}
        currentUserId={user.id}
        members={team.members.map((member, index) => ({ userId: member.userId, displayName: founderNames[index] }))}
        departures={openDepartures}
      />
      {query.austritt ? (
        <p role="status" className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {departureT(query.austritt === "aufgeloest" ? "dissolvedFeedback" : query.austritt === "weiter" ? "continueFeedback" : query.austritt === "gespeichert" ? "savedFeedback" : "error")}
        </p>
      ) : null}
      {linkedAdvisors.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{t("header.advisors", { names: linkedAdvisors.join(", ") })}</p>
      ) : null}

      {/* WARTET AUF EUCH: nur, wenn jemand etwas tun muss. Die Teamfreigabe steht hier, solange sie
          fehlt - ohne sie gibt es kein Zusammenspiel. Steht sie, liegt sie eingeklappt unten. */}
      {waitingCount > 0 ? (
        <section aria-labelledby="team-waiting-title" className="mt-5 rounded-[24px] border border-[#f3dca8] bg-[#fff8ea] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <IconTile name="bell" tone="amber" />
            <h2 id="team-waiting-title" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#7a4300]">{t("groups.waiting.title")}</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {!teamShareActive ? (
              <TeamShareCard
                teamId={team.id}
                active={teamShareActive}
                legacyShared={Boolean(viewerShare?.shared_with_team && !viewerShare.team_share_active)}
                returnTo={`/teams/${team64}#teamfreigabe`}
                status={query.teamfreigabe ?? null}
              />
            ) : null}
            {pendingSetupAdvisorTask ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-slate-900">{t("setup.advisorTask.title")}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{t("setup.advisorTask.description")}</p>
                </div>
                <Link href={`/teams/${teamId}/setup#advisor-setup-access`} className={CARD_LINK_CLASS}>{t("setup.advisorTask.cta")}</Link>
              </div>
            ) : null}
            {rosterChanged ? (
              <p className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">{setupT("rosterChanged")}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-10 grid gap-12">
        {/* KERN: die drei Grundlagen. Genau eine Karte ist hervorgehoben - die, an der der naechste
            Schritt liegt (dieselbe Regel wie im Kopf). */}
        <section aria-labelledby="team-core-title">
          <h2 id="team-core-title" className={GROUP_TITLE_CLASS}>{t("groups.core.title")}</h2>
          <p className={GROUP_TEXT_CLASS}>{t("groups.core.text")}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className={coreCard(focus === "report")} aria-labelledby="team-report-title">
              <div className="flex items-center justify-between gap-2">
                <IconTile name="team" tone={focus === "report" ? "brand" : "violet"} />
                <span className={chip(reportTone)}>{journey.work !== "present" ? t("journey.workFirst") : t(`journey.report.${journey.report}`)}</span>
              </div>
              <h3 id="team-report-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("core.report.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{t("core.report.text")}</p>
              <Link
                href={journey.work !== "present" ? "/me/profile/workstyle" : journey.report === "shareMissing" ? "#teamfreigabe" : `/teams/${team64}/workstyle`}
                className={focus === "report" ? PRIMARY_LINK : QUIET_LINK}
              >
                {t(journey.work !== "present" ? "core.report.work" : journey.report === "shareMissing" ? "core.report.share" : "core.report.open")}
              </Link>
            </article>

            <article className={coreCard(focus === "venture")} aria-labelledby="team-venture-title">
              <div className="flex items-center justify-between gap-2">
                <IconTile name="rocket" tone={focus === "venture" ? "brand" : "teal"} />
                <span className={chip(ventureTone)}>{t(`journey.assessment.${journey.venture}`)}</span>
              </div>
              <h3 id="team-venture-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("core.venture.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{t("core.venture.text")}</p>
              <Link href={ventureHref(team.id, journey.venture)} className={focus === "venture" ? PRIMARY_LINK : QUIET_LINK}>
                {t("core.venture.open")}
              </Link>
            </article>

            {/* VEREINBAREN: Founder Setup ist der verbindliche Ort. Zahlen nur aus dem bestehenden
                Readmodel; bestaetigt ist, was alle AKTUELLEN Mitglieder bestaetigt haben. */}
            <article className={coreCard(focus === "setup")} aria-labelledby="team-setup-title">
              <div className="flex items-center justify-between gap-2">
                <IconTile name="pencil" tone={focus === "setup" ? "brand" : "green"} />
                <span className={chip(journey.setup === "confirmed" ? "done" : setup?.started ? "doing" : "open")}>{t(`journey.setup.${journey.setup}`)}</span>
              </div>
              <h3 id="team-setup-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("setup.title")}</h3>
              <p className="text-sm font-medium leading-6 text-slate-800">
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
              <div className="mt-auto flex flex-wrap items-center gap-3">
                <Link href={`/teams/${teamId}/setup`} className={focus === "setup" ? PRIMARY_LINK.replace("mt-auto ", "") : QUIET_LINK.replace("mt-auto ", "")}>
                  {t("setup.open")}
                </Link>
                {setup?.started ? (
                  <Link href={`/teams/${teamId}/setup/document`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#5b21b6] underline-offset-4 hover:underline">
                    {t("setup.document")}
                  </Link>
                ) : null}
              </div>
            </article>
          </div>
        </section>

        {/* IM ALLTAG: ausprobieren und dranbleiben. Das Testprojekt ist der konkreteste Weg, die
            Zusammenarbeit zu erproben; der Check-in haelt Vereinbarungen lebendig. */}
        <section id="im-alltag" aria-labelledby="team-everyday-title" className="scroll-mt-24">
          <h2 id="team-everyday-title" className={GROUP_TITLE_CLASS}>{t("groups.everyday.title")}</h2>
          <p className={GROUP_TEXT_CLASS}>{t("groups.everyday.text")}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {team.alignment.length > 0 ? (
              <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="test-project-title">
                <div className="flex items-center justify-between gap-2"><IconTile name="flask" tone="amber" /></div>
                <h3 id="test-project-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{testProjectT("card.title")}</h3>
                <p className="text-sm leading-6 text-slate-700">{testProjectT("card.description")}</p>
                <ul className="mt-auto grid gap-3">
                  {team.alignment.map((entry) => {
                    const state = openTestProjects.get(entry.relationshipId);
                    return (
                      <li key={entry.relationshipId} className={isPairTeam ? "flex flex-wrap items-center gap-3" : "flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"}>
                        <div>
                          {!isPairTeam ? (
                            <p className="text-sm font-semibold text-slate-900">{commitmentT("pair", { names: pairName(entry.participantUserIds, names, fallback) })}</p>
                          ) : null}
                          {state ? <p className="mt-1 text-xs font-medium text-slate-600">{testProjectT(state === "active" ? "card.active" : "card.draft")}</p> : null}
                        </div>
                        <Link href={testProjectHref(teamId, entry.relationshipId)} className={QUIET_LINK.replace("mt-auto ", "")}>
                          {testProjectT(state ? "card.continue" : "card.start")}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ) : null}
            <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="team-check-in-title">
              <div className="flex items-center justify-between gap-2"><IconTile name="clock" tone={checkInCard?.state === "due" ? "amber" : "blue"} /></div>
              <h3 id="team-check-in-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{checkInT("card.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">
                {checkInCard?.state === "open"
                  ? checkInT("card.running")
                  : checkInCard?.state === "due"
                    ? checkInT("card.dueNow")
                    : checkInCard?.state === "scheduled" && checkInCard.due
                      ? checkInT("card.dueOn", { date: new Intl.DateTimeFormat(getPresentationLocale(locale), { dateStyle: "medium" }).format(checkInCard.due) })
                      : checkInT("card.none")}
              </p>
              <Link href={checkInHref(teamId)} className={QUIET_LINK}>
                {checkInT(checkInCard?.state === "open" ? "card.open" : "card.start")}
              </Link>
            </article>
          </div>
        </section>

        {/* ERGAENZUNG: kleine Karten. Helfen bei einzelnen Fragen, sind aber kein Schritt. */}
        <section aria-labelledby="team-extras-title">
          <h2 id="team-extras-title" className={GROUP_TITLE_CLASS}>{t("groups.extras.title")}</h2>
          <p className={GROUP_TEXT_CLASS}>{t("groups.extras.text")}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TeamStrengthsCard client={supabase} teamId={teamId} />
            <TradeoffsTeamCard client={supabase} teamId={teamId} memberCount={team.members.length} />
            <BetaTeamCard client={supabase} teamId={teamId} memberCount={team.members.length} />
            <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="team-roles-title">
              <div className="flex items-center justify-between gap-2"><IconTile name="tools" tone="violet" /></div>
              <h3 id="team-roles-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("extras.roles.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{t("extras.roles.text")}</p>
              <Link href={`/teams/${team64}/roles`} className={QUIET_LINK}>{t("extras.roles.open")}</Link>
            </article>
            <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="team-financing-title">
              <div className="flex items-center justify-between gap-2"><IconTile name="chart" tone="green" /></div>
              <h3 id="team-financing-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{financingT("card.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{financingT("card.text")}</p>
              <Link href={financingHref(teamId)} className={QUIET_LINK}>{financingT("card.open")}</Link>
            </article>
            <FounderLibraryHomebaseCard teamId={teamId} />
            <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="team-values-title">
              <div className="flex items-center justify-between gap-2"><IconTile name="team" tone="amber" /></div>
              <h3 id="team-values-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("extras.values.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{t("extras.values.text")}</p>
              <Link href={`/teams/${team64}/werte`} className={QUIET_LINK}>{t("extras.values.open")}</Link>
            </article>
            <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="team-ai-start-title">
              <div className="flex items-center justify-between gap-2"><IconTile name="flask" tone="teal" /></div>
              <h3 id="team-ai-start-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("extras.aiStart.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{t("extras.aiStart.text")}</p>
              <Link href={`/teams/${team64}/ki-start`} className={QUIET_LINK}>{t("extras.aiStart.open")}</Link>
            </article>
            <article className="card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="team-program-title">
              <div className="flex items-center justify-between gap-2"><IconTile name="globe" tone="blue" /></div>
              <h3 id="team-program-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("extras.program.title")}</h3>
              <p className="text-sm leading-6 text-slate-700">{t("extras.program.text")}</p>
              <Link href="/programm" className={QUIET_LINK}>{t("extras.program.open")}</Link>
            </article>
          </div>
        </section>

        {/* HINTERGRUND: eingeklappt, nie weg. */}
        <div className="grid gap-4">
          {/* VERTIEFEN: ausdruecklich zu zweit. Nur tatsaechlich vorhandene
              Paare - keine erfundenen Paarungen, keine neuen Relationships. */}
          <details id="team-deep-dives" className="scroll-mt-24 rounded-[24px] border border-dashed border-[#d8d5ea] bg-white px-5 py-3">
            <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
              <span className="flex">
                <IconTile name="chat" tone="pink" size="sm" />
                <span className="-ml-1.5 rounded-xl ring-2 ring-white"><IconTile name="globe" tone="teal" size="sm" /></span>
                <span className="-ml-1.5 rounded-xl ring-2 ring-white"><IconTile name="heart" tone="violet" size="sm" /></span>
              </span>
              <span className="text-base font-semibold text-slate-900">{t("deepen.summary")}</span>
              <span className="text-sm text-slate-600">{t("deepen.summaryHint")}</span>
            </summary>
            <section className="mt-4 pb-3" aria-labelledby="team-deepen-title">
              <h2 id="team-deepen-title" className="sr-only">{t("groups.discover.title")}</h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{t("groups.discover.text")}</p>
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

          {/* Rueckblick: eingeklappt, am Ende, nicht gleichrangig. */}
          <details id="team-alignment" className="scroll-mt-24 rounded-[24px] border border-dashed border-[#d8d5ea] bg-white px-5 py-3">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-lg text-base font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <IconTile name="book" tone="violet" size="sm" />
              {t("alignment.history")}
            </summary>
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

          {/* Die Teamfreigabe, wenn sie steht: hier zum Nachlesen und Zuruecknehmen. */}
          {teamShareActive ? (
            <details className="scroll-mt-24 rounded-[24px] border border-dashed border-[#d8d5ea] bg-white px-5 py-3" open={Boolean(query.teamfreigabe)}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                <IconTile name="shield" tone="green" size="sm" />
                {t("shareDetails")}
              </summary>
              <div className="mt-3 pb-3">
                <TeamShareCard
                  teamId={team.id}
                  active={teamShareActive}
                  legacyShared={Boolean(viewerShare?.shared_with_team && !viewerShare.team_share_active)}
                  returnTo={`/teams/${team64}#teamfreigabe`}
                  status={query.teamfreigabe ?? null}
                />
              </div>
            </details>
          ) : null}
        </div>

        <FounderRelationshipAdvisorPanel team={team} currentUserId={user.id} names={names} />

        <LeaveTeamSection teamId={team.id} memberCount={team.members.length} failed={query.verlassen === "fehler"} />
      </div>
    </main>
  );
}
