import Link from "next/link";
import { berlinToday } from "@/lib/berlinTime";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";
import { hasOrgFeature } from "@/features/advisor/orgFeatures";
import { listSavedEcoItems } from "@/features/advisor/calendar/calendarData";
import {
  CALENDAR_LAYERS,
  CALENDAR_VIEWS,
  addDays,
  buildCalendarItems,
  calendarHref,
  eventsNeedingPosts,
  hiddenLayersOf,
  hiddenParam,
  itemsByDay,
  monthGrid,
  monthOf,
  shiftMonth,
  tabOf,
  viewOf,
  viewParam,
  visibleRange,
  weekOf,
  type CalendarItem,
  type CalendarLayer,
  type CalendarView,
} from "@/features/advisor/calendar/calendarModel";
import { PlanView } from "@/features/advisor/calendar/PlanView";
import { EventPanel } from "@/features/advisor/calendar/EventPanel";
import { EventSheet } from "@/features/advisor/calendar/EventSheet";
import { PostSheet } from "@/features/advisor/calendar/PostSheet";
import { DraggableItem, DropDay } from "@/features/ui/CalendarDrag";
import { movePostToDayAction } from "@/features/advisor/socialCalendarActions";
import { EventFormats } from "@/features/advisor/EventFormats";
import { getEventAttendance, getEventRsvps, getOrgTeamPrograms, listEventExperts, listEventFormats, listProgramEventsSplit, listProgramExperts } from "@/features/advisor/teamProgramData";
import { listEventCountingRequirements } from "@/features/advisor/fundingData";
import { getOrgPost, listOrgCampaigns, listOrgEventPosts, listOrgPosts, listPostTemplates } from "@/features/advisor/socialCalendarData";
import { isoWeekNumber } from "@/features/advisor/socialCalendarModel";
import { listOrgTasks } from "@/features/advisor/teamraumData";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";
import { AreaTips } from "@/features/advisor/setup/AreaTips";

export type CalendarQuery = Record<string, string | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const LAYER_STYLE: Record<CalendarLayer, { chip: string; dot: string }> = {
  program: { chip: "bg-violet-100 text-violet-950", dot: "bg-violet-600" },
  post: { chip: "bg-pink-100 text-pink-950", dot: "bg-pink-600" },
  task: { chip: "bg-amber-100 text-amber-950", dot: "bg-amber-600" },
  eco: { chip: "bg-sky-100 text-sky-950", dot: "bg-sky-600" },
};

/**
 * Der Kalender der Organisation (Entwurf 05.11.2026, ersetzt den Programmplan): Monat, Woche, Liste und Formate.
 * Programm-Termine, Posts, Aufgaben-Fristen und gemerkte Events aus dem Oekosystem liegen als Ebenen uebereinander.
 * Ein Klick auf einen Termin oeffnet sein Panel; Anlegen und Aendern oeffnen als Seitenpanel. Alles steht in der
 * Adresse (Monat, Ansicht, Ebenen, Termin, Reiter) - ohne Skript bedienbar, Links zeigen genau hierher.
 */
