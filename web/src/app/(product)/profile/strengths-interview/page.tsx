import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPendingStrengthProposals, getPersonStrengths } from "@/features/capability/strengthData";
import { StrengthsSection } from "@/features/capability/StrengthsSection";
import { SectionMarkToggle } from "@/features/profile/SectionMarkToggle";
import { getSectionMarks } from "@/features/profile/aboutYouData";
import { ProposalWatcher } from "@/features/capability/ProposalWatcher";
import { getAiAvailability } from "@/features/direction/directionProposalData";
import { InterviewAnswerForm } from "@/features/interviews/InterviewAnswerForm";
import { SceneCards } from "@/features/strengths/SceneCards";
import { SceneForm } from "@/features/strengths/SceneForm";
import { StrengthsInterim } from "@/features/strengths/StrengthsInterim";
import { StrengthsIntro } from "@/features/strengths/StrengthsIntro";
import {
  autosaveRoundThreeDraftAction,
  saveRoundThreeAnswerAction,
  skipRoundThreeAction,
} from "@/features/strengths/strengthsDiscoverActions";
import { canSkipScene, DISCOVER_MAX_LENGTH, DISCOVER_MIN_LENGTH, ROUND_THREE_IDS, isSceneId } from "@/features/strengths/strengthsDiscoverGuide";
import "@/features/align/align.css";
import { requestStrengthProposalsAction } from "@/features/strengths/strengthsInterviewActions";
import {
  countDecidedStrengthProposals,
  getActiveStrengthsInterview,
  getLatestCompletedStrengthsInterview,
} from "@/features/strengths/strengthsInterviewData";
import {
  findStrengthsQuestion,
} from "@/features/strengths/strengthsInterviewGuide";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { UserText } from "@/features/ui/UserText";

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
  searchParams: Promise<{ error?: string; notice?: string; neu?: string }>;
}) {
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/profile/strengths-interview");

  const client = await createClient();
  const [t, tProfile, activeState, completed, aiAvailable, strengths, marks] = await Promise.all([
    getTranslations("strengths"),
    getTranslations("capability"),
    getActiveStrengthsInterview(client),
    getLatestCompletedStrengthsInterview(client),
    getAiAvailability(client),
    getPersonStrengths(client),
    getSectionMarks(client, user.id),
  ]);
  // Ein offenes Gespräch der frueheren Fassung gibt es nicht mehr: Es zaehlt als nicht vorhanden, und "Stärken entdecken"
  // schliesst es beim Start (startDiscoverAction). Seine Antworten bleiben erhalten.
  const state = activeState && activeState.guideVersion >= 3 ? activeState : null;
  const [proposals, decided] = completed
    ? await Promise.all([
        getPendingStrengthProposals(client, { sessionId: completed.sessionId }),
        countDecidedStrengthProposals(client, completed.sessionId),
      ])
    : [[], 0];

  const knownErrors = ["start", "save", "short", "long", "stale", "complete", "too_few", "ask", "proposal", "scenes", "too_few_scenes"];
  const knownNotices = ["paused", "completed", "reading"];
  const error = query.error && knownErrors.includes(query.error) ? query.error : null;
  const notice = query.notice && knownNotices.includes(query.notice) ? query.notice : null;

  // Ein laufendes oder neu begonnenes "Stärken entdecken" - sonst, wenn es schon ein abgeschlossenes Gespräch gibt, die Ergebnisse.
  const showResults = !state && Boolean(completed) && query.neu !== "1";
  const phase = state?.phase ?? null;
  const sceneTurns = state ? state.turns.filter((entry) => isSceneId(entry.questionId)) : [];
  const roundThreeTurns = state ? state.turns.filter((entry) => ROUND_THREE_IDS.includes(entry.questionId)) : [];
  const currentTurn = state && phase && (phase.phase === "scene" || phase.phase === "round3") ? state.turns[phase.index] : null;
  const roundTwoDone = phase?.phase === "interim" || phase?.phase === "round3";
  const tabClass = "rounded-full px-3.5 py-1.5 text-[13px]";

  if (showResults && completed) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <Link
          href="/me/profile"
          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
        >
          ← {t("backToStrengths")}
        </Link>
        <header className="brand-panel mt-3 rounded-[28px] p-6 sm:p-8">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t("title")}</h1>
        </header>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t(`errors.${error}`)}</p> : null}
        {notice ? <p role="status" className="mt-5 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950">{t(`notice.${notice}`)}</p> : null}

        <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50/40 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">{t("done.title")}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">{t("done.text", { count: completed.answers.length })}</p>
          {completed.job === "open" ? (
            <p role="status" className="mt-4 text-sm font-medium text-violet-900">{t("done.reading")}</p>
          ) : completed.job === "done" ? (
            proposals.length === 0 ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{decided > 0 ? t("done.allDecided") : t("done.noneFound")}</p>
            ) : null
          ) : completed.answers.length > 0 && aiAvailable ? (
            <>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{t("done.askText")}</p>
              {completed.job === "failed" ? <p className="mt-3 text-sm text-amber-900">{t("done.failed")}</p> : null}
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
        </section>

        {completed.job === "open" ? <ProposalWatcher>{null}</ProposalWatcher> : null}

        {/* Vorschläge, bestätigte Stärken (bewerten, entfernen) - alles an einer Stelle. */}
        <StrengthsSection strengths={strengths} proposals={proposals} />
        <SectionMarkToggle
          section="staerken"
          marked={marks.has("staerken")}
          copy={{
            markedNote: tProfile("aboutYou.mark.markedNote"),
            mark: tProfile("aboutYou.mark.mark"),
            unmark: tProfile("aboutYou.mark.unmark"),
          }}
        />

        {completed.answers.length > 0 ? (
          <details className="mt-8 rounded-3xl border border-slate-200 bg-white/60 p-5">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">{t("review.title")}</summary>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("review.text")}</p>
            <ul className="mt-4 space-y-4">
              {completed.answers.map((answer) => {
                const asked = findStrengthsQuestion(answer.questionId);
                return (
                  <li key={answer.id}>
                    <p className="text-sm font-medium text-slate-900">{asked ? t(`interview.questions.${asked.id}.title`) : answer.questionId}</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600"><UserText text={answer.answer} /></p>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-sm leading-6 text-slate-600">{t("again.text")}</p>
          <Link href="/profile/strengths-interview?neu=1" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            {t("again.cta")}
          </Link>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Stärken entdecken: Intro, Szenen wählen, eine Szene, Zwischenstand, Runde 3.
  // ---------------------------------------------------------------------------
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/me/profile"
          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          ← {t("backToStrengths")}
        </Link>
        {state ? (
          <ol aria-label={t("discover.pick.round")} className="m-0 ml-auto flex list-none gap-1 rounded-full bg-[#efedf7] p-1">
            <li className={`${tabClass} font-medium text-[#0b5f57]`}>✓ {t("discover.pick.warmup")}</li>
            <li
              aria-current={phase?.phase === "pick" || phase?.phase === "scene" ? "step" : undefined}
              className={`${tabClass} ${phase?.phase === "pick" || phase?.phase === "scene" ? "bg-white font-semibold text-[#4b2bb8] shadow-sm" : roundTwoDone ? "font-medium text-[#0b5f57]" : "text-[#4a4d68]"}`}
            >
              {roundTwoDone ? "✓ " : ""}{t("discover.pick.roundShort")}
            </li>
            <li
              aria-current={phase?.phase === "round3" ? "step" : undefined}
              className={`${tabClass} ${phase?.phase === "round3" ? "bg-white font-semibold text-[#4b2bb8] shadow-sm" : "text-[#4a4d68]"}`}
            >
              {t("discover.pick.roundThree")}
            </li>
          </ol>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t(`errors.${error}`)}</p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-950">{t(`notice.${notice}`)}</p>
      ) : null}

      <div className="mt-5">
        {!state ? (
          <StrengthsIntro />
        ) : phase?.phase === "pick" ? (
          <SceneCards introNotes={state.introNotes} />
        ) : phase?.phase === "scene" && currentTurn ? (
          <SceneForm
            key={currentTurn.id}
            sessionId={state.sessionId}
            turnId={currentTurn.id}
            sceneId={currentTurn.questionId}
            index={sceneTurns.indexOf(currentTurn) + 1}
            total={sceneTurns.length}
            savedParts={currentTurn.parts}
            savedWhen={currentTurn.when}
            canSkip={canSkipScene(state.turns.map((entry) => ({ questionId: entry.questionId, answered: entry.answer !== null, skipped: entry.skipped })))}
          />
        ) : phase?.phase === "interim" ? (
          <StrengthsInterim turns={sceneTurns} />
        ) : phase?.phase === "round3" && currentTurn ? (
          <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-700">
              {t("discover.round3.round")} · {t("discover.round3.counter", { index: roundThreeTurns.indexOf(currentTurn) + 1, total: roundThreeTurns.length })}
            </p>
            <h2 className="mt-3 text-xl font-semibold leading-8 text-slate-950">{t(`interview.questions.${currentTurn.questionId}.title`)}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t(`interview.questions.${currentTurn.questionId}.hint`)}</p>
            {findStrengthsQuestion(currentTurn.questionId)?.kind === "counter" ? (
              <p className="mt-1 text-sm font-medium text-slate-700">{t("discover.round3.counterNote")}</p>
            ) : null}
            <div className="mt-5">
              <InterviewAnswerForm
                namespace="strengths"
                actions={{
                  autosave: autosaveRoundThreeDraftAction,
                  save: saveRoundThreeAnswerAction,
                  skip: skipRoundThreeAction,
                }}
                minLength={DISCOVER_MIN_LENGTH}
                maxLength={DISCOVER_MAX_LENGTH}
                sessionId={state.sessionId}
                turnId={currentTurn.id}
                savedAnswer={currentTurn.draft}
                followUps={[]}
                isLastQuestion={roundThreeTurns.filter((entry) => entry.answer === null && !entry.skipped).length <= 1}
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );

}
