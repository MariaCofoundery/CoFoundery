import { getLocale, getTranslations } from "next-intl/server";
import { saveCheckInAction } from "@/features/advisor/teamProgramActions";
import type { CheckIn } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Das Gespraech zum Stand: Beide Seiten halten fest, dass und worueber gesprochen wurde, und wann das
 * naechste ansteht. Die Zusammenfassung lesen beide.
 */
export async function ProgramCheckIn({ programId, checkIns, returnTo }: { programId: string; checkIns: CheckIn[]; returnTo: string }) {
  const t = await getTranslations("advisor.teamProgram");
  const format = new Intl.DateTimeFormat(getPresentationLocale(await getLocale()), { dateStyle: "medium" });
  const today = new Date().toISOString().slice(0, 10);
  const nextTalk = checkIns.find((entry) => entry.nextOn && entry.nextOn >= today)?.nextOn ?? null;
  return (
    <section aria-labelledby={`checkin-${programId}`} className="grid gap-3">
      <div>
        <h3 id={`checkin-${programId}`} className="text-base font-semibold text-slate-950">{t("checkInTitle")}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">{t("checkInText")}</p>
        {nextTalk ? <p className="mt-1 text-sm font-semibold text-violet-800">{t("checkInNext", { date: format.format(new Date(nextTalk)) })}</p> : null}
      </div>
      <details className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("checkInNew")}</summary>
        <form action={saveCheckInAction} className="mt-3 grid gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="programId" value={programId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="block text-xs text-slate-500">{t("checkInHeld")}</span>
              <input type="date" name="heldOn" defaultValue={today} max={today} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
            </label>
            <label>
              <span className="block text-xs text-slate-500">{t("checkInNextLabel")}</span>
              <input type="date" name="nextOn" min={today} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
            </label>
          </div>
          <label>
            <span className="block text-xs text-slate-500">{t("checkInSummary")}</span>
            <textarea name="summary" rows={3} maxLength={2000} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <SubmitButton label={t("checkInSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" />
        </form>
      </details>
      {checkIns.length > 0 ? (
        <ul className="grid gap-2">
          {checkIns.map((entry) => (
            <li key={entry.checkInId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-950">{format.format(new Date(entry.heldOn))}</p>
              {entry.summary ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
