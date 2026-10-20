import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPendingStrengthProposals } from "@/features/capability/strengthData";
import { ProposalWatcher } from "@/features/capability/ProposalWatcher";
import { getAiAvailability } from "@/features/direction/directionProposalData";
import { InterviewAnswerForm } from "@/features/interviews/InterviewAnswerForm";
import { StrengthProposalCards } from "@/features/strengths/StrengthProposalCards";
import {
  autosaveStrengthsAnswerAction,
  completeStrengthsInterviewAction,
  requestStrengthProposalsAction,
  saveStrengthsAnswerAction,
  skipStrengthsQuestionAction,
  startStrengthsInterviewAction,
} from "@/features/strengths/strengthsInterviewActions";
import {
  countDecidedStrengthProposals,
  getActiveStrengthsInterview,
  getLatestCompletedStrengthsInterview,
} from "@/features/strengths/strengthsInterviewData";
import {
  findStrengthsQuestion,
  STRENGTHS_MAX_LENGTH,
  STRENGTHS_MIN_LENGTH,
} from "@/features/strengths/strengthsInterviewGuide";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Stärken-Interview.
 *
 * EIN EIGENES GESPRÄCH, NICHT DAS CAPABILITY-INTERVIEW. Bis zum 18.10.2026
 * führte "Stärken im Interview entdecken" nach `/profile/interview`, und am
 * Ende stand eine Einordnung in Funktionsbereiche. Hier gibt es keine
 * Bereiche, keine Anwendungsstufe und keinen Einordnungsschritt - nur
 * Situationen, eine Auswertung auf Anforderung und Vorschläge zum Bestätigen.
 *
 * DER ABLAUF, VON OBEN NACH UNTEN:
 *
 *   1. Einstieg mit Anleitung und Zusagen (vor dem Anfangen, nicht danach).
 *   2. Die Fragen - dasselbe Antwortfeld wie in den anderen Gesprächen.
 *   3. Abgeschlossen: Auswertung anfordern, Zustand der Auswertung.
 *   4. Vorschläge: übernehmen, umschreiben, verwerfen.
 *   5. Die eigenen Antworten zum Nachlesen; ein weiteres Gespräch, leise.
 */
