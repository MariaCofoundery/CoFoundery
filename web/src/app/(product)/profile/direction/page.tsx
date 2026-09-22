import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  autosaveDirectionAnswerAction,
  completeDirectionInterviewAction,
  saveDirectionAnswerAction,
  skipDirectionQuestionAction,
  startDirectionInterviewAction,
} from "@/features/direction/directionInterviewActions";
import {
  getActiveDirectionInterview,
  getDirectionAnswers,
} from "@/features/direction/directionInterviewData";
import {
  DIRECTION_MAX_LENGTH,
  DIRECTION_MIN_LENGTH,
  findDirectionQuestion,
} from "@/features/direction/directionInterviewGuide";
import { DirectionProposals } from "@/features/direction/DirectionProposals";
import { DirectionStatements } from "@/features/direction/DirectionStatements";
import { askForAllDirectionProposalsAction } from "@/features/direction/directionStatementActions";
import {
  getAiAvailability,
  getDirectionJobStates,
  getPendingDirectionProposals,
} from "@/features/direction/directionProposalData";
import { ProposalWatcher } from "@/features/capability/ProposalWatcher";
import { getDirectionStatements } from "@/features/direction/directionStatementData";
import { InterviewAnswerForm } from "@/features/interviews/InterviewAnswerForm";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Direction-Gespräch.
 *
 * SCHRITT S2 aus `web/docs/direction-interview-technical-brief.md`: Die sechs
 * Fragen laufen vollständig OHNE Modell. Es gibt noch keine Interpretation,
 * und die Seite behauptet auch keine - sie sagt ausdrücklich, dass die
 * Zusammenfassung noch nicht automatisch entsteht. Ein Produkt, das eine
 * Auswertung ankündigt, die es nicht gibt, hat sie damit nicht.
 *
 * ES IST DASSELBE ANTWORTFELD wie im Capability-Interview
 * (`features/interviews/InterviewAnswerForm.tsx`) - mit dem zweischichtigen
 * Speichern, dem Diktat und den Nachfragen, die erst nach dem Schreiben
 * erscheinen. Was dieses Gespräch ausmacht, sind seine Fragen und seine drei
 * Aktionen.
 *
 * DIE ANLEITUNG STEHT VOR DEM ANFANGEN, und die Zusage auch. Hier wird nach
 * Ärger, Sinn und dem langen Blick gefragt; wer erst hinterher erfährt, wohin
 * das geht, hat nicht eingewilligt, sondern erzählt.
 */
