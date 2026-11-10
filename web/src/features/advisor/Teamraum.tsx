import Link from "next/link";
import { type OrgRole, isLeadRole } from "@/features/advisor/orgRights";
import { berlinDayOf } from "@/lib/berlinTime";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { ChipChoice, ChipMultiChoice } from "@/features/ui/ChipChoice";
import { UserText } from "@/features/ui/UserText";
import { DictateTasks } from "@/features/advisor/DictateTasks";
import { DraggableItem, DropDay } from "@/features/ui/CalendarDrag";
import { monthGrid, shiftMonth } from "@/features/advisor/socialCalendarModel";
import type { ProgramEvent } from "@/features/advisor/teamProgramData";
import {
  addOrgTaskCommentAction,
  checkOrgTaskItemAction,
  deleteOrgTaskAction,
  deleteOrgTaskCommentAction,
  moveOrgTaskAction,
  saveOrgTaskAction,
  setMyOrgPresenceAction,
  setOrgTaskVisibilityAction,
  takeOrgTaskAction,
  moveTaskDueAction,
} from "@/features/advisor/teamraumActions";
import {
  TASK_FILTERS,
  TASK_STATUSES,
  addDays,
  boardColumns,
  byDue,
  checklistProgress,
  checklistToText,
  filterTasks,
  isAway,
  isOverdue,
  myWeek,
  openCountsByMember,
  openCountsByProgram,
  unassignedTasks,
  type MemberPresence,
  type OrgTask,
  type TaskComment,
  type TaskFilter,
  type TaskStatus,
} from "@/features/advisor/teamraumModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";

/**
 * Teamraum (seit 05.11.2026): Diese Woche, Aufgaben, Wer macht was - fuer das Team der Organisation.
 * Nie fuer die Teams im Programm. Den Namen eines Startups zeigt eine Aufgabe nur, wenn die
 * betrachtende Person das Team ohnehin sieht (Inhaberin oder Bezugsperson); sonst "ein Team im Programm".
 */

export type TeamraumMember = { userId: string; name: string; role: OrgRole; isSelf: boolean };
export type TeamraumProgram = { programId: string; name: string; contactUserIds: string[]; isActive: boolean };
export type TeamraumContext = {
  orgId: string;
  me: string;
  isOwner: boolean;
  canWrite: boolean;
  members: TeamraumMember[];
  programs: TeamraumProgram[];
  events: ProgramEvent[];
  tasks: OrgTask[];
  presence: MemberPresence[];
  /** Titel der Seiten (Stufe 2) - fuer den Hinweis auf einer Aufgabe, die aus einer Seite kommt. */
  pageTitles: Map<string, string>;
  today: string;
  locale: string;
  feedback: { error: string | null; saved: boolean; deleted: boolean; created: number | null };
};

// Entwurf vom 05.11.2026: weisse Flaechen mit feiner Linie, Feldnamen normal geschrieben und dunkel.
const CARD = "rounded-[18px] border border-slate-200 bg-white p-5 sm:p-6";
const LABEL = "block text-sm font-semibold text-slate-900";
const INPUT = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";
const PRIMARY = "brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold";
const QUIET = "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50";
const CHIP = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";
const TONES = ["bg-violet-100 text-violet-800", "bg-teal-100 text-teal-800", "bg-pink-100 text-pink-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-800"];
const NEXT: Record<TaskStatus, TaskStatus> = { open: "doing", doing: "done", waiting: "doing", done: "open" };
const STATUS_DOT: Record<TaskStatus, string> = { open: "bg-slate-400", doing: "bg-blue-600", waiting: "bg-amber-600", done: "bg-emerald-700" };

