import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { readOrgErrorCode } from "@/features/advisor/orgErrors";
import { AdvisorOrgSection } from "@/features/advisor/AdvisorOrgSection";
import { MyProgramStart } from "@/features/advisor/MyProgramStart";
import { OrgAreaNav } from "@/features/advisor/OrgAreaNav";
import { OrgFunding, isSuggestionKey } from "@/features/advisor/OrgFunding";
import { listFundingSnapshots, listGrants, loadFunding } from "@/features/advisor/fundingData";
import { legacyTeamraumPath } from "@/features/advisor/teamraumRoutes";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { OrgRewards } from "@/features/advisor/OrgRewards";
import { OrgOutcomeCatalog } from "@/features/advisor/OrgOutcomeCatalog";
import { OrgProgramExperts } from "@/features/advisor/OrgProgramExperts";
import { OrgFeaturesForm } from "@/features/advisor/OrgFeaturesForm";
import { hasOrgFeature, tabEnabled } from "@/features/advisor/orgFeatures";
import { OrgProgramLearning } from "@/features/advisor/ProgramLearning";
import { OrgProgramMaterials } from "@/features/advisor/ProgramMaterials";
import { OrgProgramPlan } from "@/features/advisor/OrgProgramPlan";
import { OrgTeamProgramsSection } from "@/features/advisor/OrgTeamProgramsSection";
import { OrgProgramOverview } from "@/features/advisor/OrgProgramOverview";
import { ProgramPageEditor } from "@/features/advisor/ProgramPageEditor";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { ProgramAccessTable } from "@/features/advisor/ProgramAccess";
import { OrgProgramReport } from "@/features/advisor/OrgProgramReport";
import { parseReportRange } from "@/features/advisor/programReport";
import { getOrgMilestoneDeadlines, getOrgOutcomeCounts, getOrgTeamPrograms, getOrgProgramStars, getOrgRewards, getOutcomeCatalog, getProgramAccess, listLearning, listModuleShares, listProgramEvents, listProgramExperts, listProgramMaterials, listProgramUpdates, listTeamProgramCodes, listTeamProgramInvites } from "@/features/advisor/teamProgramData";
import {
  countOrgSeatsUsed,
  getAccompaniedPeople,
  getMyAdvisorOrgs,
  getOrgMembers,
  getOrgOpenInvites,
  withAccompaniedNames,
} from "@/features/advisor/orgData";

const TABS = ["overview", "program", "plan", "report", "funding", "materials", "learning", "experts", "enroll", "page", "features", "members", "access", "profile"] as const;
type Tab = (typeof TABS)[number];

/**
 * Neu geordnet am 05.11.2026 (Durchsicht mit Maria): Betreuen (taeglich), Inhalte fuer die Teams, Einrichten.
 * "Teams" und "Personen" zeigten die eigene Begleitung ueber alle Organisationen - das steht unter "Begleitung"
 * und ist jetzt nur noch dort. "Erfolge" hatte einen zweiten Schalter; er steht jetzt unter "Funktionen & Erfolge".
 */
const AREA_GROUPS: { key: string; tabs: Tab[] }[] = [
  { key: "care", tabs: ["overview", "program", "plan", "report", "funding"] },
  { key: "content", tabs: ["materials", "learning", "experts"] },
  { key: "setup", tabs: ["enroll", "page", "features", "members", "access", "profile"] },
];
// Alte Adressen: "settings" (bis 31.10.2026) -> Mitglieder, "success" -> Funktionen & Erfolge.
const TAB_OF = (value: string | undefined): Tab =>
  value === "settings" ? "members" : value === "success" ? "features" : TABS.find((tab) => tab === value) ?? "overview";