export default async function DirectionInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/profile/direction");

  const client = await createClient();
  const [t, state, answers, statements, proposals, aiAvailable] = await Promise.all([
    getTranslations("direction"),
    getActiveDirectionInterview(client),
    getDirectionAnswers(client),
    getDirectionStatements(client),
    getPendingDirectionProposals(client),
    getAiAvailability(client),
  ]);
  const jobStates = await getDirectionJobStates(
    client,
    answers.map((answer) => answer.id)
  );
  const reading = [...jobStates.values()].includes("open");

  const turn = state?.current ?? null;
  const question = turn ? findDirectionQuestion(turn.questionId) : null;
  const followUps = question
    ? question.followUpIds.map((id) => ({
        text: t(`interview.questions.${question.id}.followUps.${id}`),
        // Stimme kommt mit Schritt S5. `null` heisst hier: kein Knopf, statt
        // eines Knopfes, der auf eine fehlende Datei zeigt.
        audio: null,
      }))
    : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <Link
        href="/profile"
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {t("eyebrow")}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("text")}</p>

      {query.error ? (
        <p role="status" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t(`errors.${query.error}`)}
        </p>
      ) : null}
      {query.notice ? (
        <p role="status" className="mt-5 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950">
          {t(`notice.${query.notice}`)}
        </p>
      ) : null}

      {state && turn && question ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-700">
            {turn.source === "model"
              ? t("progress.atFollowUp")
              : t("progress.atQuestion", {
                  index: state.progress.atQuestion,
                  total: state.progress.total,
                })}
            {" · "}
            {t("progress.answered", { count: state.progress.answeredCount })}
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-8">
            {turn.source === "model"
              ? turn.questionText
              : t(`interview.questions.${question.id}.title`)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t(`interview.questions.${question.id}.hint`)}
          </p>

          <div className="mt-5">
            <InterviewAnswerForm
              namespace="direction"
              actions={{
                autosave: autosaveDirectionAnswerAction,
                save: saveDirectionAnswerAction,
                skip: skipDirectionQuestionAction,
              }}
              minLength={DIRECTION_MIN_LENGTH}
              maxLength={DIRECTION_MAX_LENGTH}
              sessionId={state.sessionId}
              turnId={turn.id}
              savedAnswer={turn.answer ?? ""}
              followUps={followUps}
              isLastQuestion={state.nextQuestionId === null}
            />
          </div>

          {/* Abschliessen, ohne noch etwas zu schreiben - sobald vier Antworten
              da sind. Vorher stünde hier ein Knopf, der nichts tun kann. */}
          {state.progress.hasEnough && state.nextQuestionId !== null ? (
            <form action={completeDirectionInterviewAction} className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm leading-6 text-slate-600">{t("progress.enough")}</p>
              <SubmitButton
                label={t("interview.submitLast")}
                pendingLabel={t("interview.submitPending")}
                className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-900"
              />
            </form>
          ) : null}
        </section>
      ) : answers.length === 0 ? (
        /* DIE ANLEITUNG STEHT VOR DEM ANFANGEN - aber nur beim ersten Mal.
           Wer schon geantwortet hat, landet nach dem Abschliessen sonst
           wieder auf "Bevor du anfängst", und das liest sich, als wäre nichts
           passiert. Gemeldet am 22.09.2026: "Was ich nicht so gut fand, war
           der Flow am Ende, wenn man durch ist." */
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">{t("guidance.title")}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>{t("guidance.time")}</li>
            <li>{t("guidance.save")}</li>
            <li>{t("guidance.stories")}</li>
            {/* Die zwei Zusagen zuletzt, damit sie nicht überlesen werden. */}
            <li className="font-medium text-slate-900">{t("guidance.private")}</li>
            <li className="font-medium text-slate-900">{t("guidance.noTest")}</li>
          </ul>
          <form action={startDirectionInterviewAction} className="mt-6">
            <SubmitButton
              label={t("start")}
              pendingLabel={t("startPending")}
              className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
            />
          </form>
        </section>
      ) : (
        /* Fertig, und was jetzt? Nicht "noch einmal anfangen" - das steht
           ganz unten. Hier steht, was als Nächstes zu tun ist. */
        <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50/40 p-6">
          <h2 className="text-xl font-semibold">{t("done.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">
            {t("done.text", { count: answers.length, total: 6 })}
          </p>
          {aiAvailable ? (
            <>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{t("done.withAi")}</p>
              {/* EIN KNOPF, NICHT SECHS. Gemeldet: "Wenn du das sechsmal
                  anklicken musst, ist das ein bisschen unhandlich." */}
              <form action={askForAllDirectionProposalsAction} className="mt-4">
                <SubmitButton
                  label={reading ? t("proposals.jobOpen") : t("done.askAll")}
                  pendingLabel={t("proposals.askPending")}
                  className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
                />
              </form>
            </>
          ) : (
            /* OHNE MODELL GEHT ES GENAUSO WEITER, und das steht hier statt
               eines Knopfes, der nichts tut. Gemeldet am 22.09.2026: "Da
               müsste es natürlich auch eine Möglichkeit geben, dass das ohne
               KI auch funktioniert." */
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{t("done.withoutAi")}</p>
          )}
        </section>
      )}

      {reading ? <ProposalWatcher>{null}</ProposalWatcher> : null}

      <DirectionProposals proposals={proposals} />

      <DirectionStatements statements={statements} />

      {/* DER BLICK ZURÜCK, und in diesem Schritt ist er das Ergebnis: Die
          eigenen Geschichten nebeneinander zu lesen ist selbst schon etwas
          wert - und es ist das, was die Person bestätigen wird, sobald der
          Vorschlagsschritt steht. */}
      {answers.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">{t("review.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("review.text")}</p>
          <ul className="mt-5 space-y-4">
            {answers.map((answer) => {
              const answered = findDirectionQuestion(answer.questionId);
              return (
                <li key={answer.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    {answer.source === "model"
                      ? answer.questionText
                      : answered
                        ? t(`interview.questions.${answered.id}.title`)
                        : answer.questionId}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {answer.answer}
                  </p>
                  {/* Nur noch der ZUSTAND je Antwort - gelesen wird über den
                      einen Knopf oben. Sechs Knöpfe für dieselbe Entscheidung
                      sind fünf zu viel. */}
                  {jobStates.get(answer.id) === "open" ? (
                    <p role="status" className="mt-3 text-sm font-medium text-violet-900">
                      {t("proposals.jobOpen")}
                    </p>
                  ) : jobStates.get(answer.id) === "failed" ? (
                    <p className="mt-3 text-sm text-amber-900">{t("proposals.jobFailed")}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

        </section>
      ) : null}

      {/* NOCH EINMAL - unten und leise. Es ist der seltenere Wunsch, und oben
          stand es bisher so, als wäre es der nächste Schritt. */}
      {!state && answers.length > 0 ? (
        <form action={startDirectionInterviewAction} className="mt-10 border-t border-slate-200 pt-6">
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
