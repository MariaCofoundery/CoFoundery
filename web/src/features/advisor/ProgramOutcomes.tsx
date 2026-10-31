import { getLocale, getTranslations } from "next-intl/server";
import {
  confirmProgramOutcomeAction,
  removeProgramOutcomeAction,
  saveOutcomeCommentAction,
  reportProgramOutcomeAction,
} from "@/features/advisor/teamProgramActions";
import { countStars, type OutcomeComment, type ProgramOutcome } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { SubmitButton } from "@/features/ui/SubmitButton";

const stars = (count: number, filled: boolean) => (filled ? "★" : "☆").repeat(count);

/**
 * Die Erfolge EINES Teams als Sterne. Das Team meldet (leerer Stern, wartet auf Bestaetigung), die
 * Organisation bestaetigt (voller Stern) oder traegt selbst ein. Es gibt keine Rangliste und keinen
 * Vergleich zwischen Teams: Die Sterne gehoeren dem einen Team.
 */
export async function ProgramOutcomes({
  programId,
  outcomes,
  mode,
  returnTo,
  comments = [],
}: {
  programId: string;
  outcomes: ProgramOutcome[];
  mode: "team" | "org";
  returnTo: string;
  comments?: OutcomeComment[];
}) {
  const t = await getTranslations("advisor.teamProgram");
  const format = new Intl.DateTimeFormat(getPresentationLocale(await getLocale()), { dateStyle: "medium" });
  const total = countStars(outcomes);
  const reached = outcomes.filter((entry) => entry.outcomeId && entry.confirmed).length;
  const label = (entry: ProgramOutcome) => (entry.defaultKey ? t(`outcome_${entry.defaultKey}`) : (entry.title ?? ""));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section aria-labelledby={`outcomes-${programId}`} className="grid gap-4">
      <div>
        <h3 id={`outcomes-${programId}`} className="text-base font-semibold text-slate-950">{t("outcomesTitle")}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">{mode === "team" ? t("outcomesTextTeam") : t("outcomesTextOrg")}</p>
        <p className="mt-2 flex items-baseline gap-2 text-slate-950">
          <span className="text-3xl font-extrabold tracking-tight text-amber-500" aria-hidden="true">★</span>
          <span className="text-3xl font-extrabold tracking-tight">{total}</span>
          <span className="text-sm text-slate-600">{t("outcomesCount", { count: reached })}</span>
        </p>
      </div>
      <ul className="grid gap-2">
        {outcomes.map((entry) => {
          const reported = Boolean(entry.outcomeId);
          return (
            <li key={entry.catalogId} className={`rounded-2xl border px-4 py-3 ${entry.confirmed ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-slate-950">{label(entry)}</span>
                <span className={`text-sm ${entry.confirmed ? "text-amber-500" : "text-slate-400"}`} aria-label={t("outcomeStarsLabel", { count: entry.stars })}>
                  {stars(entry.stars, entry.confirmed)}
                </span>
              </div>
              {reported ? (
                <>
                  <p className="mt-1 text-xs text-slate-600">
                    {entry.confirmed ? t("outcomeConfirmed") : t("outcomeWaiting")}
                    {entry.achievedOn ? ` · ${format.format(new Date(entry.achievedOn))}` : ""}
                  </p>
                  {entry.note ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.note}</p> : null}
                  {entry.confirmed ? (
                    <div className="mt-2 grid gap-1 border-t border-amber-200/70 pt-2">
                      {(["team", "org"] as const).map((side) => {
                        const text = comments.find((comment) => comment.outcomeId === entry.outcomeId && comment.side === side)?.body ?? "";
                        if (side !== mode) {
                          return text ? <p key={side} className="text-sm leading-6 text-slate-700"><span className="font-semibold">{t(side === "team" ? "commentTeam" : "commentOrg")}: </span>{text}</p> : null;
                        }
                        return (
                          <form key={side} action={saveOutcomeCommentAction} className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="outcomeId" value={entry.outcomeId as string} />
                            <label className="min-w-0 flex-1">
                              <span className="block text-xs text-slate-500">{t("commentMine")}</span>
                              <input name="body" maxLength={500} defaultValue={text} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
                            </label>
                            <SubmitButton label={t("commentSave")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700" />
                          </form>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {mode === "org" && !entry.confirmed ? (
                      <form action={confirmProgramOutcomeAction}>
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="outcomeId" value={entry.outcomeId as string} />
                        <SubmitButton label={t("outcomeConfirm")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" />
                      </form>
                    ) : null}
                    {mode === "org" || !entry.confirmed ? (
                      <form action={removeProgramOutcomeAction}>
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="outcomeId" value={entry.outcomeId as string} />
                        <SubmitButton label={t("outcomeRemove")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-rose-800 hover:underline" />
                      </form>
                    ) : null}
                  </div>
                </>
              ) : (
                <details className="mt-1">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">{t("outcomeReach")}</summary>
                  <form action={reportProgramOutcomeAction} className="mt-2 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="programId" value={programId} />
                    <input type="hidden" name="catalogId" value={entry.catalogId} />
                    <label>
                      <span className="block text-xs text-slate-500">{t("outcomeDate")}</span>
                      <input type="date" name="achievedOn" defaultValue={today} max={today} className="mt-1 min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
                    </label>
                    <label>
                      <span className="block text-xs text-slate-500">{t("outcomeNote")}</span>
                      <input name="note" maxLength={500} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                    </label>
                    <SubmitButton label={t("outcomeSave")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" />
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
