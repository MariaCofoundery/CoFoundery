import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { TodayTiles, WaitingItems, type WaitingItem } from "@/features/advisor/TodayView";
import { TeamAvatar } from "@/features/advisor/TeamAvatar";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { QuoteOfTheDay } from "@/features/dashboard/QuoteOfTheDay";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { getAccompaniedPeople, getMyAdvisorOrgs, withAccompaniedNames } from "@/features/advisor/orgData";
import { getOrgMilestoneDeadlines, getOrgTeamPrograms, getProgramOutcomes, getProgramUpdateDue, getSuccessEnabled, listDueProgramFollowUps } from "@/features/advisor/teamProgramData";
import { getAdvisorDashboardProfile, getAdvisorDashboardTeams } from "@/features/dashboard/dashboardRoleData";
import { getAdvisorPendingTeamInvites } from "@/features/dashboard/advisorTeamInviteData";
import { listDueAdvisorFollowUps } from "@/features/reporting/advisorWorkspaceData";

const CARD = "advisor-card p-6";
const LINK =
  "inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";

/**
 * Start des Advisor-Bereichs: nur, was auf dich wartet, und wen du zuletzt
 * begleitet hast. Einladen, Organisation und die vollstaendige Liste haben
 * eigene Seiten (seit 21.10.2026 - vorher stand hier alles untereinander, und
 * die Arbeit ganz unten).
 *
 * Die Zustimmungen bleiben getrennt: Person, Team und Gruppe sind drei
 * verschiedene Freigaben. Diese Seite fuehrt sie nur zusammen, sie ersetzt
 * keine.
 */
