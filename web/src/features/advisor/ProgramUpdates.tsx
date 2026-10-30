import { getTranslations } from "next-intl/server";
import { setProgramUpdateQuestionsAction, submitProgramUpdateAction } from "@/features/advisor/teamProgramActions";
import type { ProgramUpdate } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const AREA = "mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";

/** Die bisherigen Updates - fuer Team und Bezugspersonen gleich. */
async function PastUpdates({ updates }: { updates: ProgramUpdate[] }) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{t("updatesPast")}</h3>
      {updates.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">{t("updatesNone")}</p>
      ) : (
        <ul className="mt-2 grid gap-3">
          {updates.map((update) => (
            <li key={update.updateId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">{update.submittedAt.slice(0, 10)}</p>
              <dl className="mt-1 grid gap-2">
                {update.answers.map((entry, index) => (
                  <div key={index}>
                    <dt className="text-sm font-semibold text-slate-900">{entry.q}</dt>
                    <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{entry.a || "–"}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Seite des Teams: Faelligkeit, Formular, Verlauf. */
export async function TeamProgramUpdates({
  programId,
  questions,
  due,
  updates,
}: {
  programId: string;
  questions: string[];
  due: string | null;
  updates: ProgramUpdate[];
}) {
  const t = await getTranslations("advisor.teamProgram");
  const shown = questions.length > 0 ? questions : t("defaultQuestions").split(" | ");
  return (
    <section aria-labelledby={`up-${programId}`} className="grid gap-4">
      <div>
        <h2 id={`up-${programId}`} className="text-xl font-semibold text-slate-950">{t("updatesTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("updatesText")}</p>
        {due ? <p className="mt-1 text-sm font-semibold text-slate-800">{t("updateDue", { date: due })}</p> : null}
        <p className="mt-1 text-xs text-slate-500">{t("updatesTeamNote")}</p>
      </div>
      <form action={submitProgramUpdateAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input type="hidden" name="programId" value={programId} />
        {shown.map((question, index) => (
          <label key={index} className="block">
            <input type="hidden" name="question" value={question} />
            <span className="block text-sm font-semibold text-slate-900">{question}</span>
            <textarea name="answer" maxLength={2000} aria-label={`${question} – ${t("updateAnswerLabel")}`} className={AREA} />
          </label>
        ))}
        <SubmitButton label={t("updateSubmit")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
      </form>
      <PastUpdates updates={updates} />
    </section>
  );
}

/** Seite der Bezugsperson: Fragen festlegen, Antworten lesen. */
export async function ManageProgramUpdates({
  programId,
  questions,
  due,
  updates,
  returnTo,
}: {
  programId: string;
  questions: string[];
  due: string | null;
  updates: ProgramUpdate[];
  returnTo: string;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const current = questions.length > 0 ? questions : t("defaultQuestions").split(" | ");
  return (
    <section className="grid gap-5">
      {due ? <p className="text-sm font-semibold text-slate-800">{t("updateDue", { date: due })}</p> : null}
      <form action={setProgramUpdateQuestionsAction} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label>
          <span className="block text-sm font-semibold text-slate-900">{t("questionsTitle")}</span>
          <span className="block text-xs leading-5 text-slate-600">{t("questionsHint")}</span>
          <textarea name="questions" defaultValue={current.join("\n")} maxLength={1100} className={AREA} />
        </label>
        <SubmitButton label={t("questionsSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" />
      </form>
      <PastUpdates updates={updates} />
    </section>
  );
}
