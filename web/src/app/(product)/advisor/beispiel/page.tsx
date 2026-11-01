import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { buildExampleOrg, buildExampleProgram } from "@/features/advisor/exampleProgram";
import { OrgProgramPlan } from "@/features/advisor/OrgProgramPlan";
import { OrgTeamProgramsSection } from "@/features/advisor/OrgTeamProgramsSection";
import { TodayTiles, WaitingItems, type WaitingItem } from "@/features/advisor/TodayView";
import { ProgramCheckIn } from "@/features/advisor/ProgramCheckIn";
import { ProgramMilestones } from "@/features/advisor/ProgramMilestones";
import { ProgramOutcomes } from "@/features/advisor/ProgramOutcomes";
import { ProgramOverviewTiles } from "@/features/advisor/ProgramOverviewTiles";
import { ProgramProfileView } from "@/features/advisor/ProgramProfile";
import { ProgramRewards } from "@/features/advisor/ProgramRewards";
import { ManageProgramUpdates, TeamProgramUpdates } from "@/features/advisor/ProgramUpdates";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { getRequestUser } from "@/lib/supabase/server";

const TABS = ["today", "cards", "plan", "overview", "milestones", "updates", "outcomes", "team"] as const;
type Tab = (typeof TABS)[number];

/**
 * Vorschau: ein erfundenes Team im Programm, mit den echten Bausteinen der Seiten.
 *
 * Sie liest und schreibt nichts in der Datenbank. Der Inhalt steckt in einem gesperrten
 * Formularblock (fieldset disabled), damit kein Knopf und kein Feld etwas ausloesen kann, und die
 * Links darin sind abgeschaltet. Die Seiten sehen so aus wie die echten, weil sie dieselben
 * Bausteine nutzen - aendert sich dort etwas, aendert es sich hier mit.
 */
