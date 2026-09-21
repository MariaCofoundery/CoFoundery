import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import {
  askForProposalsAction,
  resortInterviewAnswerAction,
} from "@/features/capability/capabilityInterviewActions";
import { ProposalWatcher } from "@/features/capability/ProposalWatcher";
import { InterviewSummaryView } from "@/features/capability/InterviewSummaryView";
import {
  getAiAvailability,
  getProposalJobState,
  getProposalsForTurn,
} from "@/features/capability/capabilityProposalData";
import {
  getInterviewSummary,
  getSortedInterviewAnswers,
  getUnsortedInterviewAnswers,
  interviewQuestionMeta,
} from "@/features/capability/capabilityInterviewData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { InterviewSortForm } from "@/features/capability/InterviewSortForm";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Antworten einordnen.
 *
 * DER SCHRITT, DER DAS GESPRÄCH EINLÖST. Bis hierher liegen die Erzaehlungen
 * in einer Tabelle; hier werden sie zu Eintraegen im Faehigkeitsmodell - und
 * damit zu dem, was Vergleich, Freigabeleiter und spaeter die Teamauswertung
 * ueberhaupt lesen koennen.
 *
 * EINE ANTWORT JE SEITE, und zwar die aelteste zuerst. Acht Antworten auf
 * einer Seite einzuordnen waere ein Formular mit vierundzwanzig Feldern; man
 * haekt dann durch, statt zu entscheiden.
 *
 * WARUM NICHT GLEICH NACH JEDER FRAGE: Weil das Gespraech dann kein Gespraech
 * mehr ist. Wer nach jeder Erzaehlung drei Verwaltungsschritte macht, erzaehlt
 * bei der vierten Frage nichts mehr. Erst reden, dann ordnen.
 */
