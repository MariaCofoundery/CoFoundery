import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import {
  completeInterviewAction,
  startInterviewAction,
} from "@/features/capability/capabilityInterviewActions";
import {
  getActiveInterview,
  interviewQuestionMeta,
} from "@/features/capability/capabilityInterviewData";
import { INTERVIEW_MIN_ANSWERS } from "@/features/capability/capabilityInterviewGuide";
import { InterviewAnswerForm } from "@/features/capability/InterviewAnswerForm";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das geführte Gespräch.
 *
 * WARUM EINE EIGENE SEITE und nicht ein Abschnitt im Profil: Das hier dauert
 * eine halbe Stunde und verlangt, dass jemand nachdenkt. Zwischen
 * Profilangaben und Freigabeschaltern waere es ein Formular unter Formularen -
 * und dann wird es so beantwortet.
 *
 * WAS ES ERZEUGT: Antworten. Nicht mehr. Die Einordnung in Bereiche, die
 * Anwendungsstufe und der Verantwortungswunsch sind derselbe Ablauf, den es
 * heute schon gibt, und sie kommen im Schritt danach - EINMAL fuer alle
 * Antworten, statt nach jeder Frage. Acht mal drei Schritte hintereinander
 * waere Buchhaltung, kein Gespraech.
 *
 * DER MODELLWEG FEHLT HIER NOCH. Marias Entscheidung vom 21.09.2026 war
 * "Modell live, aber wenn es nicht verfuegbar ist, soll das angezeigt werden
 * und dann sollen vorgelegte Fragen ausgespielt werden". Ausgespielt werden
 * heute die vorgelegten - und es steht kein Wort darueber auf der Seite, weil
 * eine Anzeige "der Coach hoert live zu" falsch waere, solange niemand
 * zuhoert. Sie kommt zusammen mit dem Weg, den sie beschreibt.
 */
