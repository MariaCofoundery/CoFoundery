import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { moveOrgTaskAction } from "@/features/advisor/teamraumActions";
import { byDue, isOverdue, type OrgTask } from "@/features/advisor/teamraumModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";

export type StartTasksView = "mine" | "team";
export const startTasksViewOf = (value: unknown): StartTasksView => (value === "team" ? "team" : "mine");

const SHOWN = 8;

/**
 * Aufgaben auf dem Advisor-Start (Wunsch Maria, 05.11.2026): "Fuer mich" - alles, was offen bei mir liegt - und
 * "Steht an" - was im Team ueberfaellig ist oder in den naechsten sieben Tagen faellig, egal fuer wen. Abhaken geht
 * hier; alles andere im Teamraum. Nur Aufgaben aus Organisationen, in denen die Person Mitglied ist (Zeilensicherheit).
 */
export async function StartTasks({
  view,
  mine,
  upcoming,
  orgs,
  names,
  me,
  today,
  locale,
  error,
}: {
  view: StartTasksView;
  mine: OrgTask[];
  upcoming: OrgTask[];
  orgs: { id: string; name: string }[];
  names: Map<string, string>;
  me: string;
  today: string;
  locale: string;
  error: boolean;
}) {
  const t = await getTranslations("advisor.area.start.tasks");
  const tasks = (view === "mine" ? mine : upcoming).slice().sort(byDue);
  const shown = tasks.slice(0, SHOWN);
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const dayOf = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));
  const orgName = (orgId: string) => orgs.find((org) => org.id === orgId)?.name ?? "";
  const peopleOf = (task: OrgTask) => task.assigneeUserIds.map((userId) => (userId === me ? t("me") : names.get(userId) ?? null)).filter((name): name is string => name !== null);
  const firstOrg = orgs[0]?.id ?? null;
  const chip = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] font-medium ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;

  return (
    <section id="start-tasks" aria-labelledby="start-tasks-title" className="work-ui scroll-mt-24 rounded-[18px] border border-slate-200 bg-white px-5 py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="start-tasks-title" className="text-[15px] font-semibold text-slate-950">{t("title")}</h2>
          <nav aria-label={t("filterLabel")} className="flex gap-1.5">
            <Link href="/advisor/dashboard#start-tasks" aria-current={view === "mine" ? "page" : undefined} className={chip(view === "mine")}>
              {t("mine", { count: mine.length })}
            </Link>
            <Link href="/advisor/dashboard?aufgaben=team#start-tasks" aria-current={view === "team" ? "page" : undefined} className={chip(view === "team")}>
              {t("team", { count: upcoming.length })}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[13.5px] font-medium">
          {firstOrg ? <Link href={teamraumHref("tasks", orgs.length > 1 ? firstOrg : null, { new: "1" })} className="text-violet-800 underline-offset-4 hover:underline">+ {t("new")}</Link> : null}
          <Link href={teamraumHref("tasks", null, view === "mine" ? { filter: "mine" } : {})} className="text-violet-800 underline-offset-4 hover:underline">{t("all")}</Link>
        </div>
      </div>
      {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{t("error")}</p> : null}
      {shown.length === 0 ? (
        <p className="mt-3 text-[15px] text-slate-700">{view === "mine" ? t("mineNone") : t("teamNone")}</p>
      ) : (
        <ul className="mt-1">
          {shown.map((task) => {
            const overdue = isOverdue(task, today);
            const people = peopleOf(task);
            return (
              <li key={task.id} className="flex min-h-14 items-center gap-3 border-t border-slate-100 py-2 first:border-t-0">
                <form action={moveOrgTaskAction}>
                  <input type="hidden" name="orgId" value={task.orgId} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="status" value="done" />
                  <input type="hidden" name="back" value={view === "team" ? "start-team" : "start"} />
                  <button type="submit" aria-label={t("markDone", { task: task.title })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full">
                    <span aria-hidden="true" className="h-[22px] w-[22px] rounded-full border-2 border-slate-400 bg-white hover:border-violet-500" />
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <Link href={`${teamraumHref("tasks", task.orgId, { task: task.id })}#task-detail`} className="block text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{task.title}</Link>
                  <p className="mt-0.5 text-[13px] text-slate-600">
                    {[
                      task.dueOn ? (overdue ? t("overdue", { date: dayOf(task.dueOn) }) : dayOf(task.dueOn)) : t("noDate"),
                      people.length > 0 ? people.join(", ") : t("nobody"),
                      orgs.length > 1 ? orgName(task.orgId) : null,
                    ]
                      .filter(Boolean)
                      .map((part, index) => (
                        <span key={index} className={index === 0 && overdue ? "font-semibold text-rose-700" : ""}>
                          {index > 0 ? " · " : ""}
                          {part}
                        </span>
                      ))}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {tasks.length > SHOWN ? (
        <Link href={teamraumHref("tasks", null, view === "mine" ? { filter: "mine" } : {})} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
          {t("more", { count: tasks.length - SHOWN })}
        </Link>
      ) : null}
    </section>
  );
}