export default async function InterviewSortPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [client, t, params, userResult] = await Promise.all([
    createClient(),
    getTranslations("capability"),
    searchParams,
    getRequestUser(),
  ]);

  if (!userResult.data.user) redirect("/login?next=/profile/interview/sort");

  const [unsorted, sorted, vocabulary, summary] = await Promise.all([
    getUnsortedInterviewAnswers(client),
    getSortedInterviewAnswers(client),
    getCapabilityVocabulary(client),
    getInterviewSummary(client),
  ]);

  const card = "rounded-3xl border border-slate-200 bg-white p-5 sm:p-7";
  const knownErrors = ["area", "save", "link", "resort", "ask"];
  const error = params.error && knownErrors.includes(params.error) ? params.error : null;
  const notice = params.notice === "already" ? "already" : null;

  // Alle Bereiche mit Beschriftung - die Auswertung nennt Kennungen, die
  // Oberflaeche zeigt Namen.
  const areaLabels: Record<string, string> = {};
  for (const area of vocabulary.areas) {
    areaLabels[area.area_id] = t(`areaLabels.${area.area_id}`);
  }

  // NACH FAMILIEN, damit man selbst auswaehlen kann, ohne siebenundvierzig
  // Bereiche in einer Reihe zu lesen. Der Auffangwert bleibt draussen: Ihn
  // anzuhaken ist keine Entscheidung, und er wird ohnehin genommen, wenn
  // nichts gewaehlt ist.
  const groupedVocabulary = vocabulary.families
    .filter((family) => family.family_id !== "other")
    .map((family) => ({
      familyId: family.family_id,
      label: t(`families.${family.family_id}`),
      areas: vocabulary.areas
        .filter((area) => area.family_id === family.family_id)
        .map((area) => ({ id: area.area_id, label: areaLabels[area.area_id] })),
    }));

  const turn = unsorted[0] ?? null;
  const meta = turn ? interviewQuestionMeta(turn) : null;
  const question = meta?.question ?? null;

  // NUR FUER DIE ANTWORT, DIE GERADE DRAN IST. Die Vorschlaege der uebrigen
  // interessieren hier nicht, und sie zu laden waere eine Abfrage fuer nichts.
  const [proposals, jobState, aiAvailable] = turn
    ? await Promise.all([
        getProposalsForTurn(client, turn.id),
        getProposalJobState(client, turn.id),
        getAiAvailability(client),
      ])
    : [[], "none" as const, false];

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
        {t("interview.sort.title")}
      </h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
          {t(`interview.sort.errors.${error}`)}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {t("interview.sort.alreadySorted")}
        </p>
      ) : null}

      {!turn || !turn.answer ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-lg font-semibold text-slate-900">{t("interview.sort.doneTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("interview.sort.doneText")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              {t("interview.sort.toProfile")}
            </Link>
            <Link
              href="/profile/interview"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800"
            >
              {t("interview.sort.toInterview")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-500">
            {t("interview.sort.remaining", { count: unsorted.length })}
          </p>

          <section className={`${card} mt-4`}>
            {/* DIE FRAGE UND DIE EIGENE ANTWORT STEHEN OBEN. Ohne sie ordnet
                man einen Text ein, den man vor drei Tagen geschrieben hat, und
                erinnert sich nicht mehr, worauf er antwortete. */}
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-800">
              {t("interview.sort.yourAnswer")}
            </p>
            <h2 className="mt-2 text-base font-semibold leading-7 text-slate-950">
              {question ? t(`interview.questions.${question.id}.title`) : meta?.text}
            </h2>
            <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {turn.answer}
            </p>
          </section>

          {/* ------------------------------------------------------------
              DIE KI MITLESEN LASSEN - auf Bitte, nicht von selbst.

              Anders als bei einer veröffentlichten Anzeige ist das hier der
              privateste Text im Produkt: Frage 3 fragt nach dem Leben
              außerhalb der Erwerbsarbeit. Deshalb ein Knopf und ein Satz, der
              sagt, was passiert - und kein stiller Ablauf.
              ------------------------------------------------------------ */}
          {proposals.length === 0 ? (
            <section className={`${card} mt-4`}>
              <h2 className="text-base font-semibold text-slate-950">
                {t("interview.sort.askTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("interview.sort.askText")}
              </p>

              {jobState === "open" ? (
                /* Sie liest gerade. Der Arbeiter holt sich die Aufgabe im
                   Sekundenrhythmus; die Seite wartet nicht, sondern sagt es. */
                <ProposalWatcher>
                  <p role="status" className="mt-3 text-sm leading-6 text-violet-900">
                    {t("interview.sort.askRunning")}
                  </p>
                </ProposalWatcher>
              ) : aiAvailable ? (
                <form action={askForProposalsAction} className="mt-4">
                  <input type="hidden" name="turnId" value={turn.id} />
                  <SubmitButton
                    label={t("interview.sort.ask")}
                    pendingLabel={t("interview.sort.askPending")}
                    className="inline-flex min-h-11 items-center rounded-full border border-violet-300 bg-white px-5 text-sm font-semibold text-violet-900"
                  />
                </form>
              ) : (
                /* NICHT ERREICHBAR IST NICHT KAPUTT. Das Modell läuft auf
                   einem Rechner, der auch mal aus ist - und das Einordnen
                   geht ohne es vollständig. */
                <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {t("interview.sort.askUnavailable")}
                  {jobState === "failed" ? ` ${t("interview.sort.askFailed")}` : ""}
                </p>
              )}
            </section>
          ) : null}

          <section className={`${card} mt-4`}>
            <h2 className="text-lg font-semibold text-slate-950">
              {t("interview.sort.whichAreas")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("interview.sort.whichAreasText")}
            </p>

            <div className="mt-5">
              <InterviewSortForm
                turnId={turn.id}
                answer={turn.answer}
                suggestedAreas={question?.suggestsAreas ?? []}
                suggestedWish={question?.suggestsWish ?? null}
                areaLabels={areaLabels}
                proposals={proposals}
                vocabulary={groupedVocabulary}
                suggestedFamily={question?.suggestsFamily ?? null}
              />
            </div>
          </section>
        </>
      )}

      {/* ------------------------------------------------------------------
          DER BLICK ZURUECK.

          GEMELDET AM 21.09.2026: "Acht Geschichten erzählt, und am Ende kommt
          kein Blick zurück." Er steht hier und nicht im Profil, weil er ueber
          ANTWORTEN rechnet und nicht ueber Bereiche - die Auswertung im Profil
          kann nicht wissen, aus wie vielen Geschichten ein Eintrag kam.
          ------------------------------------------------------------------ */}
      {summary.hasContent ? <InterviewSummaryView summary={summary} /> : null}

      {/* ------------------------------------------------------------------
          NOCHMAL EINORDNEN.

          GEBRAUCHT AM 21.09.2026: Die Erkennung hatte fuer die
          Verhaltensbereiche keine Begriffe - wer sein Gespraech vorher
          eingeordnet hat, bekam nur Fachliches vorgeschlagen. Die Erzaehlungen
          liegen noch da; sie neu erzaehlen zu lassen, weil unsere
          Begriffsliste besser geworden ist, waere die falsche Richtung.

          Eingeklappt, weil es der Ausnahmeweg ist und nicht der Normalfall.
          ------------------------------------------------------------------ */}
      {sorted.length > 0 ? (
        <details className="mt-8 rounded-3xl border border-slate-200 bg-white/60 p-5">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">
            {t("interview.sort.againTitle", { count: sorted.length })}
          </summary>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("interview.sort.againText")}</p>

          <ul className="mt-4 grid gap-3">
            {sorted.map((turn) => {
              const turnMeta = interviewQuestionMeta(turn);
              return (
                <li
                  key={turn.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {turnMeta.question
                      ? t(`interview.questions.${turnMeta.question.id}.title`)
                      : turnMeta.text}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                    {turn.answer}
                  </p>
                  <form action={resortInterviewAnswerAction} className="mt-3">
                    <input type="hidden" name="turnId" value={turn.id} />
                    <SubmitButton
                      label={t("interview.sort.again")}
                      pendingLabel={t("interview.sort.againPending")}
                      className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                    />
                  </form>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
