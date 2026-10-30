import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { AccompaniedPeopleList } from "@/features/advisor/AccompaniedPeopleList";
import { TeamSection } from "@/features/advisor/AdvisorTeamsList";
import { getAdvisorDashboardTeams, getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/getLocale";
import { readOrgErrorCode } from "@/features/advisor/orgErrors";
import { AdvisorOrgSection } from "@/features/advisor/AdvisorOrgSection";
import { OrgTeamProgramsSection } from "@/features/advisor/OrgTeamProgramsSection";
import { OrgProgramOverview } from "@/features/advisor/OrgProgramOverview";
import { getOrgMilestoneDeadlines, getOrgTeamPrograms, listTeamProgramInvites } from "@/features/advisor/teamProgramData";
import {
  countOrgSeatsUsed,
  getAccompaniedPeople,
  getMyAdvisorOrgs,
  getOrgMembers,
  withAccompaniedNames,
} from "@/features/advisor/orgData";

const TABS = ["overview", "teams", "people", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_OF = (value: string | undefined): Tab => TABS.find((tab) => tab === value) ?? "overview";

/**
 * Organisation - ein Programm oder eine Beratung mit mehreren Advisorinnen.
 * Sie haelt die Zugaenge, damit sie nicht mit einer einzelnen Person
 * verschwinden.
 *
 * Reiter statt einer langen Seite: Uebersicht, Teams, Personen, Mitglieder und
 * Einstellungen. Alle Zahlen und Listen zeigen nur, was DIESE Person ohnehin
 * sehen darf - Mitgliedschaft in der Organisation gibt keine Einsicht in
 * Teams oder Personen. Es gibt keine Gesamtzahl und keine Rangfolge.
 */
export default async function AdvisorOrganisationPage({
  searchParams,
}: {
  searchParams?: Promise<{ orgError?: string; tab?: string; org?: string; programInvite?: string; batch?: string; category?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const orgError = readOrgErrorCode(query.orgError);
  const tab = TAB_OF(query.tab);
  const [t, tAdvisor, locale] = await Promise.all([
    getTranslations("advisor.area"),
    getTranslations("advisor"),
    getRequestLocale(),
  ]);
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/organisation"));

  const client = await createClient();
  const [roleViews, orgs] = await Promise.all([getDashboardRoleViews(user.id), getMyAdvisorOrgs(client)]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");

  const org = orgs.find((entry) => entry.id === query.org) ?? orgs[0] ?? null;
  const base = (next: Tab, orgId?: string) => {
    const params = new URLSearchParams();
    if (orgId ?? org?.id) params.set("org", (orgId ?? org?.id) as string);
    if (next !== "overview") params.set("tab", next);
    const text = params.toString();
    return text ? `/advisor/organisation?${text}` : "/advisor/organisation";
  };

  // Ohne Organisation bleibt es beim Anlegen.
  if (!org) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <AdvisorPageHeader eyebrow={t("eyebrow")} title={t("org.title")} text={t("org.text")} />
        <div className="mt-7">
          <AdvisorOrgSection orgs={[]} members={[]} error={orgError} />
        </div>
      </main>
    );
  }

  const needsTeams = tab === "overview" || tab === "teams";
  const needsPeople = tab === "overview" || tab === "people";
  const needsPrograms = tab === "settings" || tab === "overview";
  const [seatsUsed, members, teams, people, programs, invites, deadlines] = await Promise.all([
    countOrgSeatsUsed(client, org.id),
    getOrgMembers(client, org.id),
    needsTeams ? getAdvisorDashboardTeams(user.id) : Promise.resolve([]),
    needsPeople ? withAccompaniedNames(client, await getAccompaniedPeople(client)) : Promise.resolve([]),
    needsPrograms ? getOrgTeamPrograms(client, org.id) : Promise.resolve([]),
    needsPrograms && org.role === "owner" ? listTeamProgramInvites(client, org.id) : Promise.resolve([]),
    tab === "overview" ? getOrgMilestoneDeadlines(client, org.id) : Promise.resolve([]),
  ]);

  const tabLabels = t("orgPage.tabs").split(" | ");
  const readyTeams = teams.filter((team) => team.accessStatus === "ready");
  const waitingTeams = teams.filter((team) => team.accessStatus === "waiting_for_approval");
  const pausedTeams = teams.filter((team) => team.accessStatus === "paused" || team.accessStatus === "revoked");
  const activeMembers = members.filter((member) => member.status === "active").length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-700">{t("eyebrow")}</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight text-slate-950">{org.name}</h1>
          {org.locationRegion || org.status === "suspended" ? (
            <p className="mt-1 text-sm text-slate-600">
              {[org.locationRegion, org.status === "suspended" ? t("orgPage.suspendedShort") : null].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {org.focus.length > 0 ? (
            <ul aria-label={t("orgPage.focusLabel")} className="mt-3 flex flex-wrap gap-2">
              {org.focus.map((entry) => (
                <li key={entry} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                  {entry}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {org.personSeatLimit === null
            ? t("orgPage.seatsOpen", { used: seatsUsed })
            : t("orgPage.seatsLimited", { used: seatsUsed, limit: org.personSeatLimit })}
        </p>
      </header>

      {orgs.length > 1 ? (
        <nav aria-label={t("orgPage.orgSwitchLabel")} className="mt-4 flex flex-wrap gap-2">
          {orgs.map((entry) => (
            <Link
              key={entry.id}
              href={base(tab, entry.id)}
              aria-current={entry.id === org.id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
                entry.id === org.id ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {entry.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <nav aria-label={t("orgPage.tabsLabel")} className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-slate-200">
        {TABS.map((entry, index) => (
          <Link
            key={entry}
            href={base(entry)}
            aria-current={tab === entry ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-[3px] text-sm font-semibold ${
              tab === entry ? "border-violet-600 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tabLabels[index] ?? entry}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "overview" ? (
          <div className="grid gap-6">
            <OrgProgramOverview orgId={org.id} programs={programs} batch={query.batch?.slice(0, 60) || null} category={query.category?.slice(0, 60) || null} />
            {org.description ? <p className="max-w-3xl text-sm leading-7 text-slate-700">{org.description}</p> : null}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [t("orgPage.statTeams"), teams.length],
                [t("orgPage.statWaiting"), waitingTeams.length],
                [t("orgPage.statPeople"), people.length],
                [t("orgPage.statMembers"), activeMembers],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <dd className="text-2xl font-extrabold tracking-tight text-slate-950">{value}</dd>
                  <dt className="mt-0.5 text-xs leading-5 text-slate-600">{label}</dt>
                </div>
              ))}
            </dl>
            {deadlines.length > 0 ? (
              <section aria-labelledby="org-deadlines-title" className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <h2 id="org-deadlines-title" className="text-sm font-semibold text-slate-900">{tAdvisor("teamProgram.deadlinesTitle")}</h2>
                <p className="mt-1 text-xs leading-6 text-slate-600">{tAdvisor("teamProgram.deadlinesText")}</p>
                <ul className="mt-2 grid gap-1 text-sm text-slate-800">
                  {deadlines.map((entry, index) => (
                    <li key={`${entry.programId}-${index}`}>
                      <Link href={`/advisor/programm/${entry.programId}?tab=meilensteine`} className="underline-offset-4 hover:underline">
                        {tAdvisor("teamProgram.deadlineLine", { team: entry.teamName ?? tAdvisor("teamProgram.unnamedTeam"), title: entry.title, date: entry.dueOn })}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("orgPage.overviewNote")}</p>
          </div>
        ) : null}

        {tab === "teams" ? (
          teams.length === 0 ? (
            <p className="text-sm leading-6 text-slate-600">{t("orgPage.teamsEmpty")}</p>
          ) : (
            <div>
              <TeamSection title={tAdvisor("dashboard.readySectionTitle")} description={tAdvisor("dashboard.readySectionDescription")} teams={readyTeams} t={tAdvisor} locale={locale} />
              <TeamSection title={tAdvisor("dashboard.waitingSectionTitle")} description={tAdvisor("dashboard.waitingSectionDescription")} teams={waitingTeams} t={tAdvisor} locale={locale} />
              <TeamSection title={tAdvisor("dashboard.pausedSectionTitle")} description={tAdvisor("dashboard.pausedSectionDescription")} teams={pausedTeams} t={tAdvisor} locale={locale} />
            </div>
          )
        ) : null}

        {tab === "people" ? (
          <section aria-labelledby="org-people-title">
            <h2 id="org-people-title" className="text-xl font-semibold text-slate-950">{t("orgPage.peopleTitle")}</h2>
            <AccompaniedPeopleList people={people} />
          </section>
        ) : null}

        {tab === "settings" ? (
          <>
            <AdvisorOrgSection orgs={[org]} members={members} error={orgError} />
            <OrgTeamProgramsSection org={org} members={members} programs={programs} invites={invites} freshToken={query.programInvite ?? null} />
          </>
        ) : null}
      </div>
    </main>
  );
}
