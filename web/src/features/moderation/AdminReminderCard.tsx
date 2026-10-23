import { getLocale, getTranslations } from "next-intl/server";
import { markProblemResearchDoneAction } from "@/features/moderation/adminReminderActions";
import { CopyPromptButton } from "@/features/moderation/CopyPromptButton";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { SubmitButton } from "@/features/ui/SubmitButton";

/** Montag 00:00 UTC der laufenden Woche. */
export function startOfWeekUtc(now: Date) {
  const day = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
}

/**
 * Die Wochenerinnerung: Claude nach Problemen fragen.
 *
 * Es gibt bewusst keinen automatischen Scan des Internets: Was ausdruecklich
 * erlaubt, kostenlos und ergiebig ist, gibt es nicht (siehe
 * docs/problem-radar-wochenscan.md). Die Recherche macht stattdessen Claude in
 * einer Sitzung, mit Link und eigener Zusammenfassung; hier steht nur, dass es
 * wieder Zeit ist.
 */
export async function AdminReminderCard() {
  const client = await requirePlatformAdmin();
  const [t, locale, { data }] = await Promise.all([
    getTranslations("moderation.reminder"),
    getLocale(),
    client.rpc("admin_reminder_status", { p_key: "problem_research" }),
  ]);
  const lastDone = typeof data === "string" ? new Date(data) : null;
  const done = lastDone !== null && lastDone >= startOfWeekUtc(new Date());
  const day = lastDone ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(lastDone) : null;

  return (
    <section aria-labelledby="reminder-title" className={`mt-6 rounded-3xl border p-5 sm:p-6 ${done ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/70"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{t("eyebrow")}</p>
      <h2 id="reminder-title" className="mt-1 text-xl font-semibold text-slate-950">{done ? t("doneTitle") : t("title")}</h2>
      {done ? (
        <>
          <p className="mt-2 text-sm leading-6 text-slate-700">{t("doneText", { date: day ?? "" })}</p>
          <form action={markProblemResearchDoneAction} className="mt-3">
            <input type="hidden" name="done" value="no" />
            <SubmitButton label={t("undo")} pendingLabel={t("saving")} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800" />
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-slate-700">{t("text")}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("promptLabel")}</p>
          <CopyPromptButton prompt={t("prompt")} copy={t("copy")} copied={t("copied")} manual={t("copyFailed")} />
          <form action={markProblemResearchDoneAction} className="mt-4">
            <SubmitButton label={t("markDone")} pendingLabel={t("saving")} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" />
          </form>
          {lastDone ? <p className="mt-3 text-xs text-slate-500">{t("lastTime", { date: day ?? "" })}</p> : null}
        </>
      )}
    </section>
  );
}
