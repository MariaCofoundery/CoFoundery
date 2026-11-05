import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";
import type { ProgramEvent } from "@/features/advisor/teamProgramData";
import {
  addOrgTaskCommentAction,
  checkOrgTaskItemAction,
  deleteOrgTaskAction,
  deleteOrgTaskCommentAction,
  moveOrgTaskAction,
  saveOrgTaskAction,
  setMyOrgPresenceAction,
  takeOrgTaskAction,
} from "@/features/advisor/teamraumActions";
import {
  TASK_FILTERS,
  TASK_STATUSES,
  addDays,
  boardColumns,
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

/**
 * Teamraum (seit 05.11.2026): Diese Woche, Aufgaben, Wer macht was - fuer das Team der Organisation.
 * Nie fuer die Teams im Programm. Den Namen eines Startups zeigt eine Aufgabe nur, wenn die
 * betrachtende Person das Team ohnehin sieht (Inhaberin oder Bezugsperson); sonst "ein Team im Programm".
 */

export type TeamraumMember = { userId: string; name: string; role: "owner" | "advisor"; isSelf: boolean };
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
  today: string;
  locale: string;
  feedback: { error: string | null; saved: boolean; deleted: boolean };
};

const CARD = "advisor-card p-5 sm:p-6";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const PRIMARY = "brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold";
const QUIET = "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50";
const CHIP = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";
const TONES = ["bg-violet-100 text-violet-800", "bg-teal-100 text-teal-800", "bg-pink-100 text-pink-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-800"];
const NEXT: Record<TaskStatus, TaskStatus> = { open: "doing", doing: "done", waiting: "doing", done: "open" };
const COLUMN_TONE: Record<TaskStatus, string> = { open: "bg-indigo-50/70", doing: "bg-violet-50/80", waiting: "bg-amber-50/70", done: "bg-emerald-50/70" };