export default async function AdvisorStartPage() {
  const t = await getTranslations("advisor.area");
  const tExample = await getTranslations("advisor.example");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/dashboard"));

  // Der angemeldete Zugang, nicht der privilegierte.
  const client = await createClient();
  const [roleViews, teams, profile, pendingInvites, dueFollowUps, accompanied, personInvites, orgs, programFollowUps] = await Promise.all([
    getDashboardRoleViews(user.id),
    getAdvisorDashboardTeams(user.id),
    getAdvisorDashboardProfile(user.id),
    getAdvisorPendingTeamInvites(user.id),
    listDueAdvisorFollowUps(client),
    withAccompaniedNames(client, await getAccompaniedPeople(client)),
    client.from("advisor_person_invites").select("id, status").eq("status", "sent"),
    getMyAdvisorOrgs(client),
    listDueProgramFollowUps(client),
  ]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");

  // Programm: Fristen und faellige Updates der Teams, die diese Person sehen darf
  // (Inhaber alle, Bezugsperson die eigenen). Hoechstens drei Organisationen und
  // zwoelf Teams, damit die Startseite nicht auf viele Abfragen wartet.
  const programData = await Promise.all(
    orgs.slice(0, 3).map(async (org) => {
      const [deadlines, programs, successOn] = await Promise.all([getOrgMilestoneDeadlines(client, org.id), getOrgTeamPrograms(client, org.id), getSuccessEnabled(client, org.id)]);
      const allActive = programs.filter((program) => program.isActive);
      const active = allActive.slice(0, 12);
      const dues = await Promise.all(active.map(async (program) => ({ program, due: await getProgramUpdateDue(client, program.programId) })));
      // Erfolge, die ein Team gemeldet hat und die noch auf Bestaetigung warten (Organisation traegt direkt bestaetigt ein). Nur wenn die Funktion an ist; je Team, ohne Summe.
      const pendingOutcomes = successOn
        ? (await Promise.all(active.map(async (program) => ({ program, count: (await getProgramOutcomes(client, program.programId)).filter((outcome) => outcome.outcomeId && !outcome.confirmed).length })))).filter((entry) => entry.count > 0)
        : [];
      return { org, deadlines, active, activeCount: allActive.length, dues, pendingOutcomes };
    }),
  );
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const todayIso = new Date().toISOString().slice(0, 10);
  const programDeadlines = programData.flatMap((entry) => entry.deadlines);
  const programUpdates = programData.flatMap((entry) => entry.dues).filter((entry) => entry.due && entry.due <= inTwoWeeks);
  // Die Kachel zaehlt alle aktiven Teams der gelesenen Organisationen, nicht nur die zwoelf, deren Fristen hier stehen.
  const programTeamCount = programData.reduce((sum, entry) => sum + entry.activeCount, 0);
  // Abgeschnitten wird nicht mehr stillschweigend: dann steht ein Hinweis unter der Liste.
  const programCut = orgs.length > 3 || programData.some((entry) => entry.activeCount > entry.active.length);
  const openInviteCount = (personInvites.data ?? []).length + pendingInvites.length;

  const metadataName =
    typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
  const name = profile.displayName || metadataName || user.email?.split("@")[0]?.trim() || "Advisor";

  const followUpByRelationship = new Map(dueFollowUps.flatMap((entry) => (entry.relationshipId ? [[entry.relationshipId, entry] as const] : [])));
  const today = new Date().toISOString().slice(0, 10);
  const overdueTeams = teams.filter((team) => {
    const entry = team.relationshipId ? followUpByRelationship.get(team.relationshipId) : null;
    return Boolean(entry && entry.dueOn <= today);
  });
  const waitingTeams = teams.filter((team) => team.accessStatus === "waiting_for_approval");
  const readyTeams = teams.filter((team) => team.accessStatus === "ready");
  const openPersonInvites = (personInvites.data ?? []).length;
  const people = accompanied.filter((person) => person.scopes.length > 0);

  const teamName = (team: (typeof teams)[number]) => team.teamName?.trim() || `${team.founderAName} & ${team.founderBName}`;

  const waiting: WaitingItem[] = [
    ...programDeadlines.map((entry, index) => ({
      key: `deadline-${entry.programId}-${index}`,
      text: t("start.programDeadline", { team: entry.teamName ?? t("kinds.unnamed"), title: entry.title }),
      href: `/advisor/programm/${entry.programId}?tab=meilensteine`,
      cta: t("start.open"),
      icon: "flag" as const,
    })),
    ...programUpdates.map((entry) => ({
      key: `update-${entry.program.programId}`,
      text: t("start.programUpdate", { team: entry.program.teamName ?? t("kinds.unnamed"), date: entry.due as string, overdue: (entry.due as string) < todayIso ? "yes" : "no" }),
      href: `/advisor/programm/${entry.program.programId}?tab=updates`,
      cta: t("start.view"),
      icon: "cal" as const,
    })),
    ...programData.flatMap((entry) => entry.pendingOutcomes).map((entry) => ({
      key: `outcome-${entry.program.programId}`,
      text: t("start.programOutcomes", { team: entry.program.teamName ?? t("kinds.unnamed"), count: entry.count }),
      href: `/advisor/programm/${entry.program.programId}?tab=erfolge`,
      cta: t("start.open"),
      icon: "flag" as const,
    })),
    ...programFollowUps.flatMap((entry) => {
      const program = programData.flatMap((data) => data.active).find((candidate) => candidate.programId === entry.programId);
      if (!program) return [];
      return [{
        key: `program-followup-${entry.programId}`,
        text: t("start.programFollowUp", { team: program.teamName ?? t("kinds.unnamed"), date: entry.dueOn, overdue: entry.dueOn < todayIso ? "yes" : "no" }),
        href: `/advisor/programm/${entry.programId}?tab=notizen`,
        cta: t("start.open"),
        icon: "flag" as const,
      }];
    }),
    // Wiedervorlagen zu einer Person oder einer Teamdurchsicht (bisher nur auf ihrer eigenen Seite sichtbar).
    ...dueFollowUps.flatMap((entry) => {
      if (entry.subjectUserId) {
        // Nur solange die Begleitung laeuft - sonst fuehrt der Link auf eine verschlossene Seite.
        const person = people.find((candidate) => candidate.subjectUserId === entry.subjectUserId);
        if (!person) return [];
        return [{
          key: `person-followup-${entry.subjectUserId}`,
          text: t("start.personFollowUp", { name: person.name ?? t("kinds.unnamed"), date: entry.dueOn, overdue: entry.dueOn < todayIso ? "yes" : "no" }),
          href: `/advisor/person/${entry.subjectUserId}#notebook`,
          cta: t("start.open"),
          icon: "flag" as const,
        }];
      }
      if (entry.reviewId) {
        return [{
          key: `review-followup-${entry.reviewId}`,
          text: t("start.reviewFollowUp", { date: entry.dueOn, overdue: entry.dueOn < todayIso ? "yes" : "no" }),
          href: `/advisor/review/${entry.reviewId}#notebook`,
          cta: t("start.open"),
          icon: "flag" as const,
        }];
      }
      return [];
    }),
    ...overdueTeams.map((team) => ({
      key: `due-${team.invitationId}`,
      text: t("start.overdue", { name: teamName(team) }),
      href: team.sessionHref,
      cta: t("start.open"),
      icon: "flag" as const,
    })),
    ...waitingTeams.map((team) => ({
      key: `wait-${team.invitationId}`,
      text: t("start.waitingTeam", { name: teamName(team) }),
      href: "/advisor/begleitung?art=teams",
      cta: t("start.view"),
      icon: "lock" as const,
    })),
    ...(pendingInvites.length > 0
      ? [{ key: "team-invites", text: t("start.teamInvites", { count: pendingInvites.length }), href: "/advisor/begleitung?art=teams", cta: t("start.view") }]
      : []),
    ...(openPersonInvites > 0
      ? [{ key: "person-invites", text: t("start.personInvites", { count: openPersonInvites }), href: "/advisor/einladen?art=person#person-invites", cta: t("start.view") }]
      : []),
  ];

  const recent = [
    ...readyTeams.slice(0, 3).map((team) => ({ key: `t-${team.invitationId}`, label: teamName(team), kind: t("kinds.team"), href: team.reportHref })),
    ...people.slice(0, 3).map((person) => ({
      key: `p-${person.subjectUserId}`,
      label: person.name ?? t("kinds.unnamed"),
      kind: t("kinds.person"),
      href: `/advisor/person/${person.subjectUserId}`,
    })),
  ].slice(0, 4);

  const preferred = readyTeams.find((team) => team.reportAvailable) ?? readyTeams[0] ?? null;

  return (
    <>
      <ProductNavigationOverride activeView="advisor" matchingHref={preferred?.reportHref ?? "/advisor/begleitung"} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <QuoteOfTheDay className="mb-4 max-w-3xl" />
        <AdvisorPageHeader
          eyebrow={t("eyebrow")}
          title={t("start.title", { name })}
          text={`${
            teams.length + people.length > 0
              ? t("start.summary", { people: people.length, teams: teams.length })
              : t("start.summaryNone")
          } ${t("start.accessNote")}`}
          action={
            <Link href="/advisor/einladen" className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">
              {t("start.invite")}
            </Link>
          }
        />

        <TodayTiles teams={programTeamCount} updates={programUpdates.length} invites={openInviteCount} labels={[t("start.tileTeams"), t("start.tileUpdates"), t("start.tileInvites")]} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section aria-labelledby="advisor-waiting-title" className={CARD}>
            <h2 id="advisor-waiting-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {waiting.length > 0 ? t("start.waitingTitle", { count: waiting.length }) : t("start.waitingTitleNone")}
            </h2>
            {waiting.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("start.waitingNone")}</p>
            ) : (
              <WaitingItems items={waiting} />
            )}
            {programCut ? <p className="mt-3 text-xs leading-5 text-slate-500">{t("start.programCut")}</p> : null}
            <Link href="/advisor/beispiel" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
              {tExample("link")}
            </Link>
          </section>

          <section aria-labelledby="advisor-recent-title" className={CARD}>
            <h2 id="advisor-recent-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {t("start.recentTitle")}
            </h2>
            {recent.length === 0 ? (
              <div className="mt-3 text-sm leading-6 text-slate-600">
                <p>{t("start.recentEmpty")}</p>
                <Link href="/advisor/einladen" className={`${LINK} mt-3`}>
                  {t("start.invite")}
                </Link>
              </div>
            ) : (
              <>
                <ul className="mt-4 grid gap-3">
                  {recent.map((item) => (
                    <li key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                      <TeamAvatar name={item.label} />
                      <Link href={item.href} className="min-w-0 flex-1 truncate font-semibold text-slate-900 underline-offset-4 hover:underline">
                        {item.label}
                      </Link>
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">{item.kind}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/advisor/begleitung" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
                  {t("start.recentAll")}
                </Link>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