export default async function StrengthsInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/profile/strengths-interview");

  const client = await createClient();
  const [t, state, completed, aiAvailable] = await Promise.all([
    getTranslations("strengths"),
    getActiveStrengthsInterview(client),
    getLatestCompletedStrengthsInterview(client),
    getAiAvailability(client),
  ]);
  const [proposals, decided] = completed
    ? await Promise.all([
        getPendingStrengthProposals(client, { sessionId: completed.sessionId }),
        countDecidedStrengthProposals(client, completed.sessionId),
      ])
    : [[], 0];

  const knownErrors = ["start", "save", "short", "long", "stale", "complete", "too_few", "ask", "proposal"];
  const knownNotices = ["paused", "completed", "reading"];
  const error = query.error && knownErrors.includes(query.error) ? query.error : null;
  const notice = query.notice && knownNotices.includes(query.notice) ? query.notice : null;

  const turn = state?.current ?? null;
  const question = turn ? findStrengthsQuestion(turn.questionId) : null;
  const followUps = question
    ? question.followUpIds.map((id) => ({
        text: t(`interview.questions.${question.id}.followUps.${id}`),
        audio: null,
      }))
    : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <Link
        href="/profile?step=strengths"
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        ← {t("backToStrengths")}
      </Link>
      <header className="brand-panel mt-3 rounded-[28px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-white">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white">{t("text")}</p>
      </header>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t(`errors.${error}`)}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-5 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950">
          {t(`notice.${notice}`)}
        </p>
      ) : null}

      {state && turn && question ? (
        /* ------------------------------------------------------------------
           2. Die Fragen
           ------------------------------------------------------------------ */
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-700">
            {t("progress.atQuestion", { index: state.progress.atQuestion, total: state.progress.total })}
            {" · "}
            {t("progress.answered", { count: state.progress.answeredCount })}
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-8 text-slate-950">
            {t(`interview.questions.${question.id}.title`)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t(`interview.questions.${question.id}.hint`)}
          </p>

          <div className="mt-5">
            <InterviewAnswerForm
              namespace="strengths"
              actions={{
                autosave: autosaveStrengthsAnswerAction,
                save: saveStrengthsAnswerAction,
                skip: skipStrengthsQuestionAction,
              }}
              minLength={STRENGTHS_MIN_LENGTH}
              maxLength={STRENGTHS_MAX_LENGTH}
              sessionId={state.sessionId}
              turnId={turn.id}
              savedAnswer={turn.answer ?? ""}
              followUps={followUps}
              isLastQuestion={state.nextQuestionId === null}
            />
          </div>

          {state.progress.hasEnough && state.nextQuestionId !== null ? (
            <form action={completeStrengthsInterviewAction} className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm leading-6 text-slate-600">{t("progress.enough")}</p>
              <SubmitButton
                label={t("interview.submitLast")}
                pendingLabel={t("interview.submitPending")}
                className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-900"
              />
            </form>
          ) : null}
        </section>
      ) : !completed ? (
        /* ------------------------------------------------------------------
           1. Der Einstieg
           ------------------------------------------------------------------ */
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold">{t("guidance.title")}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>{t("guidance.time")}</li>
            <li>{t("guidance.stories")}</li>
            <li>{t("guidance.notCapability")}</li>
            <li>{t("guidance.save")}</li>
            <li className="font-medium text-slate-900">{t("guidance.private")}</li>
            <li className="font-medium text-slate-900">{t("guidance.noTest")}</li>
          </ul>
          <form action={startStrengthsInterviewAction} className="mt-6">
            <SubmitButton
              label={t("start")}
              pendingLabel={t("startPending")}
              className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
            />
          </form>
        </section>
      ) : (
        /* ------------------------------------------------------------------
           3. Abgeschlossen - und die Auswertung
           ------------------------------------------------------------------ */
        <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50/40 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">{t("done.title")}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {t("done.text", { count: completed.answers.length })}
          </p>

          {completed.job === "open" ? (
            <p role="status" className="mt-4 text-sm font-medium text-violet-900">
              {t("done.reading")}
            </p>
          ) : completed.job === "done" ? (
            proposals.length === 0 ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
                {decided > 0 ? t("done.allDecided") : t("done.noneFound")}
              </p>
            ) : null
          ) : completed.answers.length > 0 && aiAvailable ? (
            <>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{t("done.askText")}</p>
              {completed.job === "failed" ? (
                <p className="mt-3 text-sm text-amber-900">{t("done.failed")}</p>
              ) : null}
              <form action={requestStrengthProposalsAction} className="mt-4">
                <input type="hidden" name="sessionId" value={completed.sessionId} />
                <SubmitButton
                  label={completed.job === "failed" ? t("done.retry") : t("done.ask")}
                  pendingLabel={t("done.askPending")}
                  className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
                />
              </form>
            </>
          ) : (
            /* Ohne erreichbare Auswertung kein Knopf, der dann nichts tut. */
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{t("done.unavailable")}</p>
          )}

          <Link
            href="/profile?step=strengths"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-900 underline-offset-4 hover:underline"
          >
            {t("done.toStrengths")} →
          </Link>
        </section>
      )}

      {completed?.job === "open" ? <ProposalWatcher>{null}</ProposalWatcher> : null}

      {/* 4. Vorschläge - nur die aus diesem Gespräch. */}
      {!state && proposals.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">{t("proposals.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("proposals.text")}</p>
          <StrengthProposalCards proposals={proposals} returnTo="/profile/strengths-interview" />
        </section>
      ) : null}

      {/* 5. Die eigenen Antworten und ein weiteres Gespräch. */}
      {!state && completed && completed.answers.length > 0 ? (
        <details className="mt-8 rounded-3xl border border-slate-200 bg-white/60 p-5">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">
            {t("review.title")}
          </summary>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("review.text")}</p>
          <ul className="mt-4 space-y-4">
            {completed.answers.map((answer) => {
              const asked = findStrengthsQuestion(answer.questionId);
              return (
                <li key={answer.id}>
                  <p className="text-sm font-medium text-slate-900">
                    {asked ? t(`interview.questions.${asked.id}.title`) : answer.questionId}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{answer.answer}</p>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}

      {!state && completed ? (
        <form action={startStrengthsInterviewAction} className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm leading-6 text-slate-600">{t("again.text")}</p>
          <SubmitButton
            label={t("again.cta")}
            pendingLabel={t("startPending")}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          />
        </form>
      ) : null}
    </main>
  );
}