export default async function CapabilityInterviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // `getRequestUser` und nicht der direkte Weg zum Auth-Server: Der
  // gemeinsame Weg haelt die Antwort fuer die Dauer der Anfrage fest, sonst
  // zahlt jede Seite den Netzwerkgang doppelt. Ein Test prueft das an allen
  // Seiten - und hat diese hier gefunden.
  const [client, t, params, userResult] = await Promise.all([
    createClient(),
    getTranslations("capability"),
    searchParams,
    getRequestUser(),
  ]);

  if (!userResult.data.user) redirect("/login?next=/profile/interview");

  const state = await getActiveInterview(client);

  const card = "rounded-3xl border border-slate-200 bg-white p-5 sm:p-7";
  const known = ["start", "save", "short", "long", "stale", "complete"];
  const error = params.error && known.includes(params.error) ? params.error : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href="/profile"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← {t("interview.backToProfile")}
      </Link>

      <p className="mt-3 text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {t("interview.title")}
      </h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
          {t(`interview.errors.${error}`)}
        </p>
      ) : null}

      {!state ? (
        /* ------------------------------------------------------------------
           Der Einstieg.

           DIE ANLEITUNG IST HIER KEINE HOEFLICHKEIT, sondern Teil des
           Messinstruments: Acht Fragen nach echten Situationen sind eine halbe
           Stunde Arbeit. Wer das nicht weiss, faengt zwischen zwei Terminen
           an, schreibt drei Stichworte und bekommt eine Auswertung, die aus
           drei Stichworten besteht.
           ------------------------------------------------------------------ */
        <>
          <p className="mt-3 leading-7 text-slate-600">{t("interview.text")}</p>

          <section className={`${card} mt-6`}>
            <h2 className="text-lg font-semibold text-slate-950">
              {t("interview.guidanceTitle")}
            </h2>
            <ul className="mt-3 grid gap-3 text-sm leading-6 text-slate-700">
              <li>{t("interview.guidanceTime")}</li>
              <li>{t("interview.guidanceLength")}</li>
              <li>{t("interview.guidanceSaving")}</li>
              <li>{t("interview.guidanceDictate")}</li>
              <li>{t("interview.guidanceNoRight")}</li>
            </ul>

            {/* Die Zusage zur Vertraulichkeit steht VOR dem Anfangen, nicht in
                einer Fussnote danach: Frage 3 fragt nach dem Privaten, und wer
                erst hinterher erfaehrt, wohin das geht, hat nicht
                eingewilligt, sondern erzaehlt. */}
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {t("interview.privacy")}
            </p>

            <form action={startInterviewAction} className="mt-5">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold text-slate-900"
              >
                {t("interview.start")}
              </button>
            </form>
          </section>
        </>
      ) : state.current ? (
        <>
          <p className="mt-3 text-sm text-slate-500">
            {t("interview.progress", {
              answered: state.progress.answered,
              total: state.progress.total,
            })}
          </p>

          <Question state={state} t={t} card={card} />

          {/* WAS BISHER ERZAEHLT WURDE, eingeklappt. Wer nach zwei Tagen
              weitermacht, weiss sonst nicht mehr, was er schon gesagt hat -
              und erzaehlt dieselbe Geschichte zweimal. */}
          {state.turns.some((turn) => turn.answer) ? (
            <details className="mt-6 rounded-3xl border border-slate-200 bg-white/60 p-5">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">
                {t("interview.previousTitle")}
              </summary>
              <div className="mt-3 grid gap-4">
                {state.turns
                  .filter((turn) => turn.answer)
                  .map((turn) => {
                    const meta = interviewQuestionMeta(turn);
                    return (
                      <div key={turn.id}>
                        <p className="text-sm font-medium text-slate-900">
                          {meta.question
                            ? t(`interview.questions.${meta.question.id}.title`)
                            : meta.text}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {turn.answer}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </details>
          ) : null}

          {/* Der Abschluss steht erst da, wenn der Leitfaden durch ist oder
              genug Antworten vorliegen. Vorher waere er eine Einladung,
              aufzuhoeren. */}
          {state.nextQuestionId === null || state.progress.hasEnough ? (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-base font-semibold text-slate-950">
                {t("interview.completeTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {state.nextQuestionId === null
                  ? t("interview.completeTextAll")
                  : t("interview.completeTextEnough", { min: INTERVIEW_MIN_ANSWERS })}
              </p>
              <form action={completeInterviewAction} className="mt-4">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800"
                >
                  {t("interview.complete")}
                </button>
              </form>
            </section>
          ) : null}
        </>
      ) : (
        /* Eine Sitzung ohne Frage: abgebrochen zwischen zwei Anweisungen.
           `startInterviewAction` holt die erste Frage nach, statt hier in
           einen leeren Bildschirm zu laufen. */
        <section className={`${card} mt-6`}>
          <p className="text-sm leading-6 text-slate-600">{t("interview.resumeEmpty")}</p>
          <form action={startInterviewAction} className="mt-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              {t("interview.resume")}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function Question({
  state,
  t,
  card,
}: {
  state: NonNullable<Awaited<ReturnType<typeof getActiveInterview>>>;
  t: Awaited<ReturnType<typeof getTranslations<"capability">>>;
  card: string;
}) {
  const turn = state.current;
  if (!turn) return null;

  const meta = interviewQuestionMeta(turn);
  const question = meta.question;

  // Eine Modellfrage traegt ihren Text im Verlauf; eine Katalogfrage holt ihn
  // aus dem Sprachbundle.
  const title = question ? t(`interview.questions.${question.id}.title`) : (meta.text ?? "");
  const hint = question ? t(`interview.questions.${question.id}.hint`) : null;
  const followUps = question
    ? question.followUpIds.map((id) => t(`interview.questions.${question.id}.followUps.${id}`))
    : [];

  return (
    <section className={`${card} mt-4`}>
      {/* Bei welcher Sorte von Situation wir sind. Bei "beides" ist der Hinweis
          nicht Deko: Ohne ihn erzaehlen Menschen bei einer neutralen Frage fast
          immer aus dem Beruf. */}
      {question ? (
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-800">
          {question.context === "professional"
            ? t("interview.contextProfessional")
            : question.context === "personal"
              ? t("interview.contextPersonal")
              : t("interview.contextEither")}
        </p>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-800">
          {t("interview.followUpTitle")}
        </p>
      )}

      <h2 className="mt-2 text-xl font-semibold leading-8 tracking-tight text-slate-950">
        {title}
      </h2>
      {hint ? <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p> : null}

      <div className="mt-5">
        <InterviewAnswerForm
          sessionId={state.sessionId}
          turnId={turn.id}
          savedAnswer={turn.answer ?? ""}
          followUps={followUps}
          isLastQuestion={state.nextQuestionId === null}
        />
      </div>
    </section>
  );
}