export async function CalendarScreen({ searchParams }: { searchParams?: Promise<CalendarQuery> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/kalender"));

  const client = await createClient();
  const [roleViews, orgs, t, tp, tAdvisor, ts, locale] = await Promise.all([
    getDashboardRoleViews(user.id),
    getMyAdvisorOrgs(client),
    getTranslations("advisor.calendar"),
    getTranslations("advisor.teamProgram"),
    getTranslations("advisor"),
    getTranslations("advisor.social"),
    getLocale().then(getPresentationLocale),
  ]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");
  const org = orgs.find((entry) => entry.id === query.org) ?? orgs[0] ?? null;
  if (!org) redirect("/advisor/organisation");

  const today = berlinToday();
  const isOwner = org.role === "owner" && org.status === "active";
  const canWrite = org.status === "active";
  const view = viewOf(query.ansicht);
  const month = monthOf(query.monat, today);
  const week = weekOf(query.woche, today);
  const hidden = hiddenLayersOf(query.aus);
  const onlyPosts = query.nur === "posts";

  // Was bei jedem Link im Kalender mitgeht.
  const keep: Record<string, string> = {
    ...(view !== "month" ? { ansicht: viewParam(view) } : {}),
    ...(query.monat && monthOf(query.monat, today) === query.monat ? { monat: query.monat } : {}),
    ...(view === "week" ? { woche: week } : {}),
    ...(hidden.size > 0 ? { aus: hiddenParam(hidden) } : {}),
    ...(onlyPosts ? { nur: "posts" } : {}),
  };
  const link = (extra: Record<string, string | null | undefined> = {}) => calendarHref(orgs.length > 1 ? org.id : null, { ...keep, ...extra });
  const linkOrg = (extra: Record<string, string | null | undefined> = {}) => calendarHref(org.id, { ...keep, ...extra });

  if (!hasOrgFeature(org, "plan")) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-brand text-[30px] font-semibold text-slate-950">{t("title")}</h1>
        <div className="mt-5 rounded-[18px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">{t("disabled.title")}</h2>
          <p className="mt-1 text-[15px] leading-6 text-slate-700">{t("disabled.text")}</p>
          <Link href={`/advisor/organisation?${new URLSearchParams({ org: org.id, tab: "features" }).toString()}`} className="brand-cta mt-4 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">{t("disabled.link")}</Link>
        </div>
      </main>
    );
  }

  const selectedId = UUID.test(query.termin ?? "") ? (query.termin as string) : null;
  const editId = UUID.test(query.bearbeiten ?? "") ? (query.bearbeiten as string) : null;
  const postId = UUID.test(query.post ?? "") ? (query.post as string) : null;
  // Termine anlegen und aendern darf nur die Inhaberin; wer die Adresse trotzdem oeffnet, sieht das Formular nicht (statt eines Formulars, dessen Eingaben die Datenbank verwirft).
  const planningSheet = editId ? "edit" : query.neu === "termin" ? "new" : query.neu === "liste" ? "bulk" : null;
  const sheet = planningSheet ? (isOwner ? planningSheet : null) : postId ? "post" : query.neu === "post" ? "post-new" : null;
  const tab = tabOf(query.reiter);
  const range = visibleRange(view, month, week);

  const [members, programs, eventSplit, formats, posts, eventPosts, templates, orgTasks, eco, requirements] = await Promise.all([
    getOrgMembers(client, org.id),
    getOrgTeamPrograms(client, org.id),
    listProgramEventsSplit(client, org.id),
    listEventFormats(client, org.id),
    view === "formats" || view === "plan" ? Promise.resolve([]) : listOrgPosts(client, org.id, range.from, range.to),
    listOrgEventPosts(client, org.id),
    listPostTemplates(client, org.id),
    listOrgTasks(client, org.id),
    hidden.has("eco") || view === "formats" || view === "plan" ? Promise.resolve([]) : listSavedEcoItems(client, user.id),
    hasOrgFeature(org, "funding") ? listEventCountingRequirements(client, org.id) : Promise.resolve([]),
  ]);
  // Archivierte Termine stehen nicht im Raster und nicht in der Liste, nur im Archiv des Programmplans (und in den Auswertungen).
  const events = eventSplit.active;
  const archivedEvents = eventSplit.archived;
  const [openPost, campaigns] = await Promise.all([
    postId ? getOrgPost(client, org.id, postId) : Promise.resolve(null),
    sheet === "post" || sheet === "post-new" ? listOrgCampaigns(client, org.id) : Promise.resolve([]),
  ]);
  const memberNames = new Map(members.map((member) => [member.userId, member.displayName ?? tAdvisor("area.kinds.unnamed")]));
  const programChoices = programs.map((program) => ({ programId: program.programId, name: program.teamName ?? tAdvisor("teamProgram.unnamedTeam") }));

  const items = buildCalendarItems({
    events,
    // Posts zu Terminen stehen auch ausserhalb des gezeigten Zeitraums im Panel; im Raster nur die darin.
    posts,
    tasks: orgTasks,
    eco,
    hidden,
    hrefs: {
      event: (eventId) => linkOrg({ termin: eventId, reiter: null }),
      post: (post) => linkOrg({ post: post.id }),
      task: (task) => teamraumHref("tasks", org.id, { task: task.id }),
      eco: "/events",
    },
  });
  const visible = items.filter((item) => item.day >= range.from && item.day <= range.to && (!onlyPosts || item.layer === "post"));
  const byDay = itemsByDay(visible);
  const selected = selectedId ? events.find((event) => event.eventId === selectedId) ?? null : null;
  const editing = editId ? events.find((event) => event.eventId === editId) ?? null : null;
  const needPosts = canWrite ? eventsNeedingPosts(events, eventPosts, today) : [];

  // Nur fuer den geoeffneten Termin: Teilnahme, Zusagen, Speaker.
  const withSpeakers = hasOrgFeature(org, "experts");
  const needsTeams = Boolean(selected && tab === "teams" && selected.audience !== "internal");
  const [attendance, rsvps, assignedSpeakers, speakerChoices] = await Promise.all([
    selected && needsTeams ? getEventAttendance(client, selected.eventId) : Promise.resolve([]),
    selected && needsTeams ? getEventRsvps(client, selected.eventId) : Promise.resolve([]),
    selected && tab === "details" && withSpeakers ? listEventExperts(client, org.id) : Promise.resolve([]),
    selected && tab === "details" && withSpeakers && isOwner ? listProgramExperts(client, org.id) : Promise.resolve([]),
  ]);
  const speakers = selected && tab === "details" && withSpeakers ? { assigned: assignedSpeakers, choices: speakerChoices.filter((entry) => !entry.archived) } : null;

  const dayLong = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const weekLabel = t("weekLabel", { number: isoWeekNumber(week), from: short.format(new Date(`${weekDays[0]}T00:00:00Z`)), to: short.format(new Date(`${weekDays[6]}T00:00:00Z`)) });
  const weekdayNames = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 2 + index))));
  const grid = monthGrid(month);

  const prevHref = view === "week" ? link({ woche: addDays(week, -7), monat: null }) : link({ monat: shiftMonth(month, -1) });
  const nextHref = view === "week" ? link({ woche: addDays(week, 7), monat: null }) : link({ monat: shiftMonth(month, 1) });
  const todayHref = view === "week" ? link({ woche: today, monat: null }) : link({ monat: today.slice(0, 7) });
  const viewHref = (next: CalendarView) => calendarHref(orgs.length > 1 ? org.id : null, { ...(next !== "month" ? { ansicht: viewParam(next) } : {}), ...(hidden.size > 0 ? { aus: hiddenParam(hidden) } : {}), ...(next === "week" ? { woche: week } : { monat: view === "week" ? week.slice(0, 7) : month }) });

  const closeSheetHref = linkOrg({ termin: selectedId });
  const closePanelHref = linkOrg({});
  const planError = query.planError;
  const message = planError
    ? { tone: "rose" as const, text: planError === "audience" ? tp("event.errorAudience") : planError === "publicUrl" ? tp("event.errorPublicUrl") : tp("planError") }
    : query.eventArchived === "1"
      ? { tone: "emerald" as const, text: t("plan.archived") }
      : query.eventRestored === "1"
        ? { tone: "emerald" as const, text: t("plan.restored") }
    : /^\d{1,2}$/.test(query.planCreated ?? "")
      ? { tone: "emerald" as const, text: tp("bulk.created", { count: Number(query.planCreated) }) }
      : query.socialError === "1"
        ? { tone: "rose" as const, text: ts("error") }
        : query.socialSaved === "1" || query.socialDeleted === "1"
          ? { tone: "emerald" as const, text: ts("saved") }
          : /^\d{1,2}$/.test(query.socialCreated ?? "")
            ? { tone: "emerald" as const, text: ts("created", { count: Number(query.socialCreated) }) }
            : query.planSaved === "1" && !selected
        ? { tone: "emerald" as const, text: tp("planSaved") }
        : null;

  const chip = (item: CalendarItem, large = false) => {
    const style = LAYER_STYLE[item.layer];
    const active = Boolean(selected && item.eventId === selected.eventId && item.layer === "program");
    const link = (
      <Link
        key={item.key}
        href={item.href}
        title={item.label}
        className={`flex w-full min-w-0 items-center gap-1.5 rounded-[7px] px-1.5 text-left text-[12px] font-semibold leading-4 transition hover:brightness-95 ${large ? "min-h-8 py-1.5 text-[13px]" : "min-h-6 py-0.5"} ${
          item.suggestion ? "border border-dashed border-pink-500 bg-white text-pink-950" : `${style.chip} border border-transparent`
        } ${active ? "ring-2 ring-violet-600" : ""} ${item.done ? "opacity-70" : ""}`}
      >
        <span aria-hidden="true" className={`h-[7px] w-[7px] shrink-0 rounded-[2px] ${style.dot}`} />
        {item.time && item.layer !== "post" ? <span className="shrink-0 font-bold">{item.time}</span> : null}
        <span className={large ? "min-w-0 flex-1" : "min-w-0 flex-1 truncate"}>{item.label}</span>
        {item.internal ? <span className="shrink-0 rounded bg-white/70 px-1 text-[10px] font-bold uppercase">{t("internalShort")}</span> : null}
        {item.warn ? (
          <svg role="img" aria-label={t("weekendWarn")} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></svg>
        ) : null}
      </Link>
    );
    // Posts lassen sich auf einen anderen Tag ziehen (wie vorher im Social-Kalender).
    return item.layer === "post" && !item.done && canWrite ? (
      <DraggableItem key={item.key} id={item.key.slice(2)} kind="post">
        {link}
      </DraggableItem>
    ) : (
      link
    );
  };

  const agendaDays = (from: string, to: string) => {
    const days: string[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) if (byDay.has(day) && (view !== "month" || day.startsWith(month))) days.push(day);
    return days;
  };
  const agenda = (days: string[]) =>
    days.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-[15px] text-slate-700">{t("agendaEmpty")}</p>
    ) : (
      <ol className="grid gap-3">
        {days.map((day) => (
          <li key={day} className="rounded-[18px] border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-[14px] font-bold ${day === today ? "text-violet-800" : "text-slate-950"}`}>{dayLong.format(new Date(`${day}T00:00:00Z`))}</p>
              {isOwner ? <Link href={linkOrg({ neu: "termin", tag: day })} aria-label={t("addOn", { day: dayLong.format(new Date(`${day}T00:00:00Z`)) })} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50">+</Link> : null}
            </div>
            <div className="mt-2 grid gap-1.5">{(byDay.get(day) ?? []).map((item) => chip(item, true))}</div>
          </li>
        ))}
      </ol>
    );

  const panel = selected ? (
    <EventPanel
      orgId={org.id}
      isOwner={isOwner}
      canWrite={canWrite}
      event={selected}
      tab={tab}
      locale={locale}
      today={today}
      closeHref={closePanelHref}
      extra={keep}
      programs={programChoices}
      posts={eventPosts.filter((post) => post.eventId === selected.eventId)}
      social={canWrite ? { templates } : null}
      tasks={orgTasks.filter((task) => task.eventId === selected.eventId)}
      memberNames={memberNames}
      attendance={attendance}
      rsvps={rsvps}
      requirements={requirements}
      speakers={speakers}
      feedback={{ postsCreated: /^\d{1,2}$/.test(query.postsCreated ?? "") ? Number(query.postsCreated) : null, postsError: query.postsError === "1", saved: query.planSaved === "1" }}
    />
  ) : null;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-[13px] text-slate-600">{org.name}</p>
          <h1 className="font-brand text-[30px] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[34px]">{t("title")}</h1>
        </div>
        <nav aria-label={t("viewLabel")} className="inline-flex rounded-xl bg-[#E9EAF3] p-[3px]">
          {CALENDAR_VIEWS.map((entry) => (
            <Link key={entry} href={viewHref(entry)} aria-current={view === entry ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-[9px] px-3.5 text-[13.5px] font-semibold ${view === entry ? "bg-white text-slate-950 shadow-[0_1px_3px_rgba(23,23,58,0.14)]" : "text-slate-700 hover:text-slate-950"}`}>
              {t(`views.${entry}`)}
            </Link>
          ))}
        </nav>
        <span className="flex-1" />
        {view !== "formats" && view !== "plan" ? (
          <nav aria-label={t("rangeLabel")} className="flex items-center gap-1">
            <Link href={prevHref} aria-label={t("prev")} className="grid h-10 w-10 place-items-center rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">‹</Link>
            <span className="min-w-36 text-center text-[16px] font-bold capitalize text-slate-950">{view === "week" ? weekLabel : monthLabel}</span>
            <Link href={nextHref} aria-label={t("next")} className="grid h-10 w-10 place-items-center rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">›</Link>
            <Link href={todayHref} className="ml-1 inline-flex min-h-10 items-center rounded-[10px] border border-slate-200 bg-white px-3 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-50">{t("today")}</Link>
          </nav>
        ) : null}
        {canWrite ? (
          <div className="flex gap-2">
            {isOwner ? <Link href={linkOrg({ neu: "liste" })} className="hidden min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:inline-flex">{t("addMany")}</Link> : null}
            <Link href={linkOrg({ neu: "post", tag: today })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50">{t("addPost")}</Link>
            {isOwner ? <Link href={linkOrg({ neu: "termin" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6D49E0] px-4 text-sm font-semibold text-white hover:bg-[#5B36D6]">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              {t("addEvent")}
            </Link> : null}
          </div>
        ) : null}
      </header>

      <AreaTips area="calendar" />
      {message ? <p role={message.tone === "rose" ? "alert" : "status"} className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message.text}</p> : null}

      {view !== "formats" && view !== "plan" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] font-semibold text-slate-700">{t("layersLabel")}</span>
          {CALENDAR_LAYERS.map((layer) => {
            const on = !hidden.has(layer);
            const toggled = new Set(hidden);
            if (on) toggled.add(layer);
            else toggled.delete(layer);
            const body = (
              <>
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[3px] ${on ? LAYER_STYLE[layer].dot : "bg-slate-400"}`} />
                {t(`layers.${layer}`)}
              </>
            );
            const cls = `inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13.5px] font-semibold ${on ? "border-slate-300 bg-white text-slate-950" : "border-slate-200 bg-slate-100 text-slate-700"}`;
            return layer === "program" ? (
              <span key={layer} className={cls}>{body}</span>
            ) : (
              <Link key={layer} href={calendarHref(orgs.length > 1 ? org.id : null, { ...keep, aus: hiddenParam(toggled) || null })} aria-pressed={on} className={`${cls} hover:bg-slate-50`}>
                {body}
              </Link>
            );
          })}
          <Link href={calendarHref(orgs.length > 1 ? org.id : null, { ...keep, nur: onlyPosts ? null : "posts" })} aria-pressed={onlyPosts} className={`ml-1 inline-flex min-h-9 items-center rounded-full border px-3 text-[13.5px] font-semibold ${onlyPosts ? "border-pink-500 bg-pink-50 text-pink-950" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}`}>{t("onlyPosts")}</Link>
          <span className="ml-1 text-[13px] text-slate-700">{t("layersHint")}</span>
        </div>
      ) : null}

      {needPosts.length > 0 && view !== "formats" && view !== "plan" ? (
        <Link href={linkOrg({ termin: needPosts[0].eventId, reiter: "social" })} className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[#FFF4E0] px-4 py-3.5 text-[#5C3300] hover:brightness-95">
          <span aria-hidden="true" className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg></span>
          <span className="min-w-0 flex-1 text-[14.5px]">
            <strong>{t("needsPosts", { count: needPosts.length })}</strong> {needPosts.slice(0, 3).map((event) => event.title).join(", ")}
          </span>
          <span className="text-[14px] font-bold text-[#7A4300]">{t("needsPostsAction")} →</span>
        </Link>
      ) : null}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {view === "formats" ? (
            <section id="formats" aria-labelledby="formats-title" className="rounded-[20px] border border-slate-200 bg-white p-5 sm:p-6">
              <h2 id="formats-title" className="text-lg font-semibold text-slate-950">{tp("formats.title", { count: formats.length })}</h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-slate-700">{t("formatsText")}</p>
              <div className="mt-4">
                <EventFormats orgId={org.id} formats={formats} isOwner={isOwner} back="plan" error={query.formatError === "1"} />
              </div>
            </section>
          ) : null}

          {view === "month" ? (
            <>
              <section aria-label={monthLabel} className="hidden overflow-hidden rounded-[20px] border border-slate-200 bg-white md:block">
                <div className="grid grid-cols-7 border-b border-slate-200">
                  {weekdayNames.map((name) => <p key={name} className="px-2.5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-slate-600">{name}</p>)}
                </div>
                {grid.map((row) => (
                  <div key={row[0].day} className="grid grid-cols-7">
                    {row.map((cell) => {
                      const list = byDay.get(cell.day) ?? [];
                      const weekend = new Date(`${cell.day}T00:00:00Z`).getUTCDay() % 6 === 0;
                      return (
                        <DropDay key={cell.day} day={cell.day} kind="post" move={movePostToDayAction} failedLabel={t("dragFailed")} label={dayLong.format(new Date(`${cell.day}T00:00:00Z`))} className={`group relative flex min-h-[116px] min-w-0 flex-col gap-[3px] border-b border-r border-slate-100 p-1.5 ${cell.inMonth ? (weekend ? "bg-slate-50/70" : "bg-white") : "bg-slate-50 text-slate-500"}`}>
                          <div className="flex items-center justify-between">
                            <span className={`grid h-[26px] min-w-[26px] place-items-center rounded-full px-1 text-[13px] font-semibold ${cell.day === today ? "bg-[#6D49E0] text-white" : cell.inMonth ? "text-slate-950" : "text-slate-500"}`}>{Number(cell.day.slice(8))}</span>
                            {isOwner ? <Link href={linkOrg({ neu: "termin", tag: cell.day })} aria-label={t("addOn", { day: dayLong.format(new Date(`${cell.day}T00:00:00Z`)) })} className="grid h-6 w-6 place-items-center rounded-full text-sm text-slate-500 opacity-0 hover:bg-violet-50 hover:text-violet-800 focus:opacity-100 group-hover:opacity-100">+</Link> : null}
                          </div>
                          {list.slice(0, 3).map((item) => chip(item))}
                          {list.length > 3 ? <Link href={calendarHref(orgs.length > 1 ? org.id : null, { ansicht: "woche", woche: weekOf(cell.day, today), ...(hidden.size > 0 ? { aus: hiddenParam(hidden) } : {}) })} className="pl-1.5 text-[12px] font-semibold text-slate-700 hover:underline">{t("moreCount", { count: list.length - 3 })}</Link> : null}
                        </DropDay>
                      );
                    })}
                  </div>
                ))}
              </section>
              <div className="md:hidden">{agenda(agendaDays(grid[0][0].day, grid[grid.length - 1][6].day))}</div>
            </>
          ) : null}

          {view === "week" ? (
            <>
              <section aria-label={weekLabel} className="hidden grid-cols-7 overflow-hidden rounded-[20px] border border-slate-200 bg-white md:grid">
                {weekDays.map((day) => (
                  <div key={day} className="min-h-64 min-w-0 border-r border-slate-100 p-2 last:border-r-0">
                    <p className={`mb-2 text-[12px] font-bold uppercase tracking-[0.06em] ${day === today ? "text-violet-800" : "text-slate-600"}`}>{dayLong.format(new Date(`${day}T00:00:00Z`)).split(",")[0]}<span className={`ml-1.5 inline-grid h-7 min-w-7 place-items-center rounded-full text-[14px] ${day === today ? "bg-[#6D49E0] text-white" : "text-slate-950"}`}>{Number(day.slice(8))}</span></p>
                    <div className="grid gap-1.5">{(byDay.get(day) ?? []).map((item) => chip(item, true))}</div>
                  </div>
                ))}
              </section>
              <div className="md:hidden">{agenda(agendaDays(week, addDays(week, 6)))}</div>
            </>
          ) : null}

          {view === "plan" ? (
            <PlanView
              orgId={org.id}
              isOwner={isOwner}
              events={events}
              archived={archivedEvents}
              postCounts={new Map(eventPosts.filter((post) => post.eventId).map((post) => [post.eventId as string, eventPosts.filter((other) => other.eventId === post.eventId).length]))}
              formats={formats}
              programs={programChoices}
              today={today}
              locale={locale}
              keep={keep}
            />
          ) : null}
        </div>
        {panel}
      </div>

      {sheet === "post" || sheet === "post-new" ? (
        <PostSheet
          orgId={org.id}
          post={sheet === "post" ? openPost : null}
          defaultDay={DAY.test(query.tag ?? "") ? (query.tag as string) : today}
          defaultEventId={sheet === "post-new" ? selectedId : null}
          month={month}
          closeHref={selectedId ? closeSheetHref : closePanelHref}
          events={events.map((event) => ({ eventId: event.eventId, title: event.title, startsAt: event.startsAt }))}
          campaigns={campaigns}
          members={members.filter((member) => member.status === "active").map((member) => ({ userId: member.userId, name: member.displayName ?? tAdvisor("area.kinds.unnamed") }))}
          canDelete={Boolean(openPost && canWrite && (openPost.createdByUserId === user.id || isOwner))}
          locale={locale}
        />
      ) : sheet ? (
        <EventSheet
          kind={sheet}
          orgId={org.id}
          event={editing}
          defaultDay={DAY.test(query.tag ?? "") ? (query.tag as string) : ""}
          today={today}
          closeHref={sheet === "edit" || selectedId ? closeSheetHref : closePanelHref}
          formats={formats}
          programs={programChoices}
          requirements={requirements}
          formatsHref={linkOrg({ ansicht: "formate", neu: null })}
        />
      ) : null}
    </main>
  );
}
