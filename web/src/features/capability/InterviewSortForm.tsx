"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { sortInterviewAnswerAction } from "./capabilityInterviewActions";
import {
  APPLICATION_LEVELS,
  MAX_CONFIRMED_AREAS,
  OWNERSHIP_WISHES,
  type OwnershipWish,
} from "./capabilityTypes";
import { analyzeNarrativeWithRules, type NarrativeAnalysis } from "./narrativeAnalysis";

/**
 * Eine Antwort einordnen.
 *
 * ZWEI QUELLEN, GETRENNT AUSGEWIESEN, und das ist die wichtigste Entscheidung
 * in dieser Datei:
 *
 *   AUS DEM TEXT. Die Regel-Auswertung nennt Bereiche und dazu die Begriffe,
 *   an denen sie sie erkannt hat. Nie eine Blackbox.
 *
 *   AUS DER FRAGE. Wer auf "wann hast du zuletzt ein unangenehmes Thema
 *   angesprochen" ueberhaupt etwas erzaehlt, hat Unangenehmes angesprochen.
 *   Das ist kein Fund im Text, sondern folgt aus der Frage - und es steht
 *   deshalb unter einer eigenen Ueberschrift. Beides in einen Topf zu werfen
 *   waere ein Vorschlag, dessen Herkunft niemand mehr pruefen kann.
 *
 * NICHTS IST VORANGEHAKT. Vorbelegen wuerde die Frage beantworten, die wir
 * gerade stellen - dieselbe Regel wie im Textfeld. Eine leere Auswahl ist eine
 * gueltige Antwort; dann landet die Erzaehlung im Auffangwert.
 *
 * DIE AUSWERTUNG LAEUFT IM BROWSER. Der Text liegt schon auf dem Server, aber
 * die Zuordnung braucht ihn dort nicht - und die Person sieht das Ergebnis
 * ohne Umweg. Dieselbe auswechselbare Schnittstelle wie im Textfeld; ein
 * Sprachmodell wuerde hier spaeter nur `engine` aendern.
 */
export function InterviewSortForm({
  turnId,
  answer,
  suggestedAreas,
  suggestedWish,
  areaLabels,
}: {
  turnId: string;
  answer: string;
  /** Bereiche, die die FRAGE nahelegt. Leer bei den meisten Fragen. */
  suggestedAreas: readonly string[];
  /** Vorauswahl fuer den Wunsch - nur bei den beiden Fragen nach dem Wollen. */
  suggestedWish: OwnershipWish | null;
  /** Beschriftungen aller Bereiche, die vorgeschlagen werden koennen. */
  areaLabels: Record<string, string>;
}) {
  const t = useTranslations("capability");
  const [analysis, setAnalysis] = useState<NarrativeAnalysis | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  // Die Antwort steht schon da - also sofort auswerten, nicht erst auf einen
  // Klick warten. Im Textfeld ist es umgekehrt: Dort tippt jemand noch.
  useEffect(() => {
    let active = true;
    void analyzeNarrativeWithRules({ narrative: answer, locale: "de" }).then((result) => {
      if (active) setAnalysis(result);
    });
    return () => {
      active = false;
    };
  }, [answer]);

  const fromText = (analysis?.areas ?? []).filter(
    (area) => !suggestedAreas.includes(area.areaId)
  );
  const atLimit = chosen.length >= MAX_CONFIRMED_AREAS;

  const toggle = (areaId: string) => {
    setChosen((current) =>
      current.includes(areaId)
        ? current.filter((id) => id !== areaId)
        : current.length >= MAX_CONFIRMED_AREAS
          ? current
          : [...current, areaId]
    );
  };

  const box =
    "flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 transition has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50/50";

  return (
    <form action={sortInterviewAnswerAction}>
      <input type="hidden" name="turnId" value={turnId} />

      {suggestedAreas.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-medium text-slate-900">
            {t("interview.sort.fromQuestion")}
          </legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t("interview.sort.fromQuestionHint")}
          </p>
          <div className="mt-3 grid gap-2">
            {suggestedAreas.map((areaId) => (
              <label key={areaId} className={box}>
                <input
                  type="checkbox"
                  name="area_id"
                  value={areaId}
                  checked={chosen.includes(areaId)}
                  disabled={atLimit && !chosen.includes(areaId)}
                  onChange={() => toggle(areaId)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
                />
                <span className="text-sm font-medium text-slate-900">
                  {areaLabels[areaId] ?? areaId}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className={suggestedAreas.length > 0 ? "mt-6" : ""}>
        <legend className="text-sm font-medium text-slate-900">
          {t("interview.sort.fromText")}
        </legend>

        {analysis === null ? (
          <p className="mt-2 text-sm text-slate-500">{t("interview.sort.analysing")}</p>
        ) : fromText.length === 0 ? (
          /* Nichts erkannt sagt nichts über die Erzählung. Derselbe Satz wie im
             Textfeld, und aus demselben Grund: Ein leeres Ergebnis darf nicht
             wie ein Mangel der Person klingen. */
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("interview.sort.nothingFound")}</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {fromText.map((area) => (
              <label key={area.areaId} className={box}>
                <input
                  type="checkbox"
                  name="area_id"
                  value={area.areaId}
                  checked={chosen.includes(area.areaId)}
                  disabled={atLimit && !chosen.includes(area.areaId)}
                  onChange={() => toggle(area.areaId)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {areaLabels[area.areaId] ?? area.areaId}
                  </span>
                  {/* Woran es erkannt wurde. Ohne diese Zeile muesste man einer
                      Maschine glauben. */}
                  {area.matchedTerms.length > 0 ? (
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {t("interview.sort.because", { terms: area.matchedTerms.join(", ") })}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t("interview.sort.limit", { max: MAX_CONFIRMED_AREAS })}
        </p>
      </fieldset>

      {/* Stufe und Wunsch. Beide duerfen leer bleiben: "noch nicht eingestuft"
          ist ein Zustand und nicht die niedrigste Stufe. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="application_level" className="block text-sm font-medium text-slate-900">
            {t("levels.label")}
          </label>
          <select
            id="application_level"
            name="application_level"
            defaultValue=""
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">{t("levels.unset")}</option>
            {APPLICATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`levels.${level}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ownership_wish" className="block text-sm font-medium text-slate-900">
            {t("ownershipWishes.label")}
          </label>
          <select
            id="ownership_wish"
            name="ownership_wish"
            // VORAUSGEWAEHLT NUR, WO DIE FRAGE DANACH GEFRAGT HAT: Wer auf
            // "was wuerdest du lieber abgeben" geantwortet hat, hat den Wunsch
            // schon genannt - ihn erneut zu erfragen waere, als haette man
            // nicht zugehoert. Bei allen anderen Fragen bleibt es offen.
            defaultValue={suggestedWish ?? ""}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">{t("ownershipWishes.unset")}</option>
            {OWNERSHIP_WISHES.map((wish) => (
              <option key={wish} value={wish}>
                {t(`ownershipWishes.${wish}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
        >
          {t("interview.sort.submit")}
        </button>
        <span className="text-xs leading-5 text-slate-500">{t("interview.sort.emptyAllowed")}</span>
      </div>
    </form>
  );
}