const toneOf = (userId: string) => TONES[[...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
const initialOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "?";

export function Avatar({ userId, name, size = "h-7 w-7 text-[11px]" }: { userId: string; name: string; size?: string }) {
  return (
    <span title={name} aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${size} ${toneOf(userId)}`}>
      {initialOf(name)}
    </span>
  );
}

export function helpers(ctx: TeamraumContext) {
  const day = new Intl.DateTimeFormat(ctx.locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const time = new Intl.DateTimeFormat(ctx.locale, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  return {
    dayOf: (iso: string) => day.format(new Date(`${iso}T00:00:00Z`)),
    timeOf: (iso: string) => time.format(new Date(iso)),
    memberOf: (userId: string | null) => (userId ? ctx.members.find((member) => member.userId === userId) ?? null : null),
    /** Die Zustaendigen einer Aufgabe, die noch Mitglied sind - in ihrer Reihenfolge. */
    peopleOf: (task: OrgTask) => task.assigneeUserIds.flatMap((userId) => ctx.members.filter((member) => member.userId === userId)),
    programOf: (programId: string | null) => (programId ? ctx.programs.find((program) => program.programId === programId) ?? null : null),
    eventOf: (eventId: string | null) => (eventId ? ctx.events.find((event) => event.eventId === eventId) ?? null : null),
    href: (tab: "week" | "tasks" | "pages" | "who", extra: Record<string, string> = {}) => teamraumHref(tab, ctx.orgId, extra),
  };
}

function Hidden({ ctx, tab, filter, taskId }: { ctx: TeamraumContext; tab: "week" | "tasks" | "who"; filter?: TaskFilter; taskId?: string }) {
  return (
    <>
      <input type="hidden" name="orgId" value={ctx.orgId} />
      <input type="hidden" name="tab" value={tab} />
      {filter ? <input type="hidden" name="filter" value={filter} /> : null}
      {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}
    </>
  );
}

async function Feedback({ ctx }: { ctx: TeamraumContext }) {
  const t = await getTranslations("advisor.teamraum");
  if (ctx.feedback.error) {
    return <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t(`errors.${["member", "program", "tooMany"].includes(ctx.feedback.error) ? ctx.feedback.error : "failed"}`)}</p>;
  }
  if (ctx.feedback.saved || ctx.feedback.deleted) {
    return (
      <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        {ctx.feedback.deleted ? t("deleted") : ctx.feedback.created !== null ? t("created", { count: ctx.feedback.created }) : t("saved")}
      </p>
    );
  }
  if (!ctx.canWrite) {
    return <p role="note" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("readOnly")}</p>;
  }
  return null;
}

/**
 * Tage fuer die Knoepfe "Heute, Morgen, Freitag, In 7 Tagen" - doppelte fallen weg. "Naechste Woche" war der kommende Montag:
 * wer am Freitag eine Aufgabe anlegte, hatte dafuer nur drei Tage (Hinweis Maria, 08.11.2026). Jetzt sind es immer sieben.
 */
function dueChoices(today: string, t: (key: string) => string) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const friday = addDays(today, (5 - weekday + 7) % 7 || 7);
  const inSevenDays = addDays(today, 7);
  const seen = new Set<string>();
  return [
    { value: today, label: t("form.today") },
    { value: addDays(today, 1), label: t("form.tomorrow") },
    { value: friday, label: t("form.friday") },
    { value: inSevenDays, label: t("form.nextWeek") },
  ].filter((choice) => (seen.has(choice.value) ? false : (seen.add(choice.value), true)));
}

/** Das Formular fuer neue und bestehende Aufgaben: das Noetige vorn, Beschreibung, Checkliste und Veranstaltung auf Wunsch. */
async function TaskForm({ ctx, tab, filter, task, cancelHref, defaultEventId = null }: { ctx: TeamraumContext; tab: "week" | "tasks"; filter?: TaskFilter; task?: OrgTask; cancelHref?: string; defaultEventId?: string | null }) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf } = helpers(ctx);
  // Ein Startup verknuepfen kann man nur mit Teams, die man sieht. Eine bestehende fremde Verknuepfung bleibt still erhalten.
  const keepsHiddenProgram = Boolean(task?.programId && !ctx.programs.some((program) => program.programId === task.programId));
  // Auch ein schon lange vergangener Termin bleibt waehlbar, wenn die Aufgabe zu ihm gehoert oder von seinem Panel kommt.
  const upcoming = ctx.events.filter((event) => berlinDayOf(event.startsAt) >= addDays(ctx.today, -14) || event.eventId === task?.eventId || event.eventId === defaultEventId);
  const people = [
    ...ctx.members.filter((member) => member.isSelf).map((member) => ({ value: member.userId, label: t("form.meShort") })),
    ...ctx.members.filter((member) => !member.isSelf).map((member) => ({ value: member.userId, label: member.name })),
  ];
  const chosen = task ? task.assigneeUserIds : [ctx.me];
  const hasMore = Boolean(defaultEventId || (task && (task.details || task.checklist.length > 0 || task.eventId || task.status !== "open")));
  return (
    <form action={saveOrgTaskAction} className="grid gap-5">
      <Hidden ctx={ctx} tab={tab} filter={filter} taskId={task?.id} />
      <label className="block">
        <span className={LABEL}>{t("form.titleQuestion")}</span>
        <input name="title" required maxLength={200} defaultValue={task?.title ?? ""} className={INPUT} disabled={!ctx.canWrite} />
      </label>
      {!task ? (
        <div>
          <span className={`${LABEL} mb-2`}>{t("form.visibilityQuestion")}</span>
          <ChipChoice name="visibility" label={t("form.visibilityQuestion")} options={[{ value: "team", label: t("form.visibilityTeam") }, { value: "private", label: t("form.visibilityPrivate") }]} defaultValue="team" disabled={!ctx.canWrite} />
          <span className="mt-1.5 block text-[13px] text-slate-600">{t("form.visibilityHint")}</span>
        </div>
      ) : null}
      <div>
        <span className={`${LABEL} mb-2`}>{t("form.assigneeQuestion")}</span>
        {/* Mehrere moeglich (20270322120000), hoechstens sechs. */}
        {people.length <= 12 ? (
          <ChipMultiChoice name="assignee" label={t("form.assigneeQuestion")} options={people} defaultValues={chosen} noneLabel={t("form.nobodyYet")} max={6} disabled={!ctx.canWrite} />
        ) : (
          <select name="assignee" multiple size={6} aria-label={t("form.assigneeQuestion")} defaultValue={chosen} className={`${INPUT} py-2`} disabled={!ctx.canWrite}>
            {people.map((person) => <option key={person.value} value={person.value}>{person.label}</option>)}
          </select>
        )}
        <span className="mt-1.5 block text-[13px] text-slate-600">{t("form.assigneeHint")}</span>
      </div>
      <div>
        <span className={`${LABEL} mb-2`}>{t("form.dueQuestion")}</span>
        <ChipChoice name="dueOn" label={t("form.dueQuestion")} options={dueChoices(ctx.today, t)} defaultValue={task?.dueOn ?? ""} allowEmpty customDate={{ label: t("form.pickDate"), inputLabel: t("form.due") }} disabled={!ctx.canWrite} />
      </div>
      <label className="block">
        <span className={LABEL}>{t("form.program")}</span>
        {keepsHiddenProgram ? (
          <>
            <input type="hidden" name="programId" value={task?.programId ?? ""} />
            <span className="mt-1 flex min-h-11 items-center text-sm text-slate-600">{t("hiddenProgram")}</span>
          </>
        ) : (
          <select name="programId" defaultValue={task?.programId ?? ""} className={INPUT} disabled={!ctx.canWrite}>
            <option value="">{t("form.internal")}</option>
            {ctx.programs.map((program) => (
              <option key={program.programId} value={program.programId}>{program.name}</option>
            ))}
          </select>
        )}
      </label>
      <details open={hasMore} className="group">
        <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center text-[15px] font-medium text-violet-800 group-open:hidden">{t("form.more")}</summary>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className={LABEL}>{t("form.event")}</span>
              <select name="eventId" defaultValue={task?.eventId ?? defaultEventId ?? ""} className={INPUT} disabled={!ctx.canWrite}>
                <option value="">{t("form.noEvent")}</option>
                {upcoming.map((event) => (
                  <option key={event.eventId} value={event.eventId}>{`${dayOf(berlinDayOf(event.startsAt))} · ${event.title}`}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={LABEL}>{t("form.status")}</span>
              <select name="status" defaultValue={task?.status ?? "open"} className={INPUT} disabled={!ctx.canWrite}>
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{t(`status.${status}`)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={LABEL}>{t("form.details")}</span>
            <textarea name="details" rows={4} maxLength={4000} defaultValue={task?.details ?? ""} className={`${INPUT} py-2`} disabled={!ctx.canWrite} />
            <span className="mt-1.5 block text-[13px] text-slate-600">{t("form.detailsHint")}</span>
          </label>
          <label className="block">
            <span className={LABEL}>{t("form.checklist")}</span>
            <textarea name="checklist" rows={4} defaultValue={task ? checklistToText(task.checklist) : ""} className={`${INPUT} py-2`} disabled={!ctx.canWrite} />
            <span className="mt-1.5 block text-[13px] text-slate-600">{t("form.checklistHint")}</span>
          </label>
        </div>
      </details>
      {ctx.canWrite ? (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label={task ? t("form.save") : t("form.add")} pendingLabel="…" className={`${PRIMARY} max-md:min-h-[52px] max-md:w-full max-md:justify-center max-md:text-base`} />
          {cancelHref ? <Link href={cancelHref} className="inline-flex min-h-11 items-center px-2 text-[15px] text-slate-600 underline-offset-4 hover:underline">{t("form.cancel")}</Link> : null}
        </div>
      ) : null}
    </form>
  );
}

/** Der Haken vor jeder Aufgabe: ein Tipp erledigt sie, bei einer erledigten holt er sie zurueck. Wer nur lesen darf, sieht den Kreis ohne Knopf. */
async function TaskCheck({ ctx, task, filter, size = "h-11 w-11" }: { ctx: TeamraumContext; task: OrgTask; filter?: TaskFilter; size?: string }) {
  const t = await getTranslations("advisor.teamraum");
  const done = task.status === "done";
  const circle = (
    <span aria-hidden="true" className={`grid h-[24px] w-[24px] place-items-center rounded-full border-2 text-[14px] font-bold leading-none ${done ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-400 bg-white group-hover:border-violet-600"}`}>{done ? "✓" : null}</span>
  );
  if (!ctx.canWrite) return <span className={`grid ${size} shrink-0 place-items-center`}>{circle}</span>;
  return (
    <form action={moveOrgTaskAction} className="shrink-0">
      <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
      <input type="hidden" name="status" value={done ? "open" : "done"} />
      <button type="submit" aria-label={t(done ? "check.reopen" : "check.done", { task: task.title })} className={`group grid ${size} place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}>{circle}</button>
    </form>
  );
}

async function TaskCard({ ctx, task, filter, selected, back }: { ctx: TeamraumContext; task: OrgTask; filter: TaskFilter; selected: boolean; back: Record<string, string> }) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf, peopleOf, programOf, eventOf, href } = helpers(ctx);
  const people = peopleOf(task);
  const program = programOf(task.programId);
  const event = eventOf(task.eventId);
  const progress = checklistProgress(task);
  const overdue = isOverdue(task, ctx.today);
  return (
    <article className={`grid gap-2 rounded-[14px] border bg-white px-3.5 py-3 ${selected ? "border-violet-400 ring-2 ring-violet-200" : "border-slate-200"} ${task.status === "done" ? "opacity-75" : ""}`}>
      <div className="-ml-2 -mt-1 flex items-start gap-0.5">
        <TaskCheck ctx={ctx} task={task} filter={filter} size="h-10 w-10" />
        <h4 className="min-w-0 flex-1 pt-2 text-[14.5px] font-semibold leading-snug text-slate-950">
          <Link href={`${href("tasks", { ...back, task: task.id })}#task-detail`} className={`underline-offset-4 hover:underline ${task.status === "done" ? "line-through" : ""}`}>{task.title}</Link>
        </h4>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-600">
        {people.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex -space-x-1.5">{people.slice(0, 3).map((person) => <Avatar key={person.userId} userId={person.userId} name={person.name} size="h-[22px] w-[22px] text-[10px] ring-2 ring-white" />)}</span>
            {people.map((person) => (person.isSelf ? t("form.meShort") : person.name)).join(", ")}
          </span>
        ) : task.status !== "done" && ctx.canWrite ? (
          <form action={takeOrgTaskAction}>
            <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
            <SubmitButton label={t("take")} pendingLabel="…" className="inline-flex min-h-7 items-center rounded-full border border-dashed border-violet-300 bg-violet-50 px-2.5 text-xs font-semibold text-violet-800" />
          </form>
        ) : (
          <span className="font-semibold text-amber-800">{t("nobody")}</span>
        )}
        {task.dueOn ? <span className={overdue ? "font-semibold text-rose-700" : ""}>{overdue ? t("overdueSince", { date: dayOf(task.dueOn) }) : dayOf(task.dueOn)}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-slate-600">
        {task.visibility === "private" ? <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-slate-900 px-2 text-xs font-semibold text-white"><svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>{t("privateBadge")}</span> : null}
        <span className="inline-flex h-[22px] items-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-700">{task.programId ? program?.name ?? t("hiddenProgram") : t("internal")}</span>
        {event ? <span className="inline-flex h-[22px] items-center rounded-full bg-amber-50 px-2 text-xs font-medium text-amber-900">{event.title}</span> : null}
        {task.pageId && ctx.pageTitles.has(task.pageId) ? (
          <Link href={href("pages", { doc: task.pageId })} className="inline-flex h-[22px] items-center rounded-full bg-pink-50 px-2 text-xs font-medium text-pink-900 underline-offset-4 hover:underline">{ctx.pageTitles.get(task.pageId)}</Link>
        ) : null}
        {progress.total > 0 ? <span>☑ {progress.done}/{progress.total}</span> : null}
        {ctx.canWrite ? (
          <form action={moveOrgTaskAction} className="ml-auto">
            <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
            <input type="hidden" name="status" value={NEXT[task.status]} />
            <SubmitButton label={t(`move.${task.status}`)} pendingLabel="…" className="inline-flex min-h-7 items-center rounded-full px-1.5 text-xs font-semibold text-violet-800 underline-offset-4 hover:underline" />
          </form>
        ) : null}
      </div>
    </article>
  );
}

async function TaskDetail({ ctx, task, filter, comments, back = {} }: { ctx: TeamraumContext; task: OrgTask; filter: TaskFilter; comments: TaskComment[]; back?: Record<string, string> }) {
  const t = await getTranslations("advisor.teamraum");
  const { memberOf, timeOf, href } = helpers(ctx);
  const creator = memberOf(task.createdByUserId);
  const canDelete = ctx.canWrite && (task.createdByUserId === ctx.me || ctx.isOwner);
  return (
    <section id="task-detail" aria-labelledby="task-detail-title" className={`${CARD} mt-6 scroll-mt-24 border-violet-200`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-violet-800">{t("detail.eyebrow")}</p>
          <h2 id="task-detail-title" className="mt-1 text-xl font-semibold text-slate-950">{task.title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("detail.meta", { name: creator?.name ?? t("formerMember"), date: timeOf(task.createdAt) })}
          </p>
        </div>
        <Link href={href("tasks", { ...back, ...(filter !== "all" ? { filter } : {}) })} className={QUIET}>{t("detail.close")}</Link>
      </div>

      {task.details ? (
        <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-800">
          <UserText text={task.details} />
        </div>
      ) : null}

      {task.checklist.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">{t("detail.checklist", checklistProgress(task))}</h3>
          <ul className="mt-2 grid gap-1.5">
            {task.checklist.map((item, index) => (
              <li key={`${index}-${item.text}`}>
                <form action={checkOrgTaskItemAction} className="flex items-center gap-3">
                  <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
                  <input type="hidden" name="index" value={index} />
                  <input type="hidden" name="done" value={item.done ? "no" : "yes"} />
                  <button
                    type="submit"
                    disabled={!ctx.canWrite}
                    aria-label={item.done ? t("detail.uncheck", { item: item.text }) : t("detail.check", { item: item.text })}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm ${item.done ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-transparent hover:border-violet-400"}`}
                  >
                    ✓
                  </button>
                  <span className={`text-sm ${item.done ? "text-slate-500 line-through" : "text-slate-900"}`}>{item.text}</span>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {task.visibility === "private" || (task.createdByUserId === ctx.me && ctx.canWrite) ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="min-w-0 flex-1 text-[14px] leading-6 text-slate-800">{task.visibility === "private" ? t("detail.privateNote") : t("detail.teamNote")}</p>
          {task.createdByUserId === ctx.me && ctx.canWrite ? (
            <form action={setOrgTaskVisibilityAction}>
              <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
              <input type="hidden" name="visibility" value={task.visibility === "private" ? "team" : "private"} />
              <SubmitButton label={task.visibility === "private" ? t("detail.shareWithTeam") : t("detail.makePrivate")} pendingLabel="…" className={QUIET} />
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <details className="self-start rounded-2xl border border-slate-200 bg-white/70 p-4" open={ctx.feedback.error !== null}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("detail.edit")}</summary>
          <div className="mt-3">
            <TaskForm ctx={ctx} tab="tasks" filter={filter} task={task} />
          </div>
        </details>

        <section aria-labelledby="task-comments-title">
          <h3 id="task-comments-title" className="text-sm font-semibold text-slate-900">{t("detail.comments", { count: comments.length })}</h3>
          <ul className="mt-2 grid gap-3">
            {comments.map((comment) => {
              const author = memberOf(comment.authorUserId);
              return (
                <li key={comment.id} className="flex gap-2.5">
                  <Avatar userId={comment.authorUserId} name={author?.name ?? t("formerMember")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{author?.name ?? t("formerMember")}</span> · {timeOf(comment.createdAt)}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-800"><UserText text={comment.body} /></p>
                    {comment.authorUserId === ctx.me ? (
                      <form action={deleteOrgTaskCommentAction}>
                        <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
                        <input type="hidden" name="commentId" value={comment.id} />
                        <SubmitButton label={t("detail.deleteComment")} pendingLabel="…" className="text-xs text-slate-500 underline-offset-4 hover:underline" />
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {ctx.canWrite ? (
            <form action={addOrgTaskCommentAction} className="mt-3 grid gap-2">
              <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
              <label className="block">
                <span className="sr-only">{t("detail.commentLabel")}</span>
                <textarea name="body" required rows={2} maxLength={2000} placeholder={t("detail.commentPlaceholder")} className={`${INPUT} py-2`} />
              </label>
              <SubmitButton label={t("detail.comment")} pendingLabel="…" className={`${QUIET} w-fit`} />
            </form>
          ) : null}
        </section>
      </div>

      {canDelete ? (
        <form action={deleteOrgTaskAction} className="mt-6 border-t border-slate-100 pt-4">
          <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
          <SubmitButton label={t("detail.delete")} pendingLabel="…" className="text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
        </form>
      ) : null}
    </section>
  );
}

/** Aufgaben als Board: Offen, In Arbeit, Wartet, Erledigt. */
export const TASK_VIEWS = ["board", "list", "calendar"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];
export const taskViewOf = (value: unknown): TaskView => ((TASK_VIEWS as readonly unknown[]).includes(value) ? (value as TaskView) : "board");

/** Aufgaben als Liste: am Rechner eine Tabelle nach Faelligkeit, am Telefon nach Stand gruppiert zum Aufklappen. */
async function TaskList({ ctx, tasks, back, mobileOnly = false, filterOf }: { ctx: TeamraumContext; tasks: OrgTask[]; back: Record<string, string>; mobileOnly?: boolean; filterOf?: TaskFilter }) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf, peopleOf, programOf, href } = helpers(ctx);
  const open = tasks.filter((task) => task.status !== "done").sort(byDue);
  const done = tasks.filter((task) => task.status === "done").sort((a, b) => ((a.doneAt ?? "") < (b.doneAt ?? "") ? 1 : -1)).slice(0, 30);
  const link = (task: OrgTask) => `${href("tasks", { ...back, task: task.id })}#task-detail`;
  const row = (task: OrgTask) => {
    const people = peopleOf(task);
    const overdue = isOverdue(task, ctx.today);
    return (
      <tr key={task.id} className="border-t border-slate-100">
        <td className="w-12 py-1 pr-1"><TaskCheck ctx={ctx} task={task} filter={filterOf} /></td>
        <td className="py-3 pr-3">
          <Link href={link(task)} className={`font-medium text-slate-950 underline-offset-4 hover:underline ${task.status === "done" ? "text-slate-500 line-through" : ""}`}>{task.title}</Link>
        </td>
        <td className="py-3 pr-3"><span className="inline-flex items-center gap-2 text-slate-800"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[task.status]}`} />{t(`status.${task.status}`)}</span></td>
        <td className="py-3 pr-3 text-slate-800">{people.length > 0 ? people.map((person) => person.name).join(", ") : <span className="font-semibold text-amber-800">{t("nobody")}</span>}</td>
        <td className={`py-3 pr-3 ${overdue ? "font-semibold text-rose-700" : "text-slate-800"}`}>{task.dueOn ? dayOf(task.dueOn) : "–"}</td>
        <td className="py-3 text-slate-700">{task.programId ? programOf(task.programId)?.name ?? t("hiddenProgram") : t("internal")}</td>
      </tr>
    );
  };
  const mobileRow = (task: OrgTask, index: number) => {
    const people = peopleOf(task);
    const assignee = people[0] ?? null;
    const overdue = isOverdue(task, ctx.today);
    const team = task.programId ? programOf(task.programId)?.name ?? t("hiddenProgram") : t("internal");
    const due = task.dueOn ? (overdue ? t("overdueSince", { date: dayOf(task.dueOn) }) : dayOf(task.dueOn)) : null;
    return (
      <li key={task.id} className={`flex items-center ${index > 0 ? "border-t border-slate-100" : ""}`}>
        <span className="pl-1.5"><TaskCheck ctx={ctx} task={task} filter={filterOf} /></span>
        <Link href={link(task)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pr-4">
          <span className="min-w-0 flex-1">
            <span className={`block text-[15px] font-medium text-slate-950 ${task.status === "done" ? "text-slate-500 line-through" : ""}`}>{task.title}</span>
            <span className={`mt-0.5 block text-[13px] ${overdue ? "text-rose-700" : "text-slate-600"}`}>{[due, task.status === "doing" || task.status === "waiting" ? t(`status.${task.status}`) : null, team, people.length > 0 ? people.map((person) => (person.isSelf ? t("form.meShort") : person.name)).join(", ") : t("nobodyShort")].filter(Boolean).join(" · ")}</span>
          </span>
        </Link>
      </li>
    );
  };
  // Am Telefon nach Faelligkeit statt nach Stand: was jetzt dran ist, steht oben.
  const weekEnd = addDays(ctx.today, 7);
  const bucketOf = (task: OrgTask) => (!task.dueOn ? "nodate" : task.dueOn < ctx.today ? "overdue" : task.dueOn === ctx.today ? "today" : task.dueOn <= weekEnd ? "week" : "later");
  const groups = (["overdue", "today", "week", "later", "nodate"] as const).map((key) => ({ key, items: open.filter((task) => bucketOf(task) === key) })).filter((group) => group.items.length > 0);
  return (
    <>
      {mobileOnly ? null : (
        <div className="mt-5 hidden overflow-x-auto rounded-[18px] border border-slate-200 bg-white p-4 md:block">
          <table className="w-full min-w-[640px] border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-[12.5px] text-slate-600">
                <th className="w-12 py-2 pr-1"><span className="sr-only">{t("list.check")}</span></th>
                <th className="py-2 pr-3 font-semibold">{t("list.task")}</th>
                <th className="py-2 pr-3 font-semibold">{t("form.status")}</th>
                <th className="py-2 pr-3 font-semibold">{t("form.assignee")}</th>
                <th className="py-2 pr-3 font-semibold">{t("form.due")}</th>
                <th className="py-2 font-semibold">{t("form.program")}</th>
              </tr>
            </thead>
            <tbody>{open.map(row)}</tbody>
          </table>
          {open.length === 0 ? <p className="py-3 text-sm text-slate-600">{t("empty.open")}</p> : null}
          {done.length > 0 ? (
            <details className="mt-3">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">{t("list.done", { count: done.length })}</summary>
              <table className="w-full min-w-[640px] border-collapse text-[14px]"><tbody>{done.map(row)}</tbody></table>
            </details>
          ) : null}
        </div>
      )}
      <div className="mt-4 grid gap-1 md:hidden">
        {groups.length === 0 ? <p className="px-1 py-3 text-sm text-slate-600">{t("empty.open")}</p> : null}
        {groups.map(({ key, items }) => (
          <section key={key} aria-labelledby={`due-${key}`}>
            <h3 id={`due-${key}`} className={`flex min-h-10 items-center justify-between px-1 text-[13px] font-bold uppercase tracking-[0.06em] ${key === "overdue" ? "text-rose-700" : "text-slate-600"}`}>
              <span>{t(`list.groups.${key}`)}</span><span className="font-semibold">{items.length}</span>
            </h3>
            <ul className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">{items.map(mobileRow)}</ul>
          </section>
        ))}
        {done.length > 0 ? (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-slate-600">
              <span>{t("list.done", { count: done.length })}</span><span aria-hidden="true" className="inline-block transition group-open:rotate-90">›</span>
            </summary>
            <ul className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">{done.map(mobileRow)}</ul>
          </details>
        ) : null}
      </div>
    </>
  );
}

/** Aufgaben als Monatskalender nach Faelligkeit - per Ziehen auf einen anderen Tag. */
async function TaskCalendar({ ctx, tasks, filter, month }: { ctx: TeamraumContext; tasks: OrgTask[]; filter: TaskFilter; month: string }) {
  const t = await getTranslations("advisor.teamraum");
  const { peopleOf, href } = helpers(ctx);
  const grid = monthGrid(month);
  const label = new Intl.DateTimeFormat(ctx.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const dayLong = new Intl.DateTimeFormat(ctx.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 2 + index))));
  const byDay = new Map<string, OrgTask[]>();
  for (const task of tasks) if (task.dueOn) byDay.set(task.dueOn, [...(byDay.get(task.dueOn) ?? []), task]);
  const undated = tasks.filter((task) => !task.dueOn && task.status !== "done");
  const nav = (next: string) => href("tasks", { view: "calendar", month: next, ...(filter !== "all" ? { filter } : {}) });
  const chip = (task: OrgTask) => {
    const assignee = peopleOf(task)[0] ?? null;
    return (
      <DraggableItem key={task.id} id={task.id} kind="task">
        <Link
          href={`${href("tasks", { view: "calendar", month, ...(filter !== "all" ? { filter } : {}), task: task.id })}#task-detail`}
          className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[12px] leading-4 ${task.status === "done" ? "border-emerald-200 bg-emerald-50/70 text-slate-500 line-through" : isOverdue(task, ctx.today) ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-800"}`}
          title={task.title}
        >
          {assignee ? <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold ${toneOf(assignee.userId)}`}>{initialOf(assignee.name)}</span> : null}
          <span className="truncate">{task.title}</span>
        </Link>
      </DraggableItem>
    );
  };
  return (
    <div className="mt-5 grid gap-4">
      <nav aria-label={t("calendar.monthNav")} className="flex items-center gap-1.5">
        <Link href={nav(shiftMonth(month, -1))} aria-label={t("calendar.prev")} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white">‹</Link>
        <span className="min-w-36 text-center font-semibold capitalize text-slate-950">{label}</span>
        <Link href={nav(shiftMonth(month, 1))} aria-label={t("calendar.next")} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white">›</Link>
        <span className="ml-2 hidden text-xs text-slate-500 md:inline">{t("calendar.dragHint")}</span>
      </nav>
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white md:block">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekdays.map((weekday) => <p key={weekday} className="px-2 py-2 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{weekday}</p>)}
        </div>
        {grid.map((week) => (
          <div key={week[0].day} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
            {week.map((cell) => (
              <DropDay key={cell.day} day={cell.day} kind="task" move={moveTaskDueAction} failedLabel={t("dragFailed")} label={dayLong.format(new Date(`${cell.day}T00:00:00Z`))} className={`min-h-28 border-r border-slate-100 p-1.5 last:border-r-0 ${cell.inMonth ? "" : "bg-slate-50/70"}`}>
                <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold ${cell.day === ctx.today ? "bg-violet-600 text-white" : cell.inMonth ? "text-slate-700" : "text-slate-400"}`}>{Number(cell.day.slice(8))}</span>
                <div className="mt-1 grid gap-1">{(byDay.get(cell.day) ?? []).map(chip)}</div>
              </DropDay>
            ))}
          </div>
        ))}
      </div>
      <ol className="grid gap-3 md:hidden">
        {grid.flat().filter((cell) => cell.inMonth && (byDay.get(cell.day)?.length ?? 0) > 0).map((cell) => (
          <li key={cell.day} className="advisor-card p-3">
            <p className={`text-sm font-semibold ${cell.day === ctx.today ? "text-violet-700" : "text-slate-900"}`}>{dayLong.format(new Date(`${cell.day}T00:00:00Z`))}</p>
            <div className="mt-2 grid gap-1.5">{(byDay.get(cell.day) ?? []).map(chip)}</div>
          </li>
        ))}
      </ol>
      {undated.length > 0 ? (
        <section aria-labelledby="undated-title" className="advisor-card p-4">
          <h3 id="undated-title" className="text-[15px] font-semibold text-slate-950">{t("calendar.undated", { count: undated.length })}</h3>
          <p className="mt-1 text-xs text-slate-500">{t("calendar.undatedHint")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{undated.map(chip)}</div>
        </section>
      ) : null}
    </div>
  );
}

export type BoardOptions = {
  /** Ansicht ausdruecklich gewaehlt? Sonst: Board am Rechner, Liste am Telefon. */
  viewChosen: boolean;
  query: string;
  showDone: boolean;
  /** Nur Aufgaben zu diesem Team im Programm (Link von der Teamzeile, 05.11.2026). */
  programId?: string | null;
  /** Neue Aufgabe zu diesem Termin (Link aus dem Panel des Termins im Kalender). */
  eventId?: string | null;
  newOpen: boolean;
  dictateOpen: boolean;
};

export async function TeamraumBoard({
  ctx,
  filter,
  selectedTaskId,
  comments,
  view = "board",
  month,
  options = { viewChosen: false, query: "", showDone: false, newOpen: false, dictateOpen: false },
}: {
  ctx: TeamraumContext;
  filter: TaskFilter;
  selectedTaskId: string | null;
  comments: TaskComment[];
  view?: TaskView;
  month?: string;
  options?: BoardOptions;
}) {
  const t = await getTranslations("advisor.teamraum");
  const { href } = helpers(ctx);
  const needle = options.query.trim().toLocaleLowerCase(ctx.locale);
  const teamFilter = options.programId ? ctx.programs.find((program) => program.programId === options.programId) ?? null : null;
  const filtered = filterTasks(ctx.tasks, filter, ctx.me)
    .filter((task) => !needle || `${task.title} ${task.details ?? ""}`.toLocaleLowerCase(ctx.locale).includes(needle))
    .filter((task) => !teamFilter || task.programId === teamFilter.programId);
  const columns = boardColumns(filtered);
  const selected = selectedTaskId ? ctx.tasks.find((task) => task.id === selectedTaskId) ?? null : null;
  const calendarMonth = month ?? ctx.today.slice(0, 7);
  // Was eine Adresse behalten soll, wenn man darin etwas oeffnet: Ansicht, Filter, Suche.
  const keep: Record<string, string> = {
    ...(options.viewChosen ? { view } : {}),
    ...(view === "calendar" ? { month: calendarMonth } : {}),
    ...(filter !== "all" ? { filter } : {}),
    ...(needle ? { q: options.query.trim() } : {}),
    ...(options.showDone ? { done: "1" } : {}),
    ...(teamFilter ? { team: teamFilter.programId } : {}),
  };
  const closeHref = href("tasks", keep);
  const viewLink = (entry: TaskView, active: boolean) => (
    <Link
      key={entry}
      href={href("tasks", { ...keep, view: entry, month: "" })}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-[34px] flex-1 items-center justify-center rounded-lg px-3.5 text-[13.5px] md:flex-none ${active ? "bg-white font-semibold text-slate-950 shadow-sm" : "font-medium text-slate-600 hover:text-slate-900"}`}
    >
      {t(`views.${entry}`)}
    </Link>
  );
  const doneCount = columns.done.length + columns.doneHidden;
  const board = (
    <div className="mt-5 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => (
        <section key={status} aria-labelledby={`col-${status}`} className="grid content-start gap-2.5 rounded-2xl bg-[#ECEDF6] p-3">
          <h3 id={`col-${status}`} className="mx-1 my-0.5 flex items-center justify-between text-sm font-semibold text-slate-950">
            <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-[9px] w-[9px] rounded-full ${STATUS_DOT[status]}`} />{t(`status.${status}`)}</span>
            <span className="text-[13px] font-medium text-slate-600">{status === "done" ? doneCount : columns[status].length}</span>
          </h3>
          {status === "done" && !options.showDone ? (
            doneCount > 0 ? (
              <Link href={href("tasks", { ...keep, done: "1" })} className="grid min-h-10 place-items-center rounded-xl border border-dashed border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-white/60">
                {t("board.showDone", { count: doneCount })}
              </Link>
            ) : (
              <p className="mx-1 text-[13px] leading-5 text-slate-600">{t("empty.done")}</p>
            )
          ) : (
            <>
              {columns[status].length === 0 ? <p className="mx-1 text-[13px] leading-5 text-slate-600">{t(`empty.${status}`)}</p> : null}
              {columns[status].map((task) => (
                <TaskCard key={task.id} ctx={ctx} task={task} filter={filter} selected={task.id === selectedTaskId} back={keep} />
              ))}
              {status === "done" && columns.doneHidden > 0 ? <p className="mx-1 text-[13px] text-slate-600">{t("board.doneHidden", { count: columns.doneHidden })}</p> : null}
            </>
          )}
        </section>
      ))}
    </div>
  );

  return (
    <div>
      <Feedback ctx={ctx} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          {/* Am Telefon steht die Liste vorn und ist ohne Wahl die Ansicht; am Rechner das Board. */}
          <nav aria-label={t("views.label")} className="flex w-full rounded-[10px] bg-[#E9EAF3] p-[3px] md:hidden">
            {(["list", "board", "calendar"] as const).map((entry) => viewLink(entry, options.viewChosen ? view === entry : entry === "list"))}
          </nav>
          <nav aria-label={t("views.label")} className="hidden rounded-[10px] bg-[#E9EAF3] p-[3px] md:flex">
            {TASK_VIEWS.map((entry) => viewLink(entry, view === entry))}
          </nav>
          <span aria-hidden="true" className="hidden h-6 w-px bg-slate-300 md:block" />
          <nav aria-label={t("board.filterLabel")} className="flex flex-wrap gap-1.5">
            {TASK_FILTERS.map((entry) => {
              const count = entry === "nobody" ? unassignedTasks(ctx.tasks).length : 0;
              return (
                <Link
                  key={entry}
                  href={href("tasks", { ...keep, filter: entry === "all" ? "" : entry })}
                  aria-current={filter === entry ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] ${filter === entry ? "border-slate-950 bg-slate-950 font-medium text-white" : "border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50"}`}
                >
                  {t(`filters.${entry}`)}{count > 0 ? ` · ${count}` : ""}
                </Link>
              );
            })}
          </nav>
        </div>
        <form method="get" action={href("tasks").split("?")[0]} role="search" className="hidden md:block">
          <input type="hidden" name="org" value={ctx.orgId} />
          {Object.entries(keep).filter(([key]) => key !== "q").map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
          <label className="flex h-[38px] w-60 items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3 text-[13.5px] text-slate-600 focus-within:border-violet-400">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <span className="sr-only">{t("board.search")}</span>
            <input type="search" name="q" defaultValue={options.query} maxLength={80} placeholder={t("board.search")} className="min-w-0 flex-1 bg-transparent text-slate-950 outline-none placeholder:text-slate-500" />
          </label>
        </form>
      </div>
      {teamFilter ? (
        <p role="status" className="mt-3 text-sm text-slate-700">
          {t("board.teamFilter", { team: teamFilter.name })}{" "}
          <Link href={href("tasks", { ...keep, team: "" })} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("board.searchClear")}</Link>
        </p>
      ) : null}
      {needle ? (
        <p role="status" className="mt-3 text-sm text-slate-700">
          {t("board.searchResult", { count: filtered.length, query: options.query.trim() })}{" "}
          <Link href={href("tasks", { ...keep, q: "" })} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("board.searchClear")}</Link>
        </p>
      ) : null}

      {ctx.canWrite && options.dictateOpen ? (
        <section aria-labelledby="dictate-title" className={`${CARD} mt-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="dictate-title" className="text-[17px] font-semibold text-slate-950">{t("week.dictateTitle")}</h2>
              <p className="mt-1 text-[14px] leading-6 text-slate-600">{t("week.dictateText")}</p>
            </div>
            <Link href={closeHref} className="inline-flex min-h-10 items-center px-2 text-[15px] text-slate-600 underline-offset-4 hover:underline">{t("form.cancel")}</Link>
          </div>
          <div className="mt-4">
            <DictateTasks orgId={ctx.orgId} tab="tasks" me={ctx.me} today={ctx.today} members={ctx.members.map(({ userId, name }) => ({ userId, name }))} programs={ctx.programs.map(({ programId, name }) => ({ programId, name }))} />
          </div>
        </section>
      ) : null}

      {ctx.canWrite && options.newOpen ? (
        <>
          {/* Am Telefon ein Blatt von unten ueber der Liste; am Rechner eine Flaeche ueber dem Board. */}
          <Link href={closeHref} aria-label={t("form.cancel")} className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" />
          <section
            aria-labelledby="new-task-title"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white px-[18px] pb-7 pt-2.5 shadow-[0_-10px_30px_rgba(20,21,43,.18)] md:static md:z-auto md:mt-5 md:max-h-none md:overflow-visible md:rounded-[18px] md:border md:border-slate-200 md:p-6 md:shadow-none"
          >
            <span aria-hidden="true" className="mx-auto mb-3 block h-[5px] w-10 rounded-full bg-slate-300 md:hidden" />
            <h2 id="new-task-title" className="mb-4 text-[19px] font-bold text-slate-950">{t("board.new")}</h2>
            <TaskForm ctx={ctx} tab="tasks" filter={filter} cancelHref={closeHref} defaultEventId={options.eventId ?? null} />
          </section>
        </>
      ) : null}

      {view === "calendar" && options.viewChosen ? <TaskCalendar ctx={ctx} tasks={filtered} filter={filter} month={calendarMonth} /> : null}
      {view === "list" && options.viewChosen ? <TaskList ctx={ctx} tasks={filtered} back={keep} filterOf={filter} /> : null}
      {view === "board" && options.viewChosen ? board : null}
      {!options.viewChosen ? (
        <>
          <div className="hidden md:block">{board}</div>
          <TaskList ctx={ctx} tasks={filtered} back={keep} mobileOnly filterOf={filter} />
        </>
      ) : null}

      {ctx.canWrite && !options.newOpen ? (
        <Link
          href={href("tasks", { ...keep, new: "1" })}
          aria-label={t("board.new")}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-br from-[#6d49e0] to-[#0a80b8] text-3xl text-white shadow-[0_8px_20px_rgba(80,50,200,.35)] min-[700px]:hidden"
        >
          +
        </Link>
      ) : null}

      {selected ? <TaskDetail ctx={ctx} task={selected} filter={filter} comments={comments} back={keep} /> : null}
    </div>
  );
}

/** Diese Woche: eine Zeile zum Eintragen, was dich betrifft, Termine, was noch niemand macht (Entwurf 05.11.2026). */
export async function TeamraumWeek({
  ctx,
  followUps,
  nextCheckIns,
}: {
  ctx: TeamraumContext;
  followUps: { programId: string; dueOn: string }[];
  nextCheckIns: { programId: string; nextOn: string }[];
}) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf, programOf, href } = helpers(ctx);
  const weekday = new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" });
  const weekdayOf = (iso: string) => weekday.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)).replace(".", "");
  const clock = new Intl.DateTimeFormat(ctx.locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const week = myWeek(ctx.tasks, ctx.me, ctx.today);
  const horizon = addDays(ctx.today, 7);
  const events = ctx.events.filter((event) => berlinDayOf(event.startsAt) >= ctx.today && berlinDayOf(event.startsAt) <= horizon);
  const unassigned = unassignedTasks(ctx.tasks);
  // Gespraeche zum Stand und Wiedervorlagen nur fuer Teams, die man sieht und die bald dran sind.
  const talks = nextCheckIns.filter((entry) => entry.nextOn <= horizon && programOf(entry.programId));
  const myFollowUps = followUps.filter((entry) => programOf(entry.programId));
  const mineCount = week.overdue.length + week.thisWeek.length + talks.length + myFollowUps.length;
  const ROW = "flex min-h-14 items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0";
  const subOf = (task: OrgTask) => {
    const progress = checklistProgress(task);
    return [
      task.programId ? programOf(task.programId)?.name ?? t("hiddenProgram") : t("internal"),
      progress.total > 0 ? t("checklistOf", progress) : null,
    ].filter(Boolean).join(" · ");
  };
  const tick = (task: OrgTask) =>
    ctx.canWrite ? (
      <form action={moveOrgTaskAction}>
        <Hidden ctx={ctx} tab="week" taskId={task.id} />
        <input type="hidden" name="status" value="done" />
        <button type="submit" aria-label={t("week.markDone", { task: task.title })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <span aria-hidden="true" className="h-[22px] w-[22px] rounded-full border-2 border-slate-400 bg-white hover:border-violet-500" />
        </button>
      </form>
    ) : (
      <span aria-hidden="true" className="mx-[11px] h-[22px] w-[22px] shrink-0 rounded-full border-2 border-slate-300" />
    );
  const taskRow = (task: OrgTask, showDay: boolean) => (
    <li key={task.id} className={ROW}>
      {tick(task)}
      <div className="min-w-0 flex-1">
        <Link href={`${href("tasks", { task: task.id })}#task-detail`} className="block text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{task.title}</Link>
        <p className="mt-0.5 text-[13px] text-slate-600">{showDay || !task.dueOn ? subOf(task) : [subOf(task), t("week.since", { date: dayOf(task.dueOn) })].join(" · ")}</p>
      </div>
      {showDay && task.dueOn ? <span className="shrink-0 text-[13px] font-semibold text-slate-700">{weekdayOf(task.dueOn)}</span> : null}
    </li>
  );
  const softRow = (key: string, link: string, title: string, sub: string, on: string) => (
    <li key={key} className={ROW}>
      <span aria-hidden="true" className="mx-[11px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-violet-100 text-[11px] text-violet-800">●</span>
      <div className="min-w-0 flex-1">
        <Link href={link} className="block text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{title}</Link>
        <p className="mt-0.5 text-[13px] text-slate-600">{sub}</p>
      </div>
      <span className={`shrink-0 text-[13px] font-semibold ${on < ctx.today ? "text-rose-700" : "text-slate-700"}`}>{weekdayOf(on)}</span>
    </li>
  );
  const PANEL = "rounded-[18px] border border-slate-200 bg-white px-5 py-[18px]";
  const H2 = "flex items-center justify-between text-[15px] font-semibold text-slate-950";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Feedback ctx={ctx} />
      {ctx.canWrite ? (
        <DictateTasks
          variant="line"
          moreHref={href("tasks", { new: "1" })}
          orgId={ctx.orgId}
          tab="week"
          me={ctx.me}
          today={ctx.today}
          members={ctx.members.map(({ userId, name }) => ({ userId, name }))}
          programs={ctx.programs.map(({ programId, name }) => ({ programId, name }))}
        />
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="week-mine-title" className={PANEL}>
          <h2 id="week-mine-title" className={H2}>
            <span>{t("week.mine")}</span>
            <Link href={href("tasks", { filter: "mine" })} className="text-[13px] font-medium text-violet-800 underline-offset-4 hover:underline">{t("week.allTasks")}</Link>
          </h2>
          {mineCount === 0 ? <p className="mt-3 text-[15px] leading-6 text-slate-700">{t("week.mineNone")}</p> : null}
          {week.overdue.length > 0 ? (
            <>
              <h3 className="mt-4 text-[13px] font-semibold text-rose-700">{t("week.overdueCount", { count: week.overdue.length })}</h3>
              <ul>{week.overdue.map((task) => taskRow(task, false))}</ul>
            </>
          ) : null}
          {week.thisWeek.length + talks.length + myFollowUps.length > 0 ? (
            <>
              <h3 className="mt-4 text-[13px] font-semibold text-slate-600">{t("week.thisWeekCount", { count: week.thisWeek.length + talks.length + myFollowUps.length })}</h3>
              <ul>
                {week.thisWeek.map((task) => taskRow(task, true))}
                {talks.map((entry) => softRow(`talk-${entry.programId}`, `/advisor/programm/${entry.programId}`, t("week.talkLine", { team: programOf(entry.programId)?.name ?? "" }), t("week.talkSub"), entry.nextOn))}
                {myFollowUps.map((entry) => softRow(`fu-${entry.programId}`, `/advisor/programm/${entry.programId}?tab=notizen`, t("week.followUpLine", { team: programOf(entry.programId)?.name ?? "" }), t("week.followUpSub"), entry.dueOn))}
              </ul>
            </>
          ) : null}
          {week.later > 0 ? (
            <p className="mt-3 text-[13px] text-slate-600">
              {t("week.later", { count: week.later })}{" "}
              <Link href={href("tasks", { filter: "mine" })} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("week.allMine")}</Link>
            </p>
          ) : null}
        </section>

        <div className="grid content-start gap-5">
          <section aria-labelledby="week-events-title" className={PANEL}>
            <h2 id="week-events-title" className={H2}>
              <span>{t("week.events")}</span>
              <Link href={calendarHref(ctx.orgId)} className="text-[13px] font-medium text-violet-800 underline-offset-4 hover:underline">{t("week.planLink")}</Link>
            </h2>
            {events.length === 0 ? <p className="mt-3 text-[15px] text-slate-700">{t("week.eventsNone")}</p> : null}
            <ul>
              {events.map((event) => (
                <li key={event.eventId} className="flex items-start gap-3 border-t border-slate-100 py-3 first:mt-1 first:border-t-0">
                  <span className="w-[46px] shrink-0 rounded-[10px] bg-violet-100 py-1 text-center text-violet-900">
                    <span className="block text-[11px] font-semibold uppercase">{weekdayOf(event.startsAt)}</span>
                    <span className="block text-[17px] font-bold leading-tight">{Number(event.startsAt.slice(8, 10))}</span>
                  </span>
                  <span className="min-w-0">
                    <Link href={calendarHref(ctx.orgId, { termin: event.eventId })} className="block text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{event.title}</Link>
                    <span className="mt-0.5 block text-[13px] text-slate-600">{[clock.format(new Date(event.startsAt)), event.location].filter(Boolean).join(" · ")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="week-nobody-title" className={PANEL}>
            <h2 id="week-nobody-title" className={H2}>
              <span>{t("week.nobody")}</span>
              <span className="text-[13px] font-medium text-slate-600">{unassigned.length}</span>
            </h2>
            {unassigned.length === 0 ? <p className="mt-3 text-[15px] text-slate-700">{t("week.nobodyNone")}</p> : null}
            <ul className="mt-1">
              {unassigned.slice(0, 6).map((task) => (
                <li key={task.id} className="flex items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`${href("tasks", { task: task.id })}#task-detail`} className="block text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{task.title}</Link>
                    <p className="mt-0.5 text-[13px] text-slate-600">{[subOf(task), task.dueOn ? t("week.until", { date: dayOf(task.dueOn) }) : null].filter(Boolean).join(" · ")}</p>
                  </div>
                  {ctx.canWrite ? (
                    <form action={takeOrgTaskAction}>
                      <Hidden ctx={ctx} tab="week" taskId={task.id} />
                      <SubmitButton label={t("take")} pendingLabel="…" className="inline-flex min-h-9 items-center rounded-[10px] border border-violet-300 bg-violet-50 px-3 text-[13px] font-semibold text-violet-800" />
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
            {unassigned.length > 6 ? (
              <Link href={href("tasks", { filter: "nobody" })} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("week.nobodyAll")}</Link>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Wer macht was: Rollen im Team, Bezugspersonen, Abwesenheit und Vertretung. Zahlen sind Anzahl, keine Bewertung. */
export async function TeamraumWho({ ctx, nextCheckIns }: { ctx: TeamraumContext; nextCheckIns: { programId: string; nextOn: string }[] }) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf, memberOf, href } = helpers(ctx);
  const counts = openCountsByMember(ctx.tasks, ctx.today);
  const byProgram = openCountsByProgram(ctx.tasks);
  const presenceOf = (userId: string) => ctx.presence.find((entry) => entry.userId === userId);
  const mine = presenceOf(ctx.me);
  const activePrograms = ctx.programs.filter((program) => program.isActive);
  return (
    <div className="grid gap-6">
      <Feedback ctx={ctx} />
      <p className="-mt-2 max-w-2xl text-[15px] leading-6 text-slate-700">{t("who.text")}</p>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ctx.members.map((member) => {
          const presence = presenceOf(member.userId);
          const away = isAway(presence, ctx.today);
          const standIn = memberOf(presence?.standInUserId ?? null);
          const count = counts.get(member.userId) ?? { open: 0, overdue: 0 };
          const contactFor = activePrograms.filter((program) => program.contactUserIds.includes(member.userId));
          return (
            <li key={member.userId} className={`${CARD} ${away ? "border-amber-200" : ""}`}>
              <div className="flex items-center gap-3">
                <Avatar userId={member.userId} name={member.name} size="h-11 w-11 text-base" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{member.isSelf ? t("me", { name: member.name }) : member.name}</p>
                  <p className="text-sm text-slate-600">{[presence?.teamRole, isLeadRole(member.role) ? t("who.lead") : null].filter(Boolean).join(" · ") || t("who.noRole")}</p>
                </div>
              </div>
              {away && presence?.awayUntil ? (
                <p className={`${CHIP} mt-3 bg-amber-100 text-amber-900`}>
                  {standIn ? t("who.awayWithStandIn", { date: dayOf(presence.awayUntil), name: standIn.name }) : t("who.away", { date: dayOf(presence.awayUntil) })}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold text-slate-500">{t("who.contactFor")}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {contactFor.length === 0 ? <span className="text-sm text-slate-500">–</span> : null}
                {contactFor.map((program) => (
                  <span key={program.programId} className={`${CHIP} ${toneOf(member.userId)}`}>{program.name}</span>
                ))}
              </div>
              <Link href={member.isSelf ? href("tasks", { filter: "mine" }) : href("tasks")} className="mt-3 inline-flex text-sm text-slate-700 underline-offset-4 hover:underline">
                {t("who.openTasks", { open: count.open, overdue: count.overdue })}
              </Link>
            </li>
          );
        })}
      </ul>

      {ctx.canWrite ? (
        <details className={CARD} open={!mine?.teamRole}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">{t("who.mineTitle")}</summary>
          <form action={setMyOrgPresenceAction} className="mt-3 grid gap-4 sm:grid-cols-3 sm:items-end">
            <Hidden ctx={ctx} tab="who" />
            <label>
              <span className={LABEL}>{t("who.teamRole")}</span>
              <input name="teamRole" maxLength={80} defaultValue={mine?.teamRole ?? ""} placeholder={t("who.teamRolePlaceholder")} className={INPUT} />
            </label>
            <label>
              <span className={LABEL}>{t("who.awayUntil")}</span>
              <input type="date" name="awayUntil" defaultValue={mine?.awayUntil ?? ""} className={INPUT} />
            </label>
            <label>
              <span className={LABEL}>{t("who.standIn")}</span>
              <select name="standIn" defaultValue={mine?.standInUserId ?? ""} className={INPUT}>
                <option value="">{t("nobody")}</option>
                {ctx.members.filter((member) => !member.isSelf).map((member) => (
                  <option key={member.userId} value={member.userId}>{member.name}</option>
                ))}
              </select>
            </label>
            <SubmitButton label={t("who.save")} pendingLabel="…" className={PRIMARY} />
          </form>
          <p className="mt-2 text-xs text-slate-500">{t("who.mineHint")}</p>
        </details>
      ) : null}

      <section aria-labelledby="who-startups-title" className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="who-startups-title" className="text-lg font-semibold text-slate-950">{t("who.startupsTitle")}</h2>
          <Link href={`/advisor/organisation?${new URLSearchParams({ org: ctx.orgId, tab: "program" }).toString()}`} className="text-sm text-violet-800 underline-offset-4 hover:underline">{t("who.startupsEdit")}</Link>
        </div>
        {activePrograms.length === 0 ? <p className="mt-3 text-sm text-slate-600">{t("who.startupsNone")}</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[12.5px] text-slate-600">
                  <th className="py-2 pr-3 font-semibold">{t("who.colStartup")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("who.colContact")}</th>
                  <th className="py-2 pr-3 font-semibold">{t("who.colNextTalk")}</th>
                  <th className="py-2 font-semibold">{t("who.colOpen")}</th>
                </tr>
              </thead>
              <tbody>
                {activePrograms.map((program) => {
                  const contacts = program.contactUserIds.map((userId) => memberOf(userId)).filter((member): member is TeamraumMember => member !== null);
                  const next = nextCheckIns.find((entry) => entry.programId === program.programId)?.nextOn ?? null;
                  return (
                    <tr key={program.programId} className={`border-t border-slate-100 ${contacts.length === 0 ? "bg-amber-50/70" : ""}`}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        <Link href={`/advisor/programm/${program.programId}`} className="underline-offset-4 hover:underline">{program.name}</Link>
                      </td>
                      <td className="py-2.5 pr-3">
                        {contacts.length === 0 ? <span className="font-semibold text-amber-800">{t("who.noContact")}</span> : (
                          <span className="flex flex-wrap items-center gap-2">
                            {contacts.map((contact) => (
                              <span key={contact.userId} className="inline-flex items-center gap-1.5">
                                <Avatar userId={contact.userId} name={contact.name} size="h-6 w-6 text-[11px]" />
                                {contact.name}
                                {isAway(presenceOf(contact.userId), ctx.today) ? <span className={`${CHIP} bg-amber-100 text-amber-900`}>{t("who.awayShort")}</span> : null}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700">{next ? dayOf(next) : "–"}</td>
                      <td className="py-2.5 text-slate-700">{byProgram.get(program.programId) ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