export default async function AdvisorExamplePage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const query = (await searchParams) ?? {};
  const tab: Tab = TABS.find((entry) => entry === query.tab) ?? "today";
  const t = await getTranslations("advisor.example");
  const tArea = await getTranslations("advisor.area");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/beispiel"));
  const roleViews = await getDashboardRoleViews(user.id);
  if (!roleViews.hasAdvisor) redirect("/dashboard");

  const example = buildExampleProgram((key) => t(key));
  const exampleOrg = buildExampleOrg((key) => t(key));
  const today = new Date().toISOString().slice(0, 10);
  const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const teamName = t("teamName");
  const waiting: WaitingItem[] = [
    { key: "outcome", text: tArea("start.programOutcomes", { team: teamName, count: 1 }), href: "#", cta: tArea("start.open"), icon: "flag" },
    { key: "update", text: tArea("start.programUpdate", { team: teamName, date: inDays(2), overdue: "no" }), href: "#", cta: tArea("start.view"), icon: "cal" },
    { key: "deadline", text: tArea("start.programDeadline", { team: t("fixtureTeamLumen"), title: t("fixtureMilestone2") }), href: "#", cta: tArea("start.open"), icon: "flag" },
    { key: "followup", text: tArea("start.programFollowUp", { team: t("fixtureTeamOrbit"), date: today, overdue: "no" }), href: "#", cta: tArea("start.open"), icon: "flag" },
    { key: "invites", text: tArea("start.teamInvites", { count: 2 }), href: "#", cta: tArea("start.view"), icon: "mail" },
  ];
  const noReturn = "/advisor/beispiel";
  const labels: Record<Tab, string> = {
    today: t("tabToday"),
    cards: t("tabCards"),
    plan: t("tabPlan"),
    overview: t("tabOverview"),
    milestones: t("tabMilestones"),
    updates: t("tabUpdates"),
    outcomes: t("tabOutcomes"),
    team: t("tabTeamView"),
  };
  const openMilestones = example.milestones.filter((milestone) => milestone.targetCount === null || milestone.doneCount < milestone.targetCount).length;

  return (
    <>
      <ProductNavigationOverride activeView="advisor" matchingHref="/advisor/organisation" />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <AdvisorPageHeader
          eyebrow={`${t("eyebrow")} · ${t("title")}`}
          title={tab === "today" || tab === "cards" || tab === "plan" ? exampleOrg.org.name : teamName}
          text={t("sub")}
          action={<span className="inline-flex rounded-full bg-amber-300/20 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-200/40">{t("badge")}</span>}
        >
          <nav className="flex flex-wrap gap-2" aria-label={t("title")}>
            {TABS.map((key) => (
              <Link
                key={key}
                href={key === "today" ? "/advisor/beispiel" : `/advisor/beispiel?tab=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                  tab === key ? "bg-white text-indigo-900" : "bg-white/10 text-indigo-100 hover:bg-white/20"
                }`}
              >
                {labels[key]}
              </Link>
            ))}
          </nav>
        </AdvisorPageHeader>

        <p role="note" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {t("banner")}
        </p>

        <fieldset disabled className="m-0 mt-4 min-w-0 border-0 p-0 [&_a]:pointer-events-none">
          {tab === "today" ? (
            <div className="grid gap-2">
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("todayNote")}</p>
              <TodayTiles teams={2} updates={1} invites={2} labels={[tArea("start.tileTeams"), tArea("start.tileUpdates"), tArea("start.tileInvites")]} />
              <section className="advisor-card mt-4 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{tArea("start.waitingTitle", { count: waiting.length })}</h2>
                <WaitingItems items={waiting} />
              </section>
            </div>
          ) : tab === "cards" ? (
            <div className="grid gap-4">
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("cardsNote")}</p>
              <OrgTeamProgramsSection part="teams" org={exampleOrg.org} members={exampleOrg.members} programs={exampleOrg.programs} stars={exampleOrg.stars} invites={[]} freshToken={null} mailState={null} inviteError={null} codes={[]} codeError={null} />
            </div>
          ) : tab === "plan" ? (
            <div className="grid gap-4">
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("planNote")}</p>
              <OrgProgramPlan orgId={exampleOrg.org.id} isOwner events={exampleOrg.events} openEventId={exampleOrg.events[0].eventId} exampleAttendance={exampleOrg.attendance} />
            </div>
          ) : tab === "overview" ? (
            <div className="grid gap-4">
              <ProgramOverviewTiles memberCount={2} openMilestones={openMilestones} contactCount={1} due={example.due} />
              <ProgramProfileView profile={example.profile} />
            </div>
          ) : tab === "milestones" ? (
            <ProgramMilestones programId={example.programId} milestones={example.milestones} returnTo={noReturn} />
          ) : tab === "updates" ? (
            <ManageProgramUpdates programId={example.programId} questions={example.questions} due={example.due} updates={example.updates} returnTo={noReturn} />
          ) : tab === "outcomes" ? (
            <div className="grid gap-8">
              <ProgramOutcomes programId={example.programId} outcomes={example.outcomes} mode="org" returnTo={noReturn} comments={example.comments} />
              <ProgramRewards programId={example.programId} rewards={example.rewards} mode="org" returnTo={noReturn} />
              <ProgramCheckIn programId={example.programId} checkIns={example.checkIns} returnTo={noReturn} />
            </div>
          ) : (
            <div className="grid gap-8">
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("teamViewNote")}</p>
              <ProgramOutcomes programId={example.programId} outcomes={example.outcomes} mode="team" returnTo={noReturn} comments={example.comments} />
              <ProgramRewards programId={example.programId} rewards={example.rewards} mode="team" returnTo={noReturn} />
              <ProgramCheckIn programId={example.programId} checkIns={example.checkIns} returnTo={noReturn} />
              <ProgramMilestones programId={example.programId} milestones={example.milestones} returnTo={noReturn} />
              <TeamProgramUpdates programId={example.programId} questions={example.questions} due={example.due} updates={example.updates} />
            </div>
          )}
        </fieldset>
      </main>
    </>
  );
}
