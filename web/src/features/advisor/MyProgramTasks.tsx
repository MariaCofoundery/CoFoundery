import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ProgramTask } from "@/features/advisor/programTasksData";
import { getPresentationLocale } from "@/i18n/presentationLocale";

/**
 * "Meine Aufgaben im Programm" (06.11.2026): was mir zugewiesen oder von mir angelegt und noch offen ist, ueber meine
 * Programme - auf Heute (Organisation) und auf dem Dashboard (Startup). Ein Klick fuehrt zur Liste des Programms.
 */
export async function MyProgramTasks({ tasks, labelOf, hrefOf, today }: { tasks: ProgramTask[]; labelOf: (programId: string) => string | null; hrefOf: (programId: string) => string; today: string }) {
  const visible = tasks.filter((task) => labelOf(task.programId) !== null).slice(0, 5);
  if (visible.length === 0) return null;
  const t = await getTranslations("advisor.programTasks");
  const locale = getPresentationLocale(await getLocale());
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  return (
    <section aria-labelledby="my-program-tasks-title" className="rounded-[18px] border border-slate-200 bg-white px-5 py-[18px]">
      <h2 id="my-program-tasks-title" className="text-[15px] font-semibold text-slate-950">{t("mineTitle")}</h2>
      <ul className="mt-1">
        {visible.map((task) => {
          const overdue = task.dueOn !== null && task.dueOn < today;
          return (
            <li key={task.id} className="border-t border-slate-100 py-2.5 first:border-t-0">
              <Link href={hrefOf(task.programId)} className="text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{task.title}</Link>
              <span className="text-[13px] text-slate-700"> · {labelOf(task.programId)}{task.visibility === "private" ? ` · ${t("private")}` : ""}</span>
              {task.dueOn ? <span className={`text-[13px] ${overdue ? "font-semibold text-rose-700" : "text-slate-700"}`}> · {t("due", { day: day.format(new Date(`${task.dueOn}T00:00:00Z`)) })}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