// Was frueher hier stand und jetzt unter "Begleitung" lebt.
const MOVED_TO_FOLLOW: Record<string, string> = { teams: "/advisor/begleitung?art=teams", people: "/advisor/begleitung?art=personen" };
// Der Teamraum (Diese Woche, Aufgaben, Chat, Social Media, Seiten, Wer macht was) ist seit dem 05.11.2026 ein
// eigener Bereich im Hauptmenue. Alte Adressen stehen in Hinweisen und Push-Mitteilungen; sie werden weitergeleitet.

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
  searchParams?: Promise<Record<string, string | undefined> & { orgError?: string; tab?: string; org?: string; programInvite?: string; programInviteMail?: string; programInviteError?: string; programCodeError?: string; batch?: string; category?: string; pageError?: string; pageSaved?: string; teamRemoved?: string; planError?: string; planSaved?: string; materialError?: string; learningError?: string; setup?: string; saved?: string; expertError?: string; q?: string; open?: string; successError?: string; from?: string; to?: string; filter?: string; task?: string; taskError?: string; taskSaved?: string; taskDeleted?: string; taskCreated?: string; doc?: string; edit?: string; newDoc?: string; template?: string; parent?: string; docError?: string; docSaved?: string; docDeleted?: string; docTask?: string; note?: string; grant?: string; newGrant?: string; suggest?: string; fundingError?: string; fundingSaved?: string; fundingDeleted?: string; fundingSnapshot?: string; chatError?: string; month?: string; channel?: string; post?: string; newPost?: string; event?: string; socialError?: string; socialSaved?: string; socialDeleted?: string; socialCreated?: string; view?: string; week?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const orgError = readOrgErrorCode(query.orgError);
  const [t, tAdvisor] = await Promise.all([getTranslations("advisor.area"), getTranslations("advisor")]);
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/organisation"));
  if (query.tab && MOVED_TO_FOLLOW[query.tab]) redirect(MOVED_TO_FOLLOW[query.tab]);
  const teamraumPath = legacyTeamraumPath(query);
  if (teamraumPath) redirect(teamraumPath);

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
        <AdvisorPageHeader eyebrow={t("eyebrow")} title={tAdvisor("myProgram.pageTitle")} text={tAdvisor("myProgram.pageText")} />
        <div className="mt-7">
          <MyProgramStart error={orgError} />
        </div>
      </main>
    );
  }

  // Wer die Organisation allein fuehrt, sieht nur den Teil, den ein eigenes Programm braucht. Uebersicht und
  // Freigaben wiederholen dort Begleitung und Start; auch ueber die Adresse landet man dann beim Programm.
  const members = await getOrgMembers(client, org.id);
  const soloOrg = org.role === "owner" && members.filter((member) => member.status === "active").length === 1;
  const SOLO_HIDDEN: Tab[] = ["overview", "access"];
  const requestedTab = query.tab ? TAB_OF(query.tab) : soloOrg ? "program" : "overview";
  const tab: Tab = soloOrg && SOLO_HIDDEN.includes(requestedTab) ? "program" : requestedTab;
  const isOwner = org.role === "owner" && org.status === "active";
  const ownerNames = members.filter((member) => member.role === "owner" && member.status === "active").map((member) => member.displayName ?? t("kinds.unnamed"));
  // Neue Organisationen bestaetigen zuerst, welche Bereiche sie brauchen. Nur die Inhaberin wird dorthin geleitet.
  if (org.role === "owner" && org.status === "active" && !org.featuresSetupDone && tab !== "features") {
    redirect(`${base("features")}&setup=1`);
  }
  // Ein ausgeschalteter Bereich erreicht man auch ueber eine alte Adresse nicht: die Seite sagt, wo man ihn einschaltet.
  const tabOff = !tabEnabled(org, tab);
  const openInvites = tab === "members" ? await getOrgOpenInvites(client, org.id) : [];
  const needsPeople = tab === "learning";
  const needsPrograms = tab === "funding" || tab === "program" || tab === "enroll" || tab === "overview" || tab === "access" || tab === "learning";
  const [seatsUsed, people, programs, invites, deadlines, access, codes, planEvents, materials, experts, outcomeCatalog, orgRewards, programStars, outcomeCounts, learning, moduleShares] = await Promise.all([
    countOrgSeatsUsed(client, org.id),
    needsPeople ? withAccompaniedNames(client, await getAccompaniedPeople(client)) : Promise.resolve([]),
    needsPrograms ? getOrgTeamPrograms(client, org.id) : Promise.resolve([]),
    tab === "enroll" && org.role === "owner" ? listTeamProgramInvites(client, org.id) : Promise.resolve([]),
    tab === "overview" ? getOrgMilestoneDeadlines(client, org.id) : Promise.resolve([]),
    tab === "access" ? getProgramAccess(client, org.id) : Promise.resolve([]),
    tab === "enroll" && org.role === "owner" ? listTeamProgramCodes(client, org.id) : Promise.resolve([]),
    tab === "plan" ? listProgramEvents(client, org.id) : Promise.resolve([]),
    tab === "materials" ? listProgramMaterials(client, org.id) : Promise.resolve([]),
    tab === "experts" ? listProgramExperts(client, org.id) : Promise.resolve([]),
    tab === "features" && hasOrgFeature(org, "success") ? getOutcomeCatalog(client, org.id) : Promise.resolve([]),
    tab === "features" && hasOrgFeature(org, "success") ? getOrgRewards(client, org.id) : Promise.resolve([]),
    tab === "program" ? getOrgProgramStars(client, org.id) : Promise.resolve([]),
    tab === "overview" ? getOrgOutcomeCounts(client, org.id) : Promise.resolve([]),
    tab === "learning" ? listLearning(client, org.id) : Promise.resolve([]),
    tab === "learning" ? listModuleShares(client, org.id) : Promise.resolve([]),
  ]);

  // Foerderauflagen: die gewaehlte Foerderung (sonst die juengste), ihr Stand, Nachweise und festgehaltene Staende.
  const funding = tab === "funding" && !tabOff ? await (async () => {
    const grants = await listGrants(client, org.id);
    const grant = query.newGrant === "1" ? null : grants.find((entry) => entry.id === query.grant) ?? grants[0] ?? null;
    const teamNames = new Map(programs.map((program) => [program.programId, program.teamName ?? tAdvisor("teamProgram.unnamedTeam")]));
    const today = new Date().toISOString().slice(0, 10);
    const [loaded, snapshots] = grant ? await Promise.all([loadFunding(client, grant, teamNames, today), isOwner ? listFundingSnapshots(client, grant.id) : Promise.resolve([])]) : [null, []];
    return { grants, grant, today, loaded, snapshots };
  })() : null;

  const tabLabels = t("orgPage.tabs").split(" | ");
  const areaGroups = AREA_GROUPS.map((group, groupIndex) => ({
    key: group.key,
    label: t("orgPage.groupLabels").split(" | ")[groupIndex] ?? group.key,
    tabs: group.tabs.filter((entry) => (!soloOrg || !SOLO_HIDDEN.includes(entry)) && tabEnabled(org, entry)).map((entry) => ({ key: entry, label: tabLabels[TABS.indexOf(entry)] ?? entry, href: base(entry) })),
  })).filter((group) => group.tabs.length > 0);
  // Teams im Programm (Entwurf 05.11.2026): je Team der naechste Meilenstein und das letzte Update. Nur Teams, die
  // diese Person sieht - die Abfragen laufen unter ihren Rechten.
  const lastActivity: Record<string, { milestone: { title: string; dueOn: string } | null; lastUpdate: string | null }> =
    tab === "program"
      ? await (async () => {
          const today = new Date().toISOString().slice(0, 10);
          const active = programs.filter((program) => program.isActive);
          const [milestones, updates] = await Promise.all([
            getOrgMilestoneDeadlines(client, org.id),
            Promise.all(active.map(async (program) => [program.programId, (await listProgramUpdates(client, program.programId)).map((update) => update.submittedAt).sort().at(-1) ?? null] as const)),
          ]);
          return Object.fromEntries(
            active.map((program) => {
              const own = milestones.filter((entry) => entry.programId === program.programId).sort((x, y) => (x.dueOn < y.dueOn ? -1 : 1));
              const next = own.find((entry) => entry.dueOn >= today) ?? own[0] ?? null;
              return [program.programId, { milestone: next ? { title: next.title, dueOn: next.dueOn } : null, lastUpdate: updates.find(([id]) => id === program.programId)?.[1] ?? null }];
            }),
          );
        })()
      : {};
  // Die Plaetze stehen seit dem Entwurf beim Reiter "Teams im Programm", nicht mehr im Kopf.
  const seatsText = org.personSeatLimit === null ? t("orgPage.seatsOpen", { used: seatsUsed }) : t("orgPage.seatsLimited", { used: seatsUsed, limit: org.personSeatLimit });
  const activeMembers = members.filter((member) => member.status === "active").length;

  return (
    <main className="work-ui mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Schmaler Kopf (Entwurf vom 05.11.2026): Ort und Schwerpunkte, Name, die drei Gruppen. Darunter die Reiter. */}
      <header className="advisor-hero flex flex-col gap-4 rounded-[22px] px-6 py-5 sm:px-7 md:flex-row md:items-center md:justify-between">
        <div className="relative z-10 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-indigo-200">
            {[org.locationRegion, org.focus.join(", ") || null, org.status === "suspended" ? t("orgPage.suspendedShort") : null].filter(Boolean).join(" · ") || t("eyebrow")}
          </p>
          <h1 className="font-brand mt-1 break-words text-[28px] font-semibold leading-tight text-white sm:text-[30px]">{org.name}</h1>
        </div>
        <OrgAreaNav part="groups" ariaLabel={t("orgPage.tabsLabel")} activeTab={tab} groups={areaGroups} />
      </header>
      <OrgAreaNav part="tabs" ariaLabel={t("orgPage.tabsLabel")} activeTab={tab} groups={areaGroups} />

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
        {/* Eingerichtet wird von der Fuehrung; andere Mitglieder lesen mit und wissen, wen sie fragen. */}
        {!isOwner && (tab === "enroll" || tab === "page" || tab === "features" || tab === "profile") ? (
          <p role="note" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {t("orgPage.ownerOnlyNote", { names: ownerNames.join(", ") || t("kinds.unnamed") })}
          </p>
        ) : null}
        {tab === "overview" ? (
          <div className="grid gap-6">
            <OrgProgramOverview orgId={org.id} programs={programs} outcomeCounts={outcomeCounts} batch={query.batch?.slice(0, 60) || null} category={query.category?.slice(0, 60) || null} />
            {org.description ? <p className="max-w-3xl text-sm leading-7 text-slate-700">{org.description}</p> : null}
            <dl className="grid grid-cols-3 gap-3">
              {[
                [t("orgPage.statTeams"), programs.filter((program) => program.isActive).length],
                [t("orgPage.statWaiting"), programs.filter((program) => !program.isActive).length],
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

        {funding ? (
          <OrgFunding
            ctx={{
              orgId: org.id,
              isOwner,
              canWrite: org.status === "active",
              locale: getPresentationLocale(await getLocale()),
              today: funding.today,
              programs: programs.filter((program) => program.isActive).map((program) => ({ programId: program.programId, name: program.teamName ?? tAdvisor("teamProgram.unnamedTeam") })),
              feedback: { error: query.fundingError ?? null, saved: query.fundingSaved === "1", deleted: query.fundingDeleted === "1", snapshot: query.fundingSnapshot === "1" },
            }}
            grants={funding.grants}
            grant={funding.grant}
            requirements={funding.loaded?.requirements ?? []}
            entries={funding.loaded?.entries ?? []}
            report={funding.loaded?.report ?? null}
            snapshots={funding.snapshots}
            suggestion={isSuggestionKey(query.suggest) ? query.suggest : null}
            newGrant={query.newGrant === "1"}
          />
        ) : null}
        {tab === "access" ? (
          <ProgramAccessTable rows={access} teamNames={new Map(programs.map((program) => [program.programId, program.teamName]))} />
        ) : null}

        {tab === "members" ? <AdvisorOrgSection orgs={[org]} members={members} openInvites={openInvites} error={orgError} saved={query.saved === "1"} part="members" /> : null}

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

        {tab === "experts" && !tabOff ? (
          <>
            {query.expertError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor("teamProgram.expertsError")}</p> : null}
            <OrgProgramExperts orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} experts={experts} query={(query.q ?? "").slice(0, 80)} />
          </>
        ) : null}

        {/* Auswertung (Feedback an Maria, 04.11.2026): Zahlen zu Veranstaltungen, Teilnahme und Gespraechen. */}
        {tab === "report" ? (
          <OrgProgramReport orgId={org.id} isOwner={org.role === "owner"} range={parseReportRange(query.from, query.to)} />
        ) : null}

        {tab === "plan" && !tabOff ? (
          <>
            {query.planSaved === "1" ? <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{tAdvisor("teamProgram.planSaved")}</p> : null}
            {query.planError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor("teamProgram.planError")}</p> : null}
            <OrgProgramPlan withSpeakers={hasOrgFeature(org, "experts")} orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} events={planEvents} openEventId={/^[0-9a-f-]{36}$/.test(query.open ?? "") ? (query.open as string) : null} />
          </>
        ) : null}

        {tab === "materials" && !tabOff ? (
          <>
            {query.materialError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor("teamProgram.materialsError")}</p> : null}
            <div>
              <OrgProgramMaterials orgId={org.id} isOwner={org.role === "owner" && org.status === "active"} materials={materials} />
            </div>
          </>
        ) : null}

        {tab === "learning" && !tabOff ? (
          <>
            {query.learningError ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor(query.learningError === "audience" ? "teamProgram.learningAudienceError" : "teamProgram.learningError")}</p> : null}
            <div>
              <OrgProgramLearning
                orgId={org.id}
                isOwner={org.role === "owner" && org.status === "active"}
                modules={learning}
                shares={moduleShares}
                teams={programs.map((program) => ({ programId: program.programId, name: program.teamName ?? tAdvisor("teamProgram.unnamedTeam") }))}
                people={people.filter((person) => person.scopes.includes("base") && person.name).map((person) => ({ userId: person.subjectUserId, name: person.name as string }))}
              />
            </div>
          </>
        ) : null}

        {tabOff ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700">
            {tAdvisor("org.features.offNotice")}{" "}
            <Link href={base("features")} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{tAdvisor("org.features.offNoticeLink")}</Link>
          </p>
        ) : null}

        {tab === "features" ? (
          <div className="grid gap-10">
            <OrgFeaturesForm
              orgId={org.id}
              isOwner={isOwner}
              enabled={org.features}
              setup={query.setup === "1"}
              saved={query.saved === "1"}
            />
            {/* Ein Schalter fuer Erfolge (oben, mit den anderen Bereichen); was dazugehoert, steht darunter. */}
            {hasOrgFeature(org, "success") ? (
              <section id="erfolge" aria-labelledby="org-success-title" className="scroll-mt-24">
                <h2 id="org-success-title" className="text-xl font-semibold text-slate-950">{t("orgPage.successTitle")}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("orgPage.successText")}</p>
                {query.successError ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{tAdvisor("teamProgram.catalogError")}</p> : null}
                <div className="mt-4">
                  <OrgOutcomeCatalog orgId={org.id} isOwner={isOwner} items={outcomeCatalog} />
                  <OrgRewards orgId={org.id} isOwner={isOwner} rewards={orgRewards} />
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "profile" ? <AdvisorOrgSection orgs={[org]} members={members} error={orgError} saved={query.saved === "1"} part="profile" /> : null}

        {tab === "program" || tab === "enroll" ? (
          <>
            {orgError ? (
              <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {tAdvisor(`org.errors.${orgError}`)}
              </p>
            ) : null}
            {query.teamRemoved === "1" ? <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{tAdvisor("teamProgram.teamRemoved")}</p> : null}
            <OrgTeamProgramsSection part={tab === "enroll" ? "enroll" : "teams"} seatsText={seatsText} lastActivity={lastActivity} org={org} members={members} programs={programs} stars={programStars} invites={invites} freshToken={query.programInvite ?? null} mailState={["sent", "failed", "invalid"].includes(query.programInviteMail ?? "") ? (query.programInviteMail as string) : null} inviteError={query.programInviteError === "limit" ? "limit" : null} codes={codes} codeError={query.programCodeError === "limit" ? "limit" : null} />
          </>
        ) : null}
      </div>
    </main>
  );
}
