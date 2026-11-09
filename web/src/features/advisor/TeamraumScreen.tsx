import Link from "next/link";
import { berlinToday } from "@/lib/berlinTime";
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
import { getContentDefaults, listContentItems, listOrgCampaigns, listPostTemplates } from "@/features/advisor/socialCalendarData";
import { addDays, monthOf } from "@/features/advisor/socialCalendarModel";
import { listMyOrgChats, searchOrgChats } from "@/features/advisor/orgChatData";
import { getMyQuietHours } from "@/features/notifications/QuietHoursSection";
import { isBuiltInTemplate } from "@/features/advisor/teamraumPageModel";
import { taskFilterOf } from "@/features/advisor/teamraumModel";
import { getOrgTeamPrograms, listDueProgramFollowUps, listProgramEvents } from "@/features/advisor/teamProgramData";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";
import { teamraumHref, teamraumPath, type TeamraumSection } from "@/features/advisor/teamraumRoutes";
import { AreaTips } from "@/features/advisor/setup/AreaTips";

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
  // Der Teamraum ist ein Recht ("room"); loeschen darf fremde Inhalte, wer die Organisation fuehrt (Admin, Koordination).
  if (!org.rights.room) redirect("/advisor/dashboard");
  const isOwner = org.isLead && org.status === "active";
  const canWrite = org.status === "active";
  const today = berlinToday();
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
      // Seit dem 06.11.2026 gibt es nur noch einen Kalender (Posts sind dort eine Ebene). Hier bleiben Vorlagen und
      // Kampagnen; alte Adressen des Social-Kalenders (Posts, "+ Post", Monat) fuehren in den Kalender.
      if (query.reiter !== "vorlagen" && query.reiter !== "kampagnen" && query.reiter !== "einstellungen") {
        redirect(
          calendarHref(org.id, {
            monat: /^\d{4}-\d{2}$/.test(query.month ?? "") ? query.month : null,
            ansicht: query.view === "week" ? "woche" : null,
            woche: query.view === "week" && /^\d{4}-\d{2}-\d{2}$/.test(query.week ?? "") ? query.week : null,
            post: UUID.test(query.post ?? "") ? query.post : null,
            neu: query.newPost ? "post" : null,
            tag: /^\d{4}-\d{2}-\d{2}$/.test(query.newPost ?? "") ? query.newPost : null,
            termin: query.newPost && UUID.test(query.event ?? "") ? query.event : null,
          }),
        );
      }
      const month = monthOf(query.month, today);
      const campaigns = await listOrgCampaigns(client, org.id);
      const templates = await listPostTemplates(client, org.id);
      const [contentItems, contentDefaults] = await Promise.all([listContentItems(client, org.id), getContentDefaults(client, org.id)]);
      return (
        <SocialCalendar
          ctx={{
            orgId: org.id,
            isOwner,
            canWrite,
            today,
            month,
            locale,
            events: planEvents.map((event) => ({ eventId: event.eventId, title: event.title, startsAt: event.startsAt })),
            campaigns,
            templates,
            reiter: query.reiter === "kampagnen" ? "kampagnen" : query.reiter === "einstellungen" ? "einstellungen" : "vorlagen",
            content: {
              items: contentItems,
              defaults: contentDefaults,
              members: activeMembers.map((member) => ({ userId: member.userId, name: member.displayName ?? unnamed })),
              canPlan: org.rights.plan && org.status === "active",
              feedback: { error: query.contentError === "1", saved: query.contentSaved === "1" },
            },
            templateEdit: query.vorlage === "neu" ? "neu" : UUID.test(query.vorlage ?? "") ? (query.vorlage as string) : null,
            feedback: { error: query.socialError === "1", saved: query.socialSaved === "1", deleted: query.socialDeleted === "1", created: /^\d{1,2}$/.test(query.socialCreated ?? "") ? Number(query.socialCreated) : null },
          }}
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
      return (
        <TeamraumBoard
          ctx={ctx}
          filter={taskFilterOf(query.filter)}
          selectedTaskId={selectedTaskId}
          comments={taskComments}
          view={taskViewOf(query.view)}
          month={monthOf(query.month, today)}
          options={{
            viewChosen: query.view === "board" || query.view === "list" || query.view === "calendar",
            query: (query.q ?? "").slice(0, 80),
            showDone: query.done === "1",
            newOpen: query.new === "1",
            dictateOpen: query.dictate === "1",
            programId: /^[0-9a-f-]{36}$/.test(query.team ?? "") ? (query.team as string) : null,
            eventId: UUID.test(query.event ?? "") ? (query.event as string) : null,
          }}
        />
      );
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

  // Kopf nach dem Entwurf vom 05.11.2026: eine kleine Zeile (Organisation, bei "Diese Woche" die Woche), darunter
  // der Teil als Ueberschrift. Bei den Aufgaben stehen "Diktieren" und "+ Neue Aufgabe" rechts daneben.
  const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const range = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const eyebrow =
    section === "week"
      ? t("eyebrowWeek", { org: org.name, from: Number(monday.slice(8)), to: range.format(new Date(`${addDays(monday, 6)}T00:00:00Z`)) })
      : t("eyebrow", { org: org.name });
  const keepForActions = Object.fromEntries(["view", "filter", "q", "month"].filter((key) => query[key]).map((key) => [key, query[key] as string]));

  return (
    <main className="work-ui mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:pb-12 lg:px-8">
      {/* "Diese Woche", "Aufgaben" und "Wer macht was" gehoeren zur Station Aufgaben in der Seitenleiste und stehen hier als Reiter -
          auf jeder Breite (vorher nur unter 1280 Pixeln: am Rechner kam man mit der Seitenleiste nicht mehr zu "Diese Woche"
          und "Wer macht was"). Chat, Seiten und Vorlagen haben eigene Stationen. */}
      {section === "week" || section === "tasks" || section === "who" ? (
        <nav aria-label={t("sectionsLabel")} className="-mx-4 -mt-5 mb-5 flex gap-5 overflow-x-auto border-b border-slate-200 px-4 text-[14.5px] [scrollbar-width:none] sm:-mx-6 sm:-mt-7 sm:px-6 lg:mx-0 lg:mt-0 lg:px-0">
          {(["week", "tasks", "who"] as const).map((entry) => (
            <Link
              key={entry}
              href={teamraumHref(entry, orgs.length > 1 ? org.id : null)}
              aria-current={entry === section ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 ${entry === section ? "border-slate-950 font-semibold text-slate-950" : "border-transparent text-slate-600"}`}
            >
              {t(`sections.${entry}`)}
            </Link>
          ))}
        </nav>
      ) : null}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[13px] text-slate-600">{eyebrow}</p>
          <h1 className="font-brand mt-1 text-[30px] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[34px]">{t(`sections.${section}`)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {section === "tasks" && canWrite ? (
            <>
              <Link href={teamraumHref("tasks", org.id, { ...keepForActions, dictate: "1" })} className="hidden min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:inline-flex">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                {t("dictate")}
              </Link>
              <Link href={teamraumHref("tasks", org.id, { ...keepForActions, new: "1" })} className="brand-cta hidden min-h-11 items-center rounded-xl px-[18px] text-sm font-semibold md:inline-flex">
                + {t("newTask")}
              </Link>
            </>
          ) : null}
        </div>
      </header>
      <AreaTips area="teamraum" />
      {content}
    </main>
  );
}
