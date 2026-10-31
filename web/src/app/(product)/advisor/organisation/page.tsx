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
import { OrgSuccessSwitch } from "@/features/advisor/OrgSuccessSwitch";
import { OrgRewards } from "@/features/advisor/OrgRewards";
import { OrgOutcomeCatalog } from "@/features/advisor/OrgOutcomeCatalog";
import { OrgProgramPlan } from "@/features/advisor/OrgProgramPlan";
import { OrgTeamProgramsSection } from "@/features/advisor/OrgTeamProgramsSection";
import { OrgProgramOverview } from "@/features/advisor/OrgProgramOverview";
import { ProgramPageEditor } from "@/features/advisor/ProgramPageEditor";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { ProgramAccessTable } from "@/features/advisor/ProgramAccess";
import { getOrgMilestoneDeadlines, getOrgTeamPrograms, getOrgRewards, getOutcomeCatalog, getSuccessEnabled, getProgramAccess, listProgramEvents, listTeamProgramCodes, listTeamProgramInvites } from "@/features/advisor/teamProgramData";
import {
  countOrgSeatsUsed,
  getAccompaniedPeople,
  getMyAdvisorOrgs,
  getOrgMembers,
  withAccompaniedNames,
} from "@/features/advisor/orgData";

const TABS = ["overview", "teams", "people", "access", "members", "program", "plan", "success", "page", "profile"] as const;
type Tab = (typeof TABS)[number];
// "settings" hiess bis zum 31.10.2026 der eine Reiter fuer alles; alte Links landen bei den Mitgliedern.
const TAB_OF = (value: string | undefined): Tab => (value === "settings" ? "members" : TABS.find((tab) => tab === value) ?? "overview");

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
  searchParams?: Promise<{ orgError?: string; tab?: string; org?: string; programInvite?: string; programInviteMail?: string; programInviteError?: string; programCodeError?: string; batch?: string; category?: string; pageError?: string; pageSaved?: string; teamRemoved?: string; planError?: string; planSaved?: string; open?: string; successError?: string }>;
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
  const needsPrograms = tab === "program" || tab === "overview" || tab === "access";
  const [seatsUsed, members, teams, people, programs, invites, deadlines, access, codes, planEvents, outcomeCatalog, orgRewards, successEnabled] = await Promise.all([
    countOrgSeatsUsed(client, org.id),
    getOrgMembers(client, org.id),
    needsTeams ? getAdvisorDashboardTeams(user.id) : Promise.resolve([]),
    needsPeople ? withAccompaniedNames(client, await getAccompaniedPeople(client)) : Promise.resolve([]),
    needsPrograms ? getOrgTeamPrograms(client, org.id) : Promise.resolve([]),
    tab === "program" && org.role === "owner" ? listTeamProgramInvites(client, org.id) : Promise.resolve([]),
    tab === "overview" ? getOrgMilestoneDeadlines(client, org.id) : Promise.resolve([]),
    tab === "access" ? getProgramAccess(client, org.id) : Promise.resolve([]),
    tab === "program" && org.role === "owner" ? listTeamProgramCodes(client, org.id) : Promise.resolve([]),
    tab === "plan" ? listProgramEvents(client, org.id) : Promise.resolve([]),
    tab === "success" ? getOutcomeCatalog(client, org.id) : Promise.resolve([]),
    tab === "success" ? getOrgRewards(client, org.id) : Promise.resolve([]),
    tab === "success" ? getSuccessEnabled(client, org.id) : Promise.resolve(false),
  ]);

  const tabLabels = t("orgPage.tabs").split(" | ");
  const readyTeams = teams.filter((team) => team.accessStatus === "ready");
  const waitingTeams = teams.filter((team) => team.accessStatus === "waiting_for_approval");
  const pausedTeams = teams.filter((team) => team.accessStatus === "paused" || team.accessStatus === "revoked");
  const activeMembers = members.filter((member) => member.status === "active").length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AdvisorPageHeader
        eyebrow={[t("eyebrow"), org.locationRegion, org.status === "suspended" ? t("orgPage.suspendedShort") : null].filter(Boolean).join(" · ")}
        title={org.name}
        action={
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20">
            {org.personSeatLimit === null
              ? t("orgPage.seatsOpen", { used: seatsUsed })
              : t("orgPage.seatsLimited", { used: seatsUsed, limit: org.personSeatLimit })}
          </span>
        }
      >
        {org.focus.length > 0 ? (
          <ul aria-label={t("orgPage.focusLabel")} className="mb-4 flex flex-wrap gap-2">
            {org.focus.map((entry) => (
              <li key={entry} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100 ring-1 ring-white/15">
                {entry}
              </li>
            ))}
          </ul>
        ) : null}
        <nav aria-label={t("orgPage.tabsLabel")} className="flex flex-wrap gap-2">
          {TABS.map((entry, index) => (
            <Link
              key={entry}
              href={base(entry)}
              aria-current={tab === entry ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                tab === entry ? "bg-white text-indigo-900" : "bg-white/10 text-indigo-100 hover:bg-white/20"
              }`}
            >
              {tabLabels[index] ?? entry}
            </Link>
          ))}
        </nav>
      </AdvisorPageHeader>

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

        {tab === "access" ? (
          <ProgramAccessTable rows={access} teamNames={new Map(programs.map((program) => [program.programId, program.teamName]))} />
        ) : null}

        {tab === "members" ? <AdvisorOrgSection orgs={[org]} members={members} error={orgError} part="members" /> : null}

        {tab === "page" ? (
          <div className="grid gap-4">
            {query.pageSaved === "1" ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{tAdvisor("programPage.saved")}</p> : null}
            {query.pageError ? (
              <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {tAdvisor(`programPage.errors.${["slug_taken", "slug_invalid", "logo"].includes(query.pageError) ? query.pageError : "failed"}`)}
              </p>
            ) : null}
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{tAdvisor("programPage.title")}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{tAdvisor("programPage.text")}</p>
            </div>
            {org.role === "owner" && org.status === "active" ? (
              <ProgramPageEditor
                orgId={org.id}
                orgName={org.name}
                origin={getPublicAppOrigin()}
                initialSlug={org.programSlug}
                initialPublished={org.programPagePublished}
                initialWelcome={org.programWelcome}
                hasLogo={org.hasProgramLogo}
                initialAccent={org.programAccent}
                initialAccentB={org.programAccentB}
                labels={{
                  published: tAdvisor("programPage.published"),
                  publishedHint: tAdvisor("programPage.publishedHint"),
                  slug: tAdvisor("programPage.slug"),
                  slugHint: tAdvisor("programPage.slugHint"),
                  welcome: tAdvisor("programPage.welcome"),
                  welcomePlaceholder: tAdvisor("programPage.welcomePlaceholder"),
                  logo: tAdvisor("programPage.logo"),
                  logoChange: tAdvisor("programPage.logoChange"),
                  logoRemove: tAdvisor("programPage.logoRemove"),
                  save: tAdvisor("programPage.save"),
                  previewTitle: tAdvisor("programPage.previewTitle"),
                  previewOpen: tAdvisor("programPage.previewOpen"),
                  previewCode: tAdvisor("programPage.previewCode"),
                  previewGo: tAdvisor("programPage.codeGo"),
                  eyebrow: tAdvisor("programPage.eyebrow"),
                  draftNote: tAdvisor("programPage.draftNote"),
                  copy: tAdvisor("programPage.copy"),
                  copied: tAdvisor("programPage.copied"),
                  accent: tAdvisor("programPage.accent"),
                  accentA: tAdvisor("programPage.accentA"),
                  accentB: tAdvisor("programPage.accentB"),
                  accentHint: tAdvisor("programPage.accentHint"),
                  bigger: tAdvisor("programPage.bigger"),
                  smaller: tAdvisor("programPage.smaller"),
                  bold: tAdvisor("programPage.bold"),
                  italic: tAdvisor("programPage.italic"),
                  list: tAdvisor("programPage.list"),
                  alignLeft: tAdvisor("programPage.alignLeft"),
                  alignCenter: tAdvisor("programPage.alignCenter"),
                  alignRight: tAdvisor("programPage.alignRight"),
                  formatHint: tAdvisor("programPage.formatHint"),
                }}
              />
            ) : (
              <p className="text-sm text-slate-600">{tAdvisor("programPage.ownerOnly")}</p>
            )}
          </div>
        ) : null}

        {tab === "plan" ? (
          <>
            {query.planSaved === "1" ? <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{tAdvisor("teamProgram.planSaved")}</p> : null}
            {query.planError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor("teamProgram.planError")}</p> : null}
            <OrgProgramPlan orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} events={planEvents} openEventId={/^[0-9a-f-]{36}$/.test(query.open ?? "") ? (query.open as string) : null} />
          </>
        ) : null}

        {tab === "success" ? (
          <>
            {query.successError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor("teamProgram.catalogError")}</p> : null}
            <div className="grid gap-8">
              <OrgSuccessSwitch orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} enabled={successEnabled} />
              {successEnabled ? (
                <div>
                  <OrgOutcomeCatalog orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} items={outcomeCatalog} />
                  <OrgRewards orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} rewards={orgRewards} />
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {tab === "profile" ? <AdvisorOrgSection orgs={[org]} members={members} error={orgError} part="profile" /> : null}

        {tab === "program" ? (
          <>
            {orgError ? (
              <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {tAdvisor(`org.errors.${orgError}`)}
              </p>
            ) : null}
            {query.teamRemoved === "1" ? <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{tAdvisor("teamProgram.teamRemoved")}</p> : null}
            <OrgTeamProgramsSection org={org} members={members} programs={programs} invites={invites} freshToken={query.programInvite ?? null} mailState={["sent", "failed", "invalid"].includes(query.programInviteMail ?? "") ? (query.programInviteMail as string) : null} inviteError={query.programInviteError === "limit" ? "limit" : null} codes={codes} codeError={query.programCodeError === "limit" ? "limit" : null} />
          </>
        ) : null}
      </div>
    </main>
  );
}
