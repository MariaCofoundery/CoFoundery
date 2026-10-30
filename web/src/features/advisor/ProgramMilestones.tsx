import { getTranslations } from "next-intl/server";
import { deleteProgramMilestoneAction, saveProgramMilestoneAction } from "@/features/advisor/teamProgramActions";
import type { ProgramMilestone } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

function MilestoneFields({ milestone, t }: { milestone?: ProgramMilestone; t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("msTitle")}</span>
        <input name="title" required maxLength={160} defaultValue={milestone?.title ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("msDue")}</span>
        <input name="dueOn" type="date" defaultValue={milestone?.dueOn ?? ""} className={FIELD} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={LABEL}>{t("msDone")}</span>
          <input name="done" inputMode="numeric" pattern="\d{1,4}" defaultValue={milestone?.doneCount ?? 0} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("msTarget")}</span>
          <input name="target" inputMode="numeric" pattern="\d{1,4}" defaultValue={milestone?.targetCount ?? ""} className={FIELD} />
        </label>
      </div>
    </div>
  );
}

/**
 * Meilensteine eines Programm-Teams. Fortschritt ist eine Zahl gegen das
 * eigene Ziel; es gibt keine Gesamtwertung und keinen Vergleich zwischen Teams.
 */
export async function ProgramMilestones({
  programId,
  milestones,
  returnTo,
}: {
  programId: string;
  milestones: ProgramMilestone[];
  returnTo: string;
}) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <section aria-labelledby={`ms-${programId}`} className="grid gap-4">
      <div>
        <h2 id={`ms-${programId}`} className="text-xl font-semibold text-slate-950">{t("milestonesTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("milestonesText")}</p>
      </div>

      {milestones.length === 0 ? <p className="text-sm text-slate-600">{t("milestonesEmpty")}</p> : null}
      <ul className="grid gap-3">
        {milestones.map((milestone) => {
          const percent =
            milestone.targetCount && milestone.targetCount > 0
              ? Math.min(100, Math.round((100 * milestone.doneCount) / milestone.targetCount))
              : null;
          return (
            <li key={milestone.milestoneId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{milestone.title}</span>
                <span className="text-xs text-slate-500">
                  {milestone.dueOn ? t("msDueOn", { date: milestone.dueOn }) : t("msNoDue")}
                  {" · "}
                  {milestone.targetCount ? t("msProgress", { done: milestone.doneCount, target: milestone.targetCount }) : t("msNoTarget")}
                </span>
              </div>
              {percent !== null ? (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${percent}%`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500" style={{ width: `${percent}%` }} />
                </div>
              ) : null}
              <details className="mt-2">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-violet-800">{t("msSave")}</summary>
                <form action={saveProgramMilestoneAction} className="grid gap-3 pb-2">
                  <input type="hidden" name="programId" value={programId} />
                  <input type="hidden" name="milestoneId" value={milestone.milestoneId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <MilestoneFields milestone={milestone} t={t} />
                  <SubmitButton label={t("msSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" />
                </form>
                <form action={deleteProgramMilestoneAction}>
                  <input type="hidden" name="programId" value={programId} />
                  <input type="hidden" name="milestoneId" value={milestone.milestoneId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton label={t("msDelete")} pendingLabel="…" className="inline-flex min-h-11 items-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline" />
                </form>
              </details>
            </li>
          );
        })}
      </ul>

      <details className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("msAdd")}</summary>
        <form action={saveProgramMilestoneAction} className="grid gap-3 pb-3">
          <input type="hidden" name="programId" value={programId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <MilestoneFields t={t} />
          <SubmitButton label={t("msAdd")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" />
        </form>
      </details>
    </section>
  );
}