const toneOf = (userId: string) => TONES[[...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
const initialOf = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

function Avatar({ userId, name, size = "h-7 w-7 text-xs" }: { userId: string; name: string; size?: string }) {
  return (
    <span title={name} aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${size} ${toneOf(userId)}`}>
      {initialOf(name)}
    </span>
  );
}

function helpers(ctx: TeamraumContext) {
  const day = new Intl.DateTimeFormat(ctx.locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const time = new Intl.DateTimeFormat(ctx.locale, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  return {
    dayOf: (iso: string) => day.format(new Date(`${iso}T00:00:00Z`)),
    timeOf: (iso: string) => time.format(new Date(iso)),
    memberOf: (userId: string | null) => (userId ? ctx.members.find((member) => member.userId === userId) ?? null : null),
    programOf: (programId: string | null) => (programId ? ctx.programs.find((program) => program.programId === programId) ?? null : null),
    eventOf: (eventId: string | null) => (eventId ? ctx.events.find((event) => event.eventId === eventId) ?? null : null),
    href: (tab: "week" | "tasks" | "who", extra: Record<string, string> = {}) => `/advisor/organisation?${new URLSearchParams({ org: ctx.orgId, tab, ...extra }).toString()}`,
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
    return <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t(`errors.${["member", "program"].includes(ctx.feedback.error) ? ctx.feedback.error : "failed"}`)}</p>;
  }
  if (ctx.feedback.saved || ctx.feedback.deleted) {
    return <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t(ctx.feedback.deleted ? "deleted" : "saved")}</p>;
  }
  if (!ctx.canWrite) {
    return <p role="note" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("readOnly")}</p>;
  }
  return null;
}

/** Das Formular fuer neue und bestehende Aufgaben. "quick" zeigt nur, was man beim schnellen Eintragen braucht. */
async function TaskForm({ ctx, tab, filter, task, quick = false }: { ctx: TeamraumContext; tab: "week" | "tasks"; filter?: TaskFilter; task?: OrgTask; quick?: boolean }) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf } = helpers(ctx);
  // Ein Startup verknuepfen kann man nur mit Teams, die man sieht. Eine bestehende fremde Verknuepfung bleibt still erhalten.
  const keepsHiddenProgram = Boolean(task?.programId && !ctx.programs.some((program) => program.programId === task.programId));
  const upcoming = ctx.events.filter((event) => event.startsAt.slice(0, 10) >= addDays(ctx.today, -14) || event.eventId === task?.eventId);
  return (
    <form action={saveOrgTaskAction} className={quick ? "grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" : "grid gap-4"}>
      <Hidden ctx={ctx} tab={tab} filter={filter} taskId={task?.id} />
      <label className={quick ? "" : "block"}>
        <span className={LABEL}>{t("form.title")}</span>
        <input name="title" required maxLength={200} defaultValue={task?.title ?? ""} placeholder={quick ? t("form.quickPlaceholder") : undefined} className={INPUT} disabled={!ctx.canWrite} />
      </label>
      <div className={quick ? "contents" : "grid gap-4 sm:grid-cols-2"}>
        <label>
          <span className={LABEL}>{t("form.assignee")}</span>
          <select name="assignee" defaultValue={task ? task.assigneeUserId ?? "" : ctx.me} className={INPUT} disabled={!ctx.canWrite}>
            <option value="">{t("nobody")}</option>
            {ctx.members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.isSelf ? t("me", { name: member.name }) : member.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={LABEL}>{t("form.due")}</span>
          <input type="date" name="dueOn" defaultValue={task?.dueOn ?? ""} className={INPUT} disabled={!ctx.canWrite} />
        </label>
        <label>
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
        {!quick ? (
          <>
            <label>
              <span className={LABEL}>{t("form.event")}</span>
              <select name="eventId" defaultValue={task?.eventId ?? ""} className={INPUT} disabled={!ctx.canWrite}>
                <option value="">{t("form.noEvent")}</option>
                {upcoming.map((event) => (
                  <option key={event.eventId} value={event.eventId}>{`${dayOf(event.startsAt.slice(0, 10))} · ${event.title}`}</option>
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
          </>
        ) : null}
      </div>
      {!quick ? (
        <>
          <label className="block">
            <span className={LABEL}>{t("form.details")}</span>
            <textarea name="details" rows={4} maxLength={4000} defaultValue={task?.details ?? ""} className={`${INPUT} py-2`} disabled={!ctx.canWrite} />
            <span className="mt-1 block text-xs text-slate-500">{t("form.detailsHint")}</span>
          </label>
          <label className="block">
            <span className={LABEL}>{t("form.checklist")}</span>
            <textarea name="checklist" rows={4} defaultValue={task ? checklistToText(task.checklist) : ""} className={`${INPUT} py-2 font-mono text-[13px]`} disabled={!ctx.canWrite} />
            <span className="mt-1 block text-xs text-slate-500">{t("form.checklistHint")}</span>
          </label>
        </>
      ) : (
        <input type="hidden" name="status" value="open" />
      )}
      {ctx.canWrite ? <SubmitButton label={task ? t("form.save") : t("form.add")} pendingLabel="…" className={PRIMARY} /> : null}
    </form>
  );
}

async function TaskCard({ ctx, task, filter, selected }: { ctx: TeamraumContext; task: OrgTask; filter: TaskFilter; selected: boolean }) {
  const t = await getTranslations("advisor.teamraum");
  const { dayOf, memberOf, programOf, eventOf, href } = helpers(ctx);
  const assignee = memberOf(task.assigneeUserId);
  const program = programOf(task.programId);
  const event = eventOf(task.eventId);
  const progress = checklistProgress(task);
  const overdue = isOverdue(task, ctx.today);
  return (
    <article className={`advisor-card grid gap-2 p-3.5 ${selected ? "ring-2 ring-violet-500" : ""} ${task.status === "done" ? "opacity-75" : ""} ${!task.assigneeUserId && task.status !== "done" ? "border-dashed" : ""}`}>
      <Link href={`${href("tasks", { ...(filter !== "all" ? { filter } : {}), task: task.id })}#task-detail`} className={`text-[15px] font-semibold leading-6 text-slate-950 underline-offset-4 hover:underline ${task.status === "done" ? "line-through" : ""}`}>
        {task.title}
      </Link>
      <div className="flex flex-wrap gap-1.5">
        {task.programId ? <span className={`${CHIP} bg-violet-100 text-violet-800`}>{program?.name ?? t("hiddenProgram")}</span> : <span className={`${CHIP} bg-sky-100 text-sky-800`}>{t("internal")}</span>}
        {event ? <span className={`${CHIP} bg-amber-100 text-amber-900`}>{event.title}</span> : null}
        {task.dueOn ? <span className={`${CHIP} ${overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{overdue ? t("overdueSince", { date: dayOf(task.dueOn) }) : t("dueOn", { date: dayOf(task.dueOn) })}</span> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{progress.total > 0 ? t("checklistProgress", progress) : ""}</span>
        <div className="flex items-center gap-1.5">
          {!task.assigneeUserId && task.status !== "done" && ctx.canWrite ? (
            <form action={takeOrgTaskAction}>
              <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
              <SubmitButton label={t("take")} pendingLabel="…" className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" />
            </form>
          ) : null}
          {ctx.canWrite ? (
            <form action={moveOrgTaskAction}>
              <Hidden ctx={ctx} tab="tasks" filter={filter} taskId={task.id} />
              <input type="hidden" name="status" value={NEXT[task.status]} />
              <SubmitButton label={t(`move.${task.status}`)} pendingLabel="…" className="inline-flex min-h-9 items-center rounded-full px-2.5 text-xs font-semibold text-violet-800 underline-offset-4 hover:underline" />
            </form>
          ) : null}
          {assignee ? <Avatar userId={assignee.userId} name={assignee.name} /> : <span className="text-xs font-semibold text-amber-800">{t("nobody")}</span>}
        </div>
      </div>
    </article>
  );
}

async function TaskDetail({ ctx, task, filter, comments }: { ctx: TeamraumContext; task: OrgTask; filter: TaskFilter; comments: TaskComment[] }) {
  const t = await getTranslations("advisor.teamraum");
  const { memberOf, timeOf, href } = helpers(ctx);
  const creator = memberOf(task.createdByUserId);
  const canDelete = ctx.canWrite && (task.createdByUserId === ctx.me || ctx.isOwner);
  return (
    <section id="task-detail" aria-labelledby="task-detail-title" className={`${CARD} mt-6 scroll-mt-24 border-violet-200`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-700">{t("detail.eyebrow")}</p>
          <h2 id="task-detail-title" className="mt-1 text-xl font-semibold text-slate-950">{task.title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("detail.meta", { name: creator?.name ?? t("formerMember"), date: timeOf(task.createdAt) })}
          </p>
        </div>
        <Link href={href("tasks", filter !== "all" ? { filter } : {})} className={QUIET}>{t("detail.close")}</Link>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <details className="rounded-2xl border border-slate-200 bg-white/70 p-4" open={ctx.feedback.error !== null}>
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
              <SubmitButton label={t("detail.comment")} pendingLabel="…" className={QUIET} />
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
export async function TeamraumBoard({ ctx, filter, selectedTaskId, comments }: { ctx: TeamraumContext; filter: TaskFilter; selectedTaskId: string | null; comments: TaskComment[] }) {
  const t = await getTranslations("advisor.teamraum");
  const { href } = helpers(ctx);
  const columns = boardColumns(filterTasks(ctx.tasks, filter, ctx.me));
  const selected = selectedTaskId ? ctx.tasks.find((task) => task.id === selectedTaskId) ?? null : null;
  return (
    <div>
      <Feedback ctx={ctx} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{t("board.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("board.text")}</p>
        </div>
        <nav aria-label={t("board.filterLabel")} className="flex flex-wrap gap-1.5">
          {TASK_FILTERS.map((entry) => (
            <Link
              key={entry}
              href={href("tasks", entry !== "all" ? { filter: entry } : {})}
              aria-current={filter === entry ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${filter === entry ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {t(`filters.${entry}`)}
            </Link>
          ))}
        </nav>
      </div>

      {ctx.canWrite ? (
        <details className={`${CARD} mt-4`} open={ctx.tasks.length === 0}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">+ {t("board.new")}</summary>
          <div className="mt-3">
            <TaskForm ctx={ctx} tab="tasks" filter={filter} />
          </div>
        </details>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <section key={status} aria-labelledby={`col-${status}`} className={`grid content-start gap-2.5 rounded-3xl p-3 ${COLUMN_TONE[status]}`}>
            <h3 id={`col-${status}`} className="flex items-center justify-between px-1 text-sm font-semibold text-slate-800">
              {t(`status.${status}`)} <span className="text-slate-500">{columns[status].length + (status === "done" ? columns.doneHidden : 0)}</span>
            </h3>
            {columns[status].length === 0 ? <p className="px-1 text-xs leading-5 text-slate-500">{t(`empty.${status}`)}</p> : null}
            {columns[status].map((task) => (
              <TaskCard key={task.id} ctx={ctx} task={task} filter={filter} selected={task.id === selectedTaskId} />
            ))}
            {status === "done" && columns.doneHidden > 0 ? <p className="px-1 text-xs text-slate-500">{t("board.doneHidden", { count: columns.doneHidden })}</p> : null}
          </section>
        ))}
      </div>

      {selected ? <TaskDetail ctx={ctx} task={selected} filter={filter} comments={comments} /> : null}
    </div>
  );
}

/** Diese Woche: schnell eintragen, was dich betrifft, Termine, was noch niemand macht. */
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
  const { dayOf, timeOf, programOf, memberOf, href } = helpers(ctx);
  const week = myWeek(ctx.tasks, ctx.me, ctx.today);
  const horizon = addDays(ctx.today, 7);
  const events = ctx.events.filter((event) => event.startsAt.slice(0, 10) >= ctx.today && event.startsAt.slice(0, 10) <= horizon);
  const unassigned = unassignedTasks(ctx.tasks);
  const recentDone = ctx.tasks
    .filter((task) => task.status === "done" && task.doneAt && task.doneAt.slice(0, 10) >= addDays(ctx.today, -7))
    .sort((a, b) => ((a.doneAt ?? "") < (b.doneAt ?? "") ? 1 : -1))
    .slice(0, 6);
  // Gespraeche zum Stand und Wiedervorlagen nur fuer Teams, die man sieht und die bald dran sind.
  const talks = nextCheckIns.filter((entry) => entry.nextOn <= horizon && programOf(entry.programId));
  const myFollowUps = followUps.filter((entry) => programOf(entry.programId));
  const mineCount = week.overdue.length + week.thisWeek.length + talks.length + myFollowUps.length;
  const taskLine = (task: OrgTask) => (
    <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <Link href={`${href("tasks", { task: task.id })}#task-detail`} className="min-w-0 text-sm font-medium text-slate-900 underline-offset-4 hover:underline">
        {task.title}
      </Link>
      <span className="flex flex-wrap items-center gap-1.5">
        {task.programId ? <span className={`${CHIP} bg-violet-100 text-violet-800`}>{programOf(task.programId)?.name ?? t("hiddenProgram")}</span> : null}
        {task.dueOn ? <span className={`${CHIP} ${isOverdue(task, ctx.today) ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{dayOf(task.dueOn)}</span> : null}
      </span>
    </li>
  );

  return (
    <div className="grid gap-6">
      <Feedback ctx={ctx} />
      {ctx.canWrite ? (
        <section aria-labelledby="week-quick-title" className="brand-panel rounded-3xl p-5 sm:p-6">
          <h2 id="week-quick-title" className="text-lg font-semibold text-slate-950">{t("week.quickTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("week.quickText")}</p>
          <div className="mt-4">
            <TaskForm ctx={ctx} tab="week" quick />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="week-mine-title" className={CARD}>
          <h2 id="week-mine-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{t("week.mineTitle", { count: mineCount })}</h2>
          {mineCount === 0 ? <p className="mt-3 text-sm leading-6 text-slate-600">{t("week.mineNone")}</p> : null}
          {week.overdue.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-rose-800">{t("week.overdue")}</h3>
              <ul className="divide-y divide-slate-100">{week.overdue.map(taskLine)}</ul>
            </>
          ) : null}
          {week.thisWeek.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">{t("week.thisWeek")}</h3>
              <ul className="divide-y divide-slate-100">{week.thisWeek.map(taskLine)}</ul>
            </>
          ) : null}
          {talks.length > 0 || myFollowUps.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">{t("week.talks")}</h3>
              <ul className="divide-y divide-slate-100">
                {talks.map((entry) => (
                  <li key={`talk-${entry.programId}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/advisor/programm/${entry.programId}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{t("week.talkLine", { team: programOf(entry.programId)?.name ?? "" })}</Link>
                    <span className={`${CHIP} ${entry.nextOn < ctx.today ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{dayOf(entry.nextOn)}</span>
                  </li>
                ))}
                {myFollowUps.map((entry) => (
                  <li key={`fu-${entry.programId}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/advisor/programm/${entry.programId}?tab=notizen`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{t("week.followUpLine", { team: programOf(entry.programId)?.name ?? "" })}</Link>
                    <span className={`${CHIP} ${entry.dueOn < ctx.today ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{dayOf(entry.dueOn)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {week.later > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              {t("week.later", { count: week.later })}{" "}
              <Link href={href("tasks", { filter: "mine" })} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("week.allMine")}</Link>
            </p>
          ) : null}
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="week-events-title" className={CARD}>
            <h2 id="week-events-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{t("week.eventsTitle")}</h2>
            {events.length === 0 ? <p className="mt-3 text-sm text-slate-600">{t("week.eventsNone")}</p> : null}
            <ul className="mt-2 divide-y divide-slate-100">
              {events.map((event) => (
                <li key={event.eventId} className="py-2 text-sm">
                  <Link href={`/advisor/organisation?${new URLSearchParams({ org: ctx.orgId, tab: "plan", open: event.eventId }).toString()}`} className="font-medium text-slate-900 underline-offset-4 hover:underline">{event.title}</Link>
                  <span className="block text-xs text-slate-500">{[timeOf(event.startsAt), event.location].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="week-nobody-title" className={`${CARD} ${unassigned.length > 0 ? "border-amber-200" : ""}`}>
            <h2 id="week-nobody-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{t("week.nobodyTitle", { count: unassigned.length })}</h2>
            {unassigned.length === 0 ? <p className="mt-3 text-sm text-slate-600">{t("week.nobodyNone")}</p> : null}
            <ul className="mt-2 divide-y divide-slate-100">
              {unassigned.slice(0, 6).map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`${href("tasks", { task: task.id })}#task-detail`} className="min-w-0 text-sm font-medium text-slate-900 underline-offset-4 hover:underline">{task.title}</Link>
                  {ctx.canWrite ? (
                    <form action={takeOrgTaskAction}>
                      <Hidden ctx={ctx} tab="week" taskId={task.id} />
                      <SubmitButton label={t("take")} pendingLabel="…" className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" />
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

      {recentDone.length > 0 ? (
        <section aria-labelledby="week-done-title" className={CARD}>
          <h2 id="week-done-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{t("week.doneTitle")}</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {recentDone.map((task) => {
              const who = memberOf(task.assigneeUserId);
              return (
                <li key={task.id} className="flex items-center gap-2 text-sm text-slate-700">
                  {who ? <Avatar userId={who.userId} name={who.name} size="h-6 w-6 text-[11px]" /> : null}
                  <span className="min-w-0 line-through decoration-slate-400">{task.title}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
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
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{t("who.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("who.text")}</p>
      </div>

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
                  <p className="text-sm text-slate-600">{[presence?.teamRole, member.role === "owner" ? t("who.lead") : null].filter(Boolean).join(" · ") || t("who.noRole")}</p>
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
                <tr className="text-left text-xs uppercase tracking-[.08em] text-slate-500">
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
