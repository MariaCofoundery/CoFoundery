import { getTranslations } from "next-intl/server";

import type { InterviewSummary } from "./capabilityInterviewSummary";

/**
 * Der Blick zurück, sichtbar gemacht.
 *
 * WAS HIER NICHT STEHT, und das ist die wichtigere Hälfte: keine Note, kein
 * Profil, kein "du bist eher der Typ, der ...". Es steht nur, was in den
 * bestätigten Einordnungen steht - nebeneinandergestellt, sodass daraus eine
 * Aussage wird, die in keinem einzelnen Eintrag zu finden ist.
 *
 * DIE REIHENFOLGE IST DIE AUSSAGEKRAFT:
 *
 *   Was mehrfach vorkam, zuerst. Das ist die verlässlichste Auskunft, die
 *   dieses Verfahren hergibt.
 *
 *   Dann, was andere an dir nachfragen - eine Fremdbeobachtung, keine
 *   Selbsteinschätzung.
 *
 *   Dann die beiden Richtungen des Wollens: abgeben und übernehmen. Sie sind
 *   für ein Team so wichtig wie das Können und werden fast nie gefragt.
 *
 *   Zuletzt, was offen blieb - und zwar getrennt: eine übersprungene Frage ist
 *   eine Entscheidung, eine Antwort ohne Treffer eine Lücke unserer
 *   Begriffsliste. Beides ist kein Mangel der Person, aber es sind nicht
 *   dieselben Sätze.
 */
export async function InterviewSummaryView({ summary }: { summary: InterviewSummary }) {
  const t = await getTranslations("capability");
  const areaLabel = (areaId: string) => t(`areaLabels.${areaId}`);
  const list = (areaIds: string[]) => areaIds.map(areaLabel).join(", ");

  const card = "rounded-3xl border border-slate-200 bg-white p-5";

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
        {t("interview.summary.title")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {t("interview.summary.text", {
          answered: summary.answered,
          personal: summary.personal,
        })}
      </p>

      {/* VORLÄUFIG, solange etwas nicht eingeordnet ist. Ohne diesen Satz
          liest sich ein dünnes Fazit wie ein Ergebnis. */}
      {summary.unsorted > 0 ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {t("interview.summary.provisional", { count: summary.unsorted })}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4">
        {/* ---------------------------------------------------------------
            Was mehrfach vorkam.
            --------------------------------------------------------------- */}
        {summary.recurring.length > 0 ? (
          <article className={card}>
            <h3 className="text-base font-semibold text-slate-950">
              {t("interview.summary.recurringTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("interview.summary.recurringText")}
            </p>
            <ul className="mt-3 grid gap-1.5">
              {summary.recurring.map((entry) => (
                <li key={entry.areaId} className="text-sm leading-6">
                  <span className="font-medium text-slate-900">{areaLabel(entry.areaId)}</span>
                  <span className="text-slate-500">
                    {" – "}
                    {t("interview.summary.inStories", { count: entry.times })}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {/* ---------------------------------------------------------------
            Der Blick von außen.
            --------------------------------------------------------------- */}
        {summary.observedByOthers.length > 0 ? (
          <article className={card}>
            <h3 className="text-base font-semibold text-slate-950">
              {t("interview.summary.observedTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("interview.summary.observedText")}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
              {list(summary.observedByOthers)}
            </p>
          </article>
        ) : null}

        {/* ---------------------------------------------------------------
            Beide Richtungen des Wollens. In EINER Karte, weil sie zusammen
            die Aussage machen: was du loswerden willst und was du dir
            vornimmst.
            --------------------------------------------------------------- */}
        {summary.handOver.length > 0 || summary.growInto.length > 0 ? (
          <article className={card}>
            <h3 className="text-base font-semibold text-slate-950">
              {t("interview.summary.wantingTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("interview.summary.wantingText")}
            </p>
            <dl className="mt-3 grid gap-2 text-sm leading-6">
              {summary.handOver.length > 0 ? (
                <div>
                  <dt className="font-medium text-slate-900">
                    {t("interview.summary.handOver")}
                  </dt>
                  <dd className="text-slate-600">{list(summary.handOver)}</dd>
                </div>
              ) : null}
              {summary.growInto.length > 0 ? (
                <div>
                  <dt className="font-medium text-slate-900">
                    {t("interview.summary.growInto")}
                  </dt>
                  <dd className="text-slate-600">{list(summary.growInto)}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        ) : null}

        {/* ---------------------------------------------------------------
            Einmal genannt. Bewusst nach den Wiederholungen und ohne
            Wertung: Einmal genannt heißt einmal erzählt, nicht "weniger
            wert".
            --------------------------------------------------------------- */}
        {summary.single.length > 0 ? (
          <article className={`${card} bg-white/60`}>
            <h3 className="text-base font-semibold text-slate-900">
              {t("interview.summary.singleTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("interview.summary.singleText")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{list(summary.single)}</p>
          </article>
        ) : null}

        {/* ---------------------------------------------------------------
            Was offen blieb - getrennt, weil es zwei verschiedene Dinge sind.
            --------------------------------------------------------------- */}
        {summary.skipped > 0 || summary.withoutArea > 0 ? (
          <article className={`${card} bg-slate-50`}>
            <h3 className="text-base font-semibold text-slate-900">
              {t("interview.summary.openTitle")}
            </h3>
            <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-slate-700">
              {summary.skipped > 0 ? (
                <li>{t("interview.summary.skipped", { count: summary.skipped })}</li>
              ) : null}
              {summary.withoutArea > 0 ? (
                <li>{t("interview.summary.withoutArea", { count: summary.withoutArea })}</li>
              ) : null}
            </ul>
          </article>
        ) : null}
      </div>
    </section>
  );
}
