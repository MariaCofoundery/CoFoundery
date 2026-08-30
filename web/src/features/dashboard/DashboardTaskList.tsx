import Link from "next/link";
import type { DashboardTaskKind } from "@/features/dashboard/founderDashboardTasks";

export type DashboardTaskPresentation = {
  id: string;
  kind: DashboardTaskKind;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  action: string;
};

const TASK_LINK_CLASS =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";

export function DashboardTaskList({
  tasks,
  emptyTitle,
  emptyText,
}: {
  tasks: DashboardTaskPresentation[];
  emptyTitle: string;
  emptyText: string;
}) {
  const visibleTasks = tasks.slice(0, 3);

  if (tasks.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <ul className="grid gap-3">
        {visibleTasks.map((task) => (
          <li
            key={task.id}
            className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              task.kind === "NEEDS_YOU"
                ? "border-violet-200 bg-violet-50/45"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {task.eyebrow}
              </p>
              <h3 className="mt-1.5 text-base font-semibold text-slate-950">{task.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{task.text}</p>
            </div>
            <Link href={task.href} className={TASK_LINK_CLASS}>
              {task.action}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
