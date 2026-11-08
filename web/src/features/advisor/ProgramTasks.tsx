import { getTranslations } from "next-intl/server";
import { deleteProgramTaskAction, moveProgramTaskAction, saveProgramTaskAction, setProgramTaskVisibilityAction } from "@/features/advisor/programTaskActions";
import type { ProgramTask, ProgramTaskPerson } from "@/features/advisor/programTasksData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

const NEXT = { open: "doing", doing: "done", done: "open" } as const;

/**
 * Aufgaben im Programm (06.11.2026): gemeinsam zwischen dem Startup und seiner Organisation - oder privat. Beide Seiten
 * sehen dieselbe Liste und arbeiten daran; jede Aufgabe zeigt, wer sie angelegt hat. Private Aufgaben sieht nur, wer sie
 * angelegt hat. Eine Aufgabe zuweisen schickt einen Hinweis im Nachrichtensystem.
 */
export async function ProgramTasks({
  programId,
  side,
  tasks,
  people,
  me,
  isOrgOwner,
  locale,
  today,
  saved,
  error,
}: {
  programId: string;
  side: "team" | "org";
  tasks: ProgramTask[];
  people: ProgramTaskPerson[];
  me: string;
  isOrgOwner: boolean;
  locale: string;
  today: string;
  saved: boolean;
  error: boolean;
}) {
  const t = await getTranslations("advisor.programTasks");
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const nameOf = (userId: string | null) => (userId ? (userId === me ? t("me") : people.find((person) => person.userId === userId)?.name || t("unnamed")) : null);
  const open = tasks.filter((task) => task.status !== "done").sort((a, b) => (a.dueOn ?? "9999") < (b.dueOn ?? "9999") ? -1 : 1);
  const done = tasks.filter((task) => task.status === "done");
  const hidden = (extra: Record<string, string> = {}) => (
    <>
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="side" value={side} />
      {Object.entries(extra).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    </>
  );

  const row = (task: ProgramTask) => {
    const overdue = task.status !== "done" && task.dueOn !== null && task.dueOn < today;
    const mine = task.createdByUserId === me;
    return (
      <li key={task.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-3.5 ${task.status === "done" ? "border-slate-200 opacity-75" : "border-slate-200"}`}>
        <form action={moveProgramTaskAction}>
          {hidden({ taskId: task.id, status: NEXT[task.status] })}
          <button type="submit" aria-label={t(`move.${task.status}`)} title={t(`move.${task.status}`)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${task.status === "done" ? "border-violet-600 bg-violet-600 text-white" : task.status === "doing" ? "border-violet-500 bg-violet-100 text-violet-800" : "border-slate-400 bg-white text-transparent hover:border-violet-500"}`}>
            {task.status === "done" ? "✓" : task.status === "doing" ? "…" : "✓"}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold text-slate-950 ${task.status === "done" ? "line-through" : ""}`}>{task.title}</p>
          {task.details ? <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-6 text-slate-700">{task.details}</p> : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-700">
            {task.visibility === "private" ? <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">{t("private")}</span> : null}
            <span className={`rounded-full px-2 py-0.5 font-semibold ${task.status === "doing" ? "bg-violet-100 text-violet-900" : "bg-slate-100 text-slate-800"}`}>{t(`status.${task.status}`)}</span>
            {task.dueOn ? <span className={overdue ? "font-semibold text-rose-700" : ""}>{t("due", { day: day.format(new Date(`${task.dueOn}T00:00:00Z`)) })}</span> : null}
            {task.assigneeUserId ? <span>{t("assignedTo", { name: nameOf(task.assigneeUserId) ?? "" })}</span> : null}
            <span>· {t("createdBy", { name: nameOf(task.createdByUserId) ?? t("formerMember") })}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {mine ? (
            <form action={setProgramTaskVisibilityAction}>
              {hidden({ taskId: task.id, visibility: task.visibility === "private" ? "shared" : "private" })}
              <SubmitButton label={task.visibility === "private" ? t("share") : t("makePrivate")} pendingLabel="…" className="inline-flex min-h-9 items-center px-2 text-[13px] font-semibold text-violet-800 underline-offset-4 hover:underline" />
            </form>
          ) : null}
          {mine || (isOrgOwner && task.visibility === "shared") ? (
            <form action={deleteProgramTaskAction}>
              {hidden({ taskId: task.id })}
              <SubmitButton label={t("delete")} pendingLabel="…" className="inline-flex min-h-9 items-center px-2 text-[13px] font-medium text-rose-700 underline-offset-4 hover:underline" />
            </form>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <section id="aufgaben" aria-labelledby="program-tasks-title" className="scroll-mt-24">
      <h2 id="program-tasks-title" className="font-brand text-[24px] font-semibold text-slate-950">{t(side === "team" ? "titleTeam" : "titleOrg")}</h2>
      <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{t(side === "team" ? "textTeam" : "textOrg")}</p>
      {saved ? <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{t("saved")}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{t("error")}</p> : null}

      <form action={saveProgramTaskAction} className="mt-4 grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
        {hidden()}
        <label className={TILE}>
          <span className={TILE_LABEL}>{t("newTitle")}</span>
          <input name="title" required maxLength={200} placeholder={t("newPlaceholder")} className={TILE_INPUT} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("dueLabel")}</span>
            <input type="date" name="dueOn" className={TILE_INPUT} />
          </label>
          <label className={`${TILE} sm:col-span-2`}>
            <span className={TILE_LABEL}>{t("assigneeLabel")}</span>
            <select name="assignee" defaultValue="" className={TILE_INPUT}>
              <option value="">{t("nobody")}</option>
              {(["team", "org"] as const).map((group) => (
                <optgroup key={group} label={t(group === "team" ? "groupTeam" : "groupOrg")}>
                  {people.filter((person) => person.side === group).map((person) => <option key={person.userId} value={person.userId}>{person.userId === me ? t("me") : person.name || t("unnamed")}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-[14px] text-slate-900">
            <input type="checkbox" name="visibility" value="private" className="size-5" />
            <span><span className="font-semibold">{t("onlyMe")}</span> <span className="text-slate-700">– {t("onlyMeHint")}</span></span>
          </label>
          <span className="flex-1" />
          <SubmitButton label={t("add")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]" />
        </div>
      </form>

      {tasks.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-[14.5px] text-slate-700">{t("empty")}</p> : null}
      {open.length > 0 ? <ul className="mt-4 grid gap-2.5">{open.map(row)}</ul> : null}
      {done.length > 0 ? (
        <details className="mt-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-slate-700">{t("doneTitle", { count: done.length })}</summary>
          <ul className="mt-2 grid gap-2.5">{done.map(row)}</ul>
        </details>
      ) : null}
    </section>
  );
}
