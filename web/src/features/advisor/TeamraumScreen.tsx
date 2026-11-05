import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { TeamraumBoard, TeamraumWeek, TeamraumWho, taskViewOf, type TeamraumContext } from "@/features/advisor/Teamraum";
import { getOrgNextCheckIns, getOrgPage, listOrgPages, listOrgPresence, listOrgTasks, listTaskComments } from "@/features/advisor/teamraumData";
import { TeamraumPages } from "@/features/advisor/TeamraumPages";
import { OrgChatList } from "@/features/advisor/OrgChatList";
import { SocialCalendar } from "@/features/advisor/SocialCalendar";
import { getOrgPost, listOrgCampaigns, listOrgEventPosts, listOrgPosts } from "@/features/advisor/socialCalendarData";
import { addDays, isChannel, monthGrid, monthOf, weekOf } from "@/features/advisor/socialCalendarModel";
import { listMyOrgChats, searchOrgChats } from "@/features/advisor/orgChatData";
import { getMyQuietHours } from "@/features/notifications/QuietHoursSection";
import { isBuiltInTemplate } from "@/features/advisor/teamraumPageModel";
import { taskFilterOf } from "@/features/advisor/teamraumModel";
import { getOrgTeamPrograms, listDueProgramFollowUps, listProgramEvents } from "@/features/advisor/teamProgramData";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import { teamraumHref, teamraumPath, type TeamraumSection } from "@/features/advisor/teamraumRoutes";

export type TeamraumQuery = Record<string, string | undefined>;

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Der Teamraum als eigener Bereich (seit 05.11.2026, vorher Reitergruppe der Organisation). Nur Mitglieder der
 * Organisation, nie die Startups - die Daten kommen ueber dieselben Abfragen und Zeilenregeln wie vorher.
 *
 * Der Kopf ist bewusst schmal: Wo man im Teamraum ist, sagt die zweite Reihe im Menue. Der grosse Kopf der
 * Organisation hatte hier vor jedem Inhalt einen ganzen Bildschirm gekostet (am Telefon).
 */
