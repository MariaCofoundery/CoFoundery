import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { QuoteOfTheDay } from "@/features/dashboard/QuoteOfTheDay";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { getAccompaniedPeople, getMyAdvisorOrgs, withAccompaniedNames } from "@/features/advisor/orgData";
import { getOrgMilestoneDeadlines, getOrgTeamPrograms, getProgramUpdateDue, listDueProgramFollowUps } from "@/features/advisor/teamProgramData";
import { getAdvisorDashboardProfile, getAdvisorDashboardTeams } from "@/features/dashboard/dashboardRoleData";
import { getAdvisorPendingTeamInvites } from "@/features/dashboard/advisorTeamInviteData";
import { listDueAdvisorFollowUps } from "@/features/reporting/advisorWorkspaceData";

const CARD = "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]";
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
      const [deadlines, programs] = await Promise.all([getOrgMilestoneDeadlines(client, org.id), getOrgTeamPrograms(client, org.id)]);
      const active = programs.filter((program) => program.isActive).slice(0, 12);
      const dues = await Promise.all(active.map(async (program) => ({ program, due: await getProgramUpdateDue(client, program.programId) })));
      return { org, deadlines, active, dues };
    }),
  );
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const todayIso = new Date().toISOString().slice(0, 10);
  const programDeadlines = programData.flatMap((entry) => entry.deadlines);
  const programUpdates = programData.flatMap((entry) => entry.dues).filter((entry) => entry.due && entry.due <= inTwoWeeks);
  const programTeamCount = programData.reduce((sum, entry) => sum + entry.active.length, 0);
  const openInviteCount = (personInvites.data ?? []).length + pendingInvites.length;

  const metadataName =
    typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
  const name = profile.displayName || metadataName || user.email?.split("@")[0]?.trim() || "Advisor";

  const followUpByRelationship = new Map(dueFollowUps.map((entry) => [entry.relationshipId, entry]));
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

  const waiting: { key: string; text: string; href: string; cta: string; icon?: "flag" | "cal" | "lock" | "mail" }[] = [
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

        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[
            [t("start.tileTeams"), programTeamCount],
            [t("start.tileUpdates"), programUpdates.length],
            [t("start.tileInvites"), openInviteCount],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <dd className="text-2xl font-extrabold tracking-tight text-slate-950">{value}</dd>
              <dt className="mt-0.5 text-xs leading-5 text-slate-600">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section aria-labelledby="advisor-waiting-title" className={`${CARD} ${waiting.length > 0 ? "border-amber-200 bg-amber-50/60" : ""}`}>
            <h2 id="advisor-waiting-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {waiting.length > 0 ? t("start.waitingTitle", { count: waiting.length }) : t("start.waitingTitleNone")}
            </h2>
            {waiting.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("start.waitingNone")}</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {waiting.map((item) => (
                  <li key={item.key} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm text-slate-900">
                    <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {item.icon === "flag" ? <path d="M6 20V4.5M6 5h11l-2.2 3.5L17 12H6" /> : item.icon === "cal" ? <><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></> : item.icon === "lock" ? <><rect x="5" y="10.5" width="14" height="9" rx="3" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></> : <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="m4.5 8 7.5 5.5L19.5 8" /></>}
                      </svg>
                    </span>
                    <span className="min-w-0">{item.text}</span>
                    <Link href={item.href} className="font-semibold text-violet-800 underline-offset-4 hover:underline">
                      {item.cta}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
                    <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link href={item.href} className="font-semibold text-slate-900 underline-offset-4 hover:underline">
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
