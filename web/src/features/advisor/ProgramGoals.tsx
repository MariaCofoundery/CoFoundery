import { getTranslations } from "next-intl/server";
import { deleteProgramGoalAction, saveProgramGoalAction, setProgramGoalStatusAction } from "@/features/advisor/programTaskActions";
import type { ProgramGoal, ProgramTaskPerson } from "@/features/advisor/programTasksData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

/**
 * Ziele im Programm (08.11.2026): was Startup und Organisation gemeinsam erreichen wollen. Beide Seiten legen an,
 * bearbeiten und haken ab ("erreicht"); loeschen darf, wer es angelegt hat, oder die Inhaberin. Kein Punktestand,
 * keine Gesamtzahl - eine Liste mit Haken.
 */
export async function ProgramGoals({
  programId,
  side,
  goals,
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
  goals: ProgramGoal[];
  people: ProgramTaskPerson[];
  me: string;
  isOrgOwner: boolean;
  locale: string;
  today: string;
  saved: boolean;
  error: boolean;
}) {
  const t = await getTranslations("advisor.programGoals");
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const nameOf = (userId: string | null) => (userId ? (userId === me ? t("me") : people.find((person) => person.userId === userId)?.name || t("unnamed")) : t("formerMember"));
  const hidden = (extra: Record<string, string> = {}) => (
    <>
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="area" value="goals" />
      {Object.entries(extra).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    </>
  );
  const open = goals.filter((goal) => goal.status === "open");
  const reached = goals.filter((goal) => goal.status === "reached");

  const row = (goal: ProgramGoal) => {
    const overdue = goal.status === "open" && goal.dueOn !== null && goal.dueOn < today;
    return (
      <li key={goal.id} className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 p-3.5">
          <form action={setProgramGoalStatusAction}>
            {hidden({ goalId: goal.id, status: goal.status === "reached" ? "open" : "reached" })}
            <button type="submit" aria-label={goal.status === "reached" ? t("reopen") : t("markReached")} title={goal.status === "reached" ? t("reopen") : t("markReached")} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${goal.status === "reached" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400 bg-white text-transparent hover:border-emerald-500"}`}>✓</button>
          </form>
          <div className="min-w-0 flex-1">
            <p className={`text-[15.5px] font-semibold text-slate-950 ${goal.status === "reached" ? "text-slate-600 line-through" : ""}`}>{goal.title}</p>
            {goal.details ? <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-6 text-slate-700">{goal.details}</p> : null}
            <p className="mt-1 flex flex-wrap gap-x-2 text-[12.5px] text-slate-700">
              {goal.dueOn ? <span className={overdue ? "font-semibold text-rose-700" : ""}>{t("due", { day: day.format(new Date(`${goal.dueOn}T00:00:00Z`)) })}</span> : null}
              <span>{goal.dueOn ? "· " : ""}{t("createdBy", { name: nameOf(goal.createdByUserId) })}</span>
            </p>
          </div>
          {goal.createdByUserId === me || isOrgOwner ? (
            <form action={deleteProgramGoalAction}>
              {hidden({ goalId: goal.id })}
              <SubmitButton label={t("delete")} pendingLabel="…" className="inline-flex min-h-9 items-center px-2 text-[13px] font-medium text-rose-700 underline-offset-4 hover:underline" />
            </form>
          ) : null}
        </div>
        <details className="border-t border-slate-100 px-3.5">
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-[13.5px] font-semibold text-violet-800">{t("edit")}</summary>
          <form action={saveProgramGoalAction} className="grid gap-2.5 pb-3.5 pt-1">
            {hidden({ goalId: goal.id })}
            <label className={TILE}><span className={TILE_LABEL}>{t("titleLabel")}</span><input name="title" required maxLength={200} defaultValue={goal.title} className={TILE_INPUT} /></label>
            <label className={TILE}><span className={TILE_LABEL}>{t("detailsLabel")}</span><textarea name="details" rows={2} maxLength={2000} defaultValue={goal.details ?? ""} className={`${TILE_INPUT} resize-y font-normal`} /></label>
            <label className={TILE}><span className={TILE_LABEL}>{t("dueLabel")}</span><input type="date" name="dueOn" defaultValue={goal.dueOn ?? ""} className={TILE_INPUT} /></label>
            <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-10 w-fit items-center rounded-xl bg-[#6D49E0] px-4 text-sm font-semibold text-white hover:bg-[#5B36D6]" />
          </form>
        </details>
      </li>
    );
  };

  return (
    <section id="ziele" aria-labelledby="program-goals-title" className="scroll-mt-24">
      <h2 id="program-goals-title" className="font-brand text-[24px] font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{t(side === "team" ? "textTeam" : "textOrg")}</p>
      {saved ? <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{t("saved")}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{t("error")}</p> : null}

      <form action={saveProgramGoalAction} className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        {hidden()}
        <label className={TILE}><span className={TILE_LABEL}>{t("newTitle")}</span><input name="title" required maxLength={200} placeholder={t("newPlaceholder")} className={TILE_INPUT} /></label>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className={TILE}><span className={TILE_LABEL}>{t("detailsLabel")}</span><input name="details" maxLength={2000} placeholder={t("detailsPlaceholder")} className={TILE_INPUT} /></label>
          <label className={TILE}><span className={TILE_LABEL}>{t("dueLabel")}</span><input type="date" name="dueOn" className={TILE_INPUT} /></label>
        </div>
        <SubmitButton label={t("add")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800" />
      </form>

      {goals.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-[14.5px] text-slate-700">{t("empty")}</p> : null}
      {open.length > 0 ? <ul className="mt-4 grid gap-2.5">{open.map(row)}</ul> : null}
      {reached.length > 0 ? (
        <details className="mt-4" open={open.length === 0}>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-slate-700">{t("reachedTitle", { count: reached.length })}</summary>
          <ul className="mt-2 grid gap-2.5">{reached.map(row)}</ul>
        </details>
      ) : null}
    </section>
  );
}