export async function TeamraumScreen({ section, searchParams }: { section: TeamraumSection; searchParams?: Promise<TeamraumQuery> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath(teamraumPath(section)));

  const client = await createClient();
  const [roleViews, orgs, t, tArea, tAdvisor, locale] = await Promise.all([
    getDashboardRoleViews(user.id),
    getMyAdvisorOrgs(client),
    getTranslations("advisor.teamraum.screen"),
    getTranslations("advisor.area"),
    getTranslations("advisor"),
    getLocale().then(getPresentationLocale),
  ]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");
  const org = orgs.find((entry) => entry.id === query.org) ?? orgs[0] ?? null;
  // Ohne Organisation gibt es keinen Teamraum; angelegt wird sie unter "Mein Programm".
  if (!org) redirect("/advisor/organisation");

  const members = await getOrgMembers(client, org.id);
  const activeMembers = members.filter((member) => member.status === "active");
  const isOwner = org.role === "owner" && org.status === "active";
  const canWrite = org.status === "active";
  const today = new Date().toISOString().slice(0, 10);
  const unnamed = tArea("kinds.unnamed");

  const content = await (async () => {
    if (section === "chat") {
      return (
        <OrgChatList
          orgId={org.id}
          me={user.id}
          members={activeMembers.map((member) => ({ userId: member.userId, name: member.displayName ?? unnamed }))}
          chats={await listMyOrgChats(client, org.id)}
          quiet={await getMyQuietHours(client)}
          canWrite={canWrite}
          locale={locale}
          query={(query.q ?? "").slice(0, 100)}
          hits={(query.q ?? "").trim().length >= 2 ? await searchOrgChats(client, org.id, query.q as string) : []}
        />
      );
    }

    const planEvents = section === "who" ? [] : await listProgramEvents(client, org.id);

    if (section === "social") {
      const view = query.view === "week" ? "week" : "month";
      const week = weekOf(query.week, today);
      const month = view === "week" ? week.slice(0, 7) : monthOf(query.month, today);
      const grid = monthGrid(month);
      const from = view === "week" ? week : grid[0][0].day;
      const to = view === "week" ? addDays(week, 6) : grid[grid.length - 1][6].day;
      const [posts, eventPosts, campaigns, selected] = await Promise.all([
        listOrgPosts(client, org.id, from, to),
        listOrgEventPosts(client, org.id),
        listOrgCampaigns(client, org.id),
        UUID.test(query.post ?? "") ? getOrgPost(client, org.id, query.post as string) : Promise.resolve(null),
      ]);
      return (
        <SocialCalendar
          ctx={{
            orgId: org.id,
            me: user.id,
            isOwner,
            canWrite,
            today,
            month,
            view,
            week,
            locale,
            members: activeMembers.map((member) => ({ userId: member.userId, name: member.displayName ?? unnamed })),
            events: planEvents.map((event) => ({ eventId: event.eventId, title: event.title, startsAt: event.startsAt })),
            posts,
            eventPosts,
            campaigns,
            channel: isChannel(query.channel) ? query.channel : null,
            feedback: { error: query.socialError === "1", saved: query.socialSaved === "1", deleted: query.socialDeleted === "1", created: /^\d{1,2}$/.test(query.socialCreated ?? "") ? Number(query.socialCreated) : null },
          }}
          selected={selected}
          newDay={selected ? null : /^\d{4}-\d{2}-\d{2}$/.test(query.newPost ?? "") ? (query.newPost as string) : null}
          newEvent={UUID.test(query.event ?? "") ? (query.event as string) : null}
        />
      );
    }

    // Diese Woche, Aufgaben, Seiten, Wer macht was: derselbe Zusammenhang aus Mitgliedern, Teams und Aufgaben.
    const docId = section === "pages" && UUID.test(query.doc ?? "") ? (query.doc as string) : null;
    const templatePageId = section === "pages" && query.newDoc === "1" && UUID.test(query.template ?? "") ? (query.template as string) : null;
    const selectedTaskId = section === "tasks" && UUID.test(query.task ?? "") ? (query.task as string) : null;
    const [programs, orgTasks, presence, taskComments, followUps, nextCheckIns, orgPages, openPage, templatePage] = await Promise.all([
      getOrgTeamPrograms(client, org.id),
      listOrgTasks(client, org.id),
      section === "who" ? listOrgPresence(client, org.id) : Promise.resolve([]),
      selectedTaskId ? listTaskComments(client, selectedTaskId) : Promise.resolve([]),
      section === "week" ? listDueProgramFollowUps(client) : Promise.resolve([]),
      section === "week" || section === "who" ? getOrgNextCheckIns(client, org.id) : Promise.resolve([]),
      section === "pages" || section === "tasks" ? listOrgPages(client, org.id) : Promise.resolve([]),
      docId ? getOrgPage(client, org.id, docId) : Promise.resolve(null),
      templatePageId ? getOrgPage(client, org.id, templatePageId) : Promise.resolve(null),
    ]);
    const ctx: TeamraumContext = {
      orgId: org.id,
      me: user.id,
      isOwner,
      canWrite,
      members: activeMembers.map((member) => ({ userId: member.userId, name: member.displayName ?? unnamed, role: member.role, isSelf: member.isSelf })),
      programs: programs.map((program) => ({ programId: program.programId, name: program.teamName ?? tAdvisor("teamProgram.unnamedTeam"), contactUserIds: program.contactUserIds, isActive: program.isActive })),
      events: planEvents,
      tasks: orgTasks,
      presence,
      pageTitles: new Map(orgPages.map((entry) => [entry.id, entry.title])),
      today,
      locale,
      feedback: { error: query.taskError ?? null, saved: query.taskSaved === "1", deleted: query.taskDeleted === "1", created: /^\d{1,2}$/.test(query.taskCreated ?? "") ? Number(query.taskCreated) : null },
    };
    if (section === "week") return <TeamraumWeek ctx={ctx} followUps={followUps} nextCheckIns={nextCheckIns} />;
    if (section === "who") return <TeamraumWho ctx={ctx} nextCheckIns={nextCheckIns} />;
    if (section === "tasks") {
      return <TeamraumBoard ctx={ctx} filter={taskFilterOf(query.filter)} selectedTaskId={selectedTaskId} comments={taskComments} view={taskViewOf(query.view)} month={monthOf(query.month, today)} />;
    }
    // Neue Seite: leer, aus einer mitgelieferten Vorlage oder aus einer eigenen Vorlage der Organisation.
    const builtIn = isBuiltInTemplate(query.template) ? query.template : null;
    return (
      <TeamraumPages
        ctx={ctx}
        pages={orgPages}
        page={openPage}
        mode={query.newDoc === "1" ? "new" : openPage && query.edit === "1" ? "edit" : "view"}
        prefill={{
          title: templatePage ? templatePage.title : builtIn ? tAdvisor(`teamraum.pages.templates.${builtIn}.title`) : "",
          body: templatePage ? templatePage.body : builtIn ? tAdvisor(`teamraum.pages.templates.${builtIn}.body`) : "",
          parentId: UUID.test(query.parent ?? "") ? (query.parent as string) : null,
          isNote: query.note === "1",
        }}
        feedback={{ error: query.docError ?? null, saved: query.docSaved === "1", deleted: query.docDeleted === "1", taskCreated: query.docTask === "1" }}
      />
    );
  })();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {t("title")} <span className="font-normal text-slate-500">· {org.name}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t("hint")}</p>
        </div>
        {orgs.length > 1 ? (
          <nav aria-label={t("orgSwitch")} className="flex flex-wrap gap-2">
            {orgs.map((entry) => (
              <Link
                key={entry.id}
                href={teamraumHref(section, entry.id)}
                aria-current={entry.id === org.id ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${entry.id === org.id ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {entry.name}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      {content}
    </main>
  );
}
